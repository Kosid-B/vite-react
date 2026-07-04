// Supabase Edge Function: daily-ceo-report
// ทุกวัน 02:00 UTC (~09:00 ไทย) — CEO สรุปรายงานประจำวัน + เสนอ Issue ให้บอร์ด
//   (1) ในระบบ: เพิ่ม approval type 'daily_report' ลง workspace_state (1 รายการ/วัน/เวิร์กสเปซ)
//   (2) อีเมล: ส่งสรุป 7 หัวข้อถึงเจ้าของเวิร์กสเปซผ่าน Resend
// รันด้วย pg_cron (ดู migration 0021)
//
// Deploy:  supabase functions deploy daily-ceo-report --no-verify-jwt
// Secret:  CRON_SECRET + RESEND_API_KEY (ชุดเดียวกับ weekly-report/billing-cron)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const FROM_EMAIL = "CEO AI Thailand <noreply@ceoaithailand.org>";
const APP_URL = "https://ceoaithailand.org";
const PLAN_PRICE: Record<string, number> = { free: 0, starter: 390, growth: 1490, scale: 5900 };
const MKT = /cmo|market|ตลาด|แบรนด์|content|โฆษณา|campaign/i;
const baht = (n: number) => "฿" + Math.round(n).toLocaleString("th-TH");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  }).catch(() => null);
  return !!res && res.ok;
}

interface Report {
  companyName: string; net: number; revenue: number; expense: number; margin: number; breakEven: boolean;
  doneCount: number; closedCount: number; closedValue: number;
  marketing: string[]; payables: { label: string; amount: number; recurring: boolean }[];
  errors: string[]; issues: string[]; nextSteps: string[];
}

// deno-lint-ignore no-explicit-any
function buildReport(state: Record<string, any>): Report | null {
  const c = state.aiCompany;
  if (!c) return null;
  // deno-lint-ignore no-explicit-any
  const tasks: any[] = c.tasks ?? [];
  // deno-lint-ignore no-explicit-any
  const agents: any[] = c.agents ?? [];
  const roleOf = (id: string) => agents.find((a) => a.id === id)?.role ?? "";

  const plan = state.subscription?.plan ?? "free";
  const auto = PLAN_PRICE[plan] > 0
    ? [{ label: `ค่าแพ็กเกจ ${plan}`, amount: PLAN_PRICE[plan], kind: "expense", recurring: true }]
    : [];
  // deno-lint-ignore no-explicit-any
  const manual: any[] = state.finance ?? [];
  const entries = [...auto, ...manual];
  const revenue = entries.filter((e) => e.kind === "revenue").reduce((s, e) => s + (e.amount || 0), 0);
  const expense = entries.filter((e) => e.kind === "expense").reduce((s, e) => s + (e.amount || 0), 0);
  const net = revenue - expense;

  // deno-lint-ignore no-explicit-any
  const deals: any[] = state.marketplace?.deals ?? [];
  const closed = deals.filter((x) => x.status === "closed");

  const review = tasks.filter((t) => t.status === "review");
  const blocked = tasks.filter((t) => t.status === "blocked");
  const done = tasks.filter((t) => t.status === "done");
  const nextT = tasks.filter((t) => t.status === "queued" || t.status === "in_progress");
  const clip = (s: string, n = 80) => { const x = String(s ?? "").replace(/\s+/g, " ").trim(); return x.length > n ? x.slice(0, n) + "…" : x; };

  return {
    companyName: c.name ?? "บริษัทของคุณ",
    revenue, expense, net,
    margin: revenue > 0 ? Math.round((net / revenue) * 100) : 0,
    breakEven: revenue > 0 && revenue >= expense,
    doneCount: done.length,
    closedCount: closed.length,
    closedValue: closed.reduce((s, x) => s + (x.amount || 0), 0),
    marketing: tasks.filter((t) => (t.status === "done" || t.status === "review") && MKT.test(roleOf(t.agentId)))
      .slice(0, 6).map((t) => clip(t.title)),
    payables: entries.filter((e) => e.kind === "expense").slice(0, 8)
      .map((e) => ({ label: e.label || "ค่าใช้จ่าย", amount: e.amount || 0, recurring: !!e.recurring })),
    errors: blocked.slice(0, 6).map((t) => `${clip(t.title)} — ${clip(t.output, 60)}`),
    issues: review.slice(0, 10).map((t) => `${roleOf(t.agentId) || "ทีม"}: ${clip(t.title)}`),
    nextSteps: nextT.slice(0, 6).map((t) => clip(t.title)),
  };
}

function reportText(r: Report, dateTh: string): string {
  const L: string[] = [];
  L.push(`รายงานประจำวัน ${dateTh} — ${r.companyName}`);
  L.push(`สรุป: งานเสร็จ ${r.doneCount} · กำไรสุทธิ ${baht(r.net)} (${r.breakEven ? "คุ้มทุน" : "ยังไม่คุ้มทุน"}) · ประเด็นรออนุมัติ ${r.issues.length}`);
  L.push(`1) 📣 การตลาด: ${r.marketing.length ? r.marketing.join(" · ") : "—"}`);
  L.push(`2) 📦 ส่งมอบ: งานเสร็จ ${r.doneCount} · ดีลปิด ${r.closedCount} (${baht(r.closedValue)})`);
  L.push(`3) 💰 การเงิน/Cashflow: เข้า ${baht(r.revenue)} · ออก ${baht(r.expense)} · สุทธิ ${baht(r.net)} · มาร์จิน ${r.margin}%`);
  L.push(`4) 🧾 ต้องจ่าย: ${r.payables.length ? r.payables.map((p) => `${p.label} ${baht(p.amount)}${p.recurring ? "(ประจำ)" : ""}`).join(" · ") : "—"}`);
  L.push(`5) ⚠️ ข้อผิดพลาด/ข้อบกพร่อง: ${r.errors.length ? r.errors.join(" · ") : "ไม่พบ"}`);
  L.push(`6) 📌 ประเด็นเสนอบอร์ดอนุมัติ: ${r.issues.length ? r.issues.join(" · ") : "—"}`);
  L.push(`7) → ขั้นตอนถัดไป: ${r.nextSteps.length ? r.nextSteps.join(" · ") : "—"}`);
  return L.join("\n");
}

function reportHtml(r: Report, dateTh: string): string {
  const sec = (n: string, body: string) =>
    `<div style="margin:14px 0"><div style="font-weight:700;color:#67e8f9;font-size:14px">${n}</div><div style="color:#cbd5e1;font-size:13px;margin-top:4px;line-height:1.6">${body}</div></div>`;
  const list = (a: string[]) => a.length ? a.map((x) => "• " + x).join("<br>") : "—";
  return `
<div style="font-family:Kanit,Sarabun,sans-serif;max-width:600px;margin:auto;background:#0f172a;color:#f8fafc;padding:30px;border-radius:12px">
  <div style="font-size:11px;letter-spacing:.12em;color:#67e8f9;text-transform:uppercase">CEO AI Thailand · Daily Board Report</div>
  <h2 style="margin:6px 0 2px">📊 รายงานผลการดำเนินงานประจำวัน</h2>
  <div style="color:#94a3b8;font-size:14px">${r.companyName} · ${dateTh}</div>
  <div style="background:#111c33;border-radius:10px;padding:14px 16px;margin-top:14px">
    งานเสร็จ <b>${r.doneCount}</b> · กำไรสุทธิ <b style="color:${r.net >= 0 ? "#34d399" : "#f87171"}">${baht(r.net)}</b>
    · ประเด็นรออนุมัติ <b style="color:#fbbf24">${r.issues.length}</b>
  </div>
  ${sec("1) 📣 งานการตลาด", list(r.marketing))}
  ${sec("2) 📦 ผลการส่งมอบสินค้า/บริการ", `งานส่งมอบเสร็จ ${r.doneCount} · ดีลปิด ${r.closedCount} (${baht(r.closedValue)})`)}
  ${sec("3) 💰 สรุปการเงิน & Cashflow", `รายรับ ${baht(r.revenue)} · รายจ่าย ${baht(r.expense)} · กระแสเงินสดสุทธิ <b>${baht(r.net)}</b> · อัตรากำไร ${r.margin}%<br>${r.breakEven ? "✅ รายรับครอบคลุมรายจ่าย" : "⚠️ รายจ่ายมากกว่ารายรับ"}`)}
  ${sec("4) 🧾 รายการที่ต้องจ่าย (Payables)", list(r.payables.map((p) => `${p.label} — ${baht(p.amount)}${p.recurring ? " (ประจำ)" : ""}`))}
  ${sec("5) ⚠️ ข้อผิดพลาด / ข้อบกพร่อง", list(r.errors))}
  ${sec("6) 📌 ประเด็นเสนอบอร์ดพิจารณาอนุมัติ", list(r.issues))}
  ${sec("7) → ขั้นตอนถัดไป", list(r.nextSteps))}
  <a href="${APP_URL}" style="display:inline-block;margin-top:18px;background:#06b6d4;color:#0f172a;font-weight:700;padding:11px 22px;border-radius:8px;text-decoration:none">เปิดพิจารณา & อนุมัติ →</a>
  <p style="color:#64748b;font-size:12px;margin-top:24px;line-height:1.7">CEO AI Thailand · โดย B. Training Consultant (M.E.A) Co., Ltd. · โทร 081-781-7773<br>
  ไม่ต้องการรับอีเมลนี้ แจ้งที่ <a href="mailto:support@b-tctraining.com" style="color:#67e8f9">support@b-tctraining.com</a></p>
</div>`;
}

Deno.serve(async (req) => {
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret") ?? "";
  if (CRON_SECRET && secret !== CRON_SECRET) return new Response("forbidden", { status: 403 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();
  const dayId = now.toISOString().slice(0, 10);            // YYYY-MM-DD
  const dateTh = now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

  const [{ data: wss, error: e1 }, { data: states, error: e2 }] = await Promise.all([
    admin.from("workspaces").select("id, name, owner_id"),
    admin.from("workspace_state").select("workspace_id, data"),
  ]);
  if (e1 || e2) return json({ error: (e1 ?? e2)!.message }, 500);

  const stateByWs = new Map((states ?? []).map((r) => [r.workspace_id, r.data]));
  let sent = 0, issued = 0, skipped = 0;

  for (const ws of wss ?? []) {
    // deno-lint-ignore no-explicit-any
    const state = stateByWs.get(ws.id) as Record<string, any> | undefined;
    const report = state ? buildReport(state) : null;
    if (!state || !report) { skipped++; continue; }

    // (1) เพิ่ม approval "รายงานประจำวัน" ลงในระบบ (1 รายการ/วัน กันซ้ำ)
    const approvals = state.aiCompany.approvals ?? [];
    const apId = `daily-${dayId}`;
    if (!approvals.some((a: { id: string }) => a.id === apId)) {
      approvals.unshift({
        id: apId,
        agentId: (state.aiCompany.agents ?? []).find((a: { role: string }) => /ceo/i.test(a.role))?.id ?? "",
        title: `📊 รายงานประจำวัน ${dateTh} — CEO เสนอบอร์ด (${report.issues.length} ประเด็น)`,
        detail: reportText(report, dateTh),
        impact: JSON.stringify({ type: "daily_report", day: dayId }),
        status: "pending",
      });
      state.aiCompany.approvals = approvals.slice(0, 60);
      const { error: upErr } = await admin.from("workspace_state")
        .update({ data: state, updated_at: now.toISOString() }).eq("workspace_id", ws.id);
      if (!upErr) issued++;
    }

    // (2) อีเมลแจ้งเตือนเจ้าของ
    const { data: u } = await admin.auth.admin.getUserById(ws.owner_id).catch(() => ({ data: null }));
    const email = u?.user?.email;
    if (email && await sendMail(email, `📊 รายงานประจำวัน ${dateTh} — ${report.companyName}`, reportHtml(report, dateTh))) sent++;
    else skipped++;
  }

  return json({ ok: true, workspaces: (wss ?? []).length, issued, sent, skipped });
});
