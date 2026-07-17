/* ===== Challenger headline rotation (จุดยืน co-opetition ท้าชนเจ้าใหญ่) =====
 * แสดงบน Landing page แล้ว "สลับ content 2 ครั้ง/วัน" ที่เวลาไทย (UTC+7): 11:00 และ 20:00
 * วนครบทั้ง 4 headline (ทุก 2 วันครบรอบ) · pure + testable (รับ nowMs เข้ามา ไม่เรียก Date ข้างใน) */

export const CHALLENGER_HEADLINES: string[] = [
  'เจ้าใหญ่ทำ AI ให้องค์กรใหญ่ — เราทำให้ SME ไทยจ้างทีม AI ทั้งบริษัทได้',
  'ไม่ต้องรองบล้านเพื่อใช้ AI — SME ไทยมีทีม AI ของตัวเองได้แล้ว ฟรี 15 วัน',
  'AI สำหรับบริษัทใหญ่มีเยอะ — แต่ AI ที่เข้าใจ SME ไทย ทำ ISO/เอกสารได้จริง มีที่เดียว',
  'ที่ปรึกษาจริง 20 ปี + ทีม AI = สิ่งที่แพลตฟอร์มต่างชาติให้คุณไม่ได้',
];

const HOUR = 3600_000;
const DAY = 86400_000;
const TH_OFFSET = 7 * HOUR; // เวลาไทย = UTC+7

/**
 * index ของ headline ที่ควรแสดง ณ เวลา nowMs (epoch ms)
 * เปลี่ยนค่าเฉพาะตอนข้ามเวลาไทย 11:00 และ 20:00 (ไม่เปลี่ยนตอนเที่ยงคืน)
 */
export function challengerIndex(nowMs: number, count = CHALLENGER_HEADLINES.length): number {
  const th = nowMs + TH_OFFSET;
  const day = Math.floor(th / DAY);
  const hour = Math.floor(th / HOUR) % 24;
  let slot: number;
  if (hour < 11) slot = (day - 1) * 2 + 1;        // 00:00–10:59 = ช่วงเย็นของ "วันก่อนหน้า" (ต่อเนื่องจาก 20:00)
  else if (hour < 20) slot = day * 2;             // 11:00–19:59 = ช่วงกลางวัน
  else slot = day * 2 + 1;                         // 20:00–23:59 = ช่วงค่ำ
  return ((slot % count) + count) % count;
}

/** headline ปัจจุบันตามเวลาไทย */
export function currentChallenger(nowMs: number): string {
  return CHALLENGER_HEADLINES[challengerIndex(nowMs)];
}
