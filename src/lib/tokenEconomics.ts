// tokenEconomics.ts — เศรษฐศาสตร์ Token: ออกแบบเพดาน token ให้ "กำไร ≥ 30% ของรายได้" เสมอ (pure, tested)
//
// ทำไมต้องมี: ระบบเดิมนับ "จำนวน call" (usage.ts / ai_usage) — call เดียวกินได้ตั้งแต่ 1.1k–2.5k tokens
//   → ต้นทุนจริงเหวี่ยง. เปลี่ยนมาคิดเป็น "token" ทำให้คุมต้นทุน/มาร์จินได้แม่นตรงกับบิลผู้ให้บริการ.
//
// หลักความปลอดภัยของมาร์จิน (สำคัญ): คิดต้นทุนที่ "แพงสุดจริง" = โมเดล default ของ edge function
//   (claude-sonnet-4-6 $3/$15 ต่อ 1M) และคิดแบบ "ผู้ใช้ใช้เต็มเพดาน". ถ้าตั้ง MODEL_SIMPLE=haiku
//   ต้นทุนจริงถูกลง ~3 เท่า → มาร์จินยิ่งดีกว่าที่คำนวณ. ทุกแพ็ก/ท็อปอัปในไฟล์นี้ผ่าน MIN_MARGIN_PCT.
//
// 3 ชั้นตามที่ User กำหนด:
//   (A) โควตา token ฟรี "รายวัน" — ให้คนบน Landing ได้ลองจริง + ให้ "คนดูนาน (dwell สูง)" มากกว่า
//       เพราะมีแนวโน้มสมัคร (สัญญาณจาก landing_funnel: dwell/scroll/reached CTA)
//   (B) เพดาน token ต่อ "แพ็ก 15 วัน (ทดลอง) + รายเดือน" ให้กำไร ≥ 30% ของราคาแพ็ก
//   (C) ซื้อ token เพิ่ม (top-up) ราคาให้กำไร > 30% ของราคาที่ผู้ใช้จ่าย

import type { PlanId } from '../types';

/** อัตราแลกเปลี่ยนประมาณ (บาท/ดอลลาร์) — ตรงกับ aiCost.ts */
export const USD_THB = 36;

/** สัดส่วน output token เฉลี่ยต่อ 1 งาน (จาก CALL_PROFILE ใน aiCost.ts ~45%) — output แพงกว่า input มาก */
export const OUTPUT_SHARE = 0.45;

/** กำไรขั้นต่ำที่ยอมรับได้ (% ของรายได้) — ข้อกำหนดจาก User */
export const MIN_MARGIN_PCT = 30;

/** ราคา USD ต่อ 1M tokens (input, output) — ค่าจากราคาป้ายผู้ให้บริการ */
export interface TokenPrice { inUsd: number; outUsd: number }
export const TOKEN_PRICE: Record<string, TokenPrice> = {
  'claude-sonnet-4-6': { inUsd: 3, outUsd: 15 }, // default ของ edge function = worst-case จริง
  'claude-haiku-4-5':  { inUsd: 1, outUsd: 5 },  // ถ้าตั้ง MODEL_SIMPLE=haiku → ถูกลง ~3 เท่า
};

/** โมเดลที่ใช้เป็น "ฐานคิดต้นทุน" (แพงสุดที่เสิร์ฟจริง) — คิดมาร์จินบนตัวนี้เพื่อความปลอดภัย */
export const COST_BASIS_MODEL = 'claude-sonnet-4-6';

/** ต้นทุน (บาท) ต่อ 1,000 tokens แบบ blended (ผสม in/out ตาม OUTPUT_SHARE) */
export function blendedThbPer1k(model: string = COST_BASIS_MODEL, outputShare: number = OUTPUT_SHARE): number {
  const p = TOKEN_PRICE[model] ?? TOKEN_PRICE[COST_BASIS_MODEL];
  const perMillionThb = (p.inUsd * (1 - outputShare) + p.outUsd * outputShare) * USD_THB;
  return perMillionThb / 1000;
}

/** ต้นทุน (บาท) ของ N tokens ที่โมเดลฐาน (default = Sonnet worst-case) */
export function tokenCostThb(tokens: number, model: string = COST_BASIS_MODEL): number {
  return (Math.max(0, tokens) / 1000) * blendedThbPer1k(model);
}

/** มาร์จิน (%) = (ราคา − ต้นทุน) / ราคา — ราคา ≤ 0 → 0 */
export function marginPct(priceThb: number, costThb: number): number {
  return priceThb > 0 ? ((priceThb - costThb) / priceThb) * 100 : 0;
}

/** ผ่านเกณฑ์กำไรขั้นต่ำไหม (≥ MIN_MARGIN_PCT) */
export function meetsMinMargin(priceThb: number, tokens: number): boolean {
  return marginPct(priceThb, tokenCostThb(tokens)) >= MIN_MARGIN_PCT;
}

// ─────────────────────────────────────────────────────────────────────────────
// (B) เพดาน token ต่อแพ็ก (รายเดือน) — กำไร ≥ 30% ของราคาแพ็ก
//   ตัวเลขเลือกให้ "ใจกว้างกว่าโควตา call เดิม" (ดึงดูดสมัคร) แต่ worst-case ยังกำไร ~49–54%
//   → เผื่อ opex อื่น (Supabase/Cloudflare/ค่าธรรมเนียมจ่ายเงิน ~3%) แล้วกำไรสุทธิยัง ≥ 30%
// ─────────────────────────────────────────────────────────────────────────────

/** ราคาแพ็กรายเดือน (บาท) — ตรงกับ PLAN_PRICE_NUM ใน access.ts */
export const PLAN_PRICE_THB: Record<Exclude<PlanId, 'free'>, number> = {
  starter: 790,
  growth: 1490,
  scale: 5900,
};

/** เพดาน token ต่อเดือนของแต่ละแพ็ก (free = ใช้โควตาฟรีรายวันแทน ไม่มีก้อนเดือน)
 *  ตั้งแบบ "ใจกว้าง" (ยืนยันโดย User) — worst-case กำไร ~38–43% (net หลัง opex ยัง ≥30%) */
export const PLAN_MONTHLY_TOKENS: Record<Exclude<PlanId, 'free'>, number> = {
  starter: 1_500_000,
  growth: 3_000_000,
  scale: 12_000_000,
};

export interface PlanTokenReport {
  plan: PlanId;
  priceThb: number;
  monthlyTokens: number;
  costThb: number;   // ต้นทุน worst-case ถ้าใช้เต็มเพดาน
  marginPct: number; // กำไร % ของราคาแพ็ก
  ok: boolean;       // ผ่าน MIN_MARGIN_PCT
}

/** รายงานมาร์จินของแพ็กหนึ่ง (worst-case ใช้เต็มเพดาน) */
export function planTokenReport(plan: Exclude<PlanId, 'free'>): PlanTokenReport {
  const priceThb = PLAN_PRICE_THB[plan];
  const monthlyTokens = PLAN_MONTHLY_TOKENS[plan];
  const costThb = tokenCostThb(monthlyTokens);
  const m = marginPct(priceThb, costThb);
  return { plan, priceThb, monthlyTokens, costThb, marginPct: m, ok: m >= MIN_MARGIN_PCT };
}

/** รายงานทุกแพ็กเสียเงิน */
export function allPlanReports(): PlanTokenReport[] {
  return (Object.keys(PLAN_MONTHLY_TOKENS) as Array<Exclude<PlanId, 'free'>>).map(planTokenReport);
}

// ─────────────────────────────────────────────────────────────────────────────
// ทดลอง 15 วัน — ต้นทุนเป็น CAC (ไม่มีรายได้) จึงคุมเพดานให้ "ลองได้จริงแต่ไม่บานปลาย"
// ─────────────────────────────────────────────────────────────────────────────

export const TRIAL_DAYS = 15;
/** เพดาน token รวมตลอดช่วงทดลอง 15 วัน (ปลดฟีเจอร์ระดับ Scale แต่จำกัด token) — ใจกว้างเพื่อ conversion */
export const TRIAL_TOKENS = 400_000;

/** ต้นทุน worst-case ต่อผู้ทดลอง 1 คน (เพดาน CAC) */
export function trialCostThb(): number {
  return tokenCostThb(TRIAL_TOKENS);
}

// ─────────────────────────────────────────────────────────────────────────────
// (A) โควตา token ฟรี "รายวัน" — ให้คนบน Landing ลองจริง + ให้ "คนดูนาน" มากกว่า
//   สัญญาณ engagement มาจาก landing_funnel (dwell วินาที · scroll % · ถึงปุ่ม CTA)
//   ต้นทุนส่วนนี้ = การตลาด/CAC (ไม่มีรายได้) — คุมด้วยเพดานรายวัน
// ─────────────────────────────────────────────────────────────────────────────

export type Engagement = 'cold' | 'warm' | 'hot';

/** token ฟรีต่อวันตามระดับ engagement (คนดูนาน/มีส่วนร่วม = โอกาสสมัครสูง → ให้มากกว่า) */
export const FREE_DAILY_TOKENS: Record<Engagement, number> = {
  cold: 20_000, // เพิ่งเข้า ยังไม่ผูกพัน
  warm: 40_000, // เริ่มสนใจ (เลื่อนดู/อยู่พอควร)
  hot: 70_000,  // ดูนาน/ถึงปุ่มสมัคร = โอกาสสมัครสูงสุด → ดันให้ลองเยอะ
};

export interface EngagementSignal {
  dwellSec: number;   // เวลาที่อยู่บนหน้า (วินาที) — landing_funnel.max_dwell
  scrollPct: number;  // เลื่อนดูลึกสุด (%) — landing_funnel.max_scroll
  reachedCta: boolean;// เลื่อน/คลิกถึงปุ่ม CTA — landing_funnel.reached_cta
}

/** จัดระดับ engagement จากสัญญาณ landing — เกณฑ์ยิ่งสูง = ยิ่งมีแนวโน้มสมัคร */
export function engagementTier(sig: EngagementSignal): Engagement {
  if (sig.reachedCta || sig.dwellSec >= 120) return 'hot';
  if (sig.dwellSec >= 30 || sig.scrollPct >= 50) return 'warm';
  return 'cold';
}

/** token ฟรีรายวันที่ควรให้ผู้เยี่ยมชมคนนี้ (จากพฤติกรรมการดูหน้า) */
export function freeDailyTokens(sig: EngagementSignal): number {
  return FREE_DAILY_TOKENS[engagementTier(sig)];
}

/** ต้นทุน worst-case ต่อวันของโควตาฟรีระดับหนึ่ง (บาท) */
export function freeDailyCostThb(tier: Engagement): number {
  return tokenCostThb(FREE_DAILY_TOKENS[tier]);
}

// ─────────────────────────────────────────────────────────────────────────────
// (C) ซื้อ token เพิ่ม (top-up) — ราคาให้กำไร > 30% ของราคาที่ผู้ใช้จ่าย
//   credits ใช้ได้เฉพาะเดือนที่ซื้อ (ตรงกับ ai_topup.month) · แทนแพ็ก call เดิมใน topup.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface TokenPack {
  id: string;
  tokens: number;
  priceThb: number;
  label: string;
  best?: boolean;
}

export const TOKEN_PACKS: TokenPack[] = [
  { id: 'tok_1m',  tokens: 1_000_000,  priceThb: 550,  label: '+1M tokens' },
  { id: 'tok_3m',  tokens: 3_000_000,  priceThb: 1500, label: '+3M tokens', best: true },
  { id: 'tok_10m', tokens: 10_000_000, priceThb: 4900, label: '+10M tokens' },
];

export function tokenPackById(id: string): TokenPack | undefined {
  return TOKEN_PACKS.find((p) => p.id === id);
}

/** มาร์จิน (%) ของแพ็ก top-up (worst-case) */
export function packMargin(pack: TokenPack): number {
  return marginPct(pack.priceThb, tokenCostThb(pack.tokens));
}

/** ราคาต่อ 1M tokens (บาท, ปัดเต็ม) — ใช้โชว์ "เฉลี่ย ฿x/1M" */
export function pricePerMillionThb(pack: TokenPack): number {
  return pack.tokens > 0 ? Math.round(pack.priceThb / (pack.tokens / 1_000_000)) : 0;
}

/** ควรชวนซื้อ top-up ไหม — ใช้ไปแล้ว ≥ 80% ของเพดาน token */
export function shouldOfferTopup(usedTokens: number, quotaTokens: number): boolean {
  return quotaTokens > 0 && usedTokens / quotaTokens >= 0.8;
}

/** แนะนำแพ็กจาก "token ที่น่าจะขาด" — เล็กสุดที่ครอบคลุม, ไม่มี → ใหญ่สุด */
export function recommendTokenPack(tokensNeeded: number): TokenPack {
  const sorted = [...TOKEN_PACKS].sort((a, b) => a.tokens - b.tokens);
  return sorted.find((p) => p.tokens >= tokensNeeded) ?? sorted[sorted.length - 1];
}
