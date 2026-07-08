// create-recurring-plan — สร้างแผนตัดเงินอัตโนมัติ (Xendit Recurring API v3) สำหรับแพ็ก SaaS
// verify_jwt = true · คำนวณราคาฝั่ง server · สร้าง/ใช้ Customer แล้วผูก Recurring Plan
//
// Deploy:  supabase functions deploy create-recurring-plan --project-ref waigsnxhrlwtiotspaim
// Secrets: supabase secrets set XENDIT_SECRET_KEY=xnd_...
//
// Body:   { plan: 'starter'|'growth'|'scale', cycle: 'monthly'|'yearly', workspaceId: string }
// Return: { action_url, plan_id }   — พาผู้ใช้ไปผูกวิธีจ่าย + เก็บงวดแรก
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { recurringPlanPayload } from "../_shared/recurring.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const XENDIT_SECRET_KEY = Deno.env.get("XENDIT_SECRET_KEY") ?? "";
const APP_ORIGIN = "https://ceoaithailand.org";

const PRICE_MONTHLY: Record<string, number> = { starter: 390, growth: 1490, scale: 5900 };
const PRICE_YEARLY: Record<string, number> = { starter: 3900, growth: 14900, scale: 59000 };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...cors } });

const xenditAuth = () => "Basic " + btoa(XENDIT_SECRET_KEY + ":");

/** สร้าง/ดึง Xendit Customer จาก workspace (reference_id = workspaceId) */
async function ensureCustomer(workspaceId: string, email: string | undefined): Promise<string> {
  const res = await fetch("https://api.xendit.co/customers", {
    method: "POST",
    headers: { "Authorization": xenditAuth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      reference_id: `ws_${workspaceId}`,
      type: "INDIVIDUAL",
      email: email ?? undefined,
      individual_detail: { given_names: email ?? "CEO AI User" },
    }),
  });
  const data = await res.json().catch(() => ({}));
  // Xendit คืน customer เดิมถ้า reference_id ซ้ำ (ผ่าน error data.id) — รองรับทั้งสองแบบ
  const id = data?.id ?? data?.data?.id ?? "";
  if (!id) throw new Error("customer_failed:" + JSON.stringify(data).slice(0, 200));
  return String(id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!XENDIT_SECRET_KEY) return json({ error: "gateway_not_configured" }, 503);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

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

  const { data: member } = await admin.from("workspace_members")
    .select("workspace_id").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!member) return json({ error: "not_a_member" }, 403);

  const amount = cycle === "yearly" ? PRICE_YEARLY[plan] : PRICE_MONTHLY[plan];
  const referenceId = `rec_${workspaceId}_${plan}_${cycle}_${Date.now().toString(36)}`;

  try {
    const customerId = await ensureCustomer(workspaceId, user.email ?? undefined);
    const payload = recurringPlanPayload({
      referenceId, customerId, plan, cycle, amount,
      successUrl: `${APP_ORIGIN}/?sub=1`,
      failureUrl: `${APP_ORIGIN}/?sub=0`,
    });
    const res = await fetch("https://api.xendit.co/recurring/plans", {
      method: "POST",
      headers: { "Authorization": xenditAuth(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return json({ error: "xendit_error", detail: detail.slice(0, 300) }, 502);
    }
    const planRes = await res.json();
    // action_url/actions = ลิงก์ให้ผู้ใช้ผูกวิธีจ่าย + อนุมัติงวดแรก
    const actionUrl = planRes?.actions?.find((a: Record<string, unknown>) => a.action === "AUTH" || a.url)?.url
      ?? planRes?.action_url ?? null;
    return json({ plan_id: planRes?.id ?? referenceId, action_url: actionUrl, reference_id: referenceId });
  } catch (e) {
    return json({ error: "recurring_failed", detail: String((e as Error).message).slice(0, 200) }, 502);
  }
});
