import { describe, it, expect } from 'vitest';
import { STANDARDS, STANDARD_ORDER, guideOf, seedClauses } from '../isoStandards';
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
