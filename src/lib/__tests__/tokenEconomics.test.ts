import { describe, it, expect } from 'vitest';
import {
  blendedThbPer1k,
  tokenCostThb,
  marginPct,
  meetsMinMargin,
  MIN_MARGIN_PCT,
  PLAN_PRICE_THB,
  PLAN_MONTHLY_TOKENS,
  planTokenReport,
  allPlanReports,
  TRIAL_TOKENS,
  trialCostThb,
  engagementTier,
  freeDailyTokens,
  freeDailyCostThb,
  FREE_DAILY_TOKENS,
  TOKEN_PACKS,
  packMargin,
  pricePerMillionThb,
  tokenPackById,
  shouldOfferTopup,
  recommendTokenPack,
} from '../tokenEconomics';

describe('tokenEconomics — ต้นทุน/มาร์จิน', () => {
  it('blended ต้นทุน Sonnet ≈ ฿0.3024/1k (ตรงกับ ~฿0.75/heavy call ใน topup.ts)', () => {
    expect(blendedThbPer1k('claude-sonnet-4-6')).toBeCloseTo(0.3024, 4);
    // Haiku ถูกลง ~3 เท่า
    expect(blendedThbPer1k('claude-haiku-4-5')).toBeCloseTo(0.1008, 4);
  });

  it('โมเดลไม่รู้จัก → ใช้ฐาน Sonnet (ปลอดภัยไว้ก่อน)', () => {
    expect(blendedThbPer1k('unknown-model')).toBeCloseTo(blendedThbPer1k('claude-sonnet-4-6'), 6);
  });

  it('tokenCostThb เป็นสัดส่วนตรง + ไม่ติดลบ', () => {
    expect(tokenCostThb(1_000_000)).toBeCloseTo(302.4, 1);
    expect(tokenCostThb(0)).toBe(0);
    expect(tokenCostThb(-100)).toBe(0);
  });

  it('marginPct + meetsMinMargin', () => {
    expect(marginPct(100, 70)).toBeCloseTo(30, 6);
    expect(marginPct(0, 10)).toBe(0);
    expect(meetsMinMargin(100, Math.round(70 / 0.3024 * 1000))).toBe(true);
  });
});

describe('tokenEconomics — แพ็กรายเดือน กำไร ≥ 30% เสมอ', () => {
  it('ทุกแพ็กผ่านเกณฑ์กำไรขั้นต่ำที่ worst-case (ใช้เต็มเพดาน + Sonnet)', () => {
    for (const r of allPlanReports()) {
      expect(r.ok).toBe(true);
      expect(r.marginPct).toBeGreaterThanOrEqual(MIN_MARGIN_PCT);
    }
  });

  it('ราคาแพ็กตรงกับ access.ts (790/1490/5900)', () => {
    expect(PLAN_PRICE_THB.starter).toBe(790);
    expect(PLAN_PRICE_THB.growth).toBe(1490);
    expect(PLAN_PRICE_THB.scale).toBe(5900);
  });

  it('เพดาน token มากขึ้นตามราคาแพ็ก (starter < growth < scale)', () => {
    expect(PLAN_MONTHLY_TOKENS.starter).toBeLessThan(PLAN_MONTHLY_TOKENS.growth);
    expect(PLAN_MONTHLY_TOKENS.growth).toBeLessThan(PLAN_MONTHLY_TOKENS.scale);
  });

  it('planTokenReport starter ~43% margin (ใจกว้าง แต่ยัง ≥30%)', () => {
    const r = planTokenReport('starter');
    expect(r.marginPct).toBeGreaterThan(40);
    expect(r.costThb).toBeCloseTo(453.6, 0);
  });
});

describe('tokenEconomics — ทดลอง 15 วัน (CAC)', () => {
  it('ต้นทุนต่อผู้ทดลองมีเพดานชัด (< ฿150)', () => {
    expect(trialCostThb()).toBeCloseTo(120.96, 1);
    expect(trialCostThb()).toBeLessThan(150);
    expect(TRIAL_TOKENS).toBeGreaterThan(0);
  });
});

describe('tokenEconomics — โควตาฟรีรายวันตาม engagement', () => {
  it('คนดูนาน/ถึง CTA = hot (ให้ token มากสุด)', () => {
    expect(engagementTier({ dwellSec: 130, scrollPct: 20, reachedCta: false })).toBe('hot');
    expect(engagementTier({ dwellSec: 5, scrollPct: 10, reachedCta: true })).toBe('hot');
  });
  it('เริ่มสนใจ = warm', () => {
    expect(engagementTier({ dwellSec: 40, scrollPct: 20, reachedCta: false })).toBe('warm');
    expect(engagementTier({ dwellSec: 5, scrollPct: 60, reachedCta: false })).toBe('warm');
  });
  it('เพิ่งเข้า = cold', () => {
    expect(engagementTier({ dwellSec: 5, scrollPct: 10, reachedCta: false })).toBe('cold');
  });
  it('freeDailyTokens เพิ่มตามความร้อนแรง', () => {
    expect(freeDailyTokens({ dwellSec: 5, scrollPct: 5, reachedCta: false })).toBe(FREE_DAILY_TOKENS.cold);
    expect(freeDailyTokens({ dwellSec: 200, scrollPct: 90, reachedCta: true })).toBe(FREE_DAILY_TOKENS.hot);
    expect(FREE_DAILY_TOKENS.cold).toBeLessThan(FREE_DAILY_TOKENS.hot);
  });
  it('ต้นทุนฟรีรายวันมีเพดาน (hot < ฿25/วัน)', () => {
    expect(freeDailyCostThb('hot')).toBeCloseTo(21.17, 1);
    expect(freeDailyCostThb('hot')).toBeLessThan(25);
  });
});

describe('tokenEconomics — top-up token กำไร > 30% เสมอ', () => {
  it('ทุกแพ็ก top-up margin > 30%', () => {
    for (const p of TOKEN_PACKS) {
      expect(packMargin(p)).toBeGreaterThan(MIN_MARGIN_PCT);
    }
  });
  it('pricePerMillion ลดลงเมื่อแพ็กใหญ่ขึ้น (จูงใจซื้อก้อนใหญ่)', () => {
    const perM = TOKEN_PACKS.map(pricePerMillionThb);
    expect(perM[0]).toBeGreaterThanOrEqual(perM[perM.length - 1]);
  });
  it('tokenPackById + recommend + shouldOfferTopup', () => {
    expect(tokenPackById('tok_1m')?.tokens).toBe(1_000_000);
    expect(tokenPackById('nope')).toBeUndefined();
    expect(recommendTokenPack(500_000).id).toBe('tok_1m');
    expect(recommendTokenPack(50_000_000).id).toBe('tok_10m');
    expect(shouldOfferTopup(80, 100)).toBe(true);
    expect(shouldOfferTopup(50, 100)).toBe(false);
    expect(shouldOfferTopup(10, 0)).toBe(false);
  });
});
