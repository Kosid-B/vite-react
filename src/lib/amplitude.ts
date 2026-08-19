/* ===== Amplitude sink — product analytics (funnel · retention · cohort) + Session Replay =====
 * ส่ง event ชุดเดียวกับ GA เข้า Amplitude ด้วย → ได้ funnel/retention/cohort เชิงลึก + "อัดเมาส์"
 * (Session Replay) ดูว่าคนเลื่อน/ลังเล/ค้างตรงไหนก่อนออก โดยไม่ต้องเขียน recorder เอง
 *
 * ⚠️ ไฟล์นี้ "ไม่ init" — การ init เกิดที่ src/main.tsx (รากของแอปฝั่ง client) ครั้งเดียวเท่านั้น
 *    ที่นี่เป็นแค่ helper ที่เรียกใช้ instance เดียวกัน (module singleton ของ SDK)
 * ── ความเป็นส่วนตัว ──
 *   • ทำงานเฉพาะเมื่อมี VITE_AMPLITUDE_KEY (public client key เหมือน GA id) — ไม่มี = inert สนิท
 *   • Session Replay ตั้ง mask ระดับ 'medium' = ปิดบังทุก input (อีเมล/ชื่อ/เบอร์) อัตโนมัติ (PDPA)
 *   • device id จัดการโดย SDK (นิรนาม)
 *   • ควร gate ด้วย consent เหมือน GA/Pixel — เรียก track() เมื่อผู้ใช้ยินยอมแล้วเท่านั้น (คุมที่จุดเรียก) */

import * as amplitude from '@amplitude/unified';

/** public client key (ฝังในบันเดิลได้โดยดีไซน์ เหมือน GA measurement id) — ตั้งผ่าน GitHub Secrets */
export const AMPLITUDE_KEY = (import.meta.env.VITE_AMPLITUDE_KEY as string | undefined)?.trim() || '';

export const isAmplitudeEnabled = Boolean(AMPLITUDE_KEY);

/** ส่ง event เข้า Amplitude (no-op ถ้าไม่มีคีย์) — SDK คิว event ที่ยิงก่อน init เสร็จให้เอง · เงียบเสมอ */
export function sendAmplitude(event: string, params: Record<string, string | number> = {}): void {
  if (!isAmplitudeEnabled || typeof window === 'undefined') return;
  try { amplitude.track(event, params); } catch { /* noop */ }
}

/** ผูก event กับผู้ใช้ (uuid นิรนาม) ตอน login — ให้ retention/cohort ตามรายคนได้ */
export function identifyAmplitudeUser(uid: string): void {
  if (!isAmplitudeEnabled || !uid) return;
  try { amplitude.setUserId(uid); } catch { /* noop */ }
}

/** ล้างตัวตนตอน logout (เริ่ม session ใหม่แบบนิรนาม) */
export function resetAmplitudeUser(): void {
  if (!isAmplitudeEnabled) return;
  try { amplitude.reset(); } catch { /* noop */ }
}
