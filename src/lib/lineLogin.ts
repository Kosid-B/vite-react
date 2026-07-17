import { INTEGRATIONS } from '../config';
import { isSupabaseEnabled, supabase } from './supabase';

/* ===== LINE Login (เข้าสู่ระบบด้วยบัญชี LINE) =====
 * gate ด้วย INTEGRATIONS.lineLoginLive — จนกว่าจะสร้าง LINE Login channel + deploy line-login
 * flow: startLineLogin() → หน้ายินยอม LINE → กลับมาที่ lineRedirectPath?code=…&state=…
 *       → handleLineCallback() → edge fn 'line-login' แลก code + สร้าง/หา user + คืน token_hash
 *       → verifyOtp({ token_hash }) เปิด session (ล็อกอินสำเร็จ)
 * ดู docs/integrations/line-login.md */

const STATE_KEY = 'line_login_state';
const LINE_AUTH = 'https://access.line.me/oauth2/v2.1/authorize';

export function lineLoginEnabled(): boolean {
  return !!INTEGRATIONS.lineLoginLive && !!INTEGRATIONS.lineChannelId && isSupabaseEnabled;
}

function redirectUri(): string {
  return window.location.origin + INTEGRATIONS.lineRedirectPath;
}

/** เริ่มเข้าสู่ระบบด้วย LINE — พาไปหน้ายินยอมของ LINE (state กัน CSRF) */
export function startLineLogin(): void {
  const state = (crypto?.randomUUID?.() ?? String(Math.floor(Math.random() * 1e16)));
  try { sessionStorage.setItem(STATE_KEY, state); } catch { /* noop */ }
  const p = new URLSearchParams({
    response_type: 'code',
    client_id: INTEGRATIONS.lineChannelId,
    redirect_uri: redirectUri(),
    state,
    scope: 'profile openid email',
  });
  window.location.href = `${LINE_AUTH}?${p.toString()}`;
}

/** true ถ้า URL ปัจจุบันคือ callback ของ LINE Login */
export function isLineCallback(): boolean {
  return window.location.pathname === INTEGRATIONS.lineRedirectPath
    && new URLSearchParams(window.location.search).has('code');
}

/** แลก code → session (ล็อกอิน) แล้วล้าง query ออกจาก URL — คืนสถานะ */
export async function handleLineCallback(): Promise<{ ok: boolean; msg: string }> {
  const q = new URLSearchParams(window.location.search);
  const code = q.get('code') ?? '';
  const state = q.get('state') ?? '';
  let saved = '';
  try { saved = sessionStorage.getItem(STATE_KEY) ?? ''; } catch { /* noop */ }
  const clearUrl = () => window.history.replaceState({}, '', window.location.pathname === INTEGRATIONS.lineRedirectPath ? '/' : window.location.pathname);

  if (!code) { clearUrl(); return { ok: false, msg: 'ลิงก์เข้าสู่ระบบไม่สมบูรณ์' }; }
  if (!state || state !== saved) { clearUrl(); return { ok: false, msg: 'สถานะไม่ตรงกัน (state) — ลองใหม่' }; }
  if (!supabase) { clearUrl(); return { ok: false, msg: 'ระบบยังไม่พร้อม' }; }
  try { sessionStorage.removeItem(STATE_KEY); } catch { /* noop */ }

  try {
    const { data, error } = await supabase.functions.invoke('line-login', {
      body: { code, redirectUri: redirectUri() },
    });
    const res = data as { ok?: boolean; email?: string; token_hash?: string } | null;
    if (error || !res?.ok || !res.token_hash) { clearUrl(); return { ok: false, msg: 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ — ลองใหม่อีกครั้ง' }; }
    // เปิด session ด้วย token_hash ที่ edge fn สร้างจาก generateLink (ไม่ต้องเปิดอีเมล)
    const { error: verr } = await supabase.auth.verifyOtp({ token_hash: res.token_hash, type: 'email' });
    clearUrl();
    if (verr) return { ok: false, msg: 'ยืนยัน session ไม่สำเร็จ' };
    return { ok: true, msg: '✅ เข้าสู่ระบบด้วย LINE สำเร็จ' };
  } catch {
    clearUrl();
    return { ok: false, msg: 'เข้าสู่ระบบด้วย LINE ไม่สำเร็จ' };
  }
}
