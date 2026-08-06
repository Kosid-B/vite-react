// terms.ts — คำไทยคู่กับศัพท์อังกฤษ (กันลูกค้า SME งงศัพท์การตลาด)
// ใช้ทั่ว UI: แสดง "คำไทย (EN)" เช่น "ความคุ้มค่า (ROI)"

export const TERM_TH: Record<'roi' | 'b2b' | 'b2c', { th: string; en: string; hint: string }> = {
  roi: { th: 'ความคุ้มค่า', en: 'ROI', hint: 'ลงทุนไปเท่าไหร่ ได้กลับมาเท่าไหร่ คุ้มไหม' },
  b2b: { th: 'ขายให้ธุรกิจ/องค์กร', en: 'B2B', hint: 'ลูกค้าคือบริษัท ร้านค้า โรงงาน (ซื้อประจำ/ทีละมาก)' },
  b2c: { th: 'ขายให้ลูกค้าทั่วไป', en: 'B2C', hint: 'ลูกค้าคือผู้บริโภคทั่วไป (ซื้อกินซื้อใช้เอง)' },
};

/** "คำไทย (EN)" เช่น termLabel('roi') → "ความคุ้มค่า (ROI)" */
export function termLabel(k: keyof typeof TERM_TH): string {
  const t = TERM_TH[k];
  return `${t.th} (${t.en})`;
}
