import { describe, it, expect } from 'vitest';
import { roiCompare } from '../roiCompare';
import { termLabel, TERM_TH } from '../terms';

describe('roiCompare', () => {
  it('คุ้ม: extra > ค่าระบบ → worth + verdict บอกคืนทุนกี่ออร์เดอร์', () => {
    // extra = 200 ออร์เดอร์ × ฿60 = 12,000 > growth 1,490
    const r = roiCompare({ walkinPerDay: 20, avgTicket: 60, extraOrdersPerMonth: 200 });
    expect(r.planCost).toBe(1490);
    expect(r.extraMonthly).toBe(12000);
    expect(r.worth).toBe(true);
    expect(r.breakEvenOrders).toBe(Math.ceil(1490 / 60)); // 25
    expect(r.timesOverCost).toBeGreaterThan(1);
    expect(r.verdict).toContain('คืนทุน');
  });

  it('ไม่คุ้ม: extra < ค่าระบบ → worth=false + บอกต้องได้เพิ่มเท่าไหร่', () => {
    const r = roiCompare({ walkinPerDay: 10, avgTicket: 50, extraOrdersPerMonth: 10 }); // extra=500 < 1490
    expect(r.worth).toBe(false);
    expect(r.verdict).toContain('ยังไม่คุ้ม');
  });

  it('รองรับเลือกแพ็ก (starter ถูกกว่า)', () => {
    const r = roiCompare({ walkinPerDay: 10, avgTicket: 50, extraOrdersPerMonth: 20, plan: 'starter' });
    expect(r.planCost).toBe(790);
  });

  it('input ว่าง → verdict ชวนกรอก', () => {
    const r = roiCompare({ walkinPerDay: 0, avgTicket: 0, extraOrdersPerMonth: 0 });
    expect(r.currentMonthly).toBe(0);
    expect(r.verdict).toContain('กรอก');
  });
});

describe('terms (คำไทยคู่ EN)', () => {
  it('termLabel = "คำไทย (EN)"', () => {
    expect(termLabel('roi')).toBe('ความคุ้มค่า (ROI)');
    expect(termLabel('b2b')).toContain('B2B');
    expect(termLabel('b2c')).toContain('B2C');
  });
  it('ทุกคำมี hint อธิบาย', () => {
    (['roi', 'b2b', 'b2c'] as const).forEach(k => expect(TERM_TH[k].hint.length).toBeGreaterThan(0));
  });
});
