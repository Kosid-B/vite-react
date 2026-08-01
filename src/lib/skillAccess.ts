// skillAccess.ts — ไฮบริด pricing: แพ็ก Scale ปลดล็อก "official skills" (B.Training) ฟรีทั้งหมด
// tier อื่นยังซื้อแยกได้ตามเดิม · คิดจากแพ็ก (ไม่ mutate purchasedSkills) → downgrade แล้วสิทธิ์หายเอง
import type { AppData } from '../types';
import { SKILL_CATALOG } from '../data/skillCatalog';
import { effectiveRank, PLAN_RANK } from './access';

/** id ของ official skills — Scale ได้ฟรีทั้งหมด (bundle) */
export const OFFICIAL_SKILL_IDS: string[] = SKILL_CATALOG.filter(s => s.official).map(s => s.id);

/** rank = Scale (รวม trial/admin/local ที่ปลดเต็ม) → ปลดล็อก official skills */
export function isScaleUnlocked(data: AppData): boolean {
  return effectiveRank(data) >= PLAN_RANK.scale;
}

/** skill ที่ใช้ได้จริง = ซื้อเอง + (ถ้า Scale) official skills ทั้งหมด — pure */
export function effectiveOwnedSkills(data: AppData): string[] {
  const owned = data.aiCompany?.purchasedSkills ?? [];
  if (!isScaleUnlocked(data)) return owned;
  const set = new Set(owned);
  for (const id of OFFICIAL_SKILL_IDS) set.add(id);
  return Array.from(set);
}

/** skill นี้ "รวมมาในแพ็ก Scale" (official + Scale + ยังไม่ได้ซื้อเอง) — ใช้แยกป้ายในตลาด */
export function isBundledByScale(data: AppData, skillId: string): boolean {
  return isScaleUnlocked(data)
    && OFFICIAL_SKILL_IDS.includes(skillId)
    && !(data.aiCompany?.purchasedSkills ?? []).includes(skillId);
}
