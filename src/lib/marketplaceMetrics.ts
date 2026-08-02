// marketplaceMetrics.ts — สุขภาพ marketplace "ระดับแพลตฟอร์ม" (ทั้งระบบ ไม่ใช่ต่อผู้ใช้)
// หลัก (จาก playbook marketplace-metrics): สุขภาพ marketplace ไม่ได้วัดที่ "จำนวนผู้ใช้รวม"
//   แต่วัดที่ "ซัพพลายกับดีมานด์เจอกันไหม" — Liquidity คือตัวเลขความเป็นความตาย
// pure/testable · ป้อนค่ารวมที่ admin โหลดได้ (storefront=ซัพพลาย · ดีลปิด/ออเดอร์=ธุรกรรม · RFQ/ลีด=ดีมานด์)
// ต่างจาก marketplaceHealth.ts (funnel ต่อผู้ใช้) — อันนี้มองทั้งตลาดเพื่อการตัดสินใจของแพลตฟอร์ม

/** ค่าธรรมเนียมแพลตฟอร์มมาตรฐาน (3%) — ใช้ประเมิน take revenue เมื่อไม่ได้ส่งค่าจริงมา */
export const DEFAULT_TAKE_RATE = 0.03;

export interface MpMetricsInput {
  listings: number;        // หน้าร้านที่เผยแพร่ (ซัพพลาย)
  sellers: number;         // ผู้ขายที่มีร้าน (distinct — ใช้ประเมิน supply side)
  txns: number;            // จำนวนธุรกรรมสำเร็จ (ดีลปิด/ออเดอร์ completed)
  gmv: number;             // มูลค่ารวมธุรกรรม (บาท)
  takeRevenue?: number;    // รายได้แพลตฟอร์ม (ค่าธรรมเนียม) — ถ้าไม่ส่ง จะประเมินจาก DEFAULT_TAKE_RATE
  demandSignals: number;   // สัญญาณดีมานด์ (RFQ + ลีด)
}

export type MpMaturity = 'pre-launch' | 'seeding' | 'liquid';
export interface MpAlert { level: 'warn' | 'info' | 'good'; msg: string }

export interface MpMetrics {
  gmv: number;
  takeRevenue: number;
  takeRate: number;        // takeRevenue / gmv (0–1)
  listings: number;
  sellers: number;
  txns: number;
  demandSignals: number;
  liquidity: number;       // txns / listings (proxy: สัดส่วนร้านที่มีธุรกรรม · 0–1) — คุมเพดานที่ 1
  supplyDemand: number;    // listings / demandSignals (>1 = ซัพพลายเกิน)
  maturity: MpMaturity;    // ระยะของตลาดตามปริมาณธุรกรรม
  alerts: MpAlert[];       // ธงเตือนตาม threshold ของ playbook
  diagnosis: string;       // สรุป + สิ่งที่ควรทำต่อ (honest)
}

const ratio = (num: number, den: number): number => (den > 0 ? num / den : 0);

/** ประเมินสุขภาพตลาดทั้งแพลตฟอร์มจากค่ารวม — pure */
export function marketplaceMetrics(inp: MpMetricsInput): MpMetrics {
  const listings = Math.max(0, inp.listings);
  const sellers = Math.max(0, inp.sellers);
  const txns = Math.max(0, inp.txns);
  const gmv = Math.max(0, inp.gmv);
  const demandSignals = Math.max(0, inp.demandSignals);
  const takeRevenue = inp.takeRevenue != null ? Math.max(0, inp.takeRevenue) : Math.round(gmv * DEFAULT_TAKE_RATE);

  const takeRate = ratio(takeRevenue, gmv);
  const liquidity = Math.min(1, ratio(txns, listings));
  const supplyDemand = ratio(listings, demandSignals);

  // ระยะตลาด: ยังไม่มีธุรกรรม = pre-launch · มีบ้าง = seeding · liquidity ผ่านเกณฑ์ = liquid
  const maturity: MpMaturity = txns === 0 ? 'pre-launch' : (liquidity >= 0.3 && txns >= 5 ? 'liquid' : 'seeding');

  const alerts: MpAlert[] = [];
  if (txns === 0) {
    alerts.push({ level: 'info', msg: 'ยังไม่มีธุรกรรม — โฟกัสสร้างดีลแรก (จับคู่ซัพพลาย↔ดีมานด์) ก่อนวัด liquidity' });
  } else {
    if (liquidity < 0.2) alerts.push({ level: 'warn', msg: `Liquidity ${(liquidity * 100).toFixed(0)}% ต่ำ (<20%) — ร้านส่วนใหญ่ยังไม่มีธุรกรรม` });
    else if (liquidity >= 0.3) alerts.push({ level: 'good', msg: `Liquidity ${(liquidity * 100).toFixed(0)}% ผ่านเกณฑ์สุขภาพ (≥30%)` });
    if (supplyDemand > 5 && demandSignals > 0) alerts.push({ level: 'warn', msg: `ซัพพลาย:ดีมานด์ = ${supplyDemand.toFixed(1)}:1 (>5) — ร้านล้น ดีมานด์ไม่พอ` });
    if (takeRate > 0 && takeRate < DEFAULT_TAKE_RATE * 0.8) alerts.push({ level: 'warn', msg: `Take rate ${(takeRate * 100).toFixed(1)}% ต่ำกว่าที่ตั้ง — อาจมีดีลปิดนอกแพลตฟอร์ม` });
  }
  if (listings > 0 && demandSignals === 0) alerts.push({ level: 'info', msg: 'มีร้านแต่ยังไม่มีสัญญาณดีมานด์ (RFQ/ลีด) — ควรดันฝั่งผู้ซื้อ' });

  // Diagnosis (จาก flowchart ของ playbook)
  let diagnosis: string;
  if (listings === 0) {
    diagnosis = 'ตลาดยังว่าง — เริ่มที่ฝั่งซัพพลาย: ชวนผู้ใช้เปิดหน้าร้าน/ลงสินค้าให้ถึงมวลวิกฤต';
  } else if (txns === 0) {
    diagnosis = demandSignals === 0
      ? 'มีร้านแล้วแต่ไม่มีทั้งดีมานด์และธุรกรรม — ปัญหาอยู่ฝั่ง "ผู้ซื้อ": ดัน traffic/ลีดเข้าหน้าร้าน + ประกาศงานกลาง (RFQ)'
      : 'มีร้าน + ดีมานด์ แต่ยังไม่ปิดดีล — ปัญหา "การจับคู่": ปรับการค้นหา/หมวด/แนะนำ ให้ผู้ซื้อเจอร้านที่ใช่';
  } else if (liquidity < 0.2) {
    diagnosis = supplyDemand > 5
      ? 'Liquidity ต่ำเพราะร้านล้น — ชะลอรับผู้ขาย ยกคุณภาพร้าน + เพิ่มงบดึงผู้ซื้อ'
      : 'Liquidity ต่ำ — เพิ่มดีมานด์ (ผู้ซื้อ) หรือปรับการจับคู่ให้ธุรกรรมเกิดง่ายขึ้น';
  } else {
    diagnosis = `ตลาดเริ่มหมุน — Liquidity ${(liquidity * 100).toFixed(0)}% · GMV ฿${gmv.toLocaleString()} · รักษาสมดุลซัพพลาย↔ดีมานด์ แล้วค่อยเร่งสเกล`;
  }

  return {
    gmv, takeRevenue, takeRate, listings, sellers, txns, demandSignals,
    liquidity, supplyDemand, maturity, alerts, diagnosis,
  };
}
