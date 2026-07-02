// Supabase Edge Function: weekly-report
// PLG Retention — สรุปผลงานทีม AI รายสัปดาห์ ส่งอีเมลถึงเจ้าของเวิร์กสเปซ
// รันทุกวันศุกร์ 02:00 UTC (~09:00 ไทย) ด้วย pg_cron (ดู migration 0008)
//
// Deploy:  supabase functions deploy weekly-report --no-verify-jwt
// Secret:  ใช้ CRON_SECRET + RESEND_API_KEY เดียวกับ billing-cron

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const FROM_EMAIL = "CEO AI Thailand <noreply@ceoaithailand.org>";
const APP_URL = "https://ceoaithailand.org";
const COMPANY_URL = "https://www.b-tctraining.com";

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

interface WeeklyStats {
  companyName: string;
  agents: number;
  tasksDoneWeek: number;
  tasksDoneTotal: number;
  tasksInProgress: number;
  approvalsPending: number;
  actionsDone: number;
  actionsTotal: number;
  skills: number;
  xp: number;
}

// deno-lint-ignore no-explicit-any
function computeStats(state: Record<string, any>): WeeklyStats | null {
  const c = state.aiCompany;
  if (!c) return null;
  const weekAgo = Date.now() - 7 * 86400000;
  // deno-lint-ignore no-explicit-any
  const tasks: any[] = c.tasks ?? [];
  return {
    companyName: c.name ?? "บริษัทของคุณ",
    agents: (c.agents ?? []).length,
    tasksDoneWeek: tasks.filter((t) => t.status === "done" && t.executedAt && new Date(t.executedAt).getTime() >= weekAgo).length,
    tasksDoneTotal: tasks.filter((t) => t.status === "done").length,
    tasksInProgress: tasks.filter((t) => t.status === "in_progress" || t.status === "queued").length,
    approvalsPending: (c.approvals ?? []).filter((a: { status: string }) => a.status === "pending").length,
    // deno-lint-ignore no-explicit-any
    actionsDone: (state.actions ?? []).filter((a: any) => a.done).length,
    actionsTotal: (state.actions ?? []).length,
    skills: (c.purchasedSkills ?? []).length,
    xp: c.skillXP ?? 0,
  };
}

function reportHtml(s: WeeklyStats): string {
  const row = (label: string, value: string, hi = false) => `
    <tr>
      <td style="padding:9px 12px;color:#94a3b8;border-bottom:1px solid #1e293b">${label}</td>
      <td style="padding:9px 12px;font-weight:700;color:${hi ? "#06b6d4" : "#f8fafc"};border-bottom:1px solid #1e293b;text-align:right">${value}</td>
    </tr>`;
  return `
<div style="font-family:Kanit,Sarabun,sans-serif;max-width:560px;margin:auto;background:#0f172a;color:#f8fafc;padding:32px;border-radius:12px">
  <div style="font-size:11px;letter-spacing:.12em;color:#67e8f9;text-transform:uppercase">CEO AI Thailand · Weekly Report</div>
  <h2 style="margin:6px 0 4px">📊 สรุปผลงานทีม AI ประจำสัปดาห์</h2>
  <div style="color:#94a3b8;font-size:14px;margin-bottom:18px">${s.companyName}</div>
  <table style="width:100%;border-collapse:collapse;background:#111c33;border-radius:10px;overflow:hidden">
    ${row("งานที่ทีม AI ทำเสร็จสัปดาห์นี้", s.tasksDoneWeek + " งาน", true)}
    ${row("งานเสร็จสะสมทั้งหมด", s.tasksDoneTotal + " งาน")}
    ${row("งานกำลังดำเนินการ/รอคิว", s.tasksInProgress + " งาน")}
    ${row("รอบอร์ด (คุณ) อนุมัติ", s.approvalsPending + " เรื่อง", s.approvalsPending > 0)}
    ${row("Priority Actions", `${s.actionsDone}/${s.actionsTotal} เสร็จ`)}
    ${row("เอเจนต์ในทีม", s.agents + " ตำแหน่ง")}
    ${row("Skill ที่บริษัทมี", s.skills + " ตัว · " + s.xp.toLocaleString() + " XP")}
  </table>
  ${s.approvalsPending > 0
    ? `<p style="margin:16px 0 0;color:#fbbf24">⚠️ มี ${s.approvalsPending} เรื่องรอคุณอนุมัติ — ทีม AI เดินต่อไม่ได้จนกว่าบอร์ดจะตัดสิน</p>`
    : ""}
  <a href="${APP_URL}" style="display:inline-block;margin-top:20px;background:#06b6d4;color:#0f172a;font-weight:700;padding:11px 22px;border-radius:8px;text-decoration:none">เปิดดูบริษัท AI ของคุณ →</a>
  <p style="color:#64748b;font-size:12px;margin-top:26px;line-height:1.7">
    CEO AI Thailand — แพลตฟอร์มสร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย<br>
    โดย <a href="${COMPANY_URL}" style="color:#67e8f9">B. Training Consultant (M.E.A) Co., Ltd.</a> · โทร 081-781-7773<br>
    ไม่ต้องการรับอีเมลนี้ แจ้งที่ <a href="mailto:support@b-tctraining.com" style="color:#67e8f9">support@b-tctraining.com</a>
  </p>
</div>`;
}

Deno.serve(async (req) => {
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret") ?? "";
  if (CRON_SECRET && secret !== CRON_SECRET) return new Response("forbidden", { status: 403 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const [{ data: wss, error: e1 }, { data: states, error: e2 }] = await Promise.all([
    admin.from("workspaces").select("id, name, owner_id"),
    admin.from("workspace_state").select("workspace_id, data"),
  ]);
  if (e1 || e2) return json({ error: (e1 ?? e2)!.message }, 500);

  const stateByWs = new Map((states ?? []).map((r) => [r.workspace_id, r.data]));
  let sent = 0, skipped = 0;

  for (const ws of wss ?? []) {
    // deno-lint-ignore no-explicit-any
    const state = stateByWs.get(ws.id) as Record<string, any> | undefined;
    const stats = state ? computeStats(state) : null;
    if (!stats) { skipped++; continue; }

    const { data: u } = await admin.auth.admin.getUserById(ws.owner_id).catch(() => ({ data: null }));
    const email = u?.user?.email;
    if (!email) { skipped++; continue; }

    const ok = await sendMail(
      email,
      `📊 สรุปผลงานทีม AI สัปดาห์นี้ — ${stats.companyName}`,
      reportHtml(stats),
    );
    ok ? sent++ : skipped++;
  }

  return json({ ok: true, workspaces: (wss ?? []).length, sent, skipped });
});
