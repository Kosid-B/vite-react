// LINE Login — แลก authorization code → โปรไฟล์ LINE → สร้าง/หา Supabase user → คืน token_hash
// ให้ client เปิด session ด้วย verifyOtp({ token_hash }) โดยไม่ต้องเปิดอีเมล
//
// Secrets ที่ต้องตั้ง: LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Deploy: npx supabase functions deploy line-login --no-verify-jwt   (public — ยังไม่มี session ตอนเรียก)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID') ?? '';
  const CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET') ?? '';
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!CHANNEL_ID || !CHANNEL_SECRET || !SUPABASE_URL || !SERVICE_ROLE) {
    return json({ ok: false, error: 'not_configured' }, 500);
  }

  let code = '', redirectUri = '';
  try {
    const b = await req.json();
    code = String(b.code ?? '');
    redirectUri = String(b.redirectUri ?? '');
  } catch { /* noop */ }
  if (!code || !redirectUri) return json({ ok: false, error: 'bad_request' }, 400);

  // 1) แลก code เป็น token (+ id_token เพราะ scope openid)
  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: CHANNEL_ID,
      client_secret: CHANNEL_SECRET,
    }),
  });
  if (!tokenRes.ok) return json({ ok: false, error: 'token_exchange_failed' }, 400);
  const tok = await tokenRes.json() as { access_token?: string; id_token?: string };

  // 2) ยืนยัน id_token กับ LINE → ได้ sub (userId) + email (ถ้าผู้ใช้ยินยอมและ channel ขอ email ได้)
  let lineUserId = '', email = '', name = '', picture = '';
  if (tok.id_token) {
    const vr = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: tok.id_token, client_id: CHANNEL_ID }),
    });
    if (vr.ok) {
      const p = await vr.json() as { sub?: string; email?: string; name?: string; picture?: string };
      lineUserId = p.sub ?? ''; email = p.email ?? ''; name = p.name ?? ''; picture = p.picture ?? '';
    }
  }
  // fallback: ดึงโปรไฟล์จาก access_token ถ้ายังไม่ได้ userId
  if (!lineUserId && tok.access_token) {
    const pr = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    if (pr.ok) {
      const p = await pr.json() as { userId?: string; displayName?: string; pictureUrl?: string };
      lineUserId = p.userId ?? ''; name = name || (p.displayName ?? ''); picture = picture || (p.pictureUrl ?? '');
    }
  }
  if (!lineUserId) return json({ ok: false, error: 'profile_failed' }, 400);

  // ไม่มีอีเมลจริง → ใช้อีเมล synthetic ผูกกับ LINE userId (ใช้เป็น key บัญชีเท่านั้น)
  const loginEmail = email || `line_${lineUserId}@line.ceoaithailand.org`;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // 3) หา/สร้าง user (idempotent) — ตั้ง metadata โปรไฟล์ LINE
  const meta = { provider: 'line', line_user_id: lineUserId, full_name: name, avatar_url: picture };
  const { error: cErr } = await admin.auth.admin.createUser({
    email: loginEmail,
    email_confirm: true,
    user_metadata: meta,
  });
  // ถ้ามีอยู่แล้ว (createUser คืน error) → ถือว่าปกติ ไปออก magic link ต่อได้เลย
  if (cErr && !/already|registered|exists/i.test(cErr.message)) {
    return json({ ok: false, error: 'user_upsert_failed' }, 500);
  }

  // 4) ออก token_hash ผ่าน generateLink (magiclink) — client เอาไป verifyOtp เปิด session
  const { data: link, error: lErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: loginEmail,
  });
  const tokenHash = (link?.properties as { hashed_token?: string } | undefined)?.hashed_token;
  if (lErr || !tokenHash) return json({ ok: false, error: 'link_failed' }, 500);

  return json({ ok: true, email: loginEmail, token_hash: tokenHash });
});
