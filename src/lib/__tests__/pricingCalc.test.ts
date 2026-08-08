import { describe, it, expect } from 'vitest';
import { suggestPrice } from '../pricingCalc';

describe('pricingCalc', () => {
  it('คำนวณราคาจากต้นทุน+กำไร% (gross margin)', () => {
    const r = suggestPrice({ cost: 60, marginPct: 40 });
    expect(r.ok).toBe(true);
    expect(r.price).toBe(100);          // 60 / (1 - .40)
    expect(r.profitPerUnit).toBe(40);
    expect(r.markupPct).toBe(67);       // 40/60
    expect(r.note).toContain('ตลาด');
  });

  it('กำไร/เดือน จากยอดขายที่ใส่', () => {
    const r = suggestPrice({ cost: 60, marginPct: 40, unitsPerMonth: 100 });
    expect(r.monthlyProfit).toBe(4000); // 40 × 100
  });

  it('input ไม่ถูกต้อง (cost<=0 / margin<=0 / margin>=95) → ok=false', () => {
    expect(suggestPrice({ cost: 0, marginPct: 40 }).ok).toBe(false);
    expect(suggestPrice({ cost: 60, marginPct: 0 }).ok).toBe(false);
    expect(suggestPrice({ cost: 60, marginPct: 95 }).ok).toBe(false);
  });
});
