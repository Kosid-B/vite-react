import { describe, it, expect } from 'vitest';
import { callCostThb, costReport, estimateVolume, MODEL_PRICE, USD_THB, CALL_PROFILE } from '../aiCost';

describe('aiCost', () => {
  it('callCostThb คำนวณตามราคาป้าย + อัตราแลกเปลี่ยน', () => {
    // sonnet: in $3/1M, out $15/1M · 1000 in + 1000 out = (3000+15000)/1e6 usd * 36
    const expected = ((1000 * 3) + (1000 * 15)) / 1_000_000 * USD_THB;
    expect(callCostThb('claude-sonnet-4-6', 1000, 1000)).toBeCloseTo(expected, 6);
  });

  it('Haiku ถูกกว่า Sonnet เสมอ (ต่อ call เดียวกัน)', () => {
    const s = callCostThb('claude-sonnet-4-6', 700, 400);
    const h = callCostThb('claude-haiku-4-5', 700, 400);
    expect(h).toBeLessThan(s);
  });

  it('Typhoon (open-source) ถูกที่สุดในตาราง', () => {
    const t = callCostThb('typhoon', 1400, 1100);
    const s = callCostThb('claude-sonnet-4-6', 1400, 1100);
    const o = callCostThb('claude-opus-4-8', 1400, 1100);
    expect(t).toBeLessThan(s);
    expect(t).toBeLessThan(o);
  });

  it('ชื่อโมเดลไม่รู้จัก → fallback sonnet (ไม่พัง)', () => {
    expect(callCostThb('unknown-model-x', 1000, 1000))
      .toBeCloseTo(callCostThb('claude-sonnet-4-6', 1000, 1000), 6);
  });

  it('จับ typhoon/haiku/opus จาก substring ของชื่อโมเดล', () => {
    expect(callCostThb('accounts/fireworks/models/typhoon-2', 100, 100))
      .toBeCloseTo(callCostThb('typhoon', 100, 100), 6);
    expect(callCostThb('claude-haiku-4-5-20251001', 100, 100))
      .toBeCloseTo(callCostThb('claude-haiku-4-5', 100, 100), 6);
  });

  it('costReport: tiering ประหยัด และ aggressive ประหยัดมากกว่า', () => {
    const r = costReport({ assists: 100, plans: 20, agentRuns: 100 });
    expect(r.current.totalThb).toBeGreaterThan(0);
    expect(r.tieredSavingThb).toBeGreaterThan(0);
    expect(r.tiered.totalThb).toBeLessThan(r.current.totalThb);
    // aggressive ย้าย agent → typhoon ด้วย → ประหยัดมากกว่า tiered
    expect(r.aggressiveSavingThb).toBeGreaterThan(r.tieredSavingThb);
    expect(r.aggressiveSavingPct).toBeGreaterThan(r.tieredSavingPct);
  });

  it('costReport: volume ศูนย์ = ต้นทุนศูนย์, saving% ไม่ NaN', () => {
    const r = costReport({ assists: 0, plans: 0, agentRuns: 0 });
    expect(r.current.totalThb).toBe(0);
    expect(r.tieredSavingThb).toBe(0);
    expect(r.tieredSavingPct).toBe(0); // ไม่หารด้วยศูนย์
  });

  it('estimateVolume: proxy จาก tasks + agents', () => {
    const v = estimateVolume({ tasksTotal: 50, agents: 5 });
    expect(v.assists).toBe(50);
    expect(v.agentRuns).toBe(50);
    expect(v.plans).toBe(5);
    // agents 0 → อย่างน้อย 1 plan
    expect(estimateVolume({ tasksTotal: 0, agents: 0 }).plans).toBe(1);
  });

  it('ตาราง MODEL_PRICE + CALL_PROFILE มีค่าครบ (guard ข้อมูลหาย)', () => {
    expect(MODEL_PRICE['claude-sonnet-4-6'].in).toBeGreaterThan(0);
    expect(CALL_PROFILE.assist.in).toBeGreaterThan(0);
  });
});
