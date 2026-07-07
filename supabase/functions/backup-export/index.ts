// Supabase Edge Function: backup-export
// สำรองข้อมูลอัตโนมัติทุกวัน — กันเหตุ "ข้อมูลหาย" (บทเรียน ก.ค. 2569: ลบ project = ข้อมูลหมด)
//   (1) ON-SITE:  อัปโหลด JSON snapshot ลง Storage bucket `backups` (กู้เร็ว) + prune เก็บ 14 วันล่าสุด
//   (2) OFF-SITE: อีเมล JSON แนบไปหา admin ผ่าน Resend — รอดแม้ทั้ง project ถูกลบ
//
// Deploy:  supabase functions deploy backup-export --no-verify-jwt
// Secret:  CRON_SECRET + RESEND_API_KEY (ชุดเดียวกับ cron อื่น) + SUPABASE_SERVICE_ROLE_KEY (มีให้อัตโนมัติ)
// รันด้วย pg_cron (ดู migration 0022) — ส่ง header x-cron-secret / ?date=YYYY-MM-DD

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const FROM_EMAIL = "CEO AI Thailand <noreply@ceoaithailand.org>";
const FALLBACK_ADMIN = "support@b-tctraining.com";
const BUCKET = "backups";
const KEEP_DAYS = 14;

// ตารางสำคัญที่ต้องสำรอง (public schema) — เรียงตามลำดับ restore (parent ก่อน child)
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
    body: JSON.stringify({
      from: FROM_EMAIL, to: [to], subject, html,
      attachments: [{ filename, content: base64 }],
    }),
  }).catch(() => null);
  return !!res && res.ok;
}

// base64 encode (Deno) รองรับ unicode
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

Deno.serve(async (req) => {
  // auth: cron secret (header หรือ query)
  const url = new URL(req.url);
  const secret = req.headers.get("x-cron-secret") ?? url.searchParams.get("secret") ?? "";
  if (!CRON_SECRET || secret !== CRON_SECRET) return json({ error: "unauthorized" }, 401);

  const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // 1) ดึงทุกตาราง
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
  // auth users (id/email/created_at เพื่อ reference ตอน restore)
  try {
    const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
    snapshot._auth_users = (users?.users ?? []).map((u) => ({ id: u.id, email: u.email, created_at: u.created_at }));
    counts["auth.users"] = snapshot._auth_users.length;
  } catch (_e) { counts["auth.users"] = -1; }

  const jsonStr = JSON.stringify(snapshot);
  const filename = `backup-${date}.json`;
  const base64 = toBase64(jsonStr);
  const sizeKb = Math.round(jsonStr.length / 1024);

  // 2) ON-SITE: อัปโหลดลง Storage (upsert)
  let storageOk = false, storageMsg = "";
  {
    const { error } = await db.storage.from(BUCKET).upload(filename, new Blob([jsonStr], { type: "application/json" }), { upsert: true });
    storageOk = !error; storageMsg = error?.message ?? "ok";
    // prune: เก็บ 14 ไฟล์ล่าสุด
    try {
      const { data: files } = await db.storage.from(BUCKET).list("", { limit: 1000, sortBy: { column: "name", order: "desc" } });
      const old = (files ?? []).filter((f) => f.name.startsWith("backup-")).slice(KEEP_DAYS);
      if (old.length) await db.storage.from(BUCKET).remove(old.map((f) => f.name));
    } catch (_e) { /* prune พังไม่เป็นไร */ }
  }

  // 3) OFF-SITE: อีเมล JSON แนบไปหา admin (survives project deletion)
  let adminEmail = FALLBACK_ADMIN;
  try {
    const { data: admins } = await db.from("app_admins").select("email").limit(1);
    if (admins?.[0]?.email) adminEmail = admins[0].email;
  } catch (_e) { /* ใช้ fallback */ }

  const rows = Object.entries(counts).map(([t, n]) => `<tr><td style="padding:2px 10px">${t}</td><td style="padding:2px 10px;text-align:right">${n < 0 ? "⚠️ error" : n.toLocaleString()}</td></tr>`).join("");
  const html = `<div style="font-family:sans-serif">
    <h2>🗄️ Backup ${date}</h2>
    <p>สำรองข้อมูล CEO AI Thailand อัตโนมัติ · ขนาด <b>${sizeKb} KB</b> · Storage: ${storageOk ? "✅" : "⚠️ " + storageMsg}</p>
    <p><b>ไฟล์แนบ = backup ออฟไซต์</b> — เก็บอีเมลนี้ไว้ กู้ได้แม้ project หาย</p>
    <table style="border-collapse:collapse;font-size:13px"><tr><th style="padding:2px 10px;text-align:left">ตาราง</th><th style="padding:2px 10px">แถว</th></tr>${rows}</table>
  </div>`;
  const mailOk = await sendBackupMail(adminEmail, `🗄️ Backup CEO AI Thailand — ${date} (${sizeKb}KB)`, html, filename, base64);

  return json({ ok: true, date, sizeKb, counts, storage: storageOk, storageMsg, email: mailOk, emailTo: adminEmail });
});
