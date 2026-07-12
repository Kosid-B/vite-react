/** รีวิวร้านค้า → AggregateRating (สะสมเป็น moat SEO ที่ลอกยาก) — pure, ทดสอบได้
 *  หลักการซื่อสัตย์: emit ดาวเฉพาะเมื่อมีรีวิว "จริง" (จากธุรกรรม/RFQ ที่ปิดจริง) เท่านั้น
 *  ห้ามปั้นดาวปลอม — Google ลงโทษ + เสียความน่าเชื่อถือ */

export interface StoreReview {
  id: string;
  slug: string;        // ร้านที่ถูกรีวิว
  rating: number;      // 1..5
  text?: string;
  by?: string;         // ผู้รีวิว (มาจากคู่ค้า/ลูกค้าที่ทำธุรกรรมจริง)
  orderId?: string;    // อ้างอิงออเดอร์/ดีลจริง (กันรีวิวลอย)
  at: string;
}

export interface AggregateRating { rating: number; reviewCount: number; }

/** รวมรีวิวจริง → ค่าเฉลี่ย (1 ทศนิยม) + จำนวน · คืน null ถ้าไม่มีรีวิวที่ถูกต้อง (จะได้ไม่ปั้นดาว) */
export function aggregateRating(reviews: Array<{ rating: number }> | undefined): AggregateRating | null {
  const valid = (reviews ?? []).filter(r => r && typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5);
  if (!valid.length) return null;
  const avg = valid.reduce((s, r) => s + r.rating, 0) / valid.length;
  return { rating: Math.round(avg * 10) / 10, reviewCount: valid.length };
}
