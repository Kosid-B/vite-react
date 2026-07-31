// planCost.ts — แหล่งความจริงเดียวของ "ต้นทุน/มาร์จินต่อแพ็ก" (pure/tested)
// เดิมกระจาย hardcode 3 ที่ (Billing มี buildCost จริง · Analytics/Admin ใช้เลข stale) → รวมมาที่นี่
// ต้นทุน AI = blended cost จริง (mix งาน 50% assist / 20% plan / 30% agent · Sonnet) จาก aiCost.ts
// calls/price ต้องตรงกับ usage.ts (PLAN_AI_CALLS) + access.ts (PLAN_PRICE_NUM)
import { callCostThb, CALL_PROFILE } from './aiCost';

export interface CostItem { label: string; amount: number; note: string; }
export interface PlanCost { items: CostItem[]; total: number; price: number; margin: number; } // margin = % (0-100)

/** ต้นทุน AI จริงต่อ 1 call (บาท) — blended จาก mix งานจริง */
export const BLENDED_CALL_THB =
  0.5 * callCostThb('claude-sonnet-4-6', CALL_PROFILE.assist.in, CALL_PROFILE.assist.out) +
  0.2 * callCostThb('claude-sonnet-4-6', CALL_PROFILE.plan.in, CALL_PROFILE.plan.out) +
  0.3 * callCostThb('claude-sonnet-4-6', CALL_PROFILE.agent.in, CALL_PROFILE.agent.out);

/** สร้าง PlanCost จาก quota จริง + ค่า infra/support — margin คำนวณสด (กัน hardcode ล้าสมัย) */
export function buildCost(
  calls: number, price: number, infra: number, support: number,
  infraNote = 'Database, Edge Functions, Storage', supportNote = 'ทีมพัฒนาและดูแลระบบ',
): PlanCost {
  const ai = Math.round(calls * BLENDED_CALL_THB);
  const total = ai + infra + support;
  return {
    items: [
      { label: 'Claude AI API', amount: ai, note: `${calls.toLocaleString()} calls × ~฿${BLENDED_CALL_THB.toFixed(2)}/call (blended · Sonnet)` },
      { label: 'Supabase + Hosting', amount: infra, note: infraNote },
      { label: 'Support & Development', amount: support, note: supportNote },
    ],
    total, price,
    margin: +(((price - total) / price) * 100).toFixed(1),
  };
}

export type PaidPlan = 'starter' | 'growth' | 'scale';

/** ต้นทุน/มาร์จินต่อแพ็ก (แหล่งความจริงเดียว) — ใช้ร่วม Billing / Analytics / Admin */
export const PLAN_COST: Record<PaidPlan, PlanCost> = {
  starter: buildCost(300, 790, 60, 25),
  growth: buildCost(700, 1490, 250, 180),
  scale: buildCost(5000, 5900, 550, 300, 'Database, Edge Functions, Storage (priority tier)', 'ทีมพัฒนาและดูแลระบบ (dedicated)'),
};

/** margin เป็นสัดส่วน 0-1 (ใช้ในที่ที่คิดเป็น fraction เช่น Analytics) */
export function marginFraction(plan: PaidPlan): number {
  return PLAN_COST[plan].margin / 100;
}
