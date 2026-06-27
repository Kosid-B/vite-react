// Supabase Edge Function: billing-cron
// งานเบื้องหลัง automate billing — รันรายวันด้วย pg_cron (ดู migration 0004)
// ตรวจทุกเวิร์กสเปซ: ต่ออายุอัตโนมัติเมื่อถึงรอบบิล / ตั้ง past_due เมื่อเกินกำหนด
//
// Deploy:  supabase functions deploy billing-cron --no-verify-jwt
// Secret:  supabase secrets set CRON_SECRET=...   (กันเรียกจากภายนอก)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const PRICE: Record<string, number> = { free: 0, growth: 990, scale: 2990 };

function addMonths(iso: string, n: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString();
}

Deno.serve(async (req) => {
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret") ?? "";
  if (CRON_SECRET && secret !== CRON_SECRET) return new Response("forbidden", { status: 403 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: rows, error } = await admin.from("workspace_state").select("workspace_id, data");
  if (error) return json({ error: error.message }, 500);

  const now = new Date();
  const GRACE_DAYS = 7; // เกินกำหนดเกินกี่วันแล้วลดเป็นแพ็กฟรี
  const RETRY_DAYS = 3; // ใบแจ้งหนี้ pending เกินกี่วันถือว่าเก็บเงินไม่สำเร็จ
  let renewed = 0, pastDue = 0, downgraded = 0, failed = 0;

  for (const row of rows ?? []) {
    const state = (row.data ?? {}) as Record<string, any>;
    const sub = state.subscription;
    if (!sub || sub.plan === "free" || !sub.currentPeriodEnd) continue;
    let dirty = false;

    // dunning: ใบแจ้งหนี้ pending ที่ค้างเกิน RETRY_DAYS → ทำเครื่องหมายล้มเหลว
    for (const inv of sub.invoices ?? []) {
      if (inv.status === "pending" && (now.getTime() - new Date(inv.date).getTime()) > RETRY_DAYS * 86400000) {
        inv.status = "failed"; failed++; dirty = true;
      }
    }

    const end = new Date(sub.currentPeriodEnd);
    const overdueMs = now.getTime() - end.getTime();

    if (overdueMs >= 0) {
      if (sub.autoRenew && sub.status !== "cancelled") {
        // ออกใบแจ้งหนี้รอบใหม่ (pending) → promptpay-webhook จะยืนยันเป็น paid เมื่อชำระสำเร็จ
        const amount = PRICE[sub.plan] ?? 0;
        const invoice = { id: "inv-cron-" + Date.now().toString(36) + renewed, date: now.toISOString(), plan: sub.plan, amount, status: "pending" };
        sub.invoices = [invoice, ...(sub.invoices ?? [])];
        sub.currentPeriodEnd = addMonths(sub.currentPeriodEnd, 1);
        sub.status = "active";
        renewed++; dirty = true;
      } else if (overdueMs >= GRACE_DAYS * 86400000) {
        // หมด grace period และไม่ต่ออายุ → ลดเป็นแพ็กฟรี
        sub.plan = "free"; sub.status = "cancelled"; sub.autoRenew = false;
        downgraded++; dirty = true;
      } else if (sub.status !== "past_due") {
        sub.status = "past_due";
        pastDue++; dirty = true;
      }
    }

    if (dirty) {
      state.subscription = sub;
      await admin.from("workspace_state")
        .upsert({ workspace_id: row.workspace_id, data: state, updated_at: now.toISOString() }, { onConflict: "workspace_id" });
    }
  }

  return json({ ok: true, renewed, past_due: pastDue, downgraded, failed, scanned: rows?.length ?? 0 }, 200);
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
