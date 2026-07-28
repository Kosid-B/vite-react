// verify-topup-slip — ตรวจสลิป top-up กับธนาคารจริงผ่าน SlipOK แล้ว "เปิด AI credits ฝั่ง server"
// แยกจาก verify-slip (แพ็กเงินเดิม) โดยสิ้นเชิง → ไม่กระทบการชำระแพ็ก · logic SlipOK mirror ตัวที่ใช้จริง
//
// Deploy:  supabase functions deploy verify-topup-slip --project-ref waigsnxhrlwtiotspaim
// Secrets: ใช้ SLIPOK_API_KEY / SLIPOK_BRANCH_ID เดียวกับ verify-slip (ตั้งไว้แล้ว)
//
// Body: { workspaceId, requestId }
//   - user อัปสลิปเข้า bucket payment-slips + สร้าง ai_topup_request (pending, slip_path) แล้ว
// Return: { ok:true, credits } | { ok:false, reason, code? }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SLIPOK_API_KEY = Deno.env.get("SLIPOK_API_KEY") ?? "";
const SLIPOK_BRANCH_ID = Deno.env.get("SLIPOK_BRANCH_ID") ?? "";
const RECEIVER_HINT = Deno.env.get("SLIPOK_RECEIVER_HINT") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...cors } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, reason: "method_not_allowed" }, 405);
  if (!SLIPOK_API_KEY || !SLIPOK_BRANCH_ID) return json({ ok: false, reason: "slipok_not_configured" }, 503);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // ── ยืนยันตัวตนจาก JWT ──
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return json({ ok: false, reason: "unauthorized" }, 401);
  const user = userData.user;

  let body: { workspaceId?: string; requestId?: string };
  try { body = await req.json(); } catch { return json({ ok: false, reason: "bad_json" }, 400); }
  const workspaceId = String(body.workspaceId ?? "");
  const requestId = String(body.requestId ?? "");
  if (!workspaceId || !requestId) return json({ ok: false, reason: "missing_params" }, 400);

  // ── ผู้เรียกต้องเป็นสมาชิก workspace นี้ ──
  const { data: member } = await admin.from("workspace_members")
    .select("workspace_id").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!member) return json({ ok: false, reason: "not_a_member" }, 403);

  // ── โหลดคำขอ top-up (pending + ของ workspace นี้) ──
  const { data: r } = await admin.from("ai_topup_request")
    .select("id, workspace_id, pack_id, status, slip_path, trans_ref")
    .eq("id", requestId).maybeSingle();
  if (!r || r.workspace_id !== workspaceId) return json({ ok: false, reason: "request_not_found" }, 404);
  if (r.status !== "pending") return json({ ok: false, reason: "not_pending", status: r.status }, 409);
  if (!r.slip_path) return json({ ok: false, reason: "no_slip_file" }, 400);

  // ── ราคา/credits จาก pack_id ฝั่ง server (กัน spoof) ──
  const { data: priceRow } = await admin.rpc("topup_pack_price", { p_pack: r.pack_id });
  const { data: creditRow } = await admin.rpc("topup_pack_credits", { p_pack: r.pack_id });
  const expected = Number(priceRow ?? 0);
  const credits = Number(creditRow ?? 0);
  if (expected <= 0 || credits <= 0) return json({ ok: false, reason: "invalid_pack" }, 400);

  // ── ดึงไฟล์สลิป ──
  const dl = await admin.storage.from("payment-slips").download(r.slip_path);
  if (dl.error || !dl.data) return json({ ok: false, reason: "slip_download_failed" }, 502);

  // ── เรียก SlipOK ──
  let slipRes: Response;
  try {
    const form = new FormData();
    form.append("files", dl.data, "slip");
    form.append("log", "true");
    slipRes = await fetch(`https://api.slipok.com/api/line/apikey/${SLIPOK_BRANCH_ID}`, {
      method: "POST", headers: { "x-authorization": SLIPOK_API_KEY }, body: form,
    });
  } catch { return json({ ok: false, reason: "slipok_unreachable" }, 502); }

  const slip = await slipRes.json().catch(() => null) as
    | { success?: boolean; code?: number; message?: string; data?: Record<string, unknown> } | null;
  if (!slip) return json({ ok: false, reason: "slipok_bad_response" }, 502);

  if (!slipRes.ok || slip.success !== true || !slip.data) {
    const code = Number(slip.code ?? 0);
    const reason =
        code === 1012 ? "duplicate_slip"
      : code === 1013 ? "amount_mismatch"
      : code === 1014 ? "receiver_mismatch"
      : code === 1010 ? "bank_delay"
      : code === 1009 ? "bank_busy"
      : code === 1011 ? "qr_expired"
      : code === 1008 ? "not_payment_qr"
      : code === 1007 ? "no_qr"
      : code === 1005 || code === 1006 ? "bad_image"
      : code === 1000 || code === 1001 || code === 1002 ? "slipok_config"
      : code === 1003 || code === 1004 || code === 1015 ? "slipok_quota"
      : "slip_not_verified";
    if (reason === "slipok_config" || reason === "slipok_quota") {
      console.error(`SlipOK store-side error ${code}: ${String(slip.message ?? "")}`);
    }
    return json({ ok: false, reason, code, detail: String(slip.message ?? "").slice(0, 200) }, 422);
  }

  const d = slip.data as Record<string, any>;
  const paidAmount = Number(d.amount ?? 0);
  const transRef = String(d.transRef ?? "");
  const receiverStr = JSON.stringify(d.receiver ?? {});

  // ── ตรวจ 3 ชั้น (เหมือน verify-slip) ──
  if (!(paidAmount + 0.01 >= expected)) {
    return json({ ok: false, reason: "amount_too_low", code: 1013, paid: paidAmount, expected }, 422);
  }
  if (RECEIVER_HINT && !receiverStr.replace(/\D/g, "").includes(RECEIVER_HINT.replace(/\D/g, ""))) {
    return json({ ok: false, reason: "receiver_mismatch" }, 422);
  }
  if (transRef) {
    // กันสลิปซ้ำข้ามทั้ง top-up และแพ็ก (payment_submissions)
    const [tu, ps] = await Promise.all([
      admin.from("ai_topup_request").select("id").eq("trans_ref", transRef).neq("id", requestId).maybeSingle(),
      admin.from("payment_submissions").select("id").eq("trans_ref", transRef).maybeSingle(),
    ]);
    if (tu.data || ps.data) return json({ ok: false, reason: "duplicate_slip", code: 1012 }, 422);
  }

  // ── ผ่านครบ → บันทึกคำขอ approved + เปิด credits (grant_ai_topup ผ่าน service-role) ──
  const now = new Date().toISOString();
  const upd = await admin.from("ai_topup_request").update({
    status: "approved", trans_ref: transRef || null, verified_at: now,
    verify_method: "slipok", decided_at: now,
    note: `SlipOK ✓ ฿${paidAmount.toLocaleString()} · ref ${transRef}`,
  }).eq("id", requestId);
  if (upd.error) return json({ ok: false, reason: "duplicate_slip", code: 1012 }, 422); // ชน unique trans_ref

  const grant = await admin.rpc("grant_ai_topup", { p_workspace: workspaceId, p_credits: credits });
  if (grant.error) return json({ ok: false, reason: "grant_failed", detail: grant.error.message }, 500);

  return json({ ok: true, credits, paid: paidAmount, transRef });
});
