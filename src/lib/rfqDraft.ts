/** ตัวช่วยร่าง RFQ + ใบเสนอราคา (fallback local / โครงให้ AI เติม) — pure, ทดสอบได้
 *  ใช้ใน Trade.tsx: ปุ่ม "✨ ให้ AI ช่วยร่าง" — prod เรียก ai-assist, local ใช้ฟังก์ชันนี้
 *  ลด friction ที่ฆ่า B2B marketplace (ผู้ซื้อไม่รู้จะเขียน RFQ ยังไง / ผู้ขายร่างใบเสนอราคาช้า) */

export interface RfqDraft { title: string; detail: string }
export interface QuoteDraft { amount: number; note: string }

/** ร่างเนื้อ RFQ จาก "ประโยคเดียว" ที่ผู้ซื้อพิมพ์ + หมวดผู้ขาย (ถ้ามี) */
export function draftRfqLocal(hint: string, sectorLabel?: string): RfqDraft {
  const h = hint.trim() || 'บริการที่ต้องการจัดจ้าง';
  const title = h.length > 60 ? h.slice(0, 57) + '…' : h;
  const detail = [
    `สิ่งที่ต้องการ: ${h}`,
    sectorLabel ? `หมวดผู้ขายที่มองหา: ${sectorLabel}` : '',
    'ขอบเขต/ปริมาณ: (โปรดระบุ เช่น จำนวน/สเปก/พื้นที่)',
    'กำหนดส่ง: (ระบุวันที่ต้องการ)',
    'สิ่งที่ใช้ตัดสินใจ: ราคา + ประสบการณ์/ผลงานที่ผ่านมา',
  ].filter(Boolean).join('\n');
  return { title, detail };
}

/** ร่างใบเสนอราคาจาก RFQ ที่รับเข้ามา — ผู้ขายกดแล้วปรับตัวเลข/เงื่อนไขได้ */
export function draftQuoteLocal(rfq: { title: string; budget: number }): QuoteDraft {
  const amount = rfq.budget > 0 ? rfq.budget : 0;
  const note = [
    `ขอบเขตงาน: ตามที่ระบุใน "${rfq.title}"`,
    'ระยะเวลาดำเนินการ: (ระบุจำนวนวันทำงาน)',
    'รวมภาษี/ค่าจัดส่งแล้ว: (ระบุ)',
    'เงื่อนไขชำระ: มัดจำ 50% · ส่วนที่เหลือเมื่อส่งมอบ',
  ].join('\n');
  return { amount, note };
}

/** ข้อความแชร์ประกาศงานกลางออกนอกแอป (FB/LINE) — ดึง demand จากภายนอกเข้าระบบ */
export function openRfqShareText(job: { title: string; budget: number; sectorLabel: string }, dirUrl: string): string {
  const budget = job.budget > 0 ? `\nงบประมาณ: ฿${job.budget.toLocaleString()}` : '';
  return `📣 ประกาศหาผู้รับงาน: ${job.title}\nหมวด: ${job.sectorLabel}${budget}\n\nสนใจเสนอราคา? เปิดร้านฟรีและรับงานได้ที่ ${dirUrl}`;
}
