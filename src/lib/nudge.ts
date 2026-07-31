// nudge.ts — In-app conversion nudge (pure): เตือนตอน trial ใกล้หมด / โควตา AI ใกล้เต็ม
// จุดประสงค์ = ดันผู้ใช้ที่ "ได้คุณค่าแล้ว" ไปสมัคร/เติม ก่อนจะสะดุด (conversion funnel) โดยไม่รบกวนเกินไป
import type { PlanId, SubStatus } from '../types';

export type NudgeTone = 'trial' | 'quota';

export interface Nudge {
  id: string;          // ใช้จำ dismiss ต่อวัน
  tone: NudgeTone;
  message: string;
  cta: string;
  goto: 'billing';
}

export interface NudgeInput {
  status: SubStatus;
  trialDaysLeft: number | null;  // null = ไม่ใช่ trial
  aiPct: number;                 // 0-100 โควตาที่ใช้ไป
  plan: PlanId;
  foundingActive: boolean;
}

export const TRIAL_NUDGE_DAYS = 3;  // เตือนเมื่อ trial เหลือ ≤ 3 วัน
export const QUOTA_NUDGE_PCT = 80;  // เตือนเมื่อใช้โควตา ≥ 80%

/** เลือก nudge ที่ควรโชว์ (trial ใกล้หมด สำคัญกว่า โควตาใกล้เต็ม) — pure · null = ไม่โชว์ */
export function computeNudge(inp: NudgeInput): Nudge | null {
  // 1) trial ใกล้หมด (0..3 วัน)
  if (inp.status === 'trial' && inp.trialDaysLeft !== null &&
      inp.trialDaysLeft >= 0 && inp.trialDaysLeft <= TRIAL_NUDGE_DAYS) {
    return {
      id: 'trial-' + inp.trialDaysLeft,
      tone: 'trial',
      message: inp.trialDaysLeft === 0
        ? '⏰ ทดลองใช้หมดวันนี้ — สมัครแพ็กก่อนฟีเจอร์ถูกล็อก'
        : `⏰ ทดลองใช้เหลือ ${inp.trialDaysLeft} วัน — สมัคร Starter ฿790 (Founding: ได้สิทธิ์ Growth) ก่อนหมด`,
      cta: 'ดูแพ็ก & สมัคร',
      goto: 'billing',
    };
  }
  // 2) โควตา AI ใกล้เต็ม (≥80%) — ยกเว้น Scale (สูงสุดแล้ว) / ไม่ใช่ช่วง trial
  if (inp.status !== 'trial' && inp.aiPct >= QUOTA_NUDGE_PCT && inp.plan !== 'scale') {
    const action = inp.foundingActive || inp.plan === 'growth' ? 'เติมเครดิต (Top-up)' : 'อัปเกรด/เติมเครดิต';
    return {
      id: 'quota-' + Math.min(100, Math.floor(inp.aiPct / 10) * 10),
      tone: 'quota',
      message: `⚡ ใช้ AI ไปแล้ว ${Math.round(inp.aiPct)}% ของโควตาเดือนนี้ — ${action} เพื่อใช้ต่อไม่สะดุด`,
      cta: 'จัดการโควตา',
      goto: 'billing',
    };
  }
  return null;
}
