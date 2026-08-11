/* ===== Leak Finder — "ตัวจับรูรั่ว" ต้นทุนวันละนิด × 365 =====
 * แนวคิด latte factor พลิกมุมเจ้าของธุรกิจ: ค่าเล็ก ๆ ที่รั่ววันละนิด พอ × 365 = เงินก้อนที่หายไป
 * pure + tested — รับรายการรูรั่ว (ต่อวัน) → คำนวณต่อเดือน/ต่อปี + "เทียบเท่า" ให้เห็นภาพ
 * ⚠️ ไม่ใช่คำแนะนำการลงทุน · equivalents เป็นค่าประมาณเพื่อสื่อสาร (ระบุใน UI) */

export const DAYS_PER_YEAR = 365;

/** รูรั่วที่พบบ่อยในร้าน SME (ใช้เป็นแถวตั้งต้นให้ผู้ใช้กรอกมูลค่าต่อวัน) */
export interface LeakPreset { id: string; label: string; hint: string; }
export const LEAK_PRESETS: LeakPreset[] = [
  { id: 'underprice', label: 'ตั้งราคาต่ำไป (รวมทุกจาน/วัน)', hint: 'ราคาที่ควรเก็บเพิ่มต่อชิ้น × จำนวนขายต่อวัน' },
  { id: 'waste', label: 'ของเหลือทิ้ง / หมดอายุ', hint: 'มูลค่าวัตถุดิบที่ทิ้งต่อวัน' },
  { id: 'overserve', label: 'แถม / ตักเกินมือ', hint: 'ต้นทุนส่วนเกินที่แจกฟรีต่อวัน' },
  { id: 'utility', label: 'ไฟ / แก๊ส / น้ำ ใช้เกิน', hint: 'เปิดทิ้ง/ใช้เกินจำเป็นต่อวัน' },
  { id: 'other', label: 'อื่น ๆ', hint: 'รูรั่วอื่นที่นึกออก' },
];

export interface LeakEntry { label: string; perDay: number; }

export interface LeakItem { label: string; perDay: number; perYear: number; }
export interface LeakResult {
  items: LeakItem[];
  totalPerDay: number;
  totalPerMonth: number;
  totalPerYear: number;
  equivalents: string[];
}

/** ค่าประมาณเพื่อ "เทียบเท่า" ให้เห็นภาพ (ไม่ใช่ราคาจริง) */
const TRIP_COST = 30000;   // ทริปญี่ปุ่นประหยัด ~
const PHONE_COST = 20000;  // มือถือใหม่ ~

/** สร้างประโยค "เทียบเท่า" จากยอดรั่วต่อปี */
export function leakEquivalents(perYear: number, rentPerMonth?: number): string[] {
  const eq: string[] = [];
  if (perYear <= 0) return eq;
  if (rentPerMonth && rentPerMonth > 0) {
    const months = perYear / rentPerMonth;
    if (months >= 1) eq.push(`ค่าเช่าร้าน ~${months.toFixed(1)} เดือน`);
  }
  if (perYear >= TRIP_COST) eq.push(`ทริปญี่ปุ่นประหยัด ~${Math.floor(perYear / TRIP_COST)} รอบ`);
  if (perYear >= PHONE_COST) eq.push(`มือถือใหม่ ~${Math.floor(perYear / PHONE_COST)} เครื่อง`);
  return eq;
}

/** คำนวณรูรั่ว: รวมต่อวัน → × 365 ต่อปี + ต่อเดือน + เทียบเท่า (นับเฉพาะรายการ > 0) */
export function annualizeLeaks(entries: LeakEntry[], opts?: { rentPerMonth?: number }): LeakResult {
  const items: LeakItem[] = entries
    .filter((e) => Number.isFinite(e.perDay) && e.perDay > 0)
    .map((e) => ({ label: e.label, perDay: e.perDay, perYear: Math.round(e.perDay * DAYS_PER_YEAR) }));
  const totalPerDay = Math.round(items.reduce((s, i) => s + i.perDay, 0));
  const totalPerYear = Math.round(totalPerDay * DAYS_PER_YEAR);
  const totalPerMonth = Math.round(totalPerYear / 12);
  return {
    items,
    totalPerDay,
    totalPerMonth,
    totalPerYear,
    equivalents: leakEquivalents(totalPerYear, opts?.rentPerMonth),
  };
}
