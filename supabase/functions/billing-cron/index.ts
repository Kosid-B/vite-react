// Supabase Edge Function: billing-cron
// งานเบื้องหลัง automate billing — รันรายวันด้วย pg_cron (ดู migration 0004)
// ตรวจทุกเวิร์กสเปซ: ต่ออายุอัตโนมัติเมื่อถึงรอบบิล / ตั้ง past_due เมื่อเกินกำหนด
//
// Deploy:  supabase functions deploy billing-cron --no-verify-jwt
// Secret:  supabase secrets set CRON_SECRET=...   (กันเรียกจากภายนอก)
//          supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const ADMIN_EMAIL = "support@b-tctraining.com";
const FROM_EMAIL = "CEO AI Thailand <noreply@ceoaithailand.org>";

const PRICE: Record<string, number> = { free: 0, starter: 390, growth: 1490, scale: 5900 };

// ─── Resend helper ────────────────────────────────────────────────────────────
async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  }).catch(() => {});
}

async function getUserEmail(admin: ReturnType<typeof createClient>, wsId: string): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(wsId);
    return data?.user?.email ?? null;
  } catch { return null; }
}

// ─── Email templates ──────────────────────────────────────────────────────────
function renewalReminderHtml(plan: string, amount: number): string {
  const planLabel = plan === "starter" ? "Starter ฿390/เดือน" : plan === "growth" ? "Growth ฿1,490/เดือน" : plan === "scale" ? "Scale ฿5,900/เดือน" : plan;
  return `
<div style="font-family:Kanit,sans-serif;max-width:560px;margin:auto;background:#0f172a;color:#f8fafc;padding:32px;border-radius:12px">
  <h2 style="color:#06b6d4;margin-top:0">🔔 ครบกำหนดชำระค่าบริการ</h2>
  <p>รอบบิลใหม่เริ่มแล้ว! กรุณาชำระเงินเพื่อให้บริการต่อเนื่อง</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px;color:#94a3b8">แพ็กเกจ</td><td style="padding:8px;font-weight:600">${planLabel}</td></tr>
    <tr><td style="padding:8px;color:#94a3b8">ยอดชำระ</td><td style="padding:8px;font-weight:600;color:#06b6d4">฿${amount.toLocaleString()}</td></tr>
  </table>
  <p>ชำระผ่าน PromptPay ได้ที่แอปหรือเว็บของเรา หากชำระแล้วระบบจะอัปเดตสถานะโดยอัตโนมัติ</p>
  <p style="color:#94a3b8;font-size:13px">มีข้อสงสัยติดต่อ <a href="mailto:${ADMIN_EMAIL}" style="color:#06b6d4">${ADMIN_EMAIL}</a></p>
  <p style="color:#64748b;font-size:12px;margin-top:24px">CEO AI Thailand · แพลตฟอร์มสร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย</p>
</div>`;
}

function paymentFailedHtml(plan: string): string {
  const planLabel = plan === "starter" ? "Starter" : plan === "growth" ? "Growth" : plan === "scale" ? "Scale" : plan;
  return `
<div style="font-family:Kanit,sans-serif;max-width:560px;margin:auto;background:#0f172a;color:#f8fafc;padding:32px;border-radius:12px">
  <h2 style="color:#ef4444;margin-top:0">⚠️ การชำระเงินล้มเหลว</h2>
  <p>เราไม่ได้รับการชำระเงินสำหรับแพ็กเกจ <strong style="color:#06b6d4">${planLabel}</strong> ของคุณ</p>
  <p>กรุณาชำระเงินภายใน 7 วัน มิฉะนั้นระบบจะลดเป็นแพ็กเกจฟรีโดยอัตโนมัติ</p>
  <p>ชำระผ่าน PromptPay ได้ที่เมนู <strong>แพ็กเกจ</strong> ในแอปของเรา</p>
  <p style="color:#94a3b8;font-size:13px">มีข้อสงสัยติดต่อ <a href="mailto:${ADMIN_EMAIL}" style="color:#06b6d4">${ADMIN_EMAIL}</a></p>
  <p style="color:#64748b;font-size:12px;margin-top:24px">CEO AI Thailand · แพลตฟอร์มสร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย</p>
</div>`;
}

function downgradedHtml(): string {
  return `
<div style="font-family:Kanit,sans-serif;max-width:560px;margin:auto;background:#0f172a;color:#f8fafc;padding:32px;border-radius:12px">
  <h2 style="color:#f59e0b;margin-top:0">📦 แพ็กเกจถูกลดระดับเป็น Free</h2>
  <p>เนื่องจากไม่ได้รับการชำระเงินภายในระยะเวลาที่กำหนด แพ็กเกจของคุณถูกปรับเป็น <strong>Free</strong> แล้ว</p>
  <p>คุณยังสามารถใช้งานฟีเจอร์พื้นฐานได้ต่อไป หากต้องการกลับมาใช้แพ็กเกจเดิม สามารถสมัครใหม่ได้ทันทีที่เมนู <strong>แพ็กเกจ</strong></p>
  <p style="color:#94a3b8;font-size:13px">มีข้อสงสัยติดต่อ <a href="mailto:${ADMIN_EMAIL}" style="color:#06b6d4">${ADMIN_EMAIL}</a></p>
  <p style="color:#64748b;font-size:12px;margin-top:24px">CEO AI Thailand · แพลตฟอร์มสร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย</p>
</div>`;
}

function adminBillingHtml(event: string, wsId: string, plan: string, userEmail: string | null): string {
  return `
<div style="font-family:sans-serif;max-width:480px;margin:auto">
  <h3>🔄 Billing Event: ${event}</h3>
  <p><b>Plan:</b> ${plan} | <b>Workspace:</b> <code>${wsId}</code></p>
  ${userEmail ? `<p><b>User Email:</b> ${userEmail}</p>` : ""}
  <p style="color:#64748b;font-size:12px">Auto-generated by billing-cron</p>
</div>`;
}

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
  const GRACE_DAYS = 7;
  const RETRY_DAYS = 3;
  let renewed = 0, pastDue = 0, downgraded = 0, failed = 0;

  const emailTasks: Promise<void>[] = [];

  for (const row of rows ?? []) {
    const state = (row.data ?? {}) as Record<string, any>;
    const sub = state.subscription;
    if (!sub || sub.plan === "free" || !sub.currentPeriodEnd) continue;
    let dirty = false;

    // dunning: ใบแจ้งหนี้ pending ที่ค้างเกิน RETRY_DAYS → ทำเครื่องหมายล้มเหลว
    let hadFailure = false;
    for (const inv of sub.invoices ?? []) {
      if (inv.status === "pending" && (now.getTime() - new Date(inv.date).getTime()) > RETRY_DAYS * 86400000) {
        inv.status = "failed"; failed++; dirty = true; hadFailure = true;
      }
    }
    if (hadFailure) {
      const wsId = row.workspace_id;
      emailTasks.push((async () => {
        const userEmail = await getUserEmail(admin, wsId);
        await Promise.all([
          userEmail ? sendMail(userEmail, `⚠️ การชำระเงินล้มเหลว — CEO AI Thailand`, paymentFailedHtml(sub.plan)) : Promise.resolve(),
          sendMail(ADMIN_EMAIL, `[CEO AI] Payment Failed — ${sub.plan} — ${wsId.slice(0, 8)}`, adminBillingHtml("payment_failed", wsId, sub.plan, userEmail ?? null)),
        ]);
      })());
    }

    const end = new Date(sub.currentPeriodEnd);
    const overdueMs = now.getTime() - end.getTime();

    if (overdueMs >= 0) {
      if (sub.autoRenew && sub.status !== "cancelled") {
        const amount = PRICE[sub.plan] ?? 0;
        const invoice = { id: "inv-cron-" + Date.now().toString(36) + renewed, date: now.toISOString(), plan: sub.plan, amount, status: "pending" };
        sub.invoices = [invoice, ...(sub.invoices ?? [])];
        sub.currentPeriodEnd = addMonths(sub.currentPeriodEnd, 1);
        sub.status = "active";
        renewed++; dirty = true;

        // ส่ง renewal reminder
        const wsId = row.workspace_id;
        const planSnap = sub.plan;
        emailTasks.push((async () => {
          const userEmail = await getUserEmail(admin, wsId);
          await Promise.all([
            userEmail ? sendMail(userEmail, `🔔 ครบกำหนดชำระค่าบริการ — ${planSnap} CEO AI Thailand`, renewalReminderHtml(planSnap, amount)) : Promise.resolve(),
            sendMail(ADMIN_EMAIL, `[CEO AI] Renewal Invoice — ${planSnap} — ${wsId.slice(0, 8)}`, adminBillingHtml("renewal_invoice", wsId, planSnap, userEmail ?? null)),
          ]);
        })());
      } else if (overdueMs >= GRACE_DAYS * 86400000) {
        const prevPlan = sub.plan;
        sub.plan = "free"; sub.status = "cancelled"; sub.autoRenew = false;
        downgraded++; dirty = true;

        const wsId = row.workspace_id;
        emailTasks.push((async () => {
          const userEmail = await getUserEmail(admin, wsId);
          await Promise.all([
            userEmail ? sendMail(userEmail, `📦 แพ็กเกจถูกลดระดับเป็น Free — CEO AI Thailand`, downgradedHtml()) : Promise.resolve(),
            sendMail(ADMIN_EMAIL, `[CEO AI] Downgraded to Free — was ${prevPlan} — ${wsId.slice(0, 8)}`, adminBillingHtml("downgraded", wsId, prevPlan, userEmail ?? null)),
          ]);
        })());
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

  // ส่งอีเมลทั้งหมด (fire-and-forget หลัง DB update)
  await Promise.allSettled(emailTasks);

  return json({ ok: true, renewed, past_due: pastDue, downgraded, failed, scanned: rows?.length ?? 0 }, 200);
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
