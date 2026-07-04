import { isSupabaseEnabled, supabase } from './supabase';

/* ===== การเชื่อมต่อเครื่องมือ — แยกชัด "ระบบดูแลให้" vs "User เชื่อมบัญชีตัวเอง" =====
 * ระบบเรา (Serper/Resend): key อยู่ฝั่ง server (Supabase secrets) — User ไม่ต้องทำอะไร
 * ของ User (LINE OA/Sheets): เก็บใน public.workspace_integrations (RLS per-workspace)
 *   — ไม่เก็บใน AppData/localStorage ที่ sync ไป client */

export type IntegrationProvider = 'line' | 'sheets';

export interface SystemIntegration { id: string; name: string; icon: string; desc: string; }
export interface UserIntegration {
  id: IntegrationProvider; name: string; icon: string; desc: string; help: string;
  comingSoon?: boolean;
  fields?: { key: string; label: string; placeholder: string }[];
}

export const SYSTEM_INTEGRATIONS: SystemIntegration[] = [
  { id: 'serper', name: 'Google Search (Serper)', icon: '🔎', desc: 'ให้ AI ค้นข้อมูลตลาด/คู่แข่งแบบเรียลไทม์' },
  { id: 'resend', name: 'อีเมลระบบ (Resend)', icon: '✉️', desc: 'ส่งอีเมล/รายงานจาก noreply@ceoaithailand.org' },
];

export const USER_INTEGRATIONS: UserIntegration[] = [
  {
    id: 'line', name: 'LINE Official Account', icon: '💬',
    desc: 'ให้ AI ตอบแชท/ส่งข้อความหาลูกค้าผ่าน LINE OA ของคุณ',
    help: 'เอา Channel access token จาก LINE Developers Console → ช่องของคุณ → Messaging API',
    fields: [{ key: 'accessToken', label: 'Channel access token', placeholder: 'วาง token จาก LINE Developers' }],
  },
  {
    id: 'sheets', name: 'Google Sheets', icon: '📊',
    desc: 'บันทึกผลงาน/รายงานลงชีตของคุณอัตโนมัติ',
    help: 'เชื่อมผ่านบัญชี Google ของคุณ (OAuth)', comingSoon: true,
  },
];

const LS = 'ceo_ai_integrations'; // local mode (dev) เท่านั้น — ไม่เก็บ secret จริง

const EMPTY: Record<IntegrationProvider, boolean> = { line: false, sheets: false };

/** สถานะการเชื่อมต่อ (ดึงเฉพาะ provider+connected — ไม่ดึง credentials มา client) */
export async function getIntegrationStatus(wsId: string | null): Promise<Record<IntegrationProvider, boolean>> {
  if (isSupabaseEnabled && supabase && wsId) {
    const { data } = await supabase.from('workspace_integrations')
      .select('provider, connected').eq('workspace_id', wsId);
    const out = { ...EMPTY };
    (data as { provider: string; connected: boolean }[] ?? []).forEach(r => {
      if (r.provider === 'line' || r.provider === 'sheets') out[r.provider] = !!r.connected;
    });
    return out;
  }
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(LS) ?? '{}') }; } catch { return { ...EMPTY }; }
}

/** บันทึกการเชื่อมต่อ (credentials เก็บใน workspace_integrations เท่านั้น) — คืน '' ถ้าสำเร็จ */
export async function saveIntegration(
  wsId: string | null, provider: IntegrationProvider, credentials: Record<string, string>,
): Promise<string> {
  if (isSupabaseEnabled && supabase) {
    if (!wsId) return 'ยังไม่พบ workspace — ลองรีเฟรชหน้า';
    const { error } = await supabase.from('workspace_integrations').upsert({
      workspace_id: wsId, provider, credentials, connected: true, updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,provider' });
    return error ? error.message : '';
  }
  try {
    const s = JSON.parse(localStorage.getItem(LS) ?? '{}');
    s[provider] = true; localStorage.setItem(LS, JSON.stringify(s));
  } catch { /* empty */ }
  return '';
}

export async function disconnectIntegration(wsId: string | null, provider: IntegrationProvider): Promise<string> {
  if (isSupabaseEnabled && supabase && wsId) {
    const { error } = await supabase.from('workspace_integrations').delete()
      .eq('workspace_id', wsId).eq('provider', provider);
    return error ? error.message : '';
  }
  try {
    const s = JSON.parse(localStorage.getItem(LS) ?? '{}');
    delete s[provider]; localStorage.setItem(LS, JSON.stringify(s));
  } catch { /* empty */ }
  return '';
}
