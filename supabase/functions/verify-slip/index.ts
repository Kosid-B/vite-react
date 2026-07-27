// verify-slip — ตรวจสลิปกับ record ธนาคารจริงผ่าน SlipOK แล้ว "เปิดแพ็กฝั่ง server" (service-role)
// ปิดช่องโหว่: เดิมเปิดแพ็กฝั่ง client (เชื่อรูป/เขียน plan เองได้) → ย้ายการตัดสินมาที่ server ล้วน
// verify_jwt = true: เฉพาะผู้ใช้ล็อกอิน · ราคาคำนวณฝั่ง server (กันปลอมยอด) · ผู้เรียกต้องเป็นสมาชิก workspace
//
// Deploy:  supabase functions deploy verify-slip --project-ref waigsnxhrlwtiotspaim
// Secrets: supabase secrets set SLIPOK_API_KEY=...  SLIPOK_BRANCH_ID=...
//          (ออปชัน) SLIPOK_RECEIVER_HINT=2560   ← เลขบัญชีผู้รับบางส่วนไว้จับคู่ (default = จากเลขบัญชี K BIZ)
//
// Body: { workspaceId, submissionId, plan, cycle }
//   - สลิปถูกอัปเข้า bucket payment-slips แล้ว (submitPaymentSlip) → ฟังก์ชันดึงไฟล์มาส่ง SlipOK เอง
// Return: { ok:true, plan, cycle, currentPeriodEnd } | { ok:false, reason, code? }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SLIPOK_API_KEY = Deno.env.get("SLIPOK_API_KEY") ?? "";
const SLIPOK_BRANCH_ID = Deno.env.get("SLIPOK_BRANCH_ID") ?? "";
// ชั้นเสริม: จับคู่เลขบัญชีผู้รับบางส่วน — ค่าเริ่มต้น "" = ปิด (พึ่ง SlipOK ที่ผูกบัญชีกับสาขาแล้ว
// → SlipOK ตรวจว่าเงินเข้าบัญชีเราจริงให้ในตัว) · ตั้ง SLIPOK_RECEIVER_HINT=2560 เพื่อเปิดชั้นนี้เพิ่ม
const RECEIVER_HINT = Deno.env.get("SLIPOK_RECEIVER_HINT") ?? "";

// ราคาจริง (ฝั่ง server เท่านั้น) — รายปี = 10 เดือน · หน่วย: บาท
const PRICE_MONTHLY: Record<string, number> = { starter: 390, growth: 1490, scale: 5900 };
const PRICE_YEARLY: Record<string, number> = { starter: 3900, growth: 14900, scale: 59000 };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...cors } });

function addMonths(iso: string, n: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString();
}

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

  let body: { workspaceId?: string; submissionId?: string; plan?: string; cycle?: string };
  try { body = await req.json(); } catch { return json({ ok: false, reason: "bad_json" }, 400); }

  const workspaceId = String(body.workspaceId ?? "");
  const submissionId = String(body.submissionId ?? "");
  const plan = String(body.plan ?? "");
  const cycle = body.cycle === "yearly" ? "yearly" : "monthly";
  if (!PRICE_MONTHLY[plan]) return json({ ok: false, reason: "invalid_plan" }, 400);
  if (!workspaceId || !submissionId) return json({ ok: false, reason: "missing_params" }, 400);

  // ── ผู้เรียกต้องเป็นสมาชิก workspace นี้ ──
  const { data: member } = await admin.from("workspace_members")
    .select("workspace_id").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!member) return json({ ok: false, reason: "not_a_member" }, 403);

  // ── โหลดคำขอชำระเงิน (ต้อง pending + เป็นของ workspace นี้) ──
  const { data: sub } = await admin.from("payment_submissions")
    .select("id, workspace_id, plan, cycle, amount, slip_path, status, trans_ref")
    .eq("id", submissionId).maybeSingle();
  if (!sub || sub.workspace_id !== workspaceId) return json({ ok: false, reason: "submission_not_found" }, 404);
  if (sub.status === "approved" && sub.trans_ref) return json({ ok: false, reason: "already_verified" }, 409);
  if (!sub.slip_path) return json({ ok: false, reason: "no_slip_file" }, 400);

  const expected = cycle === "yearly" ? PRICE_YEARLY[plan] : PRICE_MONTHLY[plan];

  // ── ดึงไฟล์สลิปจาก storage (service-role) ──
  const dl = await admin.storage.from("payment-slips").download(sub.slip_path);
  if (dl.error || !dl.data) return json({ ok: false, reason: "slip_download_failed" }, 502);

  // ── เรียก SlipOK: ส่งรูปสลิป → SlipOK อ่าน mini-QR แล้วยืนยันกับธนาคาร + กันสลิปซ้ำ ──
  let slipRes: Response;
  try {
    const form = new FormData();
    form.append("files", dl.data, "slip");
    // ไม่ส่ง amount ให้ SlipOK (กัน false-reject เมื่อจ่ายเกิน) — ตรวจ amount >= expected เองด้านล่าง
    form.append("log", "true");
    slipRes = await fetch(`https://api.slipok.com/api/line/apikey/${SLIPOK_BRANCH_ID}`, {
      method: "POST",
      headers: { "x-authorization": SLIPOK_API_KEY },
      body: form,
    });
  } catch {
    return json({ ok: false, reason: "slipok_unreachable" }, 502);
  }

  const slip = await slipRes.json().catch(() => null) as
    | { success?: boolean; code?: number; message?: string; data?: Record<string, unknown> }
    | null;

  if (!slip) return json({ ok: false, reason: "slipok_bad_response" }, 502);

  // SlipOK code 1012 = สลิปซ้ำ (เคยส่งเข้าระบบแล้ว) → ปฏิเสธชัดเจน
  if (!slipRes.ok || slip.success !== true || !slip.data) {
    const code = Number(slip.code ?? 0);
    const reason = code === 1012 ? "duplicate_slip"
      : code === 1013 ? "amount_mismatch"       // ยอดไม่ตรงที่แจ้ง (SlipOK ตรวจให้เมื่อส่ง amount)
      : "slip_not_verified";
    return json({ ok: false, reason, code, detail: String(slip.message ?? "").slice(0, 200) }, 422);
  }

  const d = slip.data as Record<string, any>;
  const paidAmount = Number(d.amount ?? 0);
  const transRef = String(d.transRef ?? "");
  const senderName = String(d.sender?.displayName ?? d.sender?.name ?? "");
  const receiverStr = JSON.stringify(d.receiver ?? {});

  // ── ตรวจ 3 ชั้น ──
  // (ก) ยอดต้อง ≥ ราคาแพ็ก (กันจ่ายน้อยกว่าจริง)
  if (!(paidAmount + 0.01 >= expected)) {
    return json({ ok: false, reason: "amount_too_low", code: 1013, paid: paidAmount, expected }, 422);
  }
  // (ข) บัญชีผู้รับต้องเป็นของเรา (เงินเข้าบัญชี K BIZ จริง ไม่ใช่โอนเข้าที่อื่น)
  if (RECEIVER_HINT && !receiverStr.replace(/\D/g, "").includes(RECEIVER_HINT.replace(/\D/g, ""))) {
    return json({ ok: false, reason: "receiver_mismatch" }, 422);
  }
  // (ค) กันสลิปซ้ำระดับ DB (นอกเหนือจาก SlipOK) — transRef เดียวเปิดแพ็กได้ครั้งเดียว
  if (transRef) {
    const { data: dup } = await admin.from("payment_submissions")
      .select("id").eq("trans_ref", transRef).neq("id", submissionId).maybeSingle();
    if (dup) return json({ ok: false, reason: "duplicate_slip", code: 1012 }, 422);
  }

  // ── ผ่านทุกชั้น → บันทึกผลตรวจ + เปิดแพ็กฝั่ง server (service-role) ──
  const now = new Date().toISOString();

  const upd = await admin.from("payment_submissions").update({
    status: "approved", trans_ref: transRef || null, sender: senderName,
    verified_at: now, verify_method: "slipok",
    note: `SlipOK ✓ ฿${paidAmount.toLocaleString()} · ref ${transRef}`,
    reviewed_at: now,
  }).eq("id", submissionId);
  if (upd.error) {
    // ชนกับ unique trans_ref = สลิปซ้ำที่แข่งกันเข้ามา
    return json({ ok: false, reason: "duplicate_slip", code: 1012 }, 422);
  }

  // อ่าน workspace_state แล้วอัปเดต subscription (mirror activateFromSlip ฝั่ง client)
  const { data: ws } = await admin.from("workspace_state")
    .select("data").eq("workspace_id", workspaceId).maybeSingle();
  const state = (ws?.data ?? {}) as Record<string, any>;
  const prevSub = state.subscription ?? {};
  const applied: string[] = Array.isArray(state.appliedPaymentIds) ? state.appliedPaymentIds : [];
  const invoice = {
    id: "inv-" + submissionId.slice(0, 8), date: now, plan, amount: paidAmount, status: "paid",
  };
  state.subscription = {
    ...prevSub,
    plan,
    status: "active",
    autoRenew: false,
    billingCycle: cycle,
    currentPeriodEnd: addMonths(now, cycle === "yearly" ? 12 : 1),
    trialEndDate: null,
    invoices: [invoice, ...(Array.isArray(prevSub.invoices) ? prevSub.invoices : [])],
  };
  state.appliedPaymentIds = applied.includes(submissionId) ? applied : [...applied, submissionId];

  const save = await admin.from("workspace_state")
    .upsert({ workspace_id: workspaceId, data: state, updated_at: now }, { onConflict: "workspace_id" });
  if (save.error) return json({ ok: false, reason: "activation_failed", detail: save.error.message }, 500);

  return json({
    ok: true, plan, cycle,
    currentPeriodEnd: state.subscription.currentPeriodEnd,
    paid: paidAmount, transRef,
    subscription: state.subscription,
    appliedPaymentIds: state.appliedPaymentIds,
  });
});
