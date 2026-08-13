// checkup-report — ส่งรายงานผลตรวจสุขภาพระบบให้คนที่ขอไว้ทาง /checkup
//
// ทำงานแบบ cron: หยิบลีดที่ยังไม่ได้ส่ง แล้วส่งทีละราย (ไม่เกิน 20 ต่อรอบ)
// เหตุผลที่ไม่ส่งทันทีตอนกรอก: ถ้าส่งใน request เดียวกัน ผู้ใช้ต้องรอ Resend ตอบ
// และถ้า Resend ล่ม ผู้ใช้จะเห็น error ทั้งที่เขาทำส่วนของเขาครบแล้ว
//
// Secret ที่ต้องมี: RESEND_API_KEY (มีอยู่แล้ว) + CRON_SECRET (มีอยู่แล้ว)
// deploy: supabase functions deploy checkup-report --no-verify-jwt
// ตั้ง cron: select cron.schedule('checkup-report','*/15 * * * *', $$ ... $$);
//
// ⚠️ เนื้อหารายงานอยู่ใน src/lib/checkupReport.ts (pure + มีเทสต์) — ที่นี่คัดลอกมาเป็น Deno
//    ถ้าแก้ถ้อยคำ ให้แก้ที่ต้นทางแล้วคัดลอกมา เพื่อให้เทสต์ยังคุมความถูกต้องอยู่

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
const STANDARD_LABEL: Record<string, string> = {
  quick12: "แบบตรวจเร็ว 12 ข้อ",
  iso9001: "ISO 9001:2015",
  iso14001: "ISO 14001:2015",
  iso45001: "ISO 45001:2018",
  iso22301: "ISO 22301:2019",
};

const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function openingLine(pct: number, gapsCount: number): string {
  if (pct >= 80) return "ระบบของคุณอยู่ในสภาพที่ดีกว่าค่าเฉลี่ยมาก สิ่งที่เหลือเป็นการเก็บรายละเอียด";
  if (pct >= 55) return "ระบบของคุณมีฐานที่ใช้งานได้จริงอยู่แล้ว ไม่ได้เริ่มจากศูนย์";
  if (pct >= 30) return "มีหลายอย่างที่ทำอยู่แล้วแต่ยังไม่ได้เขียนไว้ ซึ่งแปลว่างานที่เหลือคือการรวบรวม ไม่ใช่สร้างใหม่ทั้งหมด";
  return gapsCount > 0
    ? "จุดเริ่มต้นแบบนี้มักใช้เวลาน้อยกว่าที่คิด เพราะไม่ต้องรื้อของเก่าที่ทำไว้ผิดทาง"
    : "ขอบคุณที่ทำแบบประเมินครับ";
}

interface Gap { title: string; fix: string; mandatory: boolean }

function renderHtml(who: string, standard: string, pct: number, band: string, gaps: Gap[], mand: number): string {
  const first3 = gaps.slice(0, 3);
  const rest = Math.max(0, gaps.length - first3.length);
  const wantsTalk = pct < 70 && gaps.length > 0;
  const steps = first3.map((g, i) => `
      <tr><td style="padding:14px 0;border-bottom:1px solid #e2e8f0">
        <div style="font-weight:600;color:#0f172a;font-size:15px">${i + 1}. ${esc(g.title)}${
    g.mandatory ? '<span style="color:#b91c1c;font-size:12px;font-weight:500"> · เอกสารที่มาตรฐานกำหนดให้ต้องมี</span>' : ""
  }</div>
        <div style="color:#475569;font-size:14px;line-height:1.7;margin-top:5px">${esc(g.fix)}</div>
      </td></tr>`).join("");

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
    <p style="color:#0f172a;font-size:15px;line-height:1.8;margin:0 0 12px">${esc(openingLine(pct, gaps.length))}</p>
    <p style="color:#475569;font-size:14.5px;line-height:1.8;margin:0">${esc(BAND_SUMMARY[band] ?? "")}</p>
  </td></tr>
  ${first3.length ? `<tr><td style="padding:22px 26px 4px">
    <h2 style="font-size:16px;color:#0f172a;margin:0 0 2px">3 อย่างแรกที่ควรทำ</h2>
    <div style="color:#64748b;font-size:13px">ทำให้เสร็จทีละข้อ ดีกว่าเริ่มพร้อมกันทั้งหมด</div>
    <table role="presentation" width="100%">${steps}</table>
  </td></tr>` : ""}
  ${rest > 0 ? `<tr><td style="padding:12px 26px 0"><div style="color:#64748b;font-size:13.5px;line-height:1.7">
    ยังมีอีก ${rest} จุดที่พบ — แนะนำให้ทำ 3 ข้อบนให้เสร็จก่อน
    ${mand > 0 ? `<br>มีเอกสารที่มาตรฐานกำหนดให้ต้องมี ${mand} รายการที่ยังขาด` : ""}
  </div></td></tr>` : ""}
  <tr><td style="padding:20px 26px">
    <p style="color:#0f172a;font-size:14.5px;line-height:1.8;margin:0">${
      wantsTalk
        ? "ถ้าอยากให้ช่วยดูว่าควรเริ่มตรงไหน ตอบกลับอีเมลนี้ได้เลยครับ ไม่มีค่าใช้จ่ายในการคุยครั้งแรก"
        : "ถ้ามีคำถามเพิ่มเติม ตอบกลับอีเมลนี้ได้เลยครับ"
    }</p>
  </td></tr>
  <tr><td style="padding:0 26px 24px">
    <a href="${CHECKUP_URL}" style="color:#0891b2;font-size:14px">ทำแบบประเมินอีกครั้ง</a>
    <div style="color:#94a3b8;font-size:12.5px;line-height:1.7;margin-top:16px;border-top:1px solid #e2e8f0;padding-top:14px">
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

  // หยิบเฉพาะที่ยังไม่ได้ส่ง — ทีละ 20 กันยิง Resend รัวเกินโควตา
  const q = `${url}/rest/v1/checkup_leads?sent_at=is.null&select=id,email,company,pct,band,answers,source&order=created_at.asc&limit=20`;
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

    // gaps ที่ส่งมาจาก client เป็นคำตอบดิบ — ที่นี่ยังไม่คำนวณซ้ำ ส่งภาพรวมพอ
    // (รายละเอียดรายข้ออยู่บนหน้าเว็บแล้ว · อีเมลทำหน้าที่พาเขากลับมาและเปิดบทสนทนา)
    const gaps: Gap[] = [];
    const subject = `ผลตรวจสุขภาพระบบ ${who} — ${pct}% (${BAND_LABEL[band] ?? ""})`;
    const html = renderHtml(who, standard, pct, band, gaps, 0);

    const ok = await sendMail(email, subject, html);
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
