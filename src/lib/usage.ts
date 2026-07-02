import type { PlanId } from '../types';

/** PLG — ติดตามการใช้งาน AI calls ต่อเดือน เพื่อแสดง usage meter
 *  และชวนอัปเกรดเมื่อใกล้เต็มโควตา (usage-based expansion) */

export const PLAN_AI_CALLS: Record<PlanId, number> = {
  free: 200,     // ช่วงทดลอง
  growth: 1000,  // ต่อเดือน
  scale: 5000,   // ต่อเดือน
};

const LS_KEY = 'ceo_ai_usage';

interface Usage { month: string; count: number }

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export function getAiUsage(): Usage {
  try {
    const u = JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') as Usage | null;
    if (u && u.month === currentMonth()) return u;
  } catch { /* เริ่มนับใหม่ */ }
  return { month: currentMonth(), count: 0 };
}

/** เรียกทุกครั้งที่ยิงงานเข้า AI (agent-run / ai-assist) */
export function trackAiCall(): void {
  const u = getAiUsage();
  localStorage.setItem(LS_KEY, JSON.stringify({ month: u.month, count: u.count + 1 }));
}

export function usagePct(plan: PlanId): number {
  const quota = PLAN_AI_CALLS[plan];
  return Math.min(100, Math.round((getAiUsage().count / quota) * 100));
}
