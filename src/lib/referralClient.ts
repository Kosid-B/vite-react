// referralClient.ts — จับ ?ref= จาก URL + เรียก RPC ให้รางวัลเมื่อผู้ถูกชวนสมัครแพ็ก
import { isSupabaseEnabled, supabase } from './supabase';

const REF_KEY = 'ceo_ai_ref';

/** เก็บ ?ref= ครั้งแรกที่เข้าเว็บ (ไม่ทับของเดิม — first-touch attribution) */
export function captureRefFromUrl(): void {
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && !localStorage.getItem(REF_KEY)) localStorage.setItem(REF_KEY, ref);
  } catch { /* ignore */ }
}

export function getPendingRef(): string | null {
  try { return localStorage.getItem(REF_KEY); } catch { return null; }
}
export function clearPendingRef(): void {
  try { localStorage.removeItem(REF_KEY); } catch { /* ignore */ }
}

export interface RefResult { ok: boolean; reward?: number; reason?: string; }

/** ให้รางวัล referral — server ตัดสิน (referee = workspace ของผู้เรียก · ต้องเป็นแพ็กจ่ายเงิน · ครั้งเดียว) */
export async function claimReferral(referrerWs: string): Promise<RefResult> {
  if (!isSupabaseEnabled || !supabase) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc('claim_referral', { p_referrer: referrerWs });
    if (error) return { ok: false, reason: error.message };
    const r = (data ?? {}) as { ok?: boolean; reward?: number; reason?: string };
    return { ok: !!r.ok, reward: r.reward, reason: r.reason };
  } catch (e) { return { ok: false, reason: String(e) }; }
}
