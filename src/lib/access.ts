import type { AppData, PageId, PlanId } from '../types';
import { isSupabaseEnabled } from './supabase';

export const PLAN_RANK: Record<PlanId, number> = { free: 0, starter: 1, growth: 2, scale: 3 };

export const PLAN_NAME: Record<PlanId, string> = {
  free: 'ทดลองใช้ฟรี',
  starter: 'Starter',
  growth: 'Growth',
  scale: 'Scale',
};

export const PLAN_COLOR: Record<PlanId, string> = {
  free: '#64748b',
  starter: '#22c55e',
  growth: '#06b6d4',
  scale: '#7c3aed',
};

export const PLAN_PRICE: Record<PlanId, string> = {
  free: 'ฟรี 15 วัน',
  starter: '฿390/เดือน',
  growth: '฿1,490/เดือน',
  scale: '฿5,900/เดือน',
};

/** หน้าที่ต้องการ plan ขั้นต่ำกว่า free */
export const PAGE_MIN_PLAN: Partial<Record<PageId, PlanId>> = {
  trade:     'starter', // ซื้อขาย B2B (RFQ/Orders) — เริ่มมีรายได้ = เริ่มจ่ายเบาๆ
  aisearch:  'growth',
  market:    'growth',
  team:      'growth',
  iso9001:   'growth',
  analytics: 'growth',
  sipoc:     'growth', // SIPOC Process — ฟีเจอร์ในแพ็กเกจเสียเงิน
  admin:     'scale',
};

/* ===== Admin full access =====
 * ผู้ดูแลระบบ (support@b-tctraining.com) ใช้แพ็กสูงสุด (Scale) ได้ฟรีโดยไม่ต้องจ่าย
 * ตั้งค่าครั้งเดียวจาก App.tsx เมื่อรู้อีเมลผู้ใช้ปัจจุบัน (isAdminEmail) — มีผลกับทุก canAccess */
let adminFullAccess = false;
export function setAdminFullAccess(on: boolean): void { adminFullAccess = on; }
export function hasAdminFullAccess(): boolean { return adminFullAccess; }

/** Plan rank จริงของ user ณ ขณะนี้ — -1 หมายถึงหมดอายุ/ไม่มี subscription */
export function effectiveRank(data: AppData): number {
  if (adminFullAccess) return PLAN_RANK['scale']; // แอดมินระบบ = Scale ฟรีเสมอ
  const { plan, status, trialEndDate, currentPeriodEnd } = data.subscription;

  if (status === 'active') {
    if (currentPeriodEnd && new Date(currentPeriodEnd) < new Date()) return -1;
    return PLAN_RANK[plan];
  }
  if (status === 'trial') {
    if (!trialEndDate || new Date(trialEndDate) < new Date()) return -1;
    return PLAN_RANK['scale']; // ทดลอง = ปลดล็อกทุกฟีเจอร์เต็มรูปแบบ 15 วัน แล้วค่อย downgrade เมื่อหมดอายุ
  }
  if (status === 'pending_payment') return PLAN_RANK['free'];
  if (status === 'none' && !isSupabaseEnabled) return PLAN_RANK['scale']; // local dev — full access
  return -1;
}

/** subscription หมดอายุหรือยัง */
export function isExpired(data: AppData): boolean {
  if (adminFullAccess) return false; // แอดมินไม่มีวันหมดอายุ
  const { status, trialEndDate, currentPeriodEnd } = data.subscription;
  if (status === 'trial') return !trialEndDate || new Date(trialEndDate) < new Date();
  if (status === 'active') return !!(currentPeriodEnd && new Date(currentPeriodEnd) < new Date());
  if (status === 'none') return isSupabaseEnabled; // ถ้าเปิด Supabase → ต้องเริ่ม trial ก่อน
  return status === 'cancelled' || status === 'past_due';
}

/** user เข้าหน้านี้ได้ไหม */
export function canAccess(data: AppData, page: PageId): boolean {
  const rank = effectiveRank(data);
  if (rank < 0) return false;
  const req = PAGE_MIN_PLAN[page];
  if (!req) return true;
  return rank >= PLAN_RANK[req];
}

/** label สำหรับแสดงใน sidebar */
export function planLabel(data: AppData): string {
  if (adminFullAccess) return 'Scale · แอดมิน';
  const { plan, status, trialEndDate } = data.subscription;
  if (status === 'trial') {
    const days = trialEndDate
      ? Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / 86400000))
      : 0;
    return `ทดลอง ${days} วัน`;
  }
  if (status === 'active') return PLAN_NAME[plan];
  if (status === 'none' && !isSupabaseEnabled) return 'Local Dev';
  if (status === 'pending_payment') return 'รอชำระเงิน';
  return 'ไม่มี Plan';
}
