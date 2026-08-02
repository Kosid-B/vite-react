import { describe, it, expect } from 'vitest';
import { marketplaceMetrics, DEFAULT_TAKE_RATE } from '../marketplaceMetrics';

describe('marketplaceMetrics — platform health', () => {
  it('pre-launch: ไม่มีร้าน → diagnosis ฝั่งซัพพลาย', () => {
    const m = marketplaceMetrics({ listings: 0, sellers: 0, txns: 0, gmv: 0, demandSignals: 0 });
    expect(m.maturity).toBe('pre-launch');
    expect(m.liquidity).toBe(0);
    expect(m.diagnosis).toContain('ฝั่งซัพพลาย');
  });

  it('take rate ประเมินจาก 3% เมื่อไม่ส่ง takeRevenue', () => {
    const m = marketplaceMetrics({ listings: 10, sellers: 10, txns: 4, gmv: 10000, demandSignals: 5 });
    expect(m.takeRevenue).toBe(Math.round(10000 * DEFAULT_TAKE_RATE));
    expect(m.takeRate).toBeCloseTo(DEFAULT_TAKE_RATE, 5);
  });

  it('liquidity = txns/listings คุมเพดานที่ 1', () => {
    expect(marketplaceMetrics({ listings: 10, sellers: 10, txns: 3, gmv: 100, demandSignals: 2 }).liquidity).toBeCloseTo(0.3, 5);
    // txns > listings (เคสแปลก) → ไม่เกิน 1
    expect(marketplaceMetrics({ listings: 2, sellers: 2, txns: 5, gmv: 100, demandSignals: 1 }).liquidity).toBe(1);
  });

  it('liquidity < 20% → alert warn', () => {
    const m = marketplaceMetrics({ listings: 100, sellers: 100, txns: 5, gmv: 5000, demandSignals: 30 });
    expect(m.liquidity).toBeCloseTo(0.05, 5);
    expect(m.alerts.some(a => a.level === 'warn' && a.msg.includes('Liquidity'))).toBe(true);
  });

  it('ซัพพลายเกิน 5:1 → alert warn ร้านล้น', () => {
    const m = marketplaceMetrics({ listings: 60, sellers: 60, txns: 2, gmv: 2000, demandSignals: 10 });
    expect(m.supplyDemand).toBeCloseTo(6, 5);
    expect(m.alerts.some(a => a.msg.includes('ร้านล้น'))).toBe(true);
  });

  it('liquid: liquidity ≥ 30% + txns ≥ 5 → maturity liquid + diagnosis หมุน', () => {
    const m = marketplaceMetrics({ listings: 10, sellers: 8, txns: 6, gmv: 60000, takeRevenue: 1800, demandSignals: 8 });
    expect(m.maturity).toBe('liquid');
    expect(m.takeRate).toBeCloseTo(0.03, 5);
    expect(m.diagnosis).toContain('หมุน');
    expect(m.alerts.some(a => a.level === 'good')).toBe(true);
  });

  it('มีร้านแต่ไม่มีดีมานด์ → info ดันฝั่งผู้ซื้อ', () => {
    const m = marketplaceMetrics({ listings: 5, sellers: 5, txns: 0, gmv: 0, demandSignals: 0 });
    expect(m.alerts.some(a => a.msg.includes('ดีมานด์') || a.msg.includes('ผู้ซื้อ'))).toBe(true);
  });
});
