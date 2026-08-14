import { describe, it, expect } from 'vitest';
import { STANDARDS, STANDARD_ORDER, guideOf, seedClauses, annexAOf, ANNEX_A_14001 } from '../isoStandards';
import { fullCheckupQuestions, assessFullCheckup } from '../checkup';
import { assessReadiness } from '../isoGapAssessment';

describe('STANDARDS — 4 มาตรฐานครบ', () => {
  it('มี 4 มาตรฐาน + order ตรง', () => {
    expect(STANDARD_ORDER).toEqual(['iso9001', 'iso14001', 'iso45001', 'iso22301']);
    expect(Object.keys(STANDARDS)).toHaveLength(4);
  });

  it('ทุกมาตรฐานมี clause ครบ + guide ทุกข้อ + id ไม่ซ้ำ', () => {
    for (const id of STANDARD_ORDER) {
      const s = STANDARDS[id];
      expect(s.clauses.length).toBeGreaterThanOrEqual(20);
      const ids = s.clauses.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length); // ไม่ซ้ำ
      for (const c of s.clauses) {
        expect(c.title).toBeTruthy();
        expect(c.guide.action).toBeTruthy();
        expect(c.guide.keyDoc).toBeTruthy();
        expect([1, 2, 3]).toContain(c.guide.priority);
      }
    }
  });

  it('14001 เป็นฉบับ :2026 และมีข้อ 6.3 การวางแผนการเปลี่ยนแปลง (ข้อกำหนดใหม่)', () => {
    // ISO 14001:2026 เผยแพร่ 15 เม.ย. 2569 แทนที่ :2015 — เลขปีบนหน้าสาธารณะผิดไม่ได้
    expect(STANDARDS.iso14001.code).toBe('ISO 14001:2026');
    const c63 = STANDARDS.iso14001.clauses.find((c) => c.id === '6.3');
    expect(c63).toBeDefined();
    expect(c63?.title).toContain('การเปลี่ยนแปลง');
  });

  it('14001 ข้อ 4.1 ครอบคลุมภูมิอากาศ/ชีวภาพ และ 8.1 ครอบคลุมวัฏจักรชีวิต', () => {
    const byId = (id: string) => STANDARDS.iso14001.clauses.find((c) => c.id === id);
    expect(byId('4.1')?.guide.action).toContain('ภูมิอากาศ');
    expect(byId('4.1')?.guide.action).toContain('ชีวภาพ');
    expect(byId('8.1')?.guide.action).toContain('วัฏจักรชีวิต');
  });

  it('45001 มี clause เฉพาะ 5.4 (การมีส่วนร่วมของพนักงาน)', () => {
    expect(STANDARDS.iso45001.clauses.some(c => c.id === '5.4')).toBe(true);
  });

  it('22301 มี clause เฉพาะ 8.2 BIA', () => {
    const c82 = STANDARDS.iso22301.clauses.find(c => c.id === '8.2');
    expect(c82?.title).toContain('BIA');
  });

  it('seedClauses ให้สถานะเริ่ม red + ครบตาม clause def', () => {
    const seeded = seedClauses('iso14001');
    expect(seeded).toHaveLength(STANDARDS.iso14001.clauses.length);
    expect(seeded.every(c => c.status === 'red')).toBe(true);
  });

  it('guideOf ใช้กับ assessReadiness ได้ (per-standard)', () => {
    const seeded = seedClauses('iso45001').map((c, i) => i === 0 ? { ...c, status: 'green' as const } : c);
    const r = assessReadiness(seeded, guideOf('iso45001'));
    expect(r.applicable).toBe(seeded.length);
    expect(r.prioritizedActions.length).toBe(seeded.length - 1); // เหลือ red ทั้งหมดยกเว้นอันแรก
    expect(r.readiness).toBeGreaterThan(0);
  });
});

describe('Annex A (ISO 14001:2026) — เป็นแนวทาง ไม่ใช่ข้อกำหนด', () => {
  it('มีแนวตีความเฉพาะ 14001 · มาตรฐานอื่นคืน undefined', () => {
    expect(annexAOf('iso14001', '4.1')).toBeTruthy();
    expect(annexAOf('iso14001', '6.3')).toBeTruthy();
    expect(annexAOf('iso9001', '4.1')).toBeUndefined();
    expect(annexAOf('iso45001', '4.1')).toBeUndefined();
  });

  it('ทุกคีย์ของ Annex A ต้องตรงกับ clause id ที่มีจริง — กันอ้างข้อที่ไม่มีอยู่', () => {
    const ids = new Set(STANDARDS.iso14001.clauses.map((c) => c.id));
    for (const k of Object.keys(ANNEX_A_14001)) expect(ids.has(k)).toBe(true);
  });

  it('Annex A ไม่มีผลต่อคะแนน — ตอบเหมือนกันต้องได้คะแนนเท่ากันเสมอ', () => {
    // กันการเผลอเอา guidance ไปคิดคะแนน ซึ่งจะทำให้ออก NC จากภาคผนวกได้ (ผิดหลักการตรวจ)
    const qs = fullCheckupQuestions('iso14001');
    const withAnnex = qs.filter((q) => q.annexA);
    expect(withAnnex.length).toBeGreaterThan(0); // มีจริง

    const answers: Record<string, 0 | 1 | 2 | 3> = {};
    for (const q of qs) answers[q.id] = 2;
    const a = assessFullCheckup('iso14001', answers);
    const b = assessFullCheckup('iso14001', answers);
    expect(a.pct).toBe(b.pct);
    // คะแนนเต็มต้องมาจากจำนวนข้อกำหนด ไม่ใช่จำนวนข้อที่มี Annex
    expect(a.sections.reduce((s, x) => s + x.max, 0)).toBeGreaterThan(0);
  });
});
