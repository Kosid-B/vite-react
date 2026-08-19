/* paymentReadiness — "รับเงินได้จริงไหม" คือเฟสสุดท้ายของวงจร PDCA ที่เราไม่เคยตรวจเลย
 *
 * ทำไมไฟล์นี้ถึงต้องมี (ตรวจจาก production จริง 19 ส.ค. 2569):
 *   `payment_submissions` มี **0 แถว ตลอดกาล** — แปลว่าเส้นทางรับเงินยังไม่เคยถูกใช้จริงสักครั้ง
 *   และ `PAYMENT.slipOkLive = true` แปลว่า **server เป็นผู้ตัดสินและเปิดแพ็ก** ฝั่ง client
 *   ไม่เปิดให้เองแล้ว (ปิดช่องโหว่ "อัปรูปมั่วก็เปิดฟรี" ถูกต้องแล้ว) — แต่ผลข้างเคียงคือ
 *   **ถ้าคีย์/สาขา/โควตาผิดอยู่ ลูกค้าที่จ่ายเงินคนแรกจะถูกปฏิเสธ** และเราไม่มีทางรู้ล่วงหน้าเลย
 *
 *   ลูกค้าคนแรกที่ยอมจ่าย = คนที่หายากที่สุด · ให้เขาเป็นคนแรกที่ทดสอบระบบ = เดิมพันที่แพงที่สุด
 *
 * หลักของไฟล์นี้: **"ยังไม่เคยพิสูจน์" ต้องดังกว่า "ไม่มีข้อผิดพลาด"**
 *   ระบบที่ไม่เคยถูกใช้ ไม่ได้แปลว่าใช้ได้ — มันแปลว่ายังไม่รู้ และความเงียบนั้นอันตราย
 *
 * pure ทั้งไฟล์
 */

export type PayState = 'unproven' | 'ok' | 'at_risk' | 'blocked';

export interface PaymentReadinessInput {
  /** true = server ตัดสิน (ไม่มี fallback ฝั่ง client) · false = เชื่อผู้ใช้ไปก่อน แล้วตรวจย้อนหลัง */
  slipOkLive: boolean;
  /** จำนวนสลิปที่เคยถูกส่งเข้ามาทั้งหมด */
  slipsTotal: number;
  /** จำนวนสลิปที่ผ่านการตรวจกับธนาคารจริง — นี่คือหลักฐานเดียวว่าเส้นทางเงินใช้ได้ */
  slipsVerified: number;
  /** โควตาการตรวจสลิปที่เหลือ · null = ตรวจไม่ได้จากที่นี่ (ต้องเรียก slipok-quota-check) */
  quotaLeft?: number | null;
  /** ISO วันหมดอายุแพ็กโควตา · null = ไม่ทราบ */
  quotaExpiresAt?: string | null;
  now?: string;
}

export interface PaymentReadiness {
  state: PayState;
  /** เคยมีสลิปผ่านจริงอย่างน้อย 1 ใบหรือยัง */
  proven: boolean;
  headline: string;
  /** ความเสี่ยงเรียงจากแรงไปเบา — 🔴 ต้องแก้ก่อนรับเงินจริง · 🟡 จุดบอด */
  risks: string[];
  nextAction: string;
}

/** เหลือโควตาน้อยกว่านี้ = ต้องเติมก่อน ไม่ใช่รอให้หมดแล้วค่อยรู้ตอนลูกค้าจ่าย */
export const QUOTA_LOW = 10;
/** ใกล้หมดอายุกี่วันถึงต้องเตือน */
export const EXPIRY_WARN_DAYS = 14;

const dayMs = 86_400_000;

function daysUntil(iso: string | null | undefined, now?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  const n = now ? Date.parse(now) : Date.now();
  if (isNaN(t) || isNaN(n)) return null;
  return Math.floor((t - n) / dayMs);
}

export function paymentReadiness(inp: PaymentReadinessInput): PaymentReadiness {
  const risks: string[] = [];
  const proven = inp.slipsVerified > 0;

  if (!proven) {
    if (inp.slipOkLive) {
      risks.push(
        '🔴 ยังไม่เคยมีสลิปผ่านการตรวจจริงสักใบ และ SlipOK ตัดสินฝั่ง server อยู่ — ' +
        'ถ้าคีย์/สาขา/โควตาผิด ลูกค้าที่จ่ายเงินคนแรกจะโดนปฏิเสธ และเราจะรู้ตอนที่สายไปแล้ว',
      );
    } else {
      risks.push('🟡 ยังไม่เคยมีสลิปเข้ามา — แต่โหมดนี้เปิดแพ็กให้ก่อนแล้วตรวจย้อนหลัง จึงไม่บล็อกลูกค้า');
    }
  }

  if (inp.slipsTotal > 0 && inp.slipsVerified === 0) {
    risks.push(`🔴 มีสลิปส่งเข้ามา ${inp.slipsTotal} ใบ แต่ไม่ผ่านสักใบ — เส้นทางเงินพังอยู่ ไม่ใช่ "ยังไม่มีลูกค้า"`);
  }

  if (inp.quotaLeft == null) {
    risks.push('🟡 โควตาตรวจสลิปที่เหลือ: ตรวจจากในแอปไม่ได้ — ต้องเรียก slipok-quota-check (ไม่กินโควตา)');
  } else if (inp.quotaLeft <= 0) {
    risks.push('🔴 โควตาตรวจสลิปหมดแล้ว — ทุกการจ่ายเงินจะถูกปฏิเสธด้วยเหตุผลฝั่งร้าน');
  } else if (inp.quotaLeft < QUOTA_LOW) {
    risks.push(`🟡 โควตาตรวจสลิปเหลือ ${inp.quotaLeft} ครั้ง — เติมก่อนที่จะรู้ตอนลูกค้ากำลังจ่าย`);
  }

  const dLeft = daysUntil(inp.quotaExpiresAt, inp.now);
  if (dLeft !== null && dLeft <= 0) {
    risks.push('🔴 แพ็กโควตา SlipOK หมดอายุแล้ว');
  } else if (dLeft !== null && dLeft <= EXPIRY_WARN_DAYS) {
    risks.push(`🟡 แพ็กโควตา SlipOK หมดอายุในอีก ${dLeft} วัน — ต่ออายุก่อน ไม่ใช่หลัง`);
  }

  const hasRed = risks.some((r) => r.startsWith('🔴'));
  const state: PayState = hasRed ? (proven ? 'at_risk' : 'blocked')
    : proven ? 'ok' : 'unproven';

  const headline = proven
    ? `เส้นทางรับเงินพิสูจน์แล้ว (ผ่านจริง ${inp.slipsVerified} ใบ)`
    : 'เส้นทางรับเงิน **ยังไม่เคยถูกใช้จริงสักครั้ง** — ยังไม่รู้ว่ารับเงินได้หรือไม่';

  const nextAction = proven
    ? (hasRed ? 'แก้ความเสี่ยง 🔴 ข้างต้นก่อน — ตอนนี้รับเงินได้ แต่มีเงื่อนไขที่จะทำให้ล้ม'
              : 'เส้นทางเงินพร้อม — กลับไปโฟกัสที่การพาคนเข้ามา')
    : 'โอนเงินจริงจำนวนน้อย (เช่น ฿1) เข้าบัญชีตัวเอง แล้วอัปสลิปผ่านหน้าแพ็กเกจ 1 ครั้ง — ' +
      'ใช้โควตา 1 จาก 100 และเป็นวิธีเดียวที่พิสูจน์ทั้งเส้นได้จริง (คีย์ · สาขา · บัญชีผู้รับ · การเปิดแพ็ก)';

  return { state, proven, headline, risks, nextAction };
}
