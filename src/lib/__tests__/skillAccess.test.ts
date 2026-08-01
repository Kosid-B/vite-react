import { describe, it, expect } from 'vitest';
import type { AppData, PlanId, SubStatus } from '../../types';
import { effectiveOwnedSkills, isScaleUnlocked, isBundledByScale, OFFICIAL_SKILL_IDS } from '../skillAccess';

function mk(plan: PlanId, status: SubStatus, purchased: string[] = [], cpe = '2999-01-01'): AppData {
  return {
    subscription: { plan, status, trialEndDate: null, currentPeriodEnd: cpe, promptpayId: '', autoRenew: false, invoices: [] },
    aiCompany: { purchasedSkills: purchased },
  } as unknown as AppData;
}

describe('skillAccess — ไฮบริด Scale bundle', () => {
  it('มี official skills อย่างน้อย 1 (มี skill official ในคลัง)', () => {
    expect(OFFICIAL_SKILL_IDS.length).toBeGreaterThan(0);
  });

  it('Scale (active) → ปลดล็อก official ทั้งหมด + รวมที่ซื้อเอง', () => {
    const d = mk('scale', 'active', ['some-bought-skill']);
    expect(isScaleUnlocked(d)).toBe(true);
    const eff = effectiveOwnedSkills(d);
    OFFICIAL_SKILL_IDS.forEach(id => expect(eff).toContain(id));
    expect(eff).toContain('some-bought-skill');
  });

  it('Starter → ได้เฉพาะที่ซื้อเอง (ไม่ปลด official)', () => {
    const d = mk('starter', 'active', ['bought']);
    expect(isScaleUnlocked(d)).toBe(false);
    expect(effectiveOwnedSkills(d)).toEqual(['bought']);
  });

  it('isBundledByScale — official ที่ยังไม่ซื้อ + Scale = true · ซื้อแล้ว = false', () => {
    const id = OFFICIAL_SKILL_IDS[0];
    expect(isBundledByScale(mk('scale', 'active'), id)).toBe(true);
    expect(isBundledByScale(mk('scale', 'active', [id]), id)).toBe(false); // ซื้อเองแล้ว
    expect(isBundledByScale(mk('growth', 'active'), id)).toBe(false);      // ไม่ใช่ Scale
  });

  it('trial (rank = scale) → ปลดล็อกด้วย', () => {
    const d = { ...mk('free', 'trial'), subscription: { plan: 'free', status: 'trial', trialEndDate: '2999-01-01', currentPeriodEnd: null, promptpayId: '', autoRenew: false, invoices: [] } } as unknown as AppData;
    expect(isScaleUnlocked(d)).toBe(true);
  });
});
