import { describe, it, expect } from 'vitest';
import {
  FOUNDING_CAP, FOUNDING_ELITE, foundingReward, isFoundingPremiumActive,
  foundingEffectivePlan, foundingSeatsLeft, isFoundingFull, isFoundingEligible, foundingTierLabel,
} from '../founding';

const NOW = new Date('2026-07-31T00:00:00.000Z');

describe('foundingReward', () => {
  it('100 คนแรก = ตลอดชีพ (ไม่มีวันหมด)', () => {
    const fm = foundingReward(1, NOW);
    expect(fm.lifetime).toBe(true);
    expect(fm.premiumUntil).toBeUndefined();
    expect(fm.seq).toBe(1);
    const edge = foundingReward(FOUNDING_ELITE, NOW);
    expect(edge.lifetime).toBe(true);
  });

  it('คนที่ 101+ = 12 เดือน', () => {
    const fm = foundingReward(FOUNDING_ELITE + 1, NOW);
    expect(fm.lifetime).toBe(false);
    expect(fm.premiumUntil).toBe(new Date('2027-07-31T00:00:00.000Z').toISOString());
  });
});

describe('isFoundingPremiumActive', () => {
  it('null/undefined = ไม่ active', () => {
    expect(isFoundingPremiumActive(null, NOW)).toBe(false);
    expect(isFoundingPremiumActive(undefined, NOW)).toBe(false);
  });
  it('lifetime = active เสมอ', () => {
    expect(isFoundingPremiumActive(foundingReward(1, NOW), new Date('2099-01-01'))).toBe(true);
  });
  it('12 เดือน = active ก่อนหมด, หมดหลังครบ', () => {
    const fm = foundingReward(200, NOW);
    expect(isFoundingPremiumActive(fm, new Date('2027-07-30T00:00:00.000Z'))).toBe(true);
    expect(isFoundingPremiumActive(fm, new Date('2027-08-01T00:00:00.000Z'))).toBe(false);
  });
});

describe('foundingEffectivePlan', () => {
  it('starter + สิทธิ์ active → growth', () => {
    expect(foundingEffectivePlan('starter', foundingReward(1, NOW), NOW)).toBe('growth');
  });
  it('starter แต่สิทธิ์หมด → คงเดิม', () => {
    const fm = foundingReward(200, NOW);
    expect(foundingEffectivePlan('starter', fm, new Date('2028-01-01'))).toBe('starter');
  });
  it('free/growth/scale ไม่ถูกยก (ต้องจ่าย Starter ก่อน)', () => {
    expect(foundingEffectivePlan('free', foundingReward(1, NOW), NOW)).toBe('free');
    expect(foundingEffectivePlan('growth', foundingReward(1, NOW), NOW)).toBe('growth');
    expect(foundingEffectivePlan('scale', foundingReward(1, NOW), NOW)).toBe('scale');
  });
  it('ไม่มีสิทธิ์ → คงเดิม', () => {
    expect(foundingEffectivePlan('starter', null, NOW)).toBe('starter');
  });
});

describe('cap / seats', () => {
  it('seatsLeft นับถอย ไม่ติดลบ', () => {
    expect(foundingSeatsLeft(0)).toBe(FOUNDING_CAP);
    expect(foundingSeatsLeft(999)).toBe(1);
    expect(foundingSeatsLeft(FOUNDING_CAP)).toBe(0);
    expect(foundingSeatsLeft(FOUNDING_CAP + 50)).toBe(0);
  });
  it('isFoundingFull ที่ >= cap', () => {
    expect(isFoundingFull(999)).toBe(false);
    expect(isFoundingFull(1000)).toBe(true);
  });
});

describe('isFoundingEligible', () => {
  it('starter + ยังไม่รับ + ยังไม่เต็ม = เห็นการ์ด', () => {
    expect(isFoundingEligible('starter', undefined, 500)).toBe(true);
  });
  it('รับแล้ว = ไม่ eligible', () => {
    expect(isFoundingEligible('starter', foundingReward(1, NOW), 500)).toBe(false);
  });
  it('ไม่ใช่ starter = ไม่ eligible', () => {
    expect(isFoundingEligible('free', undefined, 500)).toBe(false);
    expect(isFoundingEligible('growth', undefined, 500)).toBe(false);
  });
  it('เต็มแล้ว = ไม่ eligible', () => {
    expect(isFoundingEligible('starter', undefined, FOUNDING_CAP)).toBe(false);
  });
});

describe('foundingTierLabel', () => {
  it('lifetime vs 12 เดือน', () => {
    expect(foundingTierLabel(foundingReward(1, NOW))).toContain('ตลอดชีพ');
    expect(foundingTierLabel(foundingReward(500, NOW))).toContain('12 เดือน');
  });
});
