/* marketplaceFees — โครงสร้างค่าธรรมเนียม Marketplace (source of truth เดียวของทั้งระบบ)
 *
 * สถานะปัจจุบัน (ยืนยันโดย User ส.ค. 2569): **ยังไม่เก็บค่าธรรมเนียม (0% จริง)**
 *   เหตุผลเชิงกลยุทธ์: ตลาดยังไม่มีซัพพลาย (storefronts 0 · orders 0) — การเก็บค่าธรรมเนียม
 *   ก่อนที่แพลตฟอร์มจะสร้างมูลค่าให้ผู้ขาย = กันคนเข้าตลาด (anti-pattern ของ marketplace)
 *   → ช่วงสร้างซัพพลาย "ฟรี 0%" แล้วค่อยเปิดเก็บเมื่อมีดีลจริง (เปลี่ยน FEE.live = true)
 *
 * ออกแบบตามหลัก: ค่าธรรมเนียมต้อง "ต่ำพอที่ผู้ขายจะอยู่ต่อ และไม่เกินมูลค่าที่แพลตฟอร์มสร้างให้"
 *   • ขั้นบันไดตามมูลค่า — ดีลเล็กจ่าย % สูง (คุ้มต้นทุนต่อรายการ) · ดีลใหญ่จ่าย % ต่ำ (ไม่ไล่ผู้ขายรายใหญ่หนี)
 *   • ค่าธรรมเนียมขั้นต่ำ — กันดีลจิ๋วที่ค่าดำเนินการแพงกว่าค่าธรรมเนียม
 *   • โปร่งใส 100% — ไม่มีค่าธรรมเนียมแอบซ่อน (ดู feeExplainTh)
 * pure/tested — ไม่มี side-effect
 */

/** เปิด/ปิดการเก็บค่าธรรมเนียมจริง + พารามิเตอร์ (แก้ที่เดียว มีผลทั้งระบบ) */
export const FEE = {
  /** false = ฟรี 0% ช่วงสร้างตลาด (ค่าปัจจุบัน) · true = เริ่มเก็บตามขั้นบันได */
  live: false,
  /** อัตราฐานเมื่อไม่ใช้ขั้นบันได (เท่าเดิมของระบบ = 3%) */
  baseRate: 0.03,
  /** ใช้ขั้นบันไดตามมูลค่าไหม (true = ตาม FEE_TIERS · false = baseRate คงที่) */
  tiered: true,
  /** ค่าธรรมเนียมขั้นต่ำต่อรายการ (บาท) — 0 = ไม่มีขั้นต่ำ */
  minFeeThb: 20,
} as const;

/** ค่าคงที่เดิมของระบบ (คงไว้เพื่อความเข้ากันได้ย้อนหลัง) */
export const PLATFORM_FEE_RATE = FEE.baseRate;

export interface FeeTier {
  /** ใช้กับมูลค่าตั้งแต่ (บาท) */
  minAmount: number;
  rate: number;
  label: string;
}

/** ขั้นบันไดค่าธรรมเนียม — ดีลเล็ก % สูง / ดีลใหญ่ % ต่ำ (เรียงจากน้อยไปมาก) */
export const FEE_TIERS: FeeTier[] = [
  { minAmount: 0,       rate: 0.05,  label: 'ดีลเล็ก (ต่ำกว่า ฿5,000)' },
  { minAmount: 5_000,   rate: 0.03,  label: 'ดีลกลาง (฿5,000–100,000)' },
  { minAmount: 100_000, rate: 0.015, label: 'ดีลใหญ่ (฿100,000 ขึ้นไป)' },
];

/** หาขั้นของมูลค่านี้ */
export function tierFor(amount: number): FeeTier {
  const a = Math.max(0, amount);
  let found = FEE_TIERS[0];
  for (const t of FEE_TIERS) if (a >= t.minAmount) found = t;
  return found;
}

/** ส่วนลดค่าธรรมเนียมตามแพ็ก SaaS ที่ผู้ขายจ่ายอยู่ (ยิ่งจ่ายแพ็กสูง ยิ่งเสีย fee น้อย)
 *  ยังไม่บังคับใช้จนกว่า FEE.live = true — เตรียมไว้เป็นแรงจูงใจอัปเกรด */
export const PLAN_FEE_DISCOUNT: Record<string, number> = {
  free: 0, starter: 0, growth: 0.2, scale: 0.4, // 0.2 = ลดค่าธรรมเนียม 20%
};

export interface FeeQuote {
  amount: number;        // มูลค่าดีล (บาท)
  rate: number;          // อัตราที่ใช้จริง (0–1) — 0 เมื่อยังไม่เก็บ
  fee: number;           // ค่าธรรมเนียมที่เก็บจริง (บาท) — 0 เมื่อ FEE.live = false
  feeIfLive: number;     // ถ้าเก็บจะเป็นเท่าไร (ใช้โชว์ความโปร่งใส/ประเมินรายได้)
  net: number;           // ผู้ขายได้รับสุทธิ
  tierLabel: string;
  free: boolean;         // true = ช่วงฟรี (ยังไม่เก็บ)
  minApplied: boolean;   // ค่าธรรมเนียมถูกดันขึ้นเป็นขั้นต่ำหรือไม่
}

/** คำนวณค่าธรรมเนียมของดีลหนึ่ง — pure
 *  planId ใส่เพื่อคิดส่วนลดตามแพ็ก (มีผลเมื่อ FEE.live = true) */
export function feeFor(amount: number, planId = 'free'): FeeQuote {
  const a = Math.max(0, Math.round(amount || 0));
  const tier = tierFor(a);
  const baseRate = FEE.tiered ? tier.rate : FEE.baseRate;
  const discount = PLAN_FEE_DISCOUNT[planId] ?? 0;
  const rate = baseRate * (1 - discount);

  let feeIfLive = Math.round(a * rate);
  let minApplied = false;
  if (a > 0 && FEE.minFeeThb > 0 && feeIfLive < FEE.minFeeThb) {
    feeIfLive = Math.min(FEE.minFeeThb, a); // ไม่เก็บเกินมูลค่าดีล
    minApplied = true;
  }

  const fee = FEE.live ? feeIfLive : 0;
  return {
    amount: a,
    rate: FEE.live ? rate : 0,
    fee,
    feeIfLive,
    net: a - fee,
    tierLabel: tier.label,
    free: !FEE.live,
    minApplied,
  };
}

/** ข้อความอธิบายค่าธรรมเนียมแบบโปร่งใส (ผู้ขายอ่าน) — ไม่มีค่าธรรมเนียมแอบซ่อน */
export function feeExplainTh(amount: number, planId = 'free'): string {
  const q = feeFor(amount, planId);
  const baht = (n: number) => '฿' + n.toLocaleString('th-TH');
  if (q.free) {
    return `ฟรีช่วงเปิดตลาด — คุณได้รับเต็ม ${baht(q.net)} ` +
      `(ปกติค่าธรรมเนียม ${Math.round((FEE.tiered ? tierFor(q.amount).rate : FEE.baseRate) * 100)}% = ${baht(q.feeIfLive)} · ตอนนี้เรายังไม่เก็บ)`;
  }
  const pct = (q.rate * 100).toFixed(q.rate * 100 % 1 === 0 ? 0 : 1);
  return `คุณได้รับ ${baht(q.net)} จาก ${baht(q.amount)} — ค่าธรรมเนียมแพลตฟอร์ม ${pct}% = ${baht(q.fee)}` +
    (q.minApplied ? ' (ขั้นต่ำต่อรายการ)' : '') +
    ' ครอบคลุมการหาผู้ซื้อ ระบบใบเสนอราคา และการดูแลข้อพิพาท · ไม่มีค่าธรรมเนียมแอบซ่อน';
}

/** วลีสั้นสำหรับหน้าการตลาด/SEO — "ค่าดำเนินการคิดยังไง" (source of truth เดียว)
 *
 *  ทำไมต้องมี: ก่อนหน้านี้ /sell, /start, และหน้า Trade เขียนคนละแบบ
 *    (/sell + /start บอก "จ่าย 3% เมื่อขายได้จริง" · Trade บอก "ฟรี 0% ช่วงเปิดตลาด")
 *    ทั้งที่ระบบเก็บจริง ฿0 → หน้าที่โฆษณา 3% ทิ้งข้อเสนอที่แรงกว่าไปเปล่า ๆ
 *  ตอนนี้ทุกหน้าเรียกฟังก์ชันนี้ → เปิด FEE.live เมื่อไร ข้อความเปลี่ยนตามทันทีทุกที่
 *
 *  @param style 'short' = ต่อท้ายประโยคอื่นได้ · 'full' = ประโยคสมบูรณ์พร้อมเหตุผล
 */
export function feeHeadlineTh(style: 'short' | 'full' = 'short'): string {
  const pct = Math.round(FEE.baseRate * 100);
  if (!FEE.live) {
    return style === 'short'
      ? `ช่วงเปิดตลาดยังไม่คิดค่าดำเนินการ (ปกติ ${pct}% เมื่อขายได้จริง)`
      : `ช่วงเปิดตลาดยังไม่คิดค่าดำเนินการเลย — ขายได้เท่าไรได้เต็มจำนวน ` +
        `(อัตราปกติ ${pct}% เมื่อขายได้จริง จะแจ้งล่วงหน้าก่อนเริ่มเก็บ)`;
  }
  return style === 'short'
    ? `คิดค่าดำเนินการ ${pct}% เมื่อขายได้จริง (ไม่ขาย = ไม่จ่าย)`
    : `คิดค่าดำเนินการ ${pct}% เฉพาะเมื่อขายได้จริง — ไม่ขายก็ไม่จ่าย ` +
      `ดีลใหญ่เสียอัตราต่ำลงตามขั้น และไม่มีค่าธรรมเนียมแอบซ่อน`;
}

export interface FeeProjection {
  txns: number;
  avgValue: number;
  gmv: number;
  revenue: number;       // รายได้ค่าธรรมเนียม (ตามอัตราจริง ณ ตอนนี้)
  revenueIfLive: number; // ถ้าเปิดเก็บแล้วจะได้เท่าไร
  effectiveRate: number; // revenueIfLive / gmv
}

/** ประเมินรายได้ค่าธรรมเนียมต่อเดือน — ใช้ตัดสินใจว่าควรเปิดเก็บเมื่อไร (pure) */
export function feeProjection(txns: number, avgValue: number, planId = 'free'): FeeProjection {
  const n = Math.max(0, Math.round(txns || 0));
  const v = Math.max(0, Math.round(avgValue || 0));
  const per = feeFor(v, planId);
  const gmv = n * v;
  return {
    txns: n,
    avgValue: v,
    gmv,
    revenue: n * per.fee,
    revenueIfLive: n * per.feeIfLive,
    effectiveRate: gmv > 0 ? (n * per.feeIfLive) / gmv : 0,
  };
}
