import { describe, it, expect } from 'vitest';
import {
  documentRegister, registerStats, docTypeOf, draftPrompt,
  DOC_SKELETON, DOC_TYPE_LABEL, type DocType,
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
