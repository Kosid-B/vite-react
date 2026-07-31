// founding.ts — โปรโมชั่น "Founding Member" (1,000 คนแรก)
// สมัคร Starter ฿790 → ได้สิทธิ์ระดับ Growth (ฟีเจอร์ + โควตา 700 calls) คุมต้นทุน (ไม่แจก Scale)
//   • 100 คนแรก  = สิทธิ์ "ตลอดชีพ" (ระหว่างที่ยังจ่าย Starter อยู่)
//   • คนที่ 101–1,000 = 12 เดือน
// pure + testable — cap 1,000 บังคับจริงฝั่ง server (migration 0042 · claim_founding_member)
// การยกระดับ plan ทำใน access.ts (effectiveRank) — ที่นี่คือ business rules ล้วน
import type { FoundingMember, PlanId } from '../types';

export const FOUNDING_CAP = 1000;    // เพดานรวม (บังคับ atomic ฝั่ง server)
export const FOUNDING_ELITE = 100;   // 100 คนแรก = ตลอดชีพ
export const FOUNDING_MONTHS = 12;   // ที่เหลือ = 12 เดือน
export const FOUNDING_GRANT: PlanId = 'growth'; // ระดับที่มอบให้ (คุมต้นทุน — ไม่ใช่ scale)

/** สร้างสิทธิ์ founding จากลำดับ seq (1-based) ณ เวลา now — pure */
export function foundingReward(seq: number, now: Date): FoundingMember {
  const lifetime = seq <= FOUNDING_ELITE;
  const fm: FoundingMember = { seq, claimedAt: now.toISOString(), lifetime };
  if (!lifetime) {
    const until = new Date(now);
    until.setMonth(until.getMonth() + FOUNDING_MONTHS);
    fm.premiumUntil = until.toISOString();
  }
  return fm;
}

/** สิทธิ์พรีเมียม founding ยัง active อยู่ไหม ณ now — pure */
export function isFoundingPremiumActive(fm: FoundingMember | null | undefined, now: Date): boolean {
  if (!fm) return false;
  if (fm.lifetime) return true;
  if (!fm.premiumUntil) return false;
  return now.getTime() < new Date(fm.premiumUntil).getTime();
}

/** plan ที่มีผลจริงเมื่อคิดสิทธิ์ founding — จ่าย Starter + สิทธิ์ active → Growth · ที่เหลือคงเดิม
 *  (ยกเฉพาะ starter — free ต้องจ่ายก่อน · growth/scale อยู่แล้วสูงกว่า) — pure */
export function foundingEffectivePlan(basePlan: PlanId, fm: FoundingMember | null | undefined, now: Date): PlanId {
  return basePlan === 'starter' && isFoundingPremiumActive(fm, now) ? FOUNDING_GRANT : basePlan;
}

/** ที่นั่ง founding เหลือกี่ที่ จากจำนวนที่ claim แล้ว — pure */
export function foundingSeatsLeft(claimedCount: number): number {
  return Math.max(0, FOUNDING_CAP - claimedCount);
}

/** โปรฯ เต็มหรือยัง — pure */
export function isFoundingFull(claimedCount: number): boolean {
  return claimedCount >= FOUNDING_CAP;
}

/** ป้ายระดับตามลำดับ seq — pure */
export function foundingTierLabel(fm: FoundingMember): string {
  return fm.lifetime
    ? `Founding #${fm.seq} · สิทธิ์ตลอดชีพ 🏅`
    : `Founding Member #${fm.seq} · Growth 12 เดือน`;
}

/** ผู้ใช้ควรเห็นการ์ดชวนรับสิทธิ์ไหม — จ่าย Starter, ยังไม่เคยรับ, ที่นั่งเหลือ — pure */
export function isFoundingEligible(plan: PlanId, fm: FoundingMember | null | undefined, claimedCount: number): boolean {
  return plan === 'starter' && !fm && !isFoundingFull(claimedCount);
}
