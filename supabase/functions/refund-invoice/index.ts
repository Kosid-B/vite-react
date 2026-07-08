// refund-invoice — Admin คืนเงิน invoice ที่จ่ายผ่าน Xendit (เต็ม/บางส่วน)
// verify_jwt = true + ตรวจว่าเป็น app admin · ยิง Xendit /refunds แล้วบันทึกลง subscription state
//
// Deploy:  supabase functions deploy refund-invoice --project-ref waigsnxhrlwtiotspaim
// Secrets: supabase secrets set XENDIT_SECRET_KEY=xnd_...
//
// Body:   { workspaceId, ref (xenditId ของ invoice), amount, reason? }
// Return: { ok, fullyRefunded, refund_id }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { applyRefund, validateRefund } from "../_shared/refund.ts";
import { type SubState } from "../_shared/subscription.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const XENDIT_SECRET_KEY = Deno.env.get("XENDIT_SECRET_KEY") ?? "";
const ADMIN_EMAILS = ["support@b-tctraining.com"];

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

  // ยืนยันตัวตน + ต้องเป็น admin (อีเมล admin หรืออยู่ใน app_admins)
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const user = userData.user;
  let isAdmin = ADMIN_EMAILS.map((e) => e.toLowerCase()).includes((user.email ?? "").toLowerCase());
  if (!isAdmin) {
    const { data: row } = await admin.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    isAdmin = !!row;
  }
  if (!isAdmin) return json({ error: "forbidden" }, 403);

  let body: { workspaceId?: string; ref?: string; amount?: number; reason?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const workspaceId = String(body.workspaceId ?? "");
  const ref = String(body.ref ?? "");
  const amount = Number(body.amount ?? 0);
  const reason = String(body.reason ?? "").slice(0, 200);
  if (!workspaceId || !ref) return json({ error: "missing_ref" }, 400);

  // โหลด state + validate ก่อนยิง Xendit
  const { data: rowData, error: selErr } = await admin
    .from("workspace_state").select("data").eq("workspace_id", workspaceId).maybeSingle();
  if (selErr) return json({ error: "db_error" }, 500);
  const state = (rowData?.data ?? {}) as SubState;

  const check = validateRefund(state, ref, amount);
  if (!check.ok) return json({ error: check.error }, 400);

  // ยิง Xendit Refund API (invoice_id = xenditId ที่เก็บไว้ตอนจ่าย)
  const auth = "Basic " + btoa(XENDIT_SECRET_KEY + ":");
  const refRes = await fetch("https://api.xendit.co/refunds", {
    method: "POST",
    headers: { "Authorization": auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      reference_id: `refund_${workspaceId}_${Date.now().toString(36)}`,
      invoice_id: ref,
      currency: "THB",
      amount,
      reason: reason || "REQUESTED_BY_CUSTOMER",
    }),
  });
  if (!refRes.ok) {
    const detail = await refRes.text().catch(() => "");
    return json({ error: "xendit_refund_error", detail: detail.slice(0, 300) }, 502);
  }
  const refData = await refRes.json().catch(() => ({}));
  const refundId = String(refData?.id ?? `rf_${Date.now().toString(36)}`);

  // บันทึกลง state
  const { state: nextState, fullyRefunded } = applyRefund(state, {
    ref, amount, reason, refundId, now: new Date(),
  });
  const { error: upErr } = await admin.from("workspace_state")
    .upsert({ workspace_id: workspaceId, data: nextState, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
  if (upErr) return json({ error: "db_error" }, 500);

  return json({ ok: true, fullyRefunded, refund_id: refundId });
});
