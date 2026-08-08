// pricingCalc.ts — "ตั้งราคาขายเท่าไหร่ดี?" (lead magnet บน Landing)
// pure + deterministic (ทดสอบได้) · ไม่ต้อง login/AI — คำนวณฝั่ง browser
// จริยธรรม: ราคาแนะนำจาก "ต้นทุน + กำไรที่ผู้ใช้ตั้งเอง" (ไม่ปั้น) + เตือนให้เทียบราคาตลาด

export interface PriceInput {
  cost: number;              // ต้นทุนต่อชิ้น/งาน (บาท)
  marginPct: number;         // กำไรที่อยากได้ (% ของราคาขาย = gross margin)
  unitsPerMonth?: number;    // ขายกี่ชิ้น/เดือน (ไม่บังคับ) → กำไร/เดือน
}

export interface PriceResult {
  ok: boolean;
  price: number;             // ราคาที่ควรตั้ง
  profitPerUnit: number;     // กำไรต่อชิ้น
  markupPct: number;         // บวกจากต้นทุนกี่ %
  monthlyProfit: number;     // กำไร/เดือน (ถ้าใส่ยอดขาย)
  note: string;
}

/** ราคาขาย = ต้นทุน / (1 - margin%) · margin เป็น % ของ "ราคาขาย" (มาตรฐานบัญชี) */
export function suggestPrice(inp: PriceInput): PriceResult {
  const cost = Number(inp.cost);
  const m = Number(inp.marginPct);
  if (!(cost > 0) || !(m > 0) || m >= 95) {
    return { ok: false, price: 0, profitPerUnit: 0, markupPct: 0, monthlyProfit: 0, note: '' };
  }
  const price = Math.round(cost / (1 - m / 100));
  const profitPerUnit = price - cost;
  const markupPct = Math.round((profitPerUnit / cost) * 100);
  const units = Math.max(0, Math.floor(Number(inp.unitsPerMonth) || 0));
  const monthlyProfit = profitPerUnit * units;
  return {
    ok: true, price, profitPerUnit, markupPct, monthlyProfit,
    note: 'ราคาแนะนำจากต้นทุน + กำไรที่คุณตั้ง — อย่าลืมเทียบราคาตลาด/คู่แข่ง และรวมค่าใช้จ่ายแฝง (ค่าส่ง/ค่าธรรมเนียม) ด้วย',
  };
}
