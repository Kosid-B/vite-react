// recurring-webhook — รับ event จาก Xendit Recurring API (recurring.*)
// verify_jwt = false: ยืนยันด้วย x-callback-token · อัปเดต subscription ตามงวด (idempotent)
//   cycle.succeeded → active + ต่อ period · cycle.failed → past_due · plan.inactivated → canceled
//
// Deploy:  supabase functions deploy recurring-webhook --no-verify-jwt --project-ref waigsnxhrlwtiotspaim
// Secrets: supabase secrets set XENDIT_CALLBACK_TOKEN=...
// Webhook URL (ตั้งใน Xendit): https://<project>.supabase.co/functions/v1/recurring-webhook
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseRecurringEvent, applyRecurringEvent, workspaceIdFromReference } from "../_shared/recurring.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CALLBACK_TOKEN = Deno.env.get("XENDIT_CALLBACK_TOKEN") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  const token = req.headers.get("x-callback-token") ?? "";
  if (!CALLBACK_TOKEN || token !== CALLBACK_TOKEN) return new Response("forbidden", { status: 401 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return new Response("bad_json", { status: 400 }); }

  const evt = parseRecurringEvent(raw);
  if (evt.type === "unknown") return new Response("ignored", { status: 200 });

  // หา workspace จาก reference_id ของ plan (fallback: lookup ด้วย recurringPlanId)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  let workspaceId = workspaceIdFromReference(evt.referenceId);
  if (!workspaceId && evt.planId) {
    const { data: found } = await admin.from("workspace_state")
      .select("workspace_id, data").limit(1000);
    const hit = (found ?? []).find((r: Record<string, any>) => r?.data?.subscription?.recurringPlanId === evt.planId);
    workspaceId = hit?.workspace_id ?? "";
  }
  if (!workspaceId) return new Response("missing_ref", { status: 200 }); // ack กัน retry ไม่รู้จบ

  const { data: row, error: selErr } = await admin
    .from("workspace_state").select("data").eq("workspace_id", workspaceId).maybeSingle();
  if (selErr) return new Response("db_error", { status: 500 });

  const state = (row?.data ?? {}) as Record<string, unknown>;
  const { state: nextState, changed } = applyRecurringEvent(state, evt, {
    now: new Date(), invoiceId: "inv-" + Date.now().toString(36),
  });

  if (!changed) {
    return new Response(JSON.stringify({ ok: true, dedup: true }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }

  const { error: upErr } = await admin.from("workspace_state")
    .upsert({ workspace_id: workspaceId, data: nextState, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
  if (upErr) return new Response("db_error", { status: 500 });

  return new Response(JSON.stringify({ ok: true, type: evt.type, workspace_id: workspaceId }), {
    status: 200, headers: { "content-type": "application/json" },
  });
});
