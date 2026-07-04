import type { AppData } from '../types';
import { financeSummary } from './finance';
import { companyXP, getCompanyLevel } from './gamification';

/* ===== รางวัลเมืองบริษัท (SIM) — ผูก "เกมสนุก" เข้ากับ "ของจริง" =====
 * ปลดล็อกตามเหตุการณ์สำคัญ (การเงิน + ระดับเมือง) → รับรางวัลจริง:
 *   discount = ส่วนลดค่าแพ็กเกจ · featured = สิทธิ์ดันร้านขึ้นแนะนำในตลาด · unlock = ของแต่งเมือง */

export interface Reward {
  id: string;
  icon: string;
  title: string;
  desc: string;
  kind: 'discount' | 'featured' | 'unlock';
  value: number;                 // discount = %, featured = จำนวนวัน, unlock = 0
  unlocked: (d: AppData) => boolean;
}

const rank = (d: AppData) => getCompanyLevel(companyXP(d)).rank;

export const REWARDS: Reward[] = [
  {
    id: 'first-revenue', icon: '🎉', title: 'รายได้ก้อนแรก',
    desc: 'ปลดของแต่งเมือง: ธง “เมืองรุ่งเรือง”', kind: 'unlock', value: 0,
    unlocked: d => financeSummary(d).hasRevenue,
  },
  {
    id: 'break-even', icon: '🏦', title: 'ทำกำไรได้! (รายได้ > รายจ่าย)',
    desc: 'รับส่วนลดค่าแพ็กเกจ 10%', kind: 'discount', value: 10,
    unlocked: d => financeSummary(d).breakEven,
  },
  {
    id: 'city-growing', icon: '🌿', title: 'เมืองโตเป็น “ชุมชนกำลังโต”',
    desc: 'สิทธิ์ดันร้านขึ้น ⭐ แนะนำ ในตลาด 3 วัน', kind: 'featured', value: 3,
    unlocked: d => rank(d) !== 'Starter',
  },
  {
    id: 'profit-100k', icon: '💎', title: 'กำไรสุทธิสะสม ฿100,000',
    desc: 'รับส่วนลดค่าแพ็กเกจ 20%', kind: 'discount', value: 20,
    unlocked: d => financeSummary(d).net >= 100000,
  },
  {
    id: 'city-pro', icon: '⭐', title: 'เมืองระดับ “มืออาชีพ” ขึ้นไป',
    desc: 'สิทธิ์ดันร้านขึ้น ⭐ แนะนำ ในตลาด 7 วัน', kind: 'featured', value: 7,
    unlocked: d => ['Professional', 'Advanced', 'Elite'].includes(rank(d)),
  },
];

export interface RewardView extends Reward { isUnlocked: boolean; isClaimed: boolean; }

export function rewardViews(d: AppData): RewardView[] {
  const claimed = new Set(d.claimedRewards ?? []);
  return REWARDS.map(r => ({ ...r, isUnlocked: r.unlocked(d), isClaimed: claimed.has(r.id) }));
}

/** จำนวนรางวัลที่ปลดล็อกแล้วแต่ยังไม่ได้กด รับ (แสดง badge เตือน) */
export function claimableCount(d: AppData): number {
  return rewardViews(d).filter(r => r.isUnlocked && !r.isClaimed).length;
}

/** รับรางวัล → คืน AppData ใหม่พร้อม perk (idempotent) */
export function claimReward(d: AppData, id: string): AppData {
  const r = REWARDS.find(x => x.id === id);
  if (!r || !r.unlocked(d) || (d.claimedRewards ?? []).includes(id)) return d;
  const next: AppData = { ...d, claimedRewards: [...(d.claimedRewards ?? []), id] };
  if (r.kind === 'discount') {
    if (r.value > (d.coupon?.pct ?? 0)) next.coupon = { pct: r.value, reason: r.title };
  } else if (r.kind === 'featured') {
    next.featuredVoucherDays = (d.featuredVoucherDays ?? 0) + r.value;
  } else {
    next.cityUnlocks = [...(d.cityUnlocks ?? []), r.id];
  }
  return next;
}
