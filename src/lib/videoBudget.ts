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

/** ต้นทุนจริงของ 1 คลิป (บาท · worst case) — คำนวณ 22 ส.ค. 2569 จากราคา provider จริง
 *    เรนเดอร์ Wan 2.6 8 วินาที 1080p  $0.40 = ฿15.20
 *  × ตัวคูณงานที่ต้องทำซ้ำ 1.6 เท่า            = ฿24.32   🟡 ยังไม่รู้อัตราจริง ตั้งแพงไว้ก่อน
 *  + ชั้นบท (LLM ~12,000 tokens worst case)   = ฿3.63
 *  + เสียงไทย TTS (~150 ตัวอักษร)              = ฿0.09
 *                                        รวม ≈ ฿28  → ปัดขึ้นเป็น 35 เผื่อพลาด
 *  ⚠️ ตัวเลขที่แพงที่สุดไม่ใช่ค่าเรนเดอร์ แต่คือ "คลิปที่ออกมาแล้วใช้ไม่ได้ ต้องทำใหม่"
 *     ⇒ ทุกอย่างที่ลดอัตราทำซ้ำ (prompt ดีขึ้น · ให้ผู้ใช้ยืนยัน storyboard ก่อนเรนเดอร์)
 *       ประหยัดกว่าการเปลี่ยนไปหา provider ที่ถูกกว่า */
export const WORST_CASE_CLIP_THB = 35;

/** 🔴 คลิปฟรี = **1 คลิปตลอดชีพ** ไม่ใช่ต่อเดือน
 *
 *  ตอนแรกผมตั้งเป็น 1 คลิป/เดือน แล้วคำนวณดูถึงเห็นว่ามันฆ่าการเติบโตของตัวเอง:
 *    งบกองกลาง ฿850 ÷ ฿28 = ~30 คลิป/เดือน
 *    ถ้าให้ฟรีทุกเดือน → เดือนที่ 1 ผู้ใช้ฟรี 30 คนได้อาฮ่า
 *                       เดือนที่ 2 คน 30 คนเดิมมารับอีก → งบหมด → **คนใหม่ไม่ได้อะไรเลย**
 *    ⇒ งบทั้งก้อนถูกล็อกไว้กับคนกลุ่มเดิมที่ยังไม่จ่ายเงิน การเติบโตหยุดตายที่ 30 คน
 *  ให้ครั้งเดียวตลอดชีพ → ทุกเดือนมีที่ว่างให้ **คนใหม่ 30 คน** ได้อาฮ่าเสมอ
 *  (อาฮ่าต้องเกิดครั้งเดียว · การให้ซ้ำคือค่าบำรุงรักษา ไม่ใช่ค่าหาลูกค้า) */
export const FREE_CLIPS_LIFETIME = 1;

/** โควตาคลิปต่อเดือนของแพ็กที่จ่ายเงิน
 *
 * 🔴 ตัวเลขชุดแรกที่ผมตั้ง (4/15/50) **ทำให้ทุกแพ็กขาดทุนเชิงมาร์จิน**
 *   เพราะลืมว่าราคาแพ็กถูกกินไปกับโควตา token อยู่แล้ว 57-61%
 *     starter ฿790  → ต้นทุน token ฿454 (57%) เหลือให้วิดีโอแค่ ฿99
 *     growth  ฿1,490 → ต้นทุน token ฿907 (61%) เหลือ ฿136
 *     scale   ฿5,900 → ต้นทุน token ฿3,629 (62%) เหลือ ฿501
 *   ⇒ 15 คลิปใน growth = ฿525 ค่าวิดีโอ ทำให้มาร์จินเหลือ **3.9%**
 *   ⚠️ และเทสต์ตัวแรกที่ผมเขียนก็ผิดแบบเดียวกัน — มันเช็ค marginPct(ราคา, ค่าวิดีโอ)
 *      โดยไม่ใส่ต้นทุน token เข้าไป ⇒ **เทสต์เห็นด้วยกับความผิดพลาด แทนที่จะจับได้**
 *      (บทเรียนเดิมของโปรเจกต์: เทสต์ที่เขียนตอนแก้บั๊ก ต้องถามก่อนว่ามันล็อกพฤติกรรมที่ถูก
 *       หรือล็อกความเข้าใจผิดของคนเขียนไว้) → กลไกใหม่: planMarginOk() ด้านล่าง */
export const PAID_CLIPS_PER_MONTH: Record<Exclude<VideoPlan, 'free'>, number> = {
  starter: 2, growth: 3, scale: 14,
};

/** โควตา token ต่อเดือนของแต่ละแพ็ก (mirror ของ PLAN_MONTHLY_TOKENS — ใช้ตรวจมาร์จิน) */
export const PLAN_TOKENS_MIRROR: Record<Exclude<VideoPlan, 'free'>, number> = {
  starter: 1_500_000, growth: 3_000_000, scale: 12_000_000,
};

/** 🎬 แพ็กสายวิดีโอที่เสนอ — ฿1,790/เดือน
 *
 *  ที่มาของตัวเลข: แพ็กเดิมให้คลิปเยอะไม่ได้ เพราะราคาถูกกินไปกับ token หมดแล้ว
 *  ⇒ ทางออกไม่ใช่ "เอาวิดีโอไปแปะบน growth" แต่คือ **แพ็กที่โควตา token ตรงกับที่คนสายวิดีโอใช้จริง**
 *     (คนที่มาทำคลิป ไม่ได้มานั่งคุยกับ AI 3 ล้าน token/เดือน)
 *
 *    ฿1,790 × 70% (กันกำไร 30%)          = ฿1,253 คืองบต้นทุนทั้งหมดที่ใช้ได้
 *  − token 1.5M (เท่าแพ็ก starter)        = ฿454
 *  = เหลือให้วิดีโอ ฿799 ÷ ฿35            = 22 คลิป (เพดาน)
 *  ⇒ ตั้งที่ **20 คลิป** = 1 คลิปทุกวันทำการ · มาร์จิน 35.5% (เผื่อไว้เหนือเกณฑ์ 5.5%)
 *
 *  🟡 ความเสี่ยงเดียวที่เหลือ: ตัวคูณงานที่ต้องทำซ้ำ (ตั้งไว้ 1.6×)
 *     ถ้าของจริงเป็น 2.5× ต้นทุน/คลิปขึ้นเป็น ~฿42 ⇒ มาร์จินเหลือ 28% = ตกเกณฑ์
 *     **ห้ามเปิดขายแพ็กนี้ก่อนรู้อัตราทำซ้ำจริงจากเฟส 0** */
export const VIDEO_PLAN = {
  priceThb: 1790,
  monthlyTokens: 1_500_000,
  clipsPerMonth: 20,
} as const;

/** เพดานค่าเรนเดอร์ของแพ็กที่จ่ายเงิน — **งอกจากโควตาที่สัญญาไว้** ไม่ใช่ตัวเลขที่ตั้งลอย ๆ
 *  🔴 ตอนแรกผมตั้งเป็น ~15% ของราคาแพ็ก แล้วเจอว่า starter ได้เพดาน ฿88
 *     แต่โควตา 4 คลิป × ฿28 = ฿112 ⇒ **ระบบจะตัดที่คลิปที่ 3 ทั้งที่สัญญาไว้ 4**
 *     = ความผิดพลาดแบบเดียวกับที่เพิ่งแก้ไป แค่เล็กลง
 *  ⇒ ผูกสองตัวเลขนี้เข้าด้วยกันด้วยสูตร ไม่ใช่ด้วยความจำ (มีเทสต์บังคับว่ามาร์จินต้องยังผ่าน) */
export function paidRenderBudgetThb(plan: Exclude<VideoPlan, 'free'>): number {
  return PAID_CLIPS_PER_MONTH[plan] * WORST_CASE_CLIP_THB;
}

/** ตรวจว่าแพ็กหนึ่ง ๆ ยังมีกำไรถึงเกณฑ์ไหม **เมื่อนับต้นทุนทั้งสองก้อน**
 *  (ค่า token ที่สัญญาไว้ + ค่าเรนเดอร์วิดีโอที่สัญญาไว้) — ทั้งคู่คิดแบบใช้เต็มโควตา worst case
 *  🔴 นี่คือกลไกที่ควรมีตั้งแต่แรก: ตัวเลขโควตาคลิปห้ามตั้งโดยไม่ผ่านฟังก์ชันนี้ */
export function planTotalCostThb(monthlyTokens: number, clips: number, tokenCost: (t: number) => number): number {
  return round2(tokenCost(monthlyTokens) + clips * WORST_CASE_CLIP_THB);
}

export type BudgetInput = {
  /** ใช้ไปแล้วทั้งระบบเดือนนี้ (บาท) — รวมงานที่จองไว้แต่ยังไม่เสร็จด้วย */
  spentGlobalThb: number;
  /** ใช้ไปแล้วของเวิร์กสเปซนี้เดือนนี้ (บาท) */
  spentWsThb: number;
  /** คลิปที่เวิร์กสเปซนี้สร้างสำเร็จแล้วเดือนนี้ (ใช้กับแพ็กที่จ่ายเงิน) */
  clipsThisMonth: number;
  /** คลิปที่เวิร์กสเปซนี้เคยสร้างทั้งหมดตั้งแต่เปิดบัญชี (ใช้กับแพ็กฟรี) */
  clipsLifetime: number;
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
    : paidRenderBudgetThb(input.plan as Exclude<VideoPlan, 'free'>);
  const remainingGlobalThb = isFree ? round2(Math.max(0, usable - input.spentGlobalThb)) : Infinity;
  const remainingWsThb = round2(Math.max(0, Math.min(wsCap - input.spentWsThb, remainingGlobalThb)));
  const base = { remainingWsThb, remainingGlobalThb };

  // ① ประเมินราคาไม่ได้ = ไม่อนุญาต (fail-closed)
  if (input.estCostThb === null || !Number.isFinite(input.estCostThb) || input.estCostThb < 0) {
    return { allow: false, reason: 'no-estimate', ...base,
      message: 'ยังประเมินค่าเรนเดอร์ของคลิปนี้ไม่ได้ จึงยังสั่งทำไม่ได้ — ไม่ใช่ความผิดของคุณ เราต้องแก้ฝั่งระบบก่อน' };
  }

  // ② โควตาคลิป — ฟรีนับตลอดชีพ · จ่ายเงินนับรายเดือน
  if (isFree) {
    if (input.clipsLifetime >= FREE_CLIPS_LIFETIME) {
      return { allow: false, reason: 'quota', ...base,
        message: 'คลิปฟรีของคุณใช้ไปแล้ว — บทและสตอรีบอร์ดยังทำได้ไม่จำกัด อัปแพ็กเมื่อไรก็เรนเดอร์ต่อได้' };
    }
  } else {
    const quota = PAID_CLIPS_PER_MONTH[input.plan as Exclude<VideoPlan, 'free'>];
    if (input.clipsThisMonth >= quota) {
      return { allow: false, reason: 'quota', ...base,
        message: `เดือนนี้ใช้ครบ ${quota} คลิปแล้ว — อัปแพ็กหรือรอเดือนหน้าได้` };
    }
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
