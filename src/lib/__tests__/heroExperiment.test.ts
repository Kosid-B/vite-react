import { describe, it, expect } from 'vitest';
import { heroAbVariant, HERO_AB_COPY } from '../heroExperiment';

describe('heroAbVariant', () => {
  it('คืน A หรือ B เท่านั้น', () => {
    for (const id of ['x', 'y', 'z', 'uid-123', '']) {
      expect(['A', 'B']).toContain(heroAbVariant(id));
    }
  });

  it('deterministic — id เดิมได้กลุ่มเดิมเสมอ', () => {
    const id = 'uid-stable-42';
    expect(heroAbVariant(id)).toBe(heroAbVariant(id));
  });

  it('กระจายเป็น 2 กลุ่มจริง (ไม่เทไปข้างเดียวทั้งหมด)', () => {
    let a = 0, b = 0;
    for (let i = 0; i < 200; i++) { if (heroAbVariant('user-' + i) === 'A') a++; else b++; }
    expect(a).toBeGreaterThan(50);
    expect(b).toBeGreaterThan(50);
  });

  it('copy ทั้ง 2 variant มี field ครบ ไม่ว่าง', () => {
    (['A', 'B'] as const).forEach(v => {
      expect(HERO_AB_COPY[v].h1a.length).toBeGreaterThan(0);
      expect(HERO_AB_COPY[v].h1bLines.length).toBeGreaterThan(0);
      expect(HERO_AB_COPY[v].subLead.length).toBeGreaterThan(0);
    });
  });
});
