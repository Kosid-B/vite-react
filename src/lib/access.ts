import type { AppData, PageId, PlanId } from '../types';
import { isSupabaseEnabled } from './supabase';

export const PLAN_RANK: Record<PlanId, number> = { free: 0, starter: 1, growth: 2, scale: 3 };

/** ผ่อนผัน (grace): ครบกำหนดชำระแล้วยังใช้งานต่อได้กี่วันก่อนตัดสิทธิ์
 *  ต้องตรงกับ GRACE_DAYS ใน supabase/functions/billing-cron (นโยบาย "เตือน + ผ่อนผัน") */
export const GRACE_DAYS = 7;

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

/** ราคาต่อเดือน (บาท ตัวเลข) — ใช้คำนวณส่วนลดคูปอง */
export const PLAN_PRICE_NUM: Record<PlanId, number> = {
  free: 0, starter: 390, growth: 1490, scale: 5900,
};

/** ราคาต่อเดือนหลังหักคูปองส่วนลด (บาท, ปัดจำนวนเต็ม) — pure */
export function discountedMonthly(plan: PlanId, couponPct = 0): number {
  const base = PLAN_PRICE_NUM[plan] ?? 0;
  const pct = Math.max(0, Math.min(100, couponPct));
  return Math.round(base * (1 - pct / 100));
}

/** หน้าที่ต้องการ plan ขั้นต่ำกว่า free */
export const PAGE_MIN_PLAN: Partial<Record<PageId, PlanId>> = {
  trade:     'starter', // ซื้อขาย B2B (RFQ/Orders) — เริ่มมีรายได้ = เริ่มจ่ายเบาๆ
  aisearch:  'growth',
  market:    'growth',
  team:      'growth',
  iso9001:   'growth',
  privacy:   'starter', // ตัวช่วย PDPA (Privacy Notice/SOP) — ฟีเจอร์ compliance เริ่มต้น
  compliance: 'growth',  // AI ตรวจเอกสาร ISO/มอก. — เครื่องมือ compliance เชิงลึก
  knowledge:  'starter', // คลังความรู้ ISO/PDPA (ถาม-ตอบ) — ฟีเจอร์ช่วยตัดสินใจเริ่มต้น
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

/* ===== Guest mode (ลองก่อนสมัคร) =====
 * ผู้เยี่ยมชม production ที่ยังไม่ล็อกอิน กด "ลองใช้เลย" → เข้าแอปด้วย localStorage (เหมือน local mode)
 * ปลดล็อกทุกฟีเจอร์ให้สัมผัสคุณค่าก่อนสมัคร (ลด friction #1 ที่ทำให้ conversion = 0) */
let guestFullAccess = false;
export function setGuestFullAccess(on: boolean): void { guestFullAccess = on; }
export function hasGuestFullAccess(): boolean { return guestFullAccess; }

/** Plan rank จริงของ user ณ ขณะนี้ — -1 หมายถึงหมดอายุ/ไม่มี subscription */
export function effectiveRank(data: AppData): number {
  if (adminFullAccess || guestFullAccess) return PLAN_RANK['scale']; // แอดมิน / ผู้ทดลอง (guest) = Scale เต็ม
  const { plan, status, trialEndDate, currentPeriodEnd } = data.subscription;

  if (status === 'active' || status === 'past_due') {
    // ผ่อนผัน: ครบกำหนดแล้ว (active ที่ cron ยังไม่รัน หรือ past_due ที่ cron ตั้งไว้)
    // ยังใช้งานแพ็กเดิมต่อได้ในช่วง grace GRACE_DAYS วัน แล้วค่อยตัดเป็น -1 (cron จะ downgrade เป็น free)
    if (currentPeriodEnd && new Date(currentPeriodEnd) < new Date()) {
      const graceEnd = new Date(currentPeriodEnd).getTime() + GRACE_DAYS * 86400000;
      return Date.now() < graceEnd ? PLAN_RANK[plan] : -1;
    }
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
  if (adminFullAccess || guestFullAccess) return false; // แอดมิน / ผู้ทดลอง ไม่นับหมดอายุ
  const { status, trialEndDate, currentPeriodEnd } = data.subscription;
  if (status === 'trial') return !trialEndDate || new Date(trialEndDate) < new Date();
  if (status === 'active' || status === 'past_due') {
    // ระหว่าง grace ยังไม่นับหมดอายุ (ผ่อนผัน) — พ้น grace แล้วจึงถือว่าหมดอายุ
    if (!currentPeriodEnd) return false;
    const graceEnd = new Date(currentPeriodEnd).getTime() + GRACE_DAYS * 86400000;
    return Date.now() >= graceEnd;
  }
  if (status === 'none') return isSupabaseEnabled; // ถ้าเปิด Supabase → ต้องเริ่ม trial ก่อน
  return status === 'cancelled';
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
