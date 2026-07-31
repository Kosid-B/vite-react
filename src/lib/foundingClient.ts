// foundingClient.ts — เรียก RPC โปรฯ Founding Member (cap 1,000 บังคับฝั่ง server)
// offline/local mode = ฟีเจอร์ production → คืนค่าเปล่า (การ์ดจะไม่โผล่เพราะ local = full access อยู่แล้ว)
import { isSupabaseEnabled, supabase } from './supabase';

export interface ClaimResult {
  ok: boolean;
  seq?: number;
  full?: boolean;
  already?: boolean;
  error?: string;
}

/** จำนวนที่ claim ไปแล้ว (สำหรับตัวนับ "X/1,000") */
export async function fetchFoundingCount(): Promise<number> {
  if (!isSupabaseEnabled || !supabase) return 0;
  try {
    const { data, error } = await supabase.rpc('get_founding_count');
    return !error && typeof data === 'number' ? data : 0;
  } catch { return 0; }
}

/** รับสิทธิ์ founding แบบ atomic — server คืน seq / full / already */
export async function claimFoundingMember(wsId: string | null): Promise<ClaimResult> {
  if (!isSupabaseEnabled || !supabase) return { ok: false, error: 'offline' };
  if (!wsId) return { ok: false, error: 'no_workspace' };
  try {
    const { data, error } = await supabase.rpc('claim_founding_member', { p_workspace_id: wsId });
    if (error) return { ok: false, error: error.message };
    const r = (data ?? {}) as { ok?: boolean; seq?: number; full?: boolean; already?: boolean };
    return { ok: !!r.ok, seq: r.seq, full: r.full, already: r.already };
  } catch (e) { return { ok: false, error: String(e) }; }
}
