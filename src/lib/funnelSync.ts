/** เชื่อมข้อมูล Funnel จริง (GA4 → กรอกเอง) — pure helpers, ทดสอบได้
 *  GA4 gtag (client) ส่ง event ได้อย่างเดียว อ่านรายงานไม่ได้ → ผู้ใช้ก็อป "จำนวนผู้ใช้ต่อ step"
 *  จาก GA4 Funnel Exploration มาวางที่แอป (Phase 1) · auto-sync ผ่าน GA4 Data API = Phase 2 (ต้อง service account) */

import type { FunnelStage } from '../types';

/** ดึงจำนวนเต็ม ≥0 จากข้อความที่วาง (รองรับ comma/บรรทัด/แท็บ + เลขหลักพัน "1,234") */
export function parseFunnelNumbers(raw: string): number[] {
  if (!raw || typeof raw !== 'string') return [];
  const out: number[] = [];
  // จับกลุ่มตัวเลข (อาจมี , คั่นหลักพัน) — ตัด , ที่คั่นหลักพันออกก่อนแปลง
  const matches = raw.match(/\d[\d,]*/g) ?? [];
  for (const m of matches) {
    const n = parseInt(m.replace(/,/g, ''), 10);
    if (Number.isFinite(n) && n >= 0) out.push(n);
  }
  return out;
}

/** วางตัวเลขที่ได้ทับ leads ของ funnel (เท่าที่มี — step ที่ไม่มีเลข คงค่าเดิม) */
export function applyFunnelNumbers(funnel: FunnelStage[], nums: number[]): FunnelStage[] {
  return funnel.map((f, i) => (i < nums.length ? { ...f, leads: nums[i] } : f));
}

/** funnel ยังเป็นข้อมูลตัวอย่างอยู่ไหม (ยังไม่เคยเชื่อม/กรอกจริง) */
export function isSeedFunnel(source: string | undefined): boolean {
  return source !== 'real';
}
