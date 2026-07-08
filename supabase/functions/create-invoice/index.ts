// create-invoice — สร้างใบชำระเงิน Xendit (hosted checkout) สำหรับแพ็ก SaaS
// verify_jwt = true: เฉพาะผู้ใช้ที่ล็อกอิน · คำนวณราคาฝั่ง server (กันปลอมราคาจาก client)
//
// Deploy:  supabase functions deploy create-invoice --project-ref waigsnxhrlwtiotspaim
// Secrets: supabase secrets set XENDIT_SECRET_KEY=xnd_...
//
// Body: { plan: 'starter'|'growth'|'scale', cycle: 'monthly'|'yearly', workspaceId: string }
// Return: { invoice_url }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const XENDIT_SECRET_KEY = Deno.env.get("XENDIT_SECRET_KEY") ?? "";
const APP_ORIGIN = "https://ceoaithailand.org";

// ราคาจริง (ฝั่ง server เท่านั้น) — รายปี = 10 เดือน
const PRICE_MONTHLY: Record<string, number> = { starter: 390, growth: 1490, scale: 5900 };
const PRICE_YEARLY: Record<string, number> = { starter: 3900, growth: 14900, scale: 59000 };
const PLAN_LABEL: Record<string, string> = {
  starter: "Starter", growth: "Growth", scale: "Scale",
};

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
  if (!XENDIT_SECRET_KEY) return json({ error: "gateway_not_configured" }, 503);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // ยืนยันตัวตนจาก JWT
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const user = userData.user;

  let body: { plan?: string; cycle?: string; workspaceId?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const plan = String(body.plan ?? "");
  const cycle = body.cycle === "yearly" ? "yearly" : "monthly";
  const workspaceId = String(body.workspaceId ?? "");
  if (!PRICE_MONTHLY[plan]) return json({ error: "invalid_plan" }, 400);
  if (!workspaceId) return json({ error: "missing_workspace" }, 400);

  // ผู้เรียกต้องเป็นสมาชิก workspace นี้
  const { data: member } = await admin.from("workspace_members")
    .select("workspace_id").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!member) return json({ error: "not_a_member" }, 403);

  const amount = cycle === "yearly" ? PRICE_YEARLY[plan] : PRICE_MONTHLY[plan];
  const externalId = `sub_${workspaceId}_${plan}_${cycle}_${Date.now().toString(36)}`;

  // สร้าง Xendit Invoice (hosted checkout — PromptPay/บัตร/e-wallet)
  const auth = "Basic " + btoa(XENDIT_SECRET_KEY + ":");
  const res = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: { "Authorization": auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      external_id: externalId,
      amount,
      currency: "THB",
      payer_email: user.email ?? undefined,
      description: `CEO AI Thailand — แพ็ก ${PLAN_LABEL[plan]} (${cycle === "yearly" ? "รายปี" : "รายเดือน"})`,
      success_redirect_url: `${APP_ORIGIN}/?paid=1`,
      failure_redirect_url: `${APP_ORIGIN}/?paid=0`,
      metadata: { workspace_id: workspaceId, plan_id: plan, cycle },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return json({ error: "xendit_error", detail: detail.slice(0, 300) }, 502);
  }
  const inv = await res.json();
  return json({ invoice_url: inv.invoice_url, external_id: externalId });
});
