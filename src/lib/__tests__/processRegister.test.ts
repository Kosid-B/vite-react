import { describe, it, expect } from 'vitest';
import {
  registerIssues, registerHealth, registerCsv, registerJson,
  emptyRegister, looksLikePerson, seedProcesses, PROCESS_TEMPLATES, demoRegister,
  type ProcessRegisterData, type ProcessRow,
} from '../processRegister';
import { STANDARDS, type StandardId } from '../isoStandards';

const ALL_STD = Object.keys(STANDARDS) as StandardId[];

const proc = (over: Partial<ProcessRow> = {}): ProcessRow => ({
  id: 'p1', name: 'รับคำสั่งซื้อ', owner: 'ผู้จัดการฝ่ายขาย',
  input: 'ใบสั่งซื้อ', output: 'ใบยืนยัน',
  metrics: [{ id: 'm1', name: '% ยืนยันภายใน 1 วัน', target: '≥ 95%', freq: 'รายเดือน', whyFrom: 'ความเสี่ยงลูกค้ายกเลิกเพราะตอบช้า' }],
  clauses: ['8.2'], docs: ['ระเบียบงานลูกค้า'],
  ...over,
});

const full = (rows: ProcessRow[]): ProcessRegisterData => ({ standard: 'iso9001', processes: rows });

describe('looksLikePerson — เตือนเมื่อใส่ชื่อคนแทนตำแหน่ง', () => {
  it('คำที่มีตำแหน่งอยู่ = ไม่ใช่ชื่อคน', () => {
    // "ผู้บริหารสูงสุด"/"คณะกรรมการ" = คำที่ตัวมาตรฐานใช้เอง ต้องไม่ถูกเตือน
    for (const s of ['ผู้จัดการฝ่ายผลิต', 'หัวหน้าแผนก QA', 'จป.วิชาชีพ', 'QMR', 'Production Manager', 'ผู้บริหารสูงสุด', 'คณะทำงาน BCM']) {
      expect(looksLikePerson(s), s).toBe(false);
    }
  });
  it('ชื่อคนสั้น ๆ ที่ไม่มีคำบอกตำแหน่ง = เตือน', () => {
    for (const s of ['สมชาย', 'สมชาย ใจดี', 'John Smith']) expect(looksLikePerson(s), s).toBe(true);
  });
  it('ค่าว่างไม่ถือว่าเป็นชื่อคน (มี issue แยกอยู่แล้ว)', () => {
    expect(looksLikePerson('')).toBe(false);
    expect(looksLikePerson('   ')).toBe(false);
  });
});

describe('registerIssues — บังคับสายโซ่', () => {
  it('ตัววัดที่ไม่ได้ระบุว่ามาจากอะไร = blocker (หัวใจของระบบ)', () => {
    const d = full([proc({ metrics: [{ id: 'm1', name: 'ยอดขาย', target: '1M' }] })]);
    const i = registerIssues(d).find((x) => x.metricId === 'm1');
    expect(i?.level).toBe('blocker');
    expect(i?.what).toContain('มาจากความเสี่ยงหรือคุณค่าอะไร');
    expect(i?.audit).toContain('ทำไมถึงวัดตัวนี้');
  });

  it('กระบวนการไม่มีตัววัด = blocker ที่ข้อ 9.1', () => {
    const i = registerIssues(full([proc({ metrics: [] })])).find((x) => x.what.includes('ยังไม่มีตัววัด'));
    expect(i?.level).toBe('blocker');
    expect(i?.audit).toContain('9.1');
  });

  it('ไม่มีผู้รับผิดชอบ = blocker ที่ข้อ 5.3 · เป็นชื่อคน = warn', () => {
    const noOwner = registerIssues(full([proc({ owner: '' })])).find((x) => x.what.includes('ผู้รับผิดชอบ'));
    expect(noOwner?.level).toBe('blocker');
    expect(noOwner?.audit).toContain('5.3');

    const person = registerIssues(full([proc({ owner: 'สมชาย' })])).find((x) => x.what.includes('ชื่อคน'));
    expect(person?.level).toBe('warn');
    expect(person?.audit).toContain('ลาออก');
  });

  it('ข้อกำหนดที่ไม่มีกระบวนการรับผิดชอบ = blocker', () => {
    const i = registerIssues(full([proc()])).find((x) => x.what.includes('ยังไม่มีกระบวนการไหนรับผิดชอบ'));
    expect(i?.level).toBe('blocker');
    // 9001 มี 28 ข้อ กระบวนการเดียวถือ 8.2 → เหลือ 27 ข้อกำพร้า
    expect(i?.what).toContain('27');
  });

  it('ทะเบียนที่ครบถ้วนต้องไม่มี blocker', () => {
    const all = STANDARDS.iso9001.clauses.map((c) => c.id);
    const d = full([proc({ clauses: all })]);
    expect(registerIssues(d).filter((x) => x.level === 'blocker')).toEqual([]);
  });

  it('เรียง blocker ขึ้นก่อน warn เสมอ', () => {
    const d = full([proc({ owner: 'สมชาย', metrics: [{ id: 'm1', name: 'x' }], docs: [] })]);
    const levels = registerIssues(d).map((x) => x.level);
    expect(levels.indexOf('warn')).toBeGreaterThan(-1);
    expect(levels.lastIndexOf('blocker')).toBeLessThan(levels.indexOf('warn'));
  });
});

describe('registerHealth', () => {
  it('นับตัววัดที่ตอบได้ว่ามาจากอะไร แยกจากตัววัดทั้งหมด', () => {
    const d = full([proc({ metrics: [
      { id: 'a', name: 'A', whyFrom: 'ความเสี่ยง X' },
      { id: 'b', name: 'B' },
    ] })]);
    const h = registerHealth(d);
    expect(h.metrics).toBe(2);
    expect(h.metricsWithWhy).toBe(1);
  });

  it('ready = true เฉพาะเมื่อไม่มี blocker และมีกระบวนการอย่างน้อยหนึ่ง', () => {
    expect(registerHealth(emptyRegister('iso9001')).ready).toBe(false);
    const all = STANDARDS.iso9001.clauses.map((c) => c.id);
    expect(registerHealth(full([proc({ clauses: all })])).ready).toBe(true);
    expect(registerHealth(full([proc()])).ready).toBe(false); // ยังมีข้อกำพร้า
  });

  it('นับข้อกำหนดที่ครอบคลุมถูกต้อง', () => {
    const h = registerHealth(full([proc({ clauses: ['8.2', '8.5'] })]));
    expect(h.clausesCovered).toBe(2);
    expect(h.clausesTotal).toBe(STANDARDS.iso9001.clauses.length);
  });
});

describe('ส่งออก — ลูกค้าต้องถือข้อมูลตัวเองได้เสมอ', () => {
  it('CSV มีหนึ่งแถวต่อหนึ่งตัววัด และ escape เครื่องหมายคำพูด', () => {
    const d = full([proc({ name: 'งาน "พิเศษ"', metrics: [
      { id: 'a', name: 'A', whyFrom: 'x' }, { id: 'b', name: 'B', whyFrom: 'y' },
    ] })]);
    const lines = registerCsv(d).split('\n');
    expect(lines).toHaveLength(3); // หัวตาราง + 2 ตัววัด
    expect(lines[1]).toContain('""พิเศษ""');
  });

  it('กระบวนการที่ยังไม่มีตัววัดก็ต้องออกมาใน CSV ไม่ใช่หายไป', () => {
    const lines = registerCsv(full([proc({ metrics: [] })])).split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('รับคำสั่งซื้อ');
  });

  it('JSON ระบุวันที่ส่งออกและรหัสมาตรฐาน', () => {
    const j = JSON.parse(registerJson(full([proc()]), '2026-08-15T00:00:00Z'));
    expect(j.exportedAt).toBe('2026-08-15T00:00:00Z');
    expect(j.standardCode).toBe(STANDARDS.iso9001.code);
    expect(j.processes).toHaveLength(1);
  });

  it('ทะเบียนเปล่าส่งออกได้ ไม่ throw', () => {
    expect(() => registerCsv(emptyRegister('iso14001'))).not.toThrow();
    expect(registerCsv(emptyRegister('iso14001')).split('\n')).toHaveLength(1);
  });
});

describe('โครงตั้งต้น — ต้องครบทุกข้อกำหนดและไม่ซ้ำ', () => {
  it.each(ALL_STD)('%s: ทุกข้อกำหนดมีกระบวนการรับผิดชอบ ครบและไม่ซ้ำ', (std) => {
    const claimed = PROCESS_TEMPLATES[std].flatMap((t) => t.clauses);
    const ids = STANDARDS[std].clauses.map((c) => c.id);
    // ไม่มีข้อไหนตกหล่น
    expect(ids.filter((id) => !claimed.includes(id))).toEqual([]);
    // ไม่มีข้อไหนถูกอ้างสองที่ (สองกระบวนการรับผิดชอบข้อเดียวกัน = ไม่มีใครรับจริง)
    expect(claimed.filter((c, i) => claimed.indexOf(c) !== i)).toEqual([]);
    // ไม่มีข้อที่มาตรฐานนี้ไม่มี
    expect(claimed.filter((c) => !ids.includes(c))).toEqual([]);
  });

  it.each(ALL_STD)('%s: ผู้รับผิดชอบเป็นตำแหน่ง ไม่ใช่ชื่อคน', (std) => {
    for (const t of PROCESS_TEMPLATES[std]) {
      expect(looksLikePerson(t.owner), `${t.name} → ${t.owner}`).toBe(false);
    }
  });

  it.each(ALL_STD)('%s: กดเริ่มแล้วเหลือแต่ blocker เรื่องตัววัด — ส่วนที่เจ้าของธุรกิจเท่านั้นตอบได้', (std) => {
    const data: ProcessRegisterData = { standard: std, processes: seedProcesses(std, (i) => `p${i}`) };
    const issues = registerIssues(data);
    const blockers = issues.filter((i) => i.level === 'blocker');
    // ต้องไม่มี blocker เรื่อง "ข้อกำหนดไม่มีเจ้าของ" หรือ "ไม่มีผู้รับผิดชอบ" เหลืออยู่
    expect(blockers.every((b) => b.what.includes('ยังไม่มีตัววัด'))).toBe(true);
    expect(blockers).toHaveLength(PROCESS_TEMPLATES[std].length);
  });

  it('โครงตั้งต้นไม่เติมตัววัดและช่อง "มาจากอะไร" ให้ (ตั้งใจ — ไม่ใช่ KPI สำเร็จรูป)', () => {
    for (const std of ALL_STD) {
      const rows = seedProcesses(std, (i) => `p${i}`);
      expect(rows.every((r) => r.metrics.length === 0)).toBe(true);
    }
  });

  it('id ไม่ซ้ำกัน และแก้ทะเบียนแล้วไม่กระทบโครงต้นฉบับ', () => {
    const rows = seedProcesses('iso9001', (i) => `p${i}`);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    rows[0].clauses.push('9.9');
    rows[0].docs.push('เอกสารมั่ว');
    expect(PROCESS_TEMPLATES.iso9001[0].clauses).not.toContain('9.9');
    expect(PROCESS_TEMPLATES.iso9001[0].docs).not.toContain('เอกสารมั่ว');
  });
});

describe('ตัวอย่าง 10 วินาที — ต้องสอนได้จริงในหน้าจอเดียว', () => {
  const demo = demoRegister();

  it('มีตัววัดที่ "ดี" ให้ดูเป็นแบบ — ระบุที่มาชัดเจน', () => {
    const withWhy = demo.processes.flatMap((p) => p.metrics).filter((m) => m.whyFrom?.trim());
    expect(withWhy.length).toBeGreaterThanOrEqual(3);
    // ที่มาต้องเป็นประโยคที่อธิบายได้จริง ไม่ใช่คำเดียวลอย ๆ
    expect(withWhy.every((m) => (m.whyFrom ?? '').length > 20)).toBe(true);
  });

  it('จงใจมีตัววัดที่ตอบไม่ได้ 1 ตัว — ให้ผู้ใช้เห็นระบบทำงานสด ๆ', () => {
    const blockers = registerIssues(demo).filter((i) => i.level === 'blocker');
    const noWhy = blockers.filter((i) => i.what.includes('มาจากความเสี่ยงหรือคุณค่าอะไร'));
    expect(noWhy).toHaveLength(1);
    expect(noWhy[0].what).toContain('ยอดผลิตรวมต่อเดือน'); // ตัววัดปริมาณล้วน = ตัวอย่างคลาสสิกของ KPI ที่ตอบไม่ได้
  });

  it('ทุกกระบวนการมีผู้รับผิดชอบเป็นตำแหน่ง และมีตัววัดอย่างน้อยหนึ่งตัว', () => {
    for (const p of demo.processes) {
      expect(p.owner, p.name).toBeTruthy();
      expect(looksLikePerson(p.owner ?? ''), p.name).toBe(false);
      expect(p.metrics.length, p.name).toBeGreaterThan(0);
      expect(p.docs.length, p.name).toBeGreaterThan(0);
    }
  });

  it('อ้างเฉพาะข้อกำหนดที่มีจริงใน ISO 9001', () => {
    const ids = STANDARDS.iso9001.clauses.map((c) => c.id);
    for (const p of demo.processes) {
      expect(p.clauses.filter((c) => !ids.includes(c)), p.name).toEqual([]);
    }
  });

  it('เรียกซ้ำได้ค่าใหม่ทุกครั้ง — แก้ตัวอย่างแล้วไม่รั่วไปครั้งถัดไป', () => {
    const a = demoRegister();
    a.processes[0].metrics[0].whyFrom = 'แก้ทิ้ง';
    expect(demoRegister().processes[0].metrics[0].whyFrom).not.toBe('แก้ทิ้ง');
  });

  it('ตัวอย่างยังไม่ผ่านเกณฑ์พร้อมตรวจ — ห้ามให้ความรู้สึกว่า "กดปุ่มเดียวก็เสร็จ"', () => {
    expect(registerHealth(demo).ready).toBe(false);
  });
});
