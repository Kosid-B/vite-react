import type { HandoffPlan } from '../../supabase/functions/_shared/handoff';

/** เก็บ "แผน" ที่ verify แล้วจาก handoff ไว้ใน localStorage
 *  → App ดึงไป pre-fill บริษัท AI หลังผู้ใช้ล็อกอิน/สมัคร (apply-on-first-load) */

const LS_KEY = 'ceo_ai_pending_handoff';

export function stashHandoff(plan: HandoffPlan): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(plan)); } catch { /* localStorage อาจถูกปิด */ }
}

export function readPendingHandoff(): HandoffPlan | null {
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? (JSON.parse(s) as HandoffPlan) : null;
  } catch { return null; }
}

export function clearPendingHandoff(): void {
  try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
}
