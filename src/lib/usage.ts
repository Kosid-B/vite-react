import type { PlanId } from '../types';
import { isSupabaseEnabled, supabase } from './supabase';

/** PLG — ติดตามการใช้งาน AI calls ต่อเดือน เพื่อแสดง usage meter
 *  และชวนอัปเกรดเมื่อใกล้เต็มโควตา (usage-based expansion) */

export interface ServerUsage { used: number; quota: number; plan: string; topup?: number }

/** ดึง usage จริงฝั่ง server (นับต่อ workspace + รวม top-up credits) — null ถ้า offline/ยังไม่พร้อม
 *  ใช้แทนตัวนับ localStorage เมื่อออนไลน์ (ตรงกับที่ edge functions บังคับ quota จริง) */
export async function fetchServerUsage(): Promise<ServerUsage | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  try {
    const { data, error } = await supabase.rpc('get_ai_usage');
    if (error || !data) return null;
    const d = data as { used?: number; quota?: number; plan?: string; topup?: number };
    return { used: d.used ?? 0, quota: d.quota ?? 0, plan: d.plan ?? 'free', topup: d.topup ?? 0 };
  } catch { return null; }
}

export const PLAN_AI_CALLS: Record<PlanId, number> = {
  free: 200,     // ช่วงทดลอง
  starter: 300,  // ต่อเดือน — แพ็กเริ่มต้นสำหรับคนเพิ่งเริ่มธุรกิจ
  growth: 700,   // ต่อเดือน — ปรับ 1000→700 เพื่อยกมาร์จิน worst-case ~38%→~48% (usage จริงต่ำกว่าเพดานมาก)
  scale: 5000,   // ต่อเดือน
};

/* ── โมเดล token (0052) — มิเตอร์เป็น "token" แทน "จำนวน call" (source of truth = tokenEconomics.ts) ── */
export interface ServerTokens { used: number; quota: number; plan: string; topup?: number }

/** ดึงมิเตอร์ token จริงฝั่ง server (get_ai_tokens) — null ถ้า offline/ยังไม่พร้อม */
export async function fetchServerTokens(): Promise<ServerTokens | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  try {
    const { data, error } = await supabase.rpc('get_ai_tokens');
    if (error || !data) return null;
    const d = data as { used?: number; quota?: number; plan?: string; topup?: number };
    return { used: d.used ?? 0, quota: d.quota ?? 0, plan: d.plan ?? 'free', topup: d.topup ?? 0 };
  } catch { return null; }
}

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
