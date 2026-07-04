import { INTEGRATIONS } from '../config';
import { isSupabaseEnabled, supabase } from './supabase';

/* ===== Google Sheets (User เชื่อมบัญชี Google ตัวเอง ผ่าน OAuth) =====
 * gate ด้วย INTEGRATIONS.sheetsLive — จนกว่าจะสร้าง OAuth Client + deploy sheets-oauth/sheets-sync
 * flow: startSheetsConnect() → Google consent → กลับมาที่ googleRedirectPath?code=…&state=wsId
 *       → handleSheetsCallback() แลก token ฝั่ง server (sheets-oauth) → เก็บใน workspace_integrations */

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export function sheetsEnabled(): boolean {
  return !!INTEGRATIONS.sheetsLive && !!INTEGRATIONS.googleClientId && isSupabaseEnabled;
}

function redirectUri(): string {
  return window.location.origin + INTEGRATIONS.googleRedirectPath;
}

/** เริ่มเชื่อม — พาไปหน้ายินยอมของ Google (offline + consent เพื่อได้ refresh_token) */
export function startSheetsConnect(wsId: string): void {
  const p = new URLSearchParams({
    client_id: INTEGRATIONS.googleClientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: GOOGLE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: wsId,
  });
  window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + p.toString();
}

/** true ถ้า URL ปัจจุบันคือ callback ของ Google OAuth */
export function isSheetsCallback(): boolean {
  return window.location.pathname === INTEGRATIONS.googleRedirectPath
    && new URLSearchParams(window.location.search).has('code');
}

/** แลก code เป็น token ฝั่ง server แล้วล้าง query ออกจาก URL — คืนข้อความสถานะ */
export async function handleSheetsCallback(): Promise<{ ok: boolean; msg: string }> {
  const q = new URLSearchParams(window.location.search);
  const code = q.get('code') ?? '';
  const wsId = q.get('state') ?? '';
  if (!code || !wsId) return { ok: false, msg: 'ลิงก์เชื่อมบัญชีไม่สมบูรณ์' };
  if (!supabase) return { ok: false, msg: 'ระบบยังไม่พร้อม' };
  try {
    const { data, error } = await supabase.functions.invoke('sheets-oauth', {
      body: { code, redirectUri: redirectUri(), workspaceId: wsId },
    });
    if (error || !data?.ok) return { ok: false, msg: 'เชื่อม Google Sheets ไม่สำเร็จ — ลองใหม่อีกครั้ง' };
    return { ok: true, msg: '✅ เชื่อม Google Sheets สำเร็จ' };
  } catch {
    return { ok: false, msg: 'เชื่อม Google Sheets ไม่สำเร็จ' };
  }
}

/** ส่งรายงาน (ตาราง rows) ลงชีตของ User — คืน URL ชีต หรือ error */
export async function syncToSheet(
  wsId: string, title: string, rows: (string | number)[][],
): Promise<{ ok: boolean; url?: string; msg: string }> {
  if (!supabase) return { ok: false, msg: 'ระบบยังไม่พร้อม' };
  try {
    const { data, error } = await supabase.functions.invoke('sheets-sync', {
      body: { workspaceId: wsId, title, rows },
    });
    if (error || !data?.ok) {
      const code = (data && (data as { error?: string }).error) || '';
      if (code === 'reconnect_required') return { ok: false, msg: 'โทเคนหมดอายุ — กรุณาเชื่อม Google Sheets ใหม่' };
      if (code === 'not_connected') return { ok: false, msg: 'ยังไม่ได้เชื่อม Google Sheets' };
      return { ok: false, msg: 'ส่งข้อมูลลงชีตไม่สำเร็จ' };
    }
    return { ok: true, url: (data as { spreadsheetUrl?: string }).spreadsheetUrl, msg: '✅ ส่งลง Google Sheets แล้ว' };
  } catch {
    return { ok: false, msg: 'ส่งข้อมูลลงชีตไม่สำเร็จ' };
  }
}
