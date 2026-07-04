// sheets-sync — เขียนรายงาน/ผลงานลง Google Sheets ของ User (บัญชีที่เขาเชื่อมไว้)
// โหลด token จาก workspace_integrations (service role) → refresh ถ้าหมดอายุ →
// สร้างสเปรดชีต (ครั้งแรก) แล้ว append แถวข้อมูล
// verify_jwt = true + ตรวจสมาชิก workspace
//
// Deploy:  supabase functions deploy sheets-sync --project-ref rsjbqmnvocvtveelselj
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (ใช้ร่วมกับ sheets-oauth)
//
// Body:   { workspaceId: string, title?: string, rows: (string|number)[][] }
// Return: { ok: true, spreadsheetUrl: string }
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

interface Creds { access_token: string; refresh_token: string | null; expiry: number; scope?: string; spreadsheet_id: string | null; }

async function refreshToken(c: Creds): Promise<Creds> {
  if (!c.refresh_token) throw new Error("no_refresh_token");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: c.refresh_token, grant_type: "refresh_token",
    }),
  });
  const t = await r.json();
  if (!r.ok || !t.access_token) throw new Error("refresh_failed");
  return { ...c, access_token: t.access_token, expiry: Date.now() + (Number(t.expires_in ?? 3600) * 1000) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return json({ error: "oauth_not_configured" }, 503);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const user = userData.user;

  let body: { workspaceId?: string; title?: string; rows?: (string | number)[][] };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const workspaceId = String(body.workspaceId ?? "");
  const title = String(body.title ?? "CEO AI Thailand — รายงานผลการดำเนินงาน");
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!workspaceId || rows.length === 0) return json({ error: "missing_params" }, 400);

  const { data: member } = await admin.from("workspace_members")
    .select("workspace_id").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!member) return json({ error: "not_a_member" }, 403);

  const { data: row } = await admin.from("workspace_integrations")
    .select("credentials").eq("workspace_id", workspaceId).eq("provider", "sheets").maybeSingle();
  let creds = row?.credentials as Creds | undefined;
  if (!creds?.access_token) return json({ error: "not_connected" }, 409);

  // refresh ถ้าใกล้หมดอายุ (เผื่อ 60 วิ)
  try {
    if (creds.expiry - 60_000 < Date.now()) creds = await refreshToken(creds);
  } catch { return json({ error: "reconnect_required" }, 401); }

  const authHdr = { "Authorization": `Bearer ${creds.access_token}`, "Content-Type": "application/json" };

  // สร้างสเปรดชีตครั้งแรก
  let spreadsheetId = creds.spreadsheet_id;
  let spreadsheetUrl = "";
  if (!spreadsheetId) {
    const cr = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST", headers: authHdr,
      body: JSON.stringify({ properties: { title } }),
    });
    const cj = await cr.json();
    if (!cr.ok || !cj.spreadsheetId) return json({ error: "create_failed", detail: cj.error?.message ?? "" }, 502);
    spreadsheetId = cj.spreadsheetId;
    spreadsheetUrl = cj.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  } else {
    spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  }

  // append แถวข้อมูล
  const ap = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", headers: authHdr, body: JSON.stringify({ values: rows }) },
  );
  if (!ap.ok) {
    const e = await ap.json().catch(() => ({}));
    return json({ error: "append_failed", detail: e.error?.message ?? "" }, 502);
  }

  // เก็บ token ที่ refresh แล้ว + spreadsheet_id
  await admin.from("workspace_integrations").update({
    credentials: { ...creds, spreadsheet_id: spreadsheetId }, updated_at: new Date().toISOString(),
  }).eq("workspace_id", workspaceId).eq("provider", "sheets");

  return json({ ok: true, spreadsheetUrl });
});
