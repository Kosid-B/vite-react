/** สุขภาพลูป B2B marketplace — funnel RFQ→quote→accept→ดีลปิด (pure, ทดสอบได้)
 *  ตัดสินใจด้วยตัวเลข ไม่ใช่ความรู้สึก: liquidity คือตัวเลขความเป็นความตายของ marketplace
 *  ใช้ข้อมูลของผู้ใช้เอง (RFQ ที่ส่ง/รับ + ออเดอร์) — ไม่ต้อง query ข้ามระบบ/ไม่ชน RLS */

import type { Rfq, Order } from './trade';

export interface MarketHealth {
  rfqTotal: number;       // RFQ ที่เกี่ยวข้องกับฉัน (ส่ง+รับ)
  quoted: number;         // ได้ใบเสนอราคาแล้ว (quoted/accepted)
  accepted: number;       // ผู้ซื้อกดรับ → เกิดออเดอร์
  dealsCompleted: number; // ออเดอร์สถานะ completed
  gmvCompleted: number;   // มูลค่ารวมดีลที่ปิดสำเร็จ (บาท)
  quoteRate: number;      // quoted / rfqTotal (0–1)
  acceptRate: number;     // accepted / quoted (0–1)
  closeRate: number;      // dealsCompleted / accepted (0–1)
  stage: 'none' | 'waiting' | 'quoted' | 'near' | 'flowing';
  label: string;          // สรุปสั้นให้ผู้ใช้อ่าน
}

const pct = (num: number, den: number): number => (den > 0 ? num / den : 0);

/** รวม RFQ ไม่ซ้ำ (ส่งออก+เข้ามา) แล้วคำนวณ funnel + มูลค่าดีลปิดจากออเดอร์ */
export function marketplaceHealth(rfqs: Rfq[], orders: Order[]): MarketHealth {
  const seen = new Set<string>();
  const uniq: Rfq[] = [];
  for (const r of rfqs) {
    if (r.id && !seen.has(r.id)) { seen.add(r.id); uniq.push(r); }
  }
  const rfqTotal = uniq.length;
  const quoted = uniq.filter(r => r.status === 'quoted' || r.status === 'accepted').length;
  const accepted = uniq.filter(r => r.status === 'accepted').length;
  const completedOrders = orders.filter(o => o.status === 'completed');
  const dealsCompleted = completedOrders.length;
  const gmvCompleted = completedOrders.reduce((s, o) => s + (o.amount || 0), 0);

  let stage: MarketHealth['stage'] = 'none';
  let label = 'ยังไม่มีดีล — ประกาศงานกลาง หรือเสนอราคางานแรกวันนี้';
  if (dealsCompleted > 0) {
    stage = 'flowing';
    label = `ลูปเริ่มหมุน — ปิดดีลแล้ว ${dealsCompleted} ดีล · GMV ฿${gmvCompleted.toLocaleString()}`;
  } else if (accepted > 0) {
    stage = 'near';
    label = 'ใกล้ปิดดีลแรก — มีออเดอร์แล้ว ดันให้ถึงสถานะ "สำเร็จ"';
  } else if (quoted > 0) {
    stage = 'quoted';
    label = 'มีใบเสนอราคาแล้ว — รอผู้ซื้อกดรับ/ต่อรอง';
  } else if (rfqTotal > 0) {
    stage = 'waiting';
    label = 'มี RFQ แล้ว — รอผู้ขายตอบใบเสนอราคา';
  }

  return {
    rfqTotal, quoted, accepted, dealsCompleted, gmvCompleted,
    quoteRate: pct(quoted, rfqTotal),
    acceptRate: pct(accepted, quoted),
    closeRate: pct(dealsCompleted, accepted),
    stage, label,
  };
}
