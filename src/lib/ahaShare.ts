// ahaShare.ts — Aha-moment trigger (Viral Loop เฟส A): จับ "ชัยชนะจริง" ของธุรกิจ → ชวนแชร์/ชวนเพื่อน
// หลัก: ยิงคำชวนตอนอารมณ์ผู้ใช้สูงสุด (ปิดดีลได้จริง) = แชร์เยอะสุด · ไม่ nag (โชว์เฉพาะ milestone ใหม่)
// pure/testable — การตัดสินใจแสดงผลอยู่ที่ component (เก็บ "seen" ฝั่ง client)
import type { AppData } from '../types';

/** จำนวนดีลที่ปิดสำเร็จ (closed) จาก marketplace — สัญญาณชัยชนะจริงของธุรกิจ (pure) */
export function closedDealCount(d: AppData): number {
  return (d.marketplace?.deals ?? []).filter(x => x?.status === 'closed').length;
}

/** ควรฉลอง + ชวนแชร์ไหม: มีดีลปิด "ใหม่" (มากกว่าที่ผู้ใช้เคยเห็นการ์ดไปแล้ว) — pure
 *  @param current จำนวน closed deals ปัจจุบัน
 *  @param seen จำนวน closed deals ครั้งล่าสุดที่ผู้ใช้ปิดการ์ดไปแล้ว (0 = ยังไม่เคย) */
export function hasNewDealMilestone(current: number, seen: number): boolean {
  return current > 0 && current > seen;
}
