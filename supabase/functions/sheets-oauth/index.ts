// sheets-oauth — แลก authorization code จาก Google เป็น access/refresh token
// แล้วเก็บใน public.workspace_integrations (provider 'sheets') ด้วย service role
// verify_jwt = true: เฉพาะผู้ใช้ที่ล็อกอิน + ต้องเป็นสมาชิก workspace นั้น
//
// Deploy:  supabase functions deploy sheets-oauth --project-ref waigsnxhrlwtiotspaim
// Secrets: supabase secrets set GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
//          supabase secrets set GOOGLE_CLIENT_SECRET=xxxx
//
// Body:   { code: string, redirectUri: string, workspaceId: string }
// Return: { ok: true }  (ไม่ส่ง token กลับ client — เก็บฝั่ง server เท่านั้น)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...cors } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return json({ error: "oauth_not_configured" }, 503);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const user = userData.user;

  let body: { code?: string; redirectUri?: string; workspaceId?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const code = String(body.code ?? "");
  const redirectUri = String(body.redirectUri ?? "");
  const workspaceId = String(body.workspaceId ?? "");
  if (!code || !redirectUri || !workspaceId) return json({ error: "missing_params" }, 400);

  // ผู้เรียกต้องเป็นสมาชิก workspace นี้ (กันข้าม tenant)
  const { data: member } = await admin.from("workspace_members")
    .select("workspace_id").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!member) return json({ error: "not_a_member" }, 403);

  // แลก code → token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tok = await tokenRes.json();
  if (!tokenRes.ok || !tok.access_token) {
    return json({ error: "token_exchange_failed", detail: tok.error_description ?? tok.error ?? "" }, 502);
  }

  const credentials = {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? null, // มีเฉพาะครั้งแรก (prompt=consent + access_type=offline)
    expiry: Date.now() + (Number(tok.expires_in ?? 3600) * 1000),
    scope: tok.scope ?? "",
    spreadsheet_id: null,
  };

  const { error: upErr } = await admin.from("workspace_integrations").upsert({
    workspace_id: workspaceId, provider: "sheets", credentials, connected: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "workspace_id,provider" });
  if (upErr) return json({ error: "store_failed", detail: upErr.message }, 500);

  return json({ ok: true });
});
