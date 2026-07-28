import { describe, it, expect } from 'vitest';
import { competitorArchetypes, findGap, competitorPrompt, tierLabel } from '../competitorAnalysis';

describe('competitorAnalysis', () => {
  it('archetypes 3 ระดับราคา + มีจุดแข็ง/อ่อนครบ', () => {
    const a = competitorArchetypes('[G] การค้าปลีก');
    expect(a).toHaveLength(3);
    expect(a.map(x => x.tier)).toEqual(['budget', 'mid', 'premium']);
    for (const c of a) {
      expect(c.strengths.length).toBeGreaterThan(0);
      expect(c.weaknesses.length).toBeGreaterThan(0);
    }
    expect(a[0].name).toContain('การค้าปลีก');   // ตัด prefix [G]
  });

  it('tierLabel แปลไทย', () => {
    expect(tierLabel('premium')).toBe('พรีเมียม');
    expect(tierLabel('budget')).toBe('ประหยัด');
  });

  it('findGap: ต่างกันตาม targetTier + ใส่จุดต่างในเหตุผล', () => {
    const g = findGap({ differentiator: 'เข้าใจ SME ไทย', targetTier: 'premium' });
    expect(g.gap).toContain('พรีเมียม');
    expect(g.why).toContain('เข้าใจ SME ไทย');
    expect(g.moveHint.length).toBeGreaterThan(0);
    expect(findGap({ targetTier: 'budget' }).gap).toContain('ประหยัด');
    expect(findGap({}).gap.length).toBeGreaterThan(0);   // default mid ไม่พัง
  });

  it('competitorPrompt มีตารางคู่แข่ง + ช่องว่าง + บริบท', () => {
    const p = competitorPrompt({ industry: 'ร้านกาแฟ', value: 'กาแฟพิเศษ' });
    expect(p).toContain('คู่แข่ง');
    expect(p).toContain('ช่องว่าง');
    expect(p).toContain('ร้านกาแฟ');
  });
});
