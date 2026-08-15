import { describe, it, expect } from 'vitest';
import {
  registerIssues, registerHealth, registerCsv, registerJson,
  emptyRegister, looksLikePerson,
  type ProcessRegisterData, type ProcessRow,
} from '../processRegister';
import { STANDARDS } from '../isoStandards';

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
    for (const s of ['ผู้จัดการฝ่ายผลิต', 'หัวหน้าแผนก QA', 'จป.วิชาชีพ', 'QMR', 'Production Manager']) {
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
