// stripe-webhook — รับ event จาก Stripe แล้วอัปเดตแพ็ก (subscription) ใน workspace อัตโนมัติ
// verify_jwt = false: ยืนยันด้วย Stripe-Signature (STRIPE_WEBHOOK_SECRET) แทน
//
// จัดการ event:
//   invoice.paid                 → เปิด/ต่ออายุแพ็ก (ยิงทั้งจ่ายครั้งแรก + ตัดเงินอัตโนมัติทุกงวด) — idempotent ด้วย invoice.id
//   customer.subscription.deleted→ ดาวน์เกรดกลับ free (ลูกค้ายกเลิก/ตัดเงินไม่ผ่านจนหมดอายุ)
//
// Deploy:  supabase functions deploy stripe-webhook --no-verify-jwt --project-ref waigsnxhrlwtiotspaim
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_... RESEND_API_KEY=re_...
// Webhook URL (ตั้งใน Stripe → Developers → Webhooks): https://<project>.supabase.co/functions/v1/stripe-webhook
//   เลือก event: invoice.paid, customer.subscription.deleted
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { applyPaidInvoice } from "../_shared/subscription.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const ADMIN_EMAIL = "support@b-tctraining.com";
const FROM_EMAIL = "CEO AI Thailand <noreply@ceoaithailand.org>";

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter ฿390/เดือน", growth: "Growth ฿1,490/เดือน", scale: "Scale ฿5,900/เดือน",
};

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  }).catch(() => {});
}

function confirmHtml(plan: string, amount: number, cycle: string): string {
  const label = PLAN_LABEL[plan] ?? plan;
  return `<div style="font-family:Kanit,sans-serif;max-width:560px;margin:auto;background:#0f172a;color:#f8fafc;padding:32px;border-radius:12px">
  <h2 style="color:#06b6d4;margin-top:0">✅ ยืนยันการชำระเงินสำเร็จ</h2>
  <p>ขอบคุณสำหรับการชำระเงิน! แพ็ก <strong style="color:#06b6d4">${label}</strong> (${cycle === "yearly" ? "รายปี" : "รายเดือน"}) เปิดใช้งานแล้ว</p>
  <p style="font-size:15px">ยอดชำระ <strong>฿${amount.toLocaleString()}</strong></p>
  <p style="color:#94a3b8;font-size:13px">ตัดเงินอัตโนมัติทุกงวด — ยกเลิกได้ทุกเมื่อ ติดต่อ <a href="mailto:${ADMIN_EMAIL}" style="color:#06b6d4">${ADMIN_EMAIL}</a></p>
  <p style="color:#64748b;font-size:12px;margin-top:24px">CEO AI Thailand · โดย B. Training Consultant</p></div>`;
}

async function lookupEmail(admin: ReturnType<typeof createClient>, workspaceId: string): Promise<string | null> {
  try {
    const { data: mem } = await admin.from("workspace_members")
      .select("user_id").eq("workspace_id", workspaceId).limit(1);
    const uid = (mem as { user_id?: string }[] | null)?.[0]?.user_id;
    if (uid) { const { data: u } = await admin.auth.admin.getUserById(uid); return u?.user?.email ?? null; }
  } catch { /* ignore */ }
  return null;
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-01-27.acacia" });
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });
  if (!STRIPE_SECRET_KEY || !WEBHOOK_SECRET) return new Response("not_configured", { status: 503 });

  const sig = req.headers.get("stripe-signature") ?? "";
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, WEBHOOK_SECRET, undefined, cryptoProvider);
  } catch (e) {
    return new Response(`bad_signature: ${(e as Error).message}`, { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // ── จ่ายสำเร็จ (ครั้งแรก + ทุกงวดอัตโนมัติ) → เปิด/ต่ออายุแพ็ก ──
  if (event.type === "invoice.paid") {
    const inv = event.data.object as Stripe.Invoice;

    // อ่าน metadata (workspace_id/plan_id/cycle) จาก subscription — เผื่อไม่ติดมากับ invoice ให้ retrieve
    let meta: Record<string, string> = {};
    const subDetailsMeta = (inv as unknown as { subscription_details?: { metadata?: Record<string, string> } })
      .subscription_details?.metadata;
    if (subDetailsMeta && subDetailsMeta.workspace_id) {
      meta = subDetailsMeta;
    } else if (typeof inv.subscription === "string") {
      try { const s = await stripe.subscriptions.retrieve(inv.subscription); meta = (s.metadata ?? {}) as Record<string, string>; }
      catch { /* ignore */ }
    }

    const workspaceId = meta.workspace_id ?? "";
    const plan = meta.plan_id ?? "";
    const cycle = meta.cycle === "yearly" ? "yearly" : "monthly";
    if (!workspaceId || !plan) return new Response("missing_ref", { status: 200 }); // ack (ไม่ retry)

    const amount = Math.round((inv.amount_paid ?? 0) / 100); // สตางค์ → บาท

    const { data: row, error: selErr } = await admin
      .from("workspace_state").select("data").eq("workspace_id", workspaceId).maybeSingle();
    if (selErr) return new Response("db_error", { status: 500 });
    const state = ((row as { data?: Record<string, unknown> } | null)?.data ?? {}) as Record<string, unknown>;

    // idempotency: Stripe ยิง event ซ้ำได้ → กันด้วย invoice.id (stable ต่อ 1 การชำระ)
    const { state: nextState, alreadyProcessed } = applyPaidInvoice(state, {
      plan, cycle, amount,
      xenditId: inv.id,                          // ใช้ invoice.id ของ Stripe เป็น idempotency key
      invoiceId: "inv-" + Date.now().toString(36),
      now: new Date(),
    });
    if (alreadyProcessed) return new Response(JSON.stringify({ ok: true, dedup: true }), { status: 200, headers: { "content-type": "application/json" } });

    const { error: upErr } = await admin.from("workspace_state")
      .upsert({ workspace_id: workspaceId, data: nextState, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
    if (upErr) return new Response("db_error", { status: 500 });

    const userEmail = await lookupEmail(admin, workspaceId);
    await Promise.all([
      userEmail ? sendMail(userEmail, `✅ ยืนยันการชำระเงิน — แพ็ก ${plan} CEO AI Thailand`, confirmHtml(plan, amount, cycle)) : Promise.resolve(),
      sendMail(ADMIN_EMAIL, `[CEO AI] Stripe Payment ฿${amount} — ${plan}/${cycle} — ${workspaceId.slice(0, 8)}`,
        `<p>Stripe invoice paid</p><p>Plan: ${plan} (${cycle}) · ฿${amount}</p><p>Workspace: <code>${workspaceId}</code></p>`),
    ]);
    return new Response(JSON.stringify({ ok: true, workspace_id: workspaceId, plan, cycle, amount }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // ── ยกเลิก subscription (ลูกค้ายกเลิก / ตัดเงินไม่ผ่านจนหมดอายุ) → ดาวน์เกรด free ──
  if (event.type === "customer.subscription.deleted") {
    const s = event.data.object as Stripe.Subscription;
    const meta = (s.metadata ?? {}) as Record<string, string>;
    const workspaceId = meta.workspace_id ?? "";
    if (!workspaceId) return new Response("missing_ref", { status: 200 });

    const { data: row } = await admin.from("workspace_state").select("data").eq("workspace_id", workspaceId).maybeSingle();
    const state = ((row as { data?: Record<string, unknown> } | null)?.data ?? {}) as Record<string, unknown>;
    const sub = (state.subscription ?? {}) as Record<string, unknown>;
    if (sub.plan === "free" || sub.status === "canceled") return new Response(JSON.stringify({ ok: true, noop: true }), { status: 200, headers: { "content-type": "application/json" } });

    const nextState = { ...state, subscription: { ...sub, plan: "free", status: "canceled" } };
    await admin.from("workspace_state")
      .upsert({ workspace_id: workspaceId, data: nextState, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });

    const userEmail = await lookupEmail(admin, workspaceId);
    if (userEmail) await sendMail(userEmail, "แพ็ก CEO AI Thailand ถูกยกเลิกแล้ว",
      `<div style="font-family:Kanit,sans-serif"><p>แพ็กของคุณถูกยกเลิก/หมดอายุแล้ว บัญชีกลับสู่ Free</p><p>สมัครใหม่ได้ทุกเมื่อที่ <a href="https://ceoaithailand.org">ceoaithailand.org</a></p></div>`);
    return new Response(JSON.stringify({ ok: true, workspace_id: workspaceId, downgraded: true }), { status: 200, headers: { "content-type": "application/json" } });
  }

  return new Response(JSON.stringify({ ok: true, ignored: event.type }), { status: 200, headers: { "content-type": "application/json" } });
});
