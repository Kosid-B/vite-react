import { describe, it, expect } from 'vitest';
import { resiliencePlan, RESILIENCE_PRESETS, RUNWAY_SAFE_MONTHS } from '../resiliencePlan';

const base = { recurringRevenue: 10000, recurringExpense: 6000, cashReserve: 30000 };

describe('resiliencePlan — Superorganism resilience stress test', () => {
  it('resilient: รายได้ตกแต่ยังไม่ขาดทุน → runway = Infinity', () => {
    const p = resiliencePlan({ ...base, scenario: { revenueDropPct: 30, expenseSpikePct: 0 } });
    // 10000*0.7=7000 - 6000 = 1000 net > 0
    expect(p.stressedNet).toBe(1000);
    expect(p.runwayMonths).toBe(Infinity);
    expect(p.severity).toBe('resilient');
    expect(p.breakEvenGap).toBe(0);
  });

  it('burning: ขาดทุนประจำ → runway = สำรอง/burn + breakEvenGap = burn', () => {
    const p = resiliencePlan({ ...base, scenario: { revenueDropPct: 50, expenseSpikePct: 20 } });
    // rev 5000, exp 7200, net -2200
    expect(p.stressedRevenue).toBe(5000);
    expect(p.stressedExpense).toBe(7200);
    expect(p.stressedNet).toBe(-2200);
    expect(p.breakEvenGap).toBe(2200);
    expect(p.runwayMonths).toBeCloseTo(30000 / 2200, 3);
  });

  it('severity: watch เมื่อ runway 3–6 เดือน · critical เมื่อ < 3', () => {
    // burn 2200, cash ทำให้ runway ~4 เดือน → watch
    const watch = resiliencePlan({ recurringRevenue: 10000, recurringExpense: 6000, cashReserve: 8800, scenario: { revenueDropPct: 50, expenseSpikePct: 20 } });
    expect(watch.runwayMonths).toBeCloseTo(4, 3);
    expect(watch.severity).toBe('watch');
    // cash น้อย → critical
    const crit = resiliencePlan({ recurringRevenue: 10000, recurringExpense: 6000, cashReserve: 2200, scenario: { revenueDropPct: 50, expenseSpikePct: 20 } });
    expect(crit.runwayMonths).toBeCloseTo(1, 3);
    expect(crit.severity).toBe('critical');
  });

  it('safe: runway ≥ 6 เดือน แม้ขาดทุนเล็กน้อย', () => {
    const p = resiliencePlan({ recurringRevenue: 10000, recurringExpense: 6000, cashReserve: 60000, scenario: { revenueDropPct: 55, expenseSpikePct: 0 } });
    // rev 4500 - 6000 = -1500 burn · runway 60000/1500 = 40 เดือน
    expect(p.severity).toBe('safe');
    expect(p.runwayMonths).toBeGreaterThanOrEqual(RUNWAY_SAFE_MONTHS);
    expect(p.mitigations.some(x => x.includes('อุดช่องว่าง'))).toBe(true);
  });

  it('clamp % ไม่หลุดขอบ (rev drop > 100 = รายได้ 0 ไม่ติดลบ)', () => {
    const p = resiliencePlan({ ...base, scenario: { revenueDropPct: 150, expenseSpikePct: 0 } });
    expect(p.stressedRevenue).toBe(0);
  });

  it('มี preset stress test มาตรฐาน', () => {
    expect(RESILIENCE_PRESETS.length).toBeGreaterThanOrEqual(3);
    expect(RESILIENCE_PRESETS.map(p => p.id)).toContain('recession');
  });
});
