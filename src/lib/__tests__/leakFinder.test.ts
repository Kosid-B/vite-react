import { describe, it, expect } from 'vitest';
import { annualizeLeaks, leakEquivalents, LEAK_PRESETS, DAYS_PER_YEAR } from '../leakFinder';

describe('annualizeLeaks', () => {
  it('รวมต่อวัน → × 365 ต่อปี + ต่อเดือน', () => {
    const r = annualizeLeaks([
      { label: 'ราคาต่ำไป', perDay: 250 },
      { label: 'ของเหลือ', perDay: 30 },
      { label: 'แถมเกิน', perDay: 40 },
    ]);
    expect(r.totalPerDay).toBe(320);
    expect(r.totalPerYear).toBe(320 * DAYS_PER_YEAR); // 116,800
    expect(r.totalPerMonth).toBe(Math.round(320 * DAYS_PER_YEAR / 12));
    expect(r.items).toHaveLength(3);
    expect(r.items[0].perYear).toBe(250 * 365);
  });

  it('กรองรายการ ≤ 0 หรือไม่ใช่ตัวเลข', () => {
    const r = annualizeLeaks([
      { label: 'a', perDay: 100 },
      { label: 'b', perDay: 0 },
      { label: 'c', perDay: -5 },
      { label: 'd', perDay: NaN },
    ]);
    expect(r.items).toHaveLength(1);
    expect(r.totalPerDay).toBe(100);
  });

  it('ไม่มีรายการ → 0 ทั้งหมด + ไม่มี equivalents', () => {
    const r = annualizeLeaks([]);
    expect(r.totalPerYear).toBe(0);
    expect(r.equivalents).toEqual([]);
  });

  it('ส่ง rentPerMonth → เทียบเท่าค่าเช่า', () => {
    const r = annualizeLeaks([{ label: 'x', perDay: 320 }], { rentPerMonth: 12000 });
    expect(r.equivalents.some((e) => e.includes('ค่าเช่า'))).toBe(true);
  });
});

describe('leakEquivalents', () => {
  it('perYear ≤ 0 → ว่าง', () => {
    expect(leakEquivalents(0)).toEqual([]);
    expect(leakEquivalents(-100)).toEqual([]);
  });

  it('ยอดสูงพอ → มีทริป/มือถือ', () => {
    const eq = leakEquivalents(116800);
    expect(eq.some((e) => e.includes('ทริป'))).toBe(true);
    expect(eq.some((e) => e.includes('มือถือ'))).toBe(true);
  });
});

describe('LEAK_PRESETS', () => {
  it('มี preset ครบ + field ถูกต้อง', () => {
    expect(LEAK_PRESETS.length).toBeGreaterThanOrEqual(4);
    LEAK_PRESETS.forEach((p) => {
      expect(p.id.length).toBeGreaterThan(0);
      expect(p.label.length).toBeGreaterThan(0);
    });
  });
});
