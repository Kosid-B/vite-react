// omise-create-charge — สร้างการชำระเงินผ่าน Omise / Opn Payments (ทางเลือกแทน Xendit)
// verify_jwt = true: เฉพาะผู้ใช้ที่ล็อกอิน · คำนวณราคาฝั่ง server (กันปลอมราคาจาก client)
//
// Deploy:  supabase functions deploy omise-create-charge --project-ref waigsnxhrlwtiotspaim
// Secrets: supabase secrets set OMISE_SECRET_KEY=skey_...   (public key = OMISE_PUBLIC_KEY ฝั่ง client)
//
// Body: { plan: 'starter'|'growth'|'scale', cycle: 'monthly'|'yearly', workspaceId, source: <omise_source_id> }
//   - source = token/source id ที่สร้างจาก Omise.js ฝั่ง client (บัตร/PromptPay/TrueMoney)
// Return: { authorize_uri } (redirect ผู้ใช้ไปยืนยัน) หรือ { paid: true } ถ้าจ่ายสำเร็จทันที
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OMISE_SECRET_KEY = Deno.env.get("OMISE_SECRET_KEY") ?? "";
const APP_ORIGIN = "https://ceoaithailand.org";

// ราคาจริง (ฝั่ง server เท่านั้น) — รายปี = 10 เดือน · หน่วย: บาท (Omise ใช้ "สตางค์" → ×100)
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
  if (!OMISE_SECRET_KEY) return json({ error: "gateway_not_configured" }, 503);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // ยืนยันตัวตนจาก JWT
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const user = userData.user;

  let body: { plan?: string; cycle?: string; workspaceId?: string; source?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const plan = String(body.plan ?? "");
  const cycle = body.cycle === "yearly" ? "yearly" : "monthly";
  const workspaceId = String(body.workspaceId ?? "");
  const source = String(body.source ?? "");
  if (!PRICE_MONTHLY[plan]) return json({ error: "invalid_plan" }, 400);
  if (!workspaceId) return json({ error: "missing_workspace" }, 400);
  if (!source) return json({ error: "missing_source" }, 400);

  // ผู้เรียกต้องเป็นสมาชิก workspace นี้
  const { data: member } = await admin.from("workspace_members")
    .select("workspace_id").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!member) return json({ error: "not_a_member" }, 403);

  const baht = cycle === "yearly" ? PRICE_YEARLY[plan] : PRICE_MONTHLY[plan];
  const amountSatang = baht * 100;
  const externalId = `sub_${workspaceId}_${plan}_${cycle}_${Date.now().toString(36)}`;
  const auth = "Basic " + btoa(OMISE_SECRET_KEY + ":");

  // ถ้า client ไม่ได้ส่ง source (card token จาก Omise.js) → สร้าง PromptPay source ฝั่ง server
  // (ผู้ใช้ไม่ต้องโหลด Omise.js — ได้ QR ผ่าน authorize_uri เลย)
  let chargeSource = source;
  if (!chargeSource) {
    const sp = new URLSearchParams();
    sp.set("type", "promptpay");
    sp.set("amount", String(amountSatang));
    sp.set("currency", "thb");
    const sres = await fetch("https://api.omise.co/sources", {
      method: "POST",
      headers: { "Authorization": auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: sp.toString(),
    });
    if (!sres.ok) {
      const detail = await sres.text().catch(() => "");
      return json({ error: "omise_source_error", detail: detail.slice(0, 300) }, 502);
    }
    chargeSource = (await sres.json()).id;
  }

  // สร้าง Omise Charge (หน่วยเงิน = สตางค์) — return_uri สำหรับ 3-D Secure / PromptPay authorize
  const params = new URLSearchParams();
  params.set("amount", String(amountSatang));
  params.set("currency", "thb");
  params.set("source", chargeSource);           // card token → params.set("card", ...) แทน
  params.set("return_uri", `${APP_ORIGIN}/?paid=1`);
  params.set("description", `CEO AI Thailand — แพ็ก ${PLAN_LABEL[plan]} (${cycle === "yearly" ? "รายปี" : "รายเดือน"})`);
  params.set("metadata[workspace_id]", workspaceId);
  params.set("metadata[plan_id]", plan);
  params.set("metadata[cycle]", cycle);
  params.set("metadata[external_id]", externalId);

  const res = await fetch("https://api.omise.co/charges", {
    method: "POST",
    headers: { "Authorization": auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return json({ error: "omise_error", detail: detail.slice(0, 300) }, 502);
  }
  const charge = await res.json();
  // charge.authorize_uri = redirect ให้ผู้ใช้ยืนยัน (บัตร 3DS / PromptPay QR) · ถ้า paid=true คือจ่ายเสร็จทันที
  return json({
    authorize_uri: charge.authorize_uri ?? null,
    paid: charge.paid === true,
    charge_id: charge.id,
    external_id: externalId,
  });
});
