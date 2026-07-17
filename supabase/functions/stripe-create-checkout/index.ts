// stripe-create-checkout — สร้าง Stripe Checkout Session (subscription mode = ตัดเงินอัตโนมัติทุกงวด)
// verify_jwt = true: เฉพาะผู้ใช้ที่ล็อกอิน · คำนวณราคาฝั่ง server (กันปลอมราคาจาก client)
// ใช้ inline recurring price_data → ไม่ต้องสร้าง Price object ล่วงหน้าใน Stripe dashboard
//
// Deploy:  supabase functions deploy stripe-create-checkout --project-ref waigsnxhrlwtiotspaim
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_live_... (หรือ sk_test_... ตอนทดสอบ)
//
// Body: { plan: 'starter'|'growth'|'scale', cycle: 'monthly'|'yearly', workspaceId: string }
// Return: { checkout_url }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const APP_ORIGIN = "https://ceoaithailand.org";

// ราคาจริง (ฝั่ง server เท่านั้น) — รายปี = 10 เดือน
const PRICE_MONTHLY: Record<string, number> = { starter: 390, growth: 1490, scale: 5900 };
const PRICE_YEARLY: Record<string, number> = { starter: 3900, growth: 14900, scale: 59000 };
const PLAN_LABEL: Record<string, string> = { starter: "Starter", growth: "Growth", scale: "Scale" };

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
  if (!STRIPE_SECRET_KEY) return json({ error: "gateway_not_configured" }, 503);

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
  const meta = { workspace_id: workspaceId, plan_id: plan, cycle };

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-01-27.acacia" });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "thb",
          unit_amount: amount * 100, // สตางค์
          recurring: { interval: cycle === "yearly" ? "year" : "month" },
          product_data: {
            name: `CEO AI Thailand — แพ็ก ${PLAN_LABEL[plan]}`,
            metadata: meta,
          },
        },
      }],
      metadata: meta,                       // อ่านได้จาก checkout.session.completed
      subscription_data: { metadata: meta }, // ติดไปกับ subscription → อ่านได้ตอน invoice.paid รอบต่อ ๆ ไป
      success_url: `${APP_ORIGIN}/?paid=1`,
      cancel_url: `${APP_ORIGIN}/?paid=0`,
    });
    if (!session.url) return json({ error: "no_checkout_url" }, 502);
    return json({ checkout_url: session.url });
  } catch (e) {
    return json({ error: "stripe_error", detail: String((e as Error).message).slice(0, 300) }, 502);
  }
});
