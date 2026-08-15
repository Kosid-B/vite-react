// checkup-report — ส่งรายงานผลตรวจสุขภาพระบบให้คนที่ขอไว้ทาง /checkup
// cron หยิบที่ยังไม่ได้ส่ง ทีละ 20 → Resend
// ไม่ส่งทันทีตอนกรอก เพราะถ้า Resend ล่ม ผู้ใช้จะเห็น error ทั้งที่ทำส่วนของเขาครบแล้ว
// เนื้อหารายงานต้นทาง: src/lib/checkupReport.ts (pure + มีเทสต์)
//
// deploy: supabase functions deploy checkup-report --no-verify-jwt
// cron: checkup-report-15min (*/15 * * * *) — ตั้งไว้แล้วใน production
//
// ⚠️ ไฟล์นี้ต้องตรงกับที่ deploy อยู่จริงเสมอ — เคยดริฟต์มาแล้วรอบหนึ่ง
//    (repo มีบล็อก 3 ขั้นตอนที่ production ไม่มี · production มีปุ่ม CTA ที่ repo ไม่มี)

const FROM_EMAIL = "CEO AI Thailand <noreply@ceoaithailand.org>";
const CHECKUP_URL = "https://ceoaithailand.org/checkup";
const CONTACT_EMAIL = "support@b-tctraining.com";
const DISCLAIMER =
  "ผลนี้เป็นการคัดกรองเบื้องต้นจากคำถามที่คุณตอบ ไม่ใช่การตรวจประเมินตามมาตรฐาน " +
  "และไม่สามารถใช้แทนการตรวจรับรองจากหน่วยรับรองได้ ใช้เพื่อดูภาพรวมและจัดลำดับสิ่งที่ควรทำก่อนเท่านั้น";

const BAND_LABEL: Record<string, string> = {
  critical: "ยังไม่มีระบบที่ใช้ได้จริง",
  weak: "มีบางส่วน แต่ยังไม่ครบ",
  developing: "ใกล้พร้อม เหลือบางจุด",
  ready: "พร้อมสำหรับการตรวจรับรอง",
};
const BAND_SUMMARY: Record<string, string> = {
  critical: "ตอนนี้ธุรกิจยังพึ่งความจำและความสามารถของคนเป็นหลัก ซึ่งเดินได้แต่ขยายไม่ได้",
  weak: "มีของอยู่บ้างแล้ว แต่กระจัดกระจายและไม่ต่อกัน งานส่วนใหญ่จึงเป็นการรวบรวมและเชื่อมสิ่งที่มีอยู่",
  developing: "ระบบใช้งานได้จริงแล้ว เหลือจุดที่ผู้ตรวจมักถามและมักตกกัน",
  ready: "ระบบอยู่ในสภาพที่พร้อมให้ตรวจ สิ่งที่ควรทำต่อคือรักษาให้คงที่",
};
/** ⚠️ ต้องตรงกับ STANDARDS[].code ใน src/lib/isoStandards.ts เสมอ
 *  ถ้าไม่ตรง = หน้าเว็บบอกฉบับหนึ่ง อีเมลบอกอีกฉบับ → เสียความน่าเชื่อถือทันที
 *  โดยเฉพาะกับผู้อ่านที่เป็นคนทำระบบ ซึ่งจับได้ทันที
 *  มีเทสต์กันดริฟต์ที่ src/lib/__tests__/checkupReportDrift.test.ts */
const STANDARD_LABEL: Record<string, string> = {
  quick12: "แบบตรวจเร็ว 12 ข้อ",
  iso9001: "ISO 9001:2015",
  iso14001: "ISO 14001:2026", // เผยแพร่ 15 เม.ย. 2569 แทนที่ :2015
  iso45001: "ISO 45001:2018",
  iso22301: "ISO 22301:2019",
};

const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function openingLine(pct: number): string {
  if (pct >= 80) return "ระบบของคุณอยู่ในสภาพที่ดีกว่าค่าเฉลี่ยมาก สิ่งที่เหลือเป็นการเก็บรายละเอียด";
  if (pct >= 55) return "ระบบของคุณมีฐานที่ใช้งานได้จริงอยู่แล้ว ไม่ได้เริ่มจากศูนย์";
  if (pct >= 30) return "มีหลายอย่างที่ทำอยู่แล้วแต่ยังไม่ได้เขียนไว้ ซึ่งแปลว่างานที่เหลือคือการรวบรวม ไม่ใช่สร้างใหม่ทั้งหมด";
  return "จุดเริ่มต้นแบบนี้มักใช้เวลาน้อยกว่าที่คิด เพราะไม่ต้องรื้อของเก่าที่ทำไว้ผิดทาง";
}

function renderHtml(who: string, standard: string, pct: number, band: string): string {
  const wantsTalk = pct < 70;
  return `<!doctype html><html lang="th"><body style="margin:0;padding:0;background:#f1f5f9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;font-family:'Kanit',-apple-system,'Segoe UI',sans-serif">
  <tr><td style="padding:26px 26px 6px">
    <div style="font-size:12px;letter-spacing:1px;color:#0891b2">CEO AI THAILAND · B. TRAINING CONSULTANT</div>
    <h1 style="font-size:21px;color:#0f172a;margin:8px 0 4px;line-height:1.35">ผลตรวจสุขภาพระบบบริหาร</h1>
    <div style="color:#64748b;font-size:14px">${esc(who)} · อ้างอิง ${esc(standard)}</div>
  </td></tr>
  <tr><td style="padding:18px 26px">
    <table role="presentation" width="100%" style="background:#f8fafc;border-radius:11px"><tr><td style="padding:18px;text-align:center">
      <div style="font-size:40px;font-weight:700;color:#0f172a;line-height:1">${pct}<span style="font-size:20px;color:#94a3b8">%</span></div>
      <div style="color:#0891b2;font-weight:600;font-size:15px;margin-top:4px">${esc(BAND_LABEL[band] ?? "")}</div>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:0 26px">
    <p style="color:#0f172a;font-size:15px;line-height:1.8;margin:0 0 12px">${esc(openingLine(pct))}</p>
    <p style="color:#475569;font-size:14.5px;line-height:1.8;margin:0">${esc(BAND_SUMMARY[band] ?? "")}</p>
  </td></tr>
  <tr><td style="padding:20px 26px 0">
    <div style="background:#f8fafc;border-radius:10px;padding:16px">
      <div style="font-weight:600;color:#0f172a;font-size:15px;margin-bottom:6px">ดูรายละเอียดรายข้อได้ที่หน้าผลประเมิน</div>
      <div style="color:#475569;font-size:14px;line-height:1.7">เปิดลิงก์ด้านล่างแล้วทำอีกครั้ง จะเห็นทุกจุดที่พบ พร้อมลำดับว่าควรทำอะไรก่อน และเอกสารที่ผู้ตรวจมองหาของแต่ละข้อ</div>
      <div style="margin-top:12px"><a href="${CHECKUP_URL}" style="background:#0891b2;color:#fff;text-decoration:none;border-radius:8px;padding:11px 18px;display:inline-block;font-size:14px;font-weight:600">เปิดหน้าผลประเมิน</a></div>
    </div>
  </td></tr>
  <tr><td style="padding:20px 26px">
    <p style="color:#0f172a;font-size:14.5px;line-height:1.8;margin:0">${
      wantsTalk
        ? "ถ้าอยากให้ช่วยดูว่าควรเริ่มตรงไหน ตอบกลับอีเมลนี้ได้เลยครับ ไม่มีค่าใช้จ่ายในการคุยครั้งแรก"
        : "ถ้ามีคำถามเพิ่มเติม ตอบกลับอีเมลนี้ได้เลยครับ"
    }</p>
  </td></tr>
  <tr><td style="padding:0 26px 24px">
    <div style="color:#94a3b8;font-size:12.5px;line-height:1.7;margin-top:8px;border-top:1px solid #e2e8f0;padding-top:14px">
      ${DISCLAIMER}<br><br>ติดต่อ ${CONTACT_EMAIL} · คุณได้รับอีเมลนี้เพราะขอรายงานจากแบบประเมินที่ ${CHECKUP_URL}
    </div>
  </td></tr>
</table></td></tr></table></body></html>`;
}

async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  }).catch(() => null);
  return !!res && res.ok;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  const given = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("s");
  if (secret && given !== secret) return json({ error: "forbidden" }, 403);

  const url = Deno.env.get("SUPABASE_URL");
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !svc) return json({ error: "missing env" }, 500);
  const h = { apikey: svc, Authorization: `Bearer ${svc}`, "content-type": "application/json" };

  const q = `${url}/rest/v1/checkup_leads?sent_at=is.null&select=id,email,company,pct,band,source&order=created_at.asc&limit=20`;
  const res = await fetch(q, { headers: h });
  if (!res.ok) return json({ error: "query failed", status: res.status }, 500);
  const rows = (await res.json()) as Array<Record<string, unknown>>;

  let sent = 0, failed = 0;
  for (const r of rows) {
    const email = String(r.email ?? "");
    if (!email.includes("@")) continue;
    const who = String(r.company ?? "").trim() || "ธุรกิจของคุณ";
    const pct = Number(r.pct) || 0;
    const band = String(r.band ?? "weak");
    const standard = STANDARD_LABEL[String(r.source ?? "")] ?? "แบบตรวจสุขภาพระบบ";

    const subject = `ผลตรวจสุขภาพระบบ ${who} — ${pct}% (${BAND_LABEL[band] ?? ""})`;
    const ok = await sendMail(email, subject, renderHtml(who, standard, pct, band));
    if (ok) {
      sent++;
      await fetch(`${url}/rest/v1/checkup_leads?id=eq.${r.id}`, {
        method: "PATCH", headers: h, body: JSON.stringify({ sent_at: new Date().toISOString() }),
      }).catch(() => null);
    } else {
      failed++;
    }
  }

  return json({ ok: true, picked: rows.length, sent, failed });
});
