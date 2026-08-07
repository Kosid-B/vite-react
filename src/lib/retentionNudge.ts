// retentionNudge.ts — "ดึงคนกลับมา" (แก้ retention รูรั่วอันดับ 1: คนเข้าครั้งเดียวไม่กลับ)
// ผู้ใช้เดิมที่หายไป ≥1 วัน แล้วกลับมา → การ์ด "ทำต่อจากที่ค้าง" + งานถัดไปที่ควรทำ
// โปร่งใส: ช่วยให้ทำต่อ ไม่ใช่หลอก/เร่งเท็จ · pure + tested
import type { PageId } from '../types';

export interface NudgeInput {
  today: string;            // yyyy-mm-dd
  lastActiveDay?: string;   // streak.lastDay (ครั้งล่าสุดที่ใช้จริง)
  seenDay?: string;         // วันที่โชว์ nudge ล่าสุด (กันโชว์ซ้ำวันเดียวกัน)
  visitedCount: number;     // จำนวนหน้าที่เคยเปิด (>1 = ผู้ใช้เดิม ไม่ใช่มือใหม่)
  streakCount: number;
  hasCompany: boolean;      // ตั้งบริษัท AI แล้ว
  hasIdea: boolean;         // มีคุณค่า/ไอเดียใน BMC แล้ว
}

export interface Nudge {
  show: boolean;
  title: string;
  message: string;
  ctaLabel: string;
  ctaPage: PageId;
}

const HIDDEN: Nudge = { show: false, title: '', message: '', ctaLabel: '', ctaPage: 'dashboard' };

/** จำนวนวันระหว่าง 2 วันที่ (yyyy-mm-dd) */
export function daysBetween(a: string, b: string): number {
  const t = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };
  const ta = t(a), tb = t(b);
  if (isNaN(ta) || isNaN(tb)) return 0;
  return Math.round((tb - ta) / 86400000);
}

/** งานถัดไปที่ควรทำ (ตามความคืบหน้า) */
function nextAction(inp: NudgeInput): { label: string; page: PageId } {
  if (!inp.hasCompany) return { label: 'ปลุกทีม AI สร้างบริษัทของคุณ', page: 'aicompany' };
  if (!inp.hasIdea) return { label: 'ทดสอบไอเดีย ก่อนลงเงิน', page: 'bmc' };
  return { label: 'ดูความคืบหน้าทีม AI ของคุณ', page: 'aicompany' };
}

/** ตัดสินใจว่าจะโชว์การ์ด "กลับมาทำต่อ" ไหม + ข้อความ/งานถัดไป */
export function retentionNudge(inp: NudgeInput): Nudge {
  if (inp.seenDay === inp.today) return HIDDEN;   // โชว์ไปแล้ววันนี้
  if (inp.visitedCount <= 1) return HIDDEN;       // มือใหม่ — ให้ onboarding จัดการ
  if (!inp.lastActiveDay) return HIDDEN;
  const gap = daysBetween(inp.lastActiveDay, inp.today);
  if (gap < 1) return HIDDEN;                      // ยังไม่ได้หายไป (เข้าวันเดียวกัน)

  const act = nextAction(inp);
  const title = gap === 1 ? 'ยินดีต้อนรับกลับ 👋' : `ไม่ได้เจอกัน ${gap} วัน — กลับมาต่อได้เลย`;
  const message = gap === 1 && inp.streakCount > 0
    ? `รักษาความต่อเนื่องไว้นะ (ตอนนี้ต่อเนื่อง ${inp.streakCount} วัน) — ทำต่อจากจุดที่ค้างไว้`
    : 'ธุรกิจสร้างจากการทำต่อเนื่องทีละนิด — เริ่มก้าวถัดไปเลย ไม่ต้องเริ่มใหม่';

  return { show: true, title, message, ctaLabel: `▸ ${act.label}`, ctaPage: act.page };
}
