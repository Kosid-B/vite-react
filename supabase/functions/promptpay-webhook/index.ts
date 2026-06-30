// Supabase Edge Function: promptpay-webhook
// รับ webhook จาก Payment Gateway ไทย (Omise / GB Prime Pay) เมื่อชำระ PromptPay สำเร็จ
// → อัปเดต subscription.status = 'active' ในเวิร์กสเปซที่อ้างถึง (ใช้ service role)
//
// Deploy:  supabase functions deploy promptpay-webhook --no-verify-jwt
// Secrets: supabase secrets set WEBHOOK_SECRET=...   (ตั้งให้ตรงกับที่ตั้งใน gateway)
//          (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY มีให้อัตโนมัติใน Edge Functions)
//
// ตั้ง URL นี้เป็น webhook endpoint ใน Omise/GB Prime และส่ง metadata.workspace_id มาด้วย

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  // ตรวจ secret อย่างง่าย (gateway บางเจ้าใช้ลายเซ็น — ปรับตามผู้ให้บริการจริง)
  const secret = req.headers.get("x-webhook-secret") ?? new URL(req.url).searchParams.get("secret") ?? "";
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) return new Response("forbidden", { status: 403 });

  let evt: any;
  try { evt = await req.json(); } catch { return new Response("bad_json", { status: 400 }); }

  // รองรับรูปแบบ Omise (key: data) และ GB Prime (key: charge) — ปรับ field ตามจริง
  const charge = evt?.data ?? evt?.charge ?? evt;
  const paid = charge?.status === "successful" || charge?.paid === true || charge?.resultCode === "00";
  const workspaceId = charge?.metadata?.workspace_id ?? evt?.metadata?.workspace_id;
  const planId = charge?.metadata?.plan_id ?? "growth";

  if (!paid) return new Response("ignored", { status: 200 });
  if (!workspaceId) return new Response("missing_workspace_id", { status: 400 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: row, error: selErr } = await admin
    .from("workspace_state").select("data").eq("workspace_id", workspaceId).maybeSingle();
  if (selErr) return new Response("db_error", { status: 500 });

  const PLAN_PRICE: Record<string, number> = { free: 0, growth: 1490, scale: 5900 };

  // ดึง amount จาก charge หรือคำนวณจาก plan
  const paidAmount: number =
    (typeof charge?.amount === "number" ? charge.amount / 100 : 0) ||
    (PLAN_PRICE[planId] ?? 0);

  const state = (row?.data ?? {}) as Record<string, any>;
  const sub = state.subscription ?? {};

  // หา pending invoice ที่ตรงกับ plan นี้ แล้วทำเครื่องหมาย paid
  const existingInvoices: any[] = sub.invoices ?? [];
  let markedPending = false;
  for (const inv of existingInvoices) {
    if (inv.status === "pending" && inv.plan === planId) {
      inv.status = "paid";
      inv.amount = paidAmount || inv.amount;
      markedPending = true;
      break;
    }
  }

  // ถ้าไม่มี pending invoice → สร้างใหม่เป็น paid
  if (!markedPending) {
    existingInvoices.unshift({
      id: "inv-" + Date.now().toString(36),
      date: new Date().toISOString(),
      plan: planId,
      amount: paidAmount,
      status: "paid",
    });
  }

  state.subscription = {
    ...sub,
    plan: planId,
    status: "active",
    invoices: existingInvoices,
    currentPeriodEnd: (() => {
      const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString();
    })(),
  };

  const { error: upErr } = await admin
    .from("workspace_state")
    .upsert({ workspace_id: workspaceId, data: state, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
  if (upErr) return new Response("db_error", { status: 500 });

  return new Response(JSON.stringify({ ok: true, workspace_id: workspaceId, plan: planId, amount: paidAmount }), {
    status: 200, headers: { "content-type": "application/json" },
  });
});
