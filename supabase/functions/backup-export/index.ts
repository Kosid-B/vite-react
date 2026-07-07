import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const FROM_EMAIL = "CEO AI Thailand <noreply@ceoaithailand.org>";
const FALLBACK_ADMIN = "support@b-tctraining.com";
const BUCKET = "backups";
const KEEP_DAYS = 14;

const TABLES = [
  "app_admins", "workspaces", "workspace_members", "workspace_state",
  "storefronts", "rfqs", "orders", "marketplace_skills", "skill_purchases",
  "skill_auctions", "skill_bids", "shop_applications", "storefront_leads",
  "workspace_integrations",
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function sendBackupMail(to: string, subject: string, html: string, filename: string, base64: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html, attachments: [{ filename, content: base64 }] }),
  }).catch(() => null);
  return !!res && res.ok;
}

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const secret = req.headers.get("x-cron-secret") ?? url.searchParams.get("secret") ?? "";
  if (!CRON_SECRET || secret !== CRON_SECRET) return json({ error: "unauthorized" }, 401);

  const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // deno-lint-ignore no-explicit-any
  const snapshot: Record<string, any> = { _meta: { date, generatedAt: new Date().toISOString(), tables: {} } };
  const counts: Record<string, number> = {};
  for (const t of TABLES) {
    const { data, error } = await db.from(t).select("*");
    if (error) { snapshot._meta.tables[t] = `ERROR: ${error.message}`; counts[t] = -1; continue; }
    snapshot[t] = data ?? [];
    counts[t] = (data ?? []).length;
    snapshot._meta.tables[t] = counts[t];
  }
  try {
    const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
    snapshot._auth_users = (users?.users ?? []).map((u) => ({ id: u.id, email: u.email, created_at: u.created_at }));
    counts["auth.users"] = snapshot._auth_users.length;
  } catch (_e) { counts["auth.users"] = -1; }

  const jsonStr = JSON.stringify(snapshot);
  const filename = `backup-${date}.json`;
  const base64 = toBase64(jsonStr);
  const sizeKb = Math.round(jsonStr.length / 1024);

  let storageOk = false, storageMsg = "";
  {
    const { error } = await db.storage.from(BUCKET).upload(filename, new Blob([jsonStr], { type: "application/json" }), { upsert: true });
    storageOk = !error; storageMsg = error?.message ?? "ok";
    try {
      const { data: files } = await db.storage.from(BUCKET).list("", { limit: 1000, sortBy: { column: "name", order: "desc" } });
      const old = (files ?? []).filter((f) => f.name.startsWith("backup-")).slice(KEEP_DAYS);
      if (old.length) await db.storage.from(BUCKET).remove(old.map((f) => f.name));
    } catch (_e) { /* prune พังไม่เป็นไร */ }
  }

  let adminEmail = FALLBACK_ADMIN;
  try {
    const { data: admins } = await db.from("app_admins").select("email").limit(1);
    if (admins?.[0]?.email) adminEmail = admins[0].email;
  } catch (_e) { /* fallback */ }

  const rows = Object.entries(counts).map(([t, n]) => `<tr><td style="padding:2px 10px">${t}</td><td style="padding:2px 10px;text-align:right">${n < 0 ? "⚠️ error" : n.toLocaleString()}</td></tr>`).join("");
  const html = `<div style="font-family:sans-serif"><h2>🗄️ Backup ${date}</h2><p>ขนาด <b>${sizeKb} KB</b> · Storage: ${storageOk ? "✅" : "⚠️ " + storageMsg}</p><p><b>ไฟล์แนบ = backup ออฟไซต์</b> เก็บอีเมลนี้ไว้ กู้ได้แม้ project หาย</p><table style="border-collapse:collapse;font-size:13px">${rows}</table></div>`;
  const mailOk = await sendBackupMail(adminEmail, `🗄️ Backup CEO AI Thailand — ${date} (${sizeKb}KB)`, html, filename, base64);

  return json({ ok: true, date, sizeKb, counts, storage: storageOk, storageMsg, email: mailOk, emailTo: adminEmail });
});