// leadNurture.ts — ตรรกะลำดับอีเมล nurture ของ lead (Dark AI Marketing #3+19+20+22)
// "อย่าทิ้ง lead" — คนที่ทิ้งอีเมลไว้แต่ยังไม่สมัคร ต้องได้อีเมลตามลำดับเวลาเพื่อดึงกลับมา activate
// ส่วนนี้ pure + tested (คำนวณ "ถึงเวลาส่งอีเมลลำดับไหนหรือยัง") · การส่งจริง + เทมเพลตอยู่ใน
// supabase/functions/lead-nurture (cron + Resend) ซึ่ง mirror ตรรกะ STAGE_DELAY_HOURS ชุดนี้
//
// nurture_stage = จำนวนอีเมลที่ "ส่งไปแล้ว" (0..3):
//   0 = ยังไม่ส่งเลย   1 = ส่ง welcome แล้ว   2 = ส่ง value แล้ว   3 = ส่ง final แล้ว (จบ)

export interface NurtureLead {
  createdAtMs: number;      // เวลา lead เข้ามา
  stage: number;            // อีเมลที่ส่งไปแล้ว (0..3)
  lastAtMs: number | null;  // เวลาส่งอีเมลล่าสุด (null ถ้ายังไม่เคยส่ง)
}

export const TOTAL_STAGES = 3;

// ชั่วโมงที่ต้อง "รอ" ก่อนส่งอีเมลลำดับถัดไป — index = stage ปัจจุบัน (ก่อนส่ง)
//   [0] welcome ส่งทันที (รอบ cron ถัดไป) · [1] value รอ 48 ชม.หลัง welcome · [2] final รอ 96 ชม.หลัง value
export const STAGE_DELAY_HOURS = [0, 48, 96];

/** contact เป็นอีเมลที่ส่งได้จริงไหม (LINE/เบอร์ ส่งอีเมลไม่ได้ → ข้าม nurture) */
export function isEmail(contact: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((contact || '').trim());
}

/**
 * คืน "ลำดับอีเมลที่ควรส่งตอนนี้" (1=welcome, 2=value, 3=final) หรือ null ถ้ายังไม่ถึงเวลา/จบแล้ว
 * @param lead สถานะ nurture ของ lead
 * @param nowMs เวลาปัจจุบัน (ms) — รับเข้ามาเพื่อทดสอบได้
 */
export function dueEmail(lead: NurtureLead, nowMs: number): 1 | 2 | 3 | null {
  const { createdAtMs, stage, lastAtMs } = lead;
  if (stage >= TOTAL_STAGES || stage < 0) return null;           // จบแล้ว/ค่าเพี้ยน
  const delayH = STAGE_DELAY_HOURS[stage] ?? 0;
  const ref = stage === 0 ? createdAtMs : (lastAtMs ?? createdAtMs); // นับจากเวลาส่งล่าสุด (stage 0 นับจากเข้ามา)
  if (nowMs - ref >= delayH * 3600_000) return (stage + 1) as 1 | 2 | 3;
  return null;
}
