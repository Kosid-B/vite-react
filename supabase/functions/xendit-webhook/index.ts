// xendit-webhook — รับ callback จาก Xendit เมื่อ Invoice ถูกชำระ (status PAID)
// verify_jwt = false: ยืนยันด้วย x-callback-token แทน (ตั้งใน Xendit dashboard)
// → เปิดใช้งานแพ็ก (subscription.active) ใน workspace ที่อ้างถึง + ส่งอีเมล Resend
//
// Deploy:  supabase functions deploy xendit-webhook --no-verify-jwt --project-ref rsjbqmnvocvtveelselj
// Secrets: supabase secrets set XENDIT_CALLBACK_TOKEN=...   (Callback Verification Token จาก Xendit)
//          supabase secrets set RESEND_API_KEY=re_...
// Webhook URL (ตั้งใน Xendit): https://<project>.supabase.co/functions/v1/xendit-webhook
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CALLBACK_TOKEN = Deno.env.get("XENDIT_CALLBACK_TOKEN") ?? "";
const ADMIN_EMAIL = "support@b-tctraining.com";
const FROM_EMAIL = "CEO AI Thailand <noreply@ceoaithailand.org>";

const PRICE_MONTHLY: Record<string, number> = { starter: 390, growth: 1490, scale: 5900 };
const PRICE_YEARLY: Record<string, number> = { starter: 3900, growth: 14900, scale: 59000 };
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
  <p style="color:#94a3b8;font-size:13px">หากต้องการยกเลิก/เปลี่ยนแพ็ก ติดต่อ <a href="mailto:${ADMIN_EMAIL}" style="color:#06b6d4">${ADMIN_EMAIL}</a></p>
  <p style="color:#64748b;font-size:12px;margin-top:24px">CEO AI Thailand · โดย B. Training Consultant</p></div>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  // ยืนยัน webhook จาก Xendit ด้วย callback token
  const token = req.headers.get("x-callback-token") ?? "";
  if (!CALLBACK_TOKEN || token !== CALLBACK_TOKEN) return new Response("forbidden", { status: 401 });

  let evt: any;
  try { evt = await req.json(); } catch { return new Response("bad_json", { status: 400 }); }

  // Xendit invoice callback: { status: 'PAID', external_id, amount, paid_amount, metadata }
  const status = String(evt?.status ?? "").toUpperCase();
  if (status !== "PAID" && status !== "SETTLED") return new Response("ignored", { status: 200 });

  const externalId: string = evt?.external_id ?? "";
  const meta = evt?.metadata ?? {};
  // external_id = sub_<wsId>_<plan>_<cycle>_<ts>
  const m = externalId.match(/^sub_(.+)_(starter|growth|scale)_(monthly|yearly)_/);
  const workspaceId = meta.workspace_id ?? (m ? m[1] : "");
  const plan = meta.plan_id ?? (m ? m[2] : "");
  const cycle = meta.cycle ?? (m ? m[3] : "monthly");
  if (!workspaceId || !plan) return new Response("missing_ref", { status: 400 });

  const amount = Number(evt?.paid_amount ?? evt?.amount ??
    (cycle === "yearly" ? PRICE_YEARLY[plan] : PRICE_MONTHLY[plan]) ?? 0);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: row, error: selErr } = await admin
    .from("workspace_state").select("data").eq("workspace_id", workspaceId).maybeSingle();
  if (selErr) return new Response("db_error", { status: 500 });

  const state = (row?.data ?? {}) as Record<string, any>;
  const sub = state.subscription ?? {};
  const invoices: any[] = sub.invoices ?? [];
  invoices.unshift({
    id: "inv-" + Date.now().toString(36),
    date: new Date().toISOString(),
    plan, amount, status: "paid",
  });

  const periodEnd = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + (cycle === "yearly" ? 12 : 1));
    return d.toISOString();
  })();

  state.subscription = {
    ...sub, plan, status: "active", billingCycle: cycle,
    trialEndDate: null, invoices, currentPeriodEnd: periodEnd,
  };

  const { error: upErr } = await admin.from("workspace_state")
    .upsert({ workspace_id: workspaceId, data: state, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
  if (upErr) return new Response("db_error", { status: 500 });

  // อีเมลยืนยัน
  let userEmail: string | null = null;
  try {
    const { data: mem } = await admin.from("workspace_members")
      .select("user_id").eq("workspace_id", workspaceId).limit(1);
    const uid = mem?.[0]?.user_id;
    if (uid) { const { data: u } = await admin.auth.admin.getUserById(uid); userEmail = u?.user?.email ?? null; }
  } catch { /* ignore */ }

  await Promise.all([
    userEmail ? sendMail(userEmail, `✅ ยืนยันการชำระเงิน — แพ็ก ${plan} CEO AI Thailand`, confirmHtml(plan, amount, cycle)) : Promise.resolve(),
    sendMail(ADMIN_EMAIL, `[CEO AI] Xendit Payment ฿${amount} — ${plan}/${cycle} — ${String(workspaceId).slice(0, 8)}`,
      `<p>Xendit invoice paid</p><p>Plan: ${plan} (${cycle}) · ฿${amount}</p><p>Workspace: <code>${workspaceId}</code></p>`),
  ]);

  return new Response(JSON.stringify({ ok: true, workspace_id: workspaceId, plan, cycle, amount }), {
    status: 200, headers: { "content-type": "application/json" },
  });
});
