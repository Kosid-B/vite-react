/* ===== เพดานงบวิดีโอ — source of truth เดียวของทั้งระบบ (pure · เทสต์ได้) =====
 *
 * เจ้าของยืนยัน 22 ส.ค. 2569: **฿1,000 ต่อเดือน คือเพดานรวมทั้งระบบ**
 * ไม่ใช่ต่อคน ไม่ใช่ต่อเวิร์กสเปซ — คือทั้งหมดที่ยอมเสียได้ต่อเดือน
 *
 * 🔴 ทำไมต้องมีไฟล์นี้ ไม่ใช่เช็คตรง ๆ ตอนเรียก provider
 *   ① วิดีโอเป็นค่าใช้จ่ายที่ "บานได้เงียบ ๆ" — 1 คลิปแพงกว่า 1 คำถาม AI หลายพันเท่า
 *      คนเดียวกดรัว 20 ครั้งใน 5 นาที = งบทั้งเดือนหายก่อนใครรู้ตัว
 *   ② โปรเจกต์เคยพลาดแบบเดียวกันมาแล้ว: `activateFromSlip` เปิดแพ็กฝั่ง client
 *      = อัปรูปมั่วก็เปิดแพ็กได้ → ต้องย้ายไป server (`verify-slip`)
 *      ⇒ เพดานที่อยู่ฝั่ง client แก้ด้วย devtools ได้ **ต้องบังคับฝั่ง server เสมอ**
 *   ③ แพตเทิร์นเดียวกับ `CeoAiAgent.checkGuestTokens` — **จองก่อนเรียก** ไม่ใช่หักทีหลัง
 *      หักทีหลัง = ยิงพร้อมกัน 10 request ผ่านหมด เพราะตอนเช็คยังไม่มีใครใช้
 *
 * ⚠️ fail-closed เสมอ: ประเมินราคาไม่ได้ = ไม่อนุญาต
 *   (ปฏิเสธคลิป = ผู้ใช้เสียใจ · งบบาน = เราจ่ายจริงและอาจต้องปิดฟีเจอร์ทั้งตัว)
 */

/** เงินที่เจ้าของควักจ่ายเองต่อเดือน (บาท) — เจ้าของยืนยัน 22 ส.ค. 2569
 *
 * 🔴 เพดานนี้คุม **เฉพาะผู้ใช้แพ็กฟรี** ไม่ใช่ทั้งระบบ
 *   ตอนแรกผมเขียนให้คุมทุกคน แล้วเจอว่ามันพังโดยโครงสร้าง:
 *   ถ้าลูกค้าแพ็ก growth 10 คน ใช้คนละ 15 คลิป = ฿2,280 ซึ่งเกิน ฿1,000
 *   ⇒ **ระบบจะปฏิเสธคนที่จ่ายเงินมาแล้ว** = ขายของที่ส่งมอบไม่ได้
 *   ค่าเรนเดอร์ของลูกค้าที่จ่ายเงิน ต้องมาจากค่าสมาชิกของเขาเอง ไม่ใช่จากกระเป๋าเจ้าของ */
export const FREE_POOL_THB_PER_MONTH = 1000;

/** 🟡 อัตราแลกเปลี่ยนที่ใช้แปลง cost_usd ของ provider → บาท
 *  ยังไม่ได้ตรึงกับแหล่งจริง — ตั้งสูงไว้ก่อนโดยตั้งใจ (ประเมินแพงไว้ = ปลอดภัยกว่าประเมินถูก)
 *  ต้องอัปเดตเมื่อมีบิลจริงใบแรก */
export const USD_TO_THB = 38;

/** กันไม่ให้เวิร์กสเปซเดียวกินงบทั้งเดือน — คนเดียวใช้ได้ไม่เกินสัดส่วนนี้ของงบรวม
 *  30% = ต่อให้มีคนกดรัวสุดแรง ก็ยังเหลืองบให้อีกอย่างน้อย 3 คนได้ลอง */
export const MAX_SHARE_PER_WORKSPACE = 0.3;

/** กันงบหมดกลางเดือน — เหลือไว้ 15% สำหรับงานที่ค้างอยู่ในคิว + คลิปที่ต้องเรนเดอร์ซ้ำเพราะพัง */
export const RESERVE_PCT = 0.15;

export type VideoPlan = 'free' | 'starter' | 'growth' | 'scale';

/** จำนวนคลิปฟรีต่อเดือนต่อเวิร์กสเปซ
 *  🔴 ตัวเลขนี้ **ไม่ใช่คำสัญญา** — เพดานเงินชนะเสมอ
 *     ถ้างบรวมหมด free ได้ 0 คลิปแม้จะยังไม่ครบโควตา (ดู decide() เหตุผล 'global')
 *  free = 1 โดยตั้งใจ: "อาฮ่า" ต้องได้ฟรี แต่คลิปที่ 2 ต้องจ่าย (แพตเทิร์นเดียวกับโควตา token) */
export const FREE_CLIPS_PER_MONTH: Record<VideoPlan, number> = {
  free: 1, starter: 4, growth: 15, scale: 50,
};

export type BudgetInput = {
  /** ใช้ไปแล้วทั้งระบบเดือนนี้ (บาท) — รวมงานที่จองไว้แต่ยังไม่เสร็จด้วย */
  spentGlobalThb: number;
  /** ใช้ไปแล้วของเวิร์กสเปซนี้เดือนนี้ (บาท) */
  spentWsThb: number;
  /** คลิปที่เวิร์กสเปซนี้สร้างสำเร็จแล้วเดือนนี้ */
  clipsThisMonth: number;
  /** ราคาที่ประเมินไว้ของคลิปนี้ (บาท) — null = ประเมินไม่ได้ */
  estCostThb: number | null;
  plan: VideoPlan;
};

export type BudgetReason = 'ok' | 'no-estimate' | 'quota' | 'workspace-cap' | 'global' | 'reserve';

export type BudgetDecision = {
  allow: boolean;
  reason: BudgetReason;
  /** ข้อความที่แสดงให้ผู้ใช้ — บอกตรง ๆ ว่าติดอะไร ไม่โทษผู้ใช้ */
  message: string;
  /** งบที่เหลือให้เวิร์กสเปซนี้ (บาท) */
  remainingWsThb: number;
  /** งบที่เหลือทั้งระบบ (บาท) */
  remainingGlobalThb: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** แปลงราคา provider (USD) → บาท · ปัดขึ้นให้ปลอดภัย */
export function usdToThb(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) return Number.POSITIVE_INFINITY;  // fail-closed
  return round2(usd * USD_TO_THB);
}

/** งบกองกลางของผู้ใช้ฟรีที่ใช้ได้จริง (หักส่วนกันสำรองแล้ว) */
export function usablePoolThb(): number {
  return round2(FREE_POOL_THB_PER_MONTH * (1 - RESERVE_PCT));
}

/** เพดานของเวิร์กสเปซฟรีเดียว — กันคนเดียวกินงบกองกลางทั้งเดือน */
export function freeWorkspaceCapThb(): number {
  return round2(FREE_POOL_THB_PER_MONTH * MAX_SHARE_PER_WORKSPACE);
}

/** เพดานค่าเรนเดอร์ของแพ็กที่จ่ายเงิน — มาจากค่าสมาชิกของเขาเอง ไม่แตะงบกองกลาง
 *  ตั้งที่ ~15% ของค่าแพ็ก เพื่อให้เหลือกำไร ≥30% ตามกฎ MIN_MARGIN_PCT หลังรวมค่า token แล้ว */
export const PAID_RENDER_BUDGET_THB: Record<Exclude<VideoPlan, 'free'>, number> = {
  starter: 88,    // แพ็ก ฿590
  growth: 223,    // แพ็ก ฿1,490
  scale: 885,     // แพ็ก ฿5,900
};

/**
 * ตัดสินว่าเรนเดอร์คลิปนี้ได้ไหม — **ต้องเรียกฝั่ง server ก่อนยิงเข้า provider เสมอ**
 * ลำดับการตรวจสำคัญ: ประเมินราคาไม่ได้ → โควตาคลิป → เพดานคน → เพดานรวม
 * (เรียงจาก "เหตุผลที่ผู้ใช้แก้ได้เอง" ไป "เหตุผลที่เป็นเรื่องของเรา")
 */
export function decide(input: BudgetInput): BudgetDecision {
  const isFree = input.plan === 'free';
  // ผู้ใช้ฟรีกินงบกองกลาง · ผู้ใช้ที่จ่ายเงินกินงบของแพ็กตัวเอง (ไม่แตะกองกลาง)
  const usable = isFree ? usablePoolThb() : Number.POSITIVE_INFINITY;
  const wsCap = isFree
    ? freeWorkspaceCapThb()
    : PAID_RENDER_BUDGET_THB[input.plan as Exclude<VideoPlan, 'free'>];
  const remainingGlobalThb = isFree ? round2(Math.max(0, usable - input.spentGlobalThb)) : Infinity;
  const remainingWsThb = round2(Math.max(0, Math.min(wsCap - input.spentWsThb, remainingGlobalThb)));
  const base = { remainingWsThb, remainingGlobalThb };

  // ① ประเมินราคาไม่ได้ = ไม่อนุญาต (fail-closed)
  if (input.estCostThb === null || !Number.isFinite(input.estCostThb) || input.estCostThb < 0) {
    return { allow: false, reason: 'no-estimate', ...base,
      message: 'ยังประเมินค่าเรนเดอร์ของคลิปนี้ไม่ได้ จึงยังสั่งทำไม่ได้ — ไม่ใช่ความผิดของคุณ เราต้องแก้ฝั่งระบบก่อน' };
  }

  // ② โควตาคลิปของแพ็ก
  const quota = FREE_CLIPS_PER_MONTH[input.plan];
  if (input.clipsThisMonth >= quota) {
    return { allow: false, reason: 'quota', ...base,
      message: `เดือนนี้ใช้ครบ ${quota} คลิปแล้ว — อัปแพ็กหรือรอเดือนหน้าได้` };
  }

  // ③ เพดานของเวิร์กสเปซนี้ (กันคนเดียวกินงบทั้งเดือน)
  if (input.spentWsThb + input.estCostThb > wsCap) {
    return { allow: false, reason: 'workspace-cap', ...base,
      message: `คลิปนี้จะทำให้ยอดของคุณเกินเพดาน ฿${wsCap} ต่อเดือน — ลองคลิปที่สั้นลงหรือรอเดือนหน้า` };
  }

  // ④ เพดานรวมทั้งระบบ
  if (input.spentGlobalThb + input.estCostThb > usable) {
    const hitReserve = input.spentGlobalThb + input.estCostThb <= FREE_POOL_THB_PER_MONTH;
    return { allow: false, reason: hitReserve ? 'reserve' : 'global', ...base,
      message: 'โควตาเรนเดอร์ของผู้ใช้ฟรีเดือนนี้เต็มแล้ว — บทและสตอรีบอร์ดยังใช้ได้ตามปกติ ไม่มีค่าใช้จ่าย' };
  }

  return { allow: true, reason: 'ok', ...base, message: '' };
}

/** จำนวนคลิปที่งบรวมยังรองรับได้ ถ้าคลิปละ costThb — ใช้โชว์ให้แอดมินเห็นว่างบจะพอถึงสิ้นเดือนไหม */
export function clipsAffordable(costThb: number, spentGlobalThb = 0): number {
  if (!Number.isFinite(costThb) || costThb <= 0) return 0;
  return Math.max(0, Math.floor((usablePoolThb() - spentGlobalThb) / costThb));
}
