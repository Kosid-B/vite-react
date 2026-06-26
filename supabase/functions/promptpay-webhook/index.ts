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

  const state = (row?.data ?? {}) as Record<string, any>;
  state.subscription = { ...(state.subscription ?? {}), plan: planId, status: "active" };

  const { error: upErr } = await admin
    .from("workspace_state")
    .upsert({ workspace_id: workspaceId, data: state, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
  if (upErr) return new Response("db_error", { status: 500 });

  return new Response(JSON.stringify({ ok: true, workspace_id: workspaceId, plan: planId }), {
    status: 200, headers: { "content-type": "application/json" },
  });
});
