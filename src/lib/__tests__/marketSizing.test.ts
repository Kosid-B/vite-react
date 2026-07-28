import { describe, it, expect } from 'vitest';
import { estimateSizing, opportunityScore, cmoResearchPrompt } from '../marketSizing';

describe('marketSizing', () => {
  it('TAM ≥ SAM ≥ SOM + ช่วง ±25% + จำนวนลูกค้า SOM', () => {
    const r = estimateSizing({ annualRevenuePerCustomer: 7080, businessBase: 1_000_000, serviceablePct: 5, capturePctYr1: 1 });
    expect(r.tam).toBe(1_000_000 * 7080);
    expect(r.sam).toBe(50_000 * 7080);          // 5% ของ 1M
    expect(r.customersSom).toBe(500);           // 1% ของ 50,000
    expect(r.som).toBe(500 * 7080);
    expect(r.tam).toBeGreaterThanOrEqual(r.sam);
    expect(r.sam).toBeGreaterThanOrEqual(r.som);
    expect(r.somRange[0]).toBeLessThan(r.som);
    expect(r.somRange[1]).toBeGreaterThan(r.som);
  });

  it('ใช้ default SME ไทย เมื่อไม่ระบุฐาน + มีสมมติฐานเสมอ', () => {
    const r = estimateSizing({ annualRevenuePerCustomer: 5900 });
    expect(r.tam).toBe(3_200_000 * 5900);
    expect(r.assumptions.length).toBeGreaterThanOrEqual(4);
    expect(r.assumptions.join(' ')).toContain('OSMEP');
  });

  it('clamp % นอกช่วง', () => {
    const r = estimateSizing({ annualRevenuePerCustomer: 1000, serviceablePct: 500, capturePctYr1: -5 });
    expect(r.sam).toBe(r.tam);   // 100%
    expect(r.som).toBe(0);       // 0%
  });

  it('opportunityScore: competition/barrier กลับค่า', () => {
    const good = opportunityScore({ size: 5, growth: 5, competition: 1, barrier: 1, differentiation: 5 });
    expect(good.score).toBe(5);
    expect(good.label).toContain('🟢');
    const bad = opportunityScore({ size: 2, growth: 2, competition: 5, barrier: 5, differentiation: 2 });
    expect(bad.score).toBeLessThan(3);
    expect(bad.label).toContain('🔴');
  });

  it('cmoResearchPrompt มี TAM/SAM/SOM + บริบทธุรกิจ', () => {
    const p = cmoResearchPrompt({ industry: 'ร้านกาแฟ', goal: 'ขยายสาขา', arpu: 7080 });
    expect(p).toContain('TAM/SAM/SOM');
    expect(p).toContain('ร้านกาแฟ');
    expect(p).toContain('CMO');
  });
});
