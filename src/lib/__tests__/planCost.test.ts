import { describe, it, expect } from 'vitest';
import { BLENDED_CALL_THB, buildCost, PLAN_COST, marginFraction } from '../planCost';
import { PLAN_AI_CALLS } from '../usage';
import { PLAN_PRICE_NUM } from '../access';

describe('planCost — blended cost', () => {
  it('~฿0.49/call (mix 50/20/30 · Sonnet)', () => {
    expect(BLENDED_CALL_THB).toBeCloseTo(0.49, 2);
  });
});

describe('planCost — margins ตรงกับ buildCost จริง (ไม่ hardcode)', () => {
  it('Starter margin ~70.6% (300 calls)', () => {
    expect(PLAN_COST.starter.total).toBe(232);   // 147 AI + 60 + 25
    expect(PLAN_COST.starter.margin).toBe(70.6);
  });
  it('Growth margin ~48.1% (700 calls) — ตัวที่เคย stale', () => {
    expect(PLAN_COST.growth.total).toBe(773);     // 343 AI + 250 + 180
    expect(PLAN_COST.growth.margin).toBe(48.1);
  });
  it('Scale margin ~44.0% (5000 calls) — ตัวที่เคย stale', () => {
    expect(PLAN_COST.scale.total).toBe(3302);     // 2452 AI + 550 + 300
    expect(PLAN_COST.scale.margin).toBe(44.0);
  });
});

describe('planCost — สอดคล้องแหล่งความจริงอื่น', () => {
  it('calls ตรงกับ PLAN_AI_CALLS (usage.ts)', () => {
    // starter 300 / growth 700 / scale 5000
    expect(PLAN_AI_CALLS.starter).toBe(300);
    expect(PLAN_AI_CALLS.growth).toBe(700);
    expect(PLAN_AI_CALLS.scale).toBe(5000);
  });
  it('price ตรงกับ PLAN_PRICE_NUM (access.ts)', () => {
    (['starter', 'growth', 'scale'] as const).forEach((p) => {
      expect(PLAN_COST[p].price).toBe(PLAN_PRICE_NUM[p]);
    });
  });
});

describe('planCost — helpers', () => {
  it('marginFraction = margin/100 (0-1)', () => {
    expect(marginFraction('growth')).toBeCloseTo(0.481, 3);
    expect(marginFraction('scale')).toBeCloseTo(0.440, 3);
  });
  it('buildCost — margin คำนวณสดจากราคา-ต้นทุน', () => {
    const c = buildCost(100, 1000, 100, 100);
    expect(c.total).toBe(Math.round(100 * BLENDED_CALL_THB) + 200);
    expect(c.margin).toBe(+(((1000 - c.total) / 1000) * 100).toFixed(1));
    expect(c.items).toHaveLength(3);
  });
});
