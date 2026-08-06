// Supabase Edge Function: lead-nurture
// Dark AI Marketing #3+19+20+22 — "อย่าทิ้ง lead": ส่งอีเมลลำดับ welcome → value → final
// ให้คนที่ทิ้งอีเมลไว้บน landing แต่ยังไม่สมัคร เพื่อดึงกลับมา activate
// รันรายวันด้วย pg_cron (migration 0047) · ตรรกะเวลา mirror src/lib/leadNurture.ts
//
// Deploy:  supabase functions deploy lead-nurture --no-verify-jwt
// Secret:  supabase secrets set CRON_SECRET=...   (กันเรียกจากภายนอก — ใช้ค่าเดียวกับ billing-cron ได้)
//          supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const ADMIN_EMAIL = "support@b-tctraining.com";
const FROM_EMAIL = "CEO AI Thailand <noreply@ceoaithailand.org>";
const SITE = "https://ceoaithailand.org";

// ── ตรรกะเวลา (mirror src/lib/leadNurture.ts) ──────────────────────────────────
const TOTAL_STAGES = 3;
const STAGE_DELAY_HOURS = [0, 48, 96]; // welcome ทันที · value +48ชม. · final +96ชม.
const isEmail = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((c || "").trim());
function dueEmail(createdMs: number, stage: number, lastMs: number | null, nowMs: number): 1 | 2 | 3 | null {
  if (stage >= TOTAL_STAGES || stage < 0) return null;
  const ref = stage === 0 ? createdMs : (lastMs ?? createdMs);
  if (nowMs - ref >= (STAGE_DELAY_HOURS[stage] ?? 0) * 3600_000) return (stage + 1) as 1 | 2 | 3;
  return null;
}

// ── Resend ─────────────────────────────────────────────────────────────────────
async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  }).catch(() => null);
  return !!r?.ok;
}

// ── personalize ตาม seg (กลุ่มที่คนนี้เข้ามา) ─────────────────────────────────
function segCopy(seg: string): { hook: string; cta: string; link: string } {
  const s = (seg || "").toLowerCase();
  if (s === "seller") return {
    hook: "คุณมีของขายอยู่แล้ว — สิ่งที่ขาดคือ 'ให้ลูกค้าหาเจอ'",
    cta: "เปิดหน้าร้านฟรีใน 5 นาที",
    link: `${SITE}/start?utm_source=email&utm_medium=nurture&seg=seller`,
  };
  if (s === "owner") return {
    hook: "ทำธุรกิจคนเดียวจนไม่มีเวลาโต? ให้ทีม AI ช่วยวางระบบ",
    cta: "ให้ทีม AI เริ่มทำงาน",
    link: `${SITE}/start?utm_source=email&utm_medium=nurture&seg=owner`,
  };
  if (s === "newbie") return {
    hook: "อยากมีธุรกิจ แต่กลัวลงเงินแล้วเจ๊ง? ทดสอบไอเดียก่อนได้",
    cta: "ทดสอบไอเดียธุรกิจฟรี",
    link: `${SITE}/start?utm_source=email&utm_medium=nurture&seg=newbie`,
  };
  return {
    hook: "เริ่มธุรกิจของคุณเอง พร้อมทีม AI ช่วยลงมือ",
    cta: "เริ่มใช้ฟรี ไม่ต้องสมัคร",
    link: `${SITE}/start?utm_source=email&utm_medium=nurture`,
  };
}

const shell = (inner: string) => `
<div style="font-family:Kanit,sans-serif;max-width:560px;margin:auto;background:#0f172a;color:#f8fafc;padding:32px;border-radius:12px">
  ${inner}
  <p style="color:#64748b;font-size:12px;margin-top:26px;border-top:1px solid #1e293b;padding-top:14px">
    CEO AI Thailand · บ.บี.เทรนนิ่ง คอนซัลแทนท์ · ระบบสร้างธุรกิจด้วย AI สำหรับ SME ไทย<br/>
    ไม่ต้องการรับอีเมลนี้แล้ว? ตอบกลับ "ยกเลิก" หรือแจ้ง
    <a href="mailto:${ADMIN_EMAIL}?subject=ยกเลิกรับข่าว" style="color:#94a3b8">${ADMIN_EMAIL}</a> (PDPA)
  </p>
</div>`;

const btn = (label: string, href: string) =>
  `<a href="${href}" style="display:inline-block;background:#f59e0b;color:#020617;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:10px;margin:8px 0">${label} →</a>`;

function emailFor(no: 1 | 2 | 3, name: string, seg: string): { subject: string; html: string } {
  const hi = name ? `สวัสดีคุณ ${name} ครับ` : "สวัสดีครับ";
  const c = segCopy(seg);
  if (no === 1) return {
    subject: "🎉 ยินดีต้อนรับ — เริ่มธุรกิจด้วย AI ได้เลย (ฟรี ไม่ต้องสมัคร)",
    html: shell(`
      <h2 style="color:#06b6d4;margin-top:0">ขอบคุณที่สนใจ CEO AI Thailand</h2>
      <p>${hi} — ${c.hook}</p>
      <p>ลองเลยแบบไม่ต้องสมัคร: พิมพ์ไอเดียธุรกิจ 1 บรรทัด แล้วดูว่าทีม AI ช่วยวางแผน/หาลูกค้า/ตั้งราคาให้ยังไง</p>
      <p style="text-align:center">${btn(c.cta, c.link)}</p>
      <p style="color:#94a3b8;font-size:13px">อีก 2 วัน ผมจะส่ง "เคสจริง" ที่ร้านเล็ก ๆ ใช้ระบบนี้ให้ดูครับ</p>`),
  };
  if (no === 2) return {
    subject: "🍜 ร้านก๋วยเตี๋ยวไก่มะระ ก็มีทีมวางแผนธุรกิจ AI ได้",
    html: shell(`
      <h2 style="color:#06b6d4;margin-top:0">เคสจริง: ธุรกิจเล็กก็ใช้ได้</h2>
      <p>${hi}</p>
      <p>ร้านก๋วยเตี๋ยวไก่มะระข้างบ้าน พิมพ์ชื่อธุรกิจไป 1 บรรทัด — AI ช่วยหากลุ่มลูกค้าที่ยอมจ่าย
      ทดสอบว่าไอเดียไปรอดไหม <b>ก่อนเสียเงินจริง</b> แล้ววางแผนหาลูกค้าให้ทีละสเต็ป</p>
      <p>หัวใจคือ <b>ทดสอบก่อนเสี่ยง</b> — ไม่ใช่เดาแล้วลงเงินเลย นี่คือสิ่งที่ที่ปรึกษาธุรกิจ 20 ปีของเราออกแบบไว้ในระบบ</p>
      <p style="text-align:center">${btn(c.cta, c.link)}</p>`),
  };
  return {
    subject: "🚀 พร้อมเริ่มธุรกิจแรกของคุณหรือยัง? (+ สิทธิ์รุ่นก่อตั้ง)",
    html: shell(`
      <h2 style="color:#06b6d4;margin-top:0">ก้าวแรกใช้เวลาแค่ 5 นาที</h2>
      <p>${hi} — ${c.hook}</p>
      <p>เริ่มฟรี ไม่ต้องใช้บัตรเครดิต ไม่ต้องลาออก · คุณสั่ง AI ลงมือ คุณคุมทุกการตัดสินใจ
      และผู้เริ่มช่วงนี้จะได้ <b>สิทธิ์รุ่นก่อตั้ง</b></p>
      <p style="text-align:center">${btn(c.cta, c.link)}</p>
      <p style="color:#94a3b8;font-size:13px">ถ้ายังไม่ใช่จังหวะ ไม่เป็นไรครับ — เก็บอีเมลนี้ไว้ กลับมาเมื่อพร้อมได้เสมอ</p>`),
  };
}

Deno.serve(async (req) => {
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret") ?? "";
  if (CRON_SECRET && secret !== CRON_SECRET) return new Response("forbidden", { status: 403 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: rows, error } = await admin
    .from("platform_leads")
    .select("id, contact, name, seg, nurture_stage, nurture_last_at, created_at")
    .lt("nurture_stage", TOTAL_STAGES)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) return json({ error: error.message }, 500);

  const nowMs = Date.now();
  let sent = 0, skipped = 0, failed = 0;

  for (const r of rows ?? []) {
    const contact = String(r.contact ?? "");
    if (!isEmail(contact)) { skipped++; continue; } // LINE/เบอร์ → ส่งอีเมลไม่ได้
    const createdMs = new Date(String(r.created_at)).getTime();
    const lastMs = r.nurture_last_at ? new Date(String(r.nurture_last_at)).getTime() : null;
    const no = dueEmail(createdMs, Number(r.nurture_stage ?? 0), lastMs, nowMs);
    if (!no) { skipped++; continue; }

    const { subject, html } = emailFor(no, String(r.name ?? "").trim(), String(r.seg ?? ""));
    const ok = await sendMail(contact, subject, html);
    if (!ok) { failed++; continue; } // ส่งล้ม → ไม่ advance stage (รอบหน้าลองใหม่)

    await admin.from("platform_leads")
      .update({ nurture_stage: no, nurture_last_at: new Date(nowMs).toISOString() })
      .eq("id", r.id);
    sent++;
  }

  return json({ ok: true, sent, skipped, failed, scanned: rows?.length ?? 0 }, 200);
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
