import type { AppData } from '../types';

/* ===== CMO วิเคราะห์ตลาด + แบ่งกลุ่มลูกค้า (Customer Segmentation) รายสัปดาห์ =====
 * ให้ CMO agent ดึงข้อมูลตลาดจริง (Serper) ทุกวันศุกร์ → สรุปกลุ่มลูกค้า + กลยุทธ์ต่อกลุ่ม
 * กรอบ: RFM + Behavioral + Needs-based (3–4 กลุ่ม) พร้อมกลยุทธ์การสื่อสาร/ข้อเสนอต่อกลุ่ม */

/** แท็กสัปดาห์ (YYYY-Www) เพื่อรันสัปดาห์ละครั้ง */
export function weekTag(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** ถึงเวลาที่ CMO ควรวิเคราะห์รอบสัปดาห์นี้ไหม (วันศุกร์เป็นต้นไป และยังไม่ได้ทำสัปดาห์นี้) */
export function shouldRunWeekly(d: AppData, now = new Date()): boolean {
  const isFriOrLater = now.getDay() === 5 || now.getDay() === 6 || now.getDay() === 0; // ศุกร์/เสาร์/อาทิตย์
  return isFriOrLater && d.cmoMarket?.weekTag !== weekTag(now);
}

/** คำสั่งให้ CMO agent วิเคราะห์ (ใช้กับ agent-run + web search) */
export function segmentationInstruction(d: AppData): string {
  const c = d.aiCompany;
  const closed = (d.marketplace?.deals ?? []).filter(x => x.status === 'closed');
  const winCtx = closed.length
    ? 'ดีล/ลูกค้าที่ปิดสำเร็จล่าสุด: ' + closed.slice(0, 5).map(x => `${x.title} (฿${(x.amount || 0).toLocaleString('th-TH')})`).join(' · ')
    : 'ยังไม่มีดีลที่ปิด — ใช้ตัวอย่างสมมติที่สมจริงจากอุตสาหกรรม';
  return [
    `ทำหน้าที่ CMO วิเคราะห์ "ตลาดและกลุ่มลูกค้า" ของธุรกิจ: ${c?.name || 'บริษัท'} (${c?.industry || 'ไม่ระบุอุตสาหกรรม'})`,
    `เป้าหมายบริษัท: ${c?.goal || '-'}`,
    winCtx,
    '',
    'ให้ค้นข้อมูลตลาดล่าสุด (คู่แข่ง ราคา เทรนด์ความต้องการ) แล้วจัดทำ Customer Segmentation:',
    '1) แบ่งลูกค้าเป็น 3–4 กลุ่ม (ใช้กรอบ RFM / พฤติกรรม / ความต้องการ) ตั้งชื่อกลุ่มให้จำง่าย',
    '2) แต่ละกลุ่ม ระบุ: ลักษณะเด่น · มูลค่า/ศักยภาพ · ช่องทางเข้าถึง',
    '3) กลยุทธ์ต่อกลุ่ม: เป้าหมาย · ความถี่/โทนการสื่อสาร · ข้อเสนอ (offer) · ข้อความหลัก (key message)',
    '4) Customer Lifetime Value (CLV/LTV): ประเมินมูลค่าลูกค้าตลอดช่วงชีวิต + อัตรา LTV:CAC ที่คุ้ม',
    '5) Customer Win Story: เลือกลูกค้า/ดีลที่สำเร็จ 1 ราย เขียนเรื่องราวความสำเร็จ',
    '   (สถานการณ์ก่อน · ความท้าทาย · สิ่งที่เราทำ · ผลลัพธ์+ตัวเลข · บทเรียนที่ทำซ้ำได้) เพื่อเสนอ CEO/ทีม',
    '6) 3 การลงมือทำสำคัญของสัปดาห์นี้ (ทำได้จริง วัดผลได้)',
    '',
    'ตอบเป็นภาษาไทย กระชับ อ่านง่าย เหมาะสำหรับเสนอ CEO/บอร์ด',
  ].join('\n');
}
