import { describe, it, expect } from 'vitest';
import {
  documentRegister, registerStats, docTypeOf, draftPrompt,
  DOC_SKELETON, DOC_TYPE_LABEL, leanSet, leanCoverage, AUDIT_THREAD,
  CONTEXT_LAYERS, ownerDocOf, docsToBuild, type DocType,
} from '../isoDocuments';
import { STANDARD_ORDER, STANDARDS } from '../isoStandards';

describe('docTypeOf — เดาประเภทเอกสารจากชื่อ', () => {
  const cases: [string, DocType][] = [
    ['นโยบายสิ่งแวดล้อม', 'policy'],
    ['เอกสารขอบเขต EMS', 'manual'],
    ['ระเบียบควบคุมเอกสาร', 'procedure'],
    ['ขั้นตอนปฏิบัติงาน', 'procedure'],
    ['แผนฉุกเฉิน', 'plan'],
    ['ทะเบียนประเด็นสิ่งแวดล้อม', 'register'],
    ['ตารางวัตถุประสงค์สิ่งแวดล้อม', 'register'],
    ['Master List', 'register'],
    ['บันทึกการแก้ไข (CAR)', 'record'],
    ['รายงานประชุมทบทวนฝ่ายบริหาร', 'record'],
  ];
  for (const [name, want] of cases) {
    it(`"${name}" → ${want}`, () => expect(docTypeOf(name)).toBe(want));
  }
});

describe('documentRegister', () => {
  it('ทุกมาตรฐานสร้างทะเบียนได้ และไม่มีชื่อซ้ำ', () => {
    for (const std of STANDARD_ORDER) {
      const docs = documentRegister(std);
      expect(docs.length).toBeGreaterThan(5);
      const names = docs.map((d) => d.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('แตกชื่อเอกสารที่เขียนรวมกันด้วย + ออกเป็นคนละฉบับ', () => {
    // 9.2 เขียนว่า 'แผนตรวจติดตามภายใน + รายงานตรวจติดตามภายใน' = 2 ฉบับ ไม่ใช่ฉบับเดียว
    const docs = documentRegister('iso14001');
    expect(docs.some((d) => d.name === 'แผนตรวจติดตามภายใน')).toBe(true);
    expect(docs.some((d) => d.name === 'รายงานตรวจติดตามภายใน')).toBe(true);
    // และห้ามมีชื่อกำพร้าที่เป็นคำกว้างลอย ๆ จากการแตกผิด
    for (const d of docs) expect(d.name.length).toBeGreaterThan(3);
  });

  it('ไม่มีชื่อเอกสารที่เป็นคำกว้างลอย ๆ ในทุกมาตรฐาน', () => {
    // 'แผน' / 'บันทึก' / 'รายงาน' เดี่ยว ๆ = ผลจากการแตกสตริงผิด ใช้งานจริงไม่ได้
    const bare = new Set(['แผน', 'บันทึก', 'รายงาน', 'ทะเบียน', 'ตาราง', 'ฟอร์ม', 'เอกสาร']);
    for (const std of STANDARD_ORDER) {
      for (const d of documentRegister(std)) expect(bare.has(d.name)).toBe(false);
    }
  });

  it('เรียงเอกสารบังคับขึ้นก่อนเสมอ', () => {
    for (const std of STANDARD_ORDER) {
      const docs = documentRegister(std);
      const lastMandatory = docs.map((d) => d.mandatory).lastIndexOf(true);
      const firstOptional = docs.map((d) => d.mandatory).indexOf(false);
      if (lastMandatory >= 0 && firstOptional >= 0) expect(lastMandatory).toBeLessThan(firstOptional);
    }
  });

  it('clause ที่อ้างต้องมีอยู่จริงในมาตรฐานนั้น', () => {
    for (const std of STANDARD_ORDER) {
      const ids = new Set(STANDARDS[std].clauses.map((c) => c.id));
      for (const d of documentRegister(std)) {
        for (const cid of d.clauses) expect(ids.has(cid)).toBe(true);
      }
    }
  });

  it('14001:2026 ต้องมีเอกสารรองรับข้อ 6.3 (ข้อกำหนดใหม่)', () => {
    const docs = documentRegister('iso14001');
    expect(docs.some((d) => d.clauses.includes('6.3'))).toBe(true);
  });
});

describe('registerStats', () => {
  it('นับรวมถูกต้องและ byType ครบทุกประเภท', () => {
    const docs = documentRegister('iso9001');
    const s = registerStats(docs);
    expect(s.total).toBe(docs.length);
    expect(s.mandatory).toBe(docs.filter((d) => d.mandatory).length);
    expect(Object.keys(s.byType).sort()).toEqual(Object.keys(DOC_TYPE_LABEL).sort());
    expect(Object.values(s.byType).reduce((a, b) => a + b, 0)).toBe(docs.length);
  });
});

describe('draftPrompt — ข้อบังคับกันแต่งข้อมูลต้องอยู่ครบ', () => {
  const doc = documentRegister('iso14001').find((d) => d.clauses.includes('6.3'))!;

  it('ใส่มาตรฐาน ชื่อเอกสาร และข้อกำหนดที่ต้องตอบ', () => {
    const p = draftPrompt('iso14001', doc);
    expect(p).toContain('ISO 14001:2026');
    expect(p).toContain(doc.name);
    expect(p).toContain('6.3');
  });

  it('ใส่โครงเอกสารครบทุกหัวข้อของประเภทนั้น', () => {
    const p = draftPrompt('iso14001', doc);
    for (const line of DOC_SKELETON[doc.type]) expect(p).toContain(line);
  });

  it('มีข้อห้ามแต่งตัวเลข/ชื่อ และห้ามอ้างข้อกำหนดอื่น', () => {
    const p = draftPrompt('iso14001', doc);
    expect(p).toContain('ห้ามแต่งตัวเลข');
    expect(p).toContain('ห้ามอ้างอิงข้อกำหนดอื่น');
    expect(p).toContain('[ระบุ');
  });

  it('บริบทลูกค้าถูกใส่ลง prompt · เอกสารที่มีอยู่แล้วสั่งห้ามร่างซ้ำ', () => {
    const p = draftPrompt('iso14001', doc, {
      company: 'บริษัททดสอบ', industry: 'ผลิตชิ้นส่วนยานยนต์', employees: 45,
      existingDocs: ['นโยบายสิ่งแวดล้อม'], constraints: 'ไม่มีฝ่าย QA แยก',
    });
    expect(p).toContain('บริษัททดสอบ');
    expect(p).toContain('ผลิตชิ้นส่วนยานยนต์');
    expect(p).toContain('45');
    expect(p).toContain('ห้ามร่างซ้ำ');
    expect(p).toContain('ไม่มีฝ่าย QA แยก');
  });

  it('ไม่มีบริบท ต้องสั่งให้เว้นวงเล็บเหลี่ยม ไม่ใช่ให้เดา', () => {
    const p = draftPrompt('iso9001', documentRegister('iso9001')[0]);
    expect(p).toContain('ยังไม่ระบุ');
    expect(p).toContain('เว้นวงเล็บเหลี่ยม');
  });
});

describe('ชุดเอกสารกระชับ (Lean Set) — จุดต่างที่ต้องพิสูจน์ได้', () => {
  const withLean = STANDARD_ORDER.filter((s) => leanSet(s));

  it('มาตรฐานที่ทำชุดกระชับแล้ว ต้องครอบคลุมข้อกำหนดครบทุกข้อ', () => {
    expect(withLean.length).toBeGreaterThan(0);
    for (const std of withLean) {
      const cov = leanCoverage(std)!;
      // ข้อนี้คือหัวใจ — ถ้าจัดกลุ่มแล้วมีข้อหลุด ชุดนี้ใช้ขายไม่ได้
      expect(cov.missing, `${std}: ข้อที่ไม่มีเอกสารรับผิดชอบ`).toEqual([]);
      expect(cov.covered).toBe(cov.totalClauses);
    }
  });

  it('ไม่มีข้อกำหนดที่ถูกอ้างซ้ำหลายฉบับ — ความรับผิดชอบต้องชัด', () => {
    for (const std of withLean) {
      expect(leanCoverage(std)!.duplicated, `${std}: ข้อที่ซ้ำ`).toEqual([]);
    }
  });

  it('clause ที่ชุดกระชับอ้าง ต้องมีอยู่จริงในมาตรฐาน', () => {
    for (const std of withLean) {
      const ids = new Set(STANDARDS[std].clauses.map((c) => c.id));
      for (const d of leanSet(std)!) {
        for (const cid of d.clauses) expect(ids.has(cid), `${std}: อ้างข้อ ${cid} ที่ไม่มีอยู่`).toBe(true);
      }
    }
  });

  it('ต้องน้อยกว่าการทำแยกทีละข้ออย่างมีนัย (≥50%)', () => {
    for (const std of withLean) {
      const cov = leanCoverage(std)!;
      expect(cov.leanCount).toBeLessThan(cov.naiveCount);
      expect(cov.reductionPct, `${std} ลดได้แค่ ${cov.reductionPct}%`).toBeGreaterThanOrEqual(50);
    }
  });

  it('ทุกฉบับต้องมีเหตุผลการจัดกลุ่ม — ใช้อธิบายผู้ตรวจได้', () => {
    for (const std of withLean) {
      for (const d of leanSet(std)!) {
        expect(d.why.length, `${std}/${d.name} ไม่มีเหตุผล`).toBeGreaterThan(20);
        expect(d.clauses.length).toBeGreaterThan(0);
      }
    }
  });

  it('ชื่อเอกสารในชุดกระชับต้องไม่ซ้ำกัน', () => {
    for (const std of withLean) {
      const names = leanSet(std)!.map((d) => d.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('มาตรฐานที่ยังไม่ได้ทำชุดกระชับ ต้องคืน undefined ไม่ใช่ค่าว่าง', () => {
    for (const std of STANDARD_ORDER) {
      const s = leanSet(std);
      if (s === undefined) expect(leanCoverage(std)).toBeUndefined();
      else expect(s.length).toBeGreaterThan(0);
    }
  });
});

describe('AUDIT_THREAD — สายโซ่ที่ผู้ตรวจไล่จริง ต้องไม่ขาด', () => {
  it('ทุกมาตรฐานที่มีชุดกระชับ ต้องมีเอกสารที่ร้อยสายโซ่ครบทั้งเส้น', () => {
    const threadClauses = AUDIT_THREAD.flatMap((s) => s.clauses);
    for (const std of STANDARD_ORDER.filter((s) => leanSet(s))) {
      const docs = leanSet(std)!;
      // หาเอกสารที่ถือข้อกลางของเส้น (6.1) — ฉบับนั้นต้องครอบคลุมเส้นทั้งหมด
      const owner = docs.find((d) => d.clauses.includes('6.1'));
      expect(owner, `${std}: ไม่มีเอกสารที่ถือข้อ 6.1`).toBeTruthy();
      const reach = new Set([...owner!.clauses, ...(owner!.tracesFrom ?? [])]);
      for (const c of threadClauses) {
        expect(reach.has(c), `${std}: สายโซ่ขาดที่ข้อ ${c} — เอกสาร "${owner!.name}" ไม่ได้ถือหรืออ้างถึง`).toBe(true);
      }
    }
  });

  it('ข้อต้นทางของเส้น (4.1/4.2) ต้องมีเจ้าของจริงในชุด ไม่ใช่แค่ถูกอ้าง', () => {
    for (const std of STANDARD_ORDER.filter((s) => leanSet(s))) {
      const docs = leanSet(std)!;
      for (const c of ['4.1', '4.2']) {
        expect(docs.some((d) => d.clauses.includes(c)), `${std}: ข้อ ${c} ไม่มีเจ้าของ`).toBe(true);
      }
    }
  });

  it('tracesFrom ต้องไม่ทับกับ clauses ของฉบับเดียวกัน — อ้างถึง ≠ เป็นเจ้าของ', () => {
    for (const std of STANDARD_ORDER.filter((s) => leanSet(s))) {
      for (const d of leanSet(std)!) {
        for (const t of d.tracesFrom ?? []) {
          expect(d.clauses.includes(t), `${std}/${d.name}: ${t} อยู่ทั้งสองที่`).toBe(false);
        }
      }
    }
  });

  it('ทุกขั้นของสายโซ่มีคำอธิบาย และเรียงจากบริบทไปหาการปรับปรุง', () => {
    expect(AUDIT_THREAD.length).toBeGreaterThanOrEqual(5);
    for (const s of AUDIT_THREAD) {
      expect(s.step.length).toBeGreaterThan(10);
      expect(s.clauses.length).toBeGreaterThan(0);
    }
    expect(AUDIT_THREAD[0].clauses).toContain('4.1');
    expect(AUDIT_THREAD[AUDIT_THREAD.length - 1].clauses).toContain('10.2');
  });
});

describe('ต่อเข้าแบบตรวจสุขภาพ — เปลี่ยนคะแนนเป็นแผนทำเอกสาร', () => {
  it('ทุกข้อกำหนดต้องรู้ว่าไปอยู่เอกสารฉบับไหน', () => {
    for (const std of STANDARD_ORDER.filter((s) => leanSet(s))) {
      for (const c of STANDARDS[std].clauses) {
        expect(ownerDocOf(std, c.id), `${std}: ข้อ ${c.id} ไม่รู้ว่าอยู่เอกสารไหน`).toBeTruthy();
      }
    }
  });

  it('docsToBuild เรียงเอกสารที่ปลดล็อกได้หลายข้อขึ้นก่อน', () => {
    const weak = ['4.1', '4.2', '4.3', '5.2'];
    const plan = docsToBuild('iso14001', weak);
    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0].fixes.length).toBeGreaterThanOrEqual(plan[plan.length - 1].fixes.length);
    // บริบทองค์กรถือ 4.1-4.3 จึงต้องมาก่อนนโยบายที่ถือข้อเดียว
    expect(plan[0].doc.name).toBe('บริบทองค์กร');
    expect(plan[0].fixes).toEqual(['4.1', '4.2', '4.3']);
  });

  it('ไม่มีข้อที่ขาด → ไม่มีเอกสารต้องทำ', () => {
    expect(docsToBuild('iso9001', [])).toEqual([]);
  });

  it('มาตรฐานที่ยังไม่มีชุดกระชับ คืนรายการว่าง ไม่ throw', () => {
    expect(docsToBuild('iso45001', ['4.1'])).toEqual([]);
    expect(ownerDocOf('iso45001', '4.1')).toBeUndefined();
  });

  it('CONTEXT_LAYERS มีครบ 5 ชั้นและเรียงจาก BMC ไปหาข้อกำหนด ISO', () => {
    expect(CONTEXT_LAYERS).toHaveLength(5);
    expect(CONTEXT_LAYERS[0].layer).toContain('BMC');
    expect(CONTEXT_LAYERS[CONTEXT_LAYERS.length - 1].layer).toContain('ISO');
    for (const l of CONTEXT_LAYERS) {
      expect(l.what.length).toBeGreaterThan(10);
      expect(l.answers.length).toBeGreaterThan(10);
    }
  });
});
