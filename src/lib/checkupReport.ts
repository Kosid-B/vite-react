/* checkupReport — สร้างรายงานผลตรวจสุขภาพระบบเป็นอีเมล (pure, tested)
 *
 * ใช้ร่วมกัน 2 ที่: Edge Function ส่งอีเมลจริง (Resend) + หน้าเว็บแสดงตัวอย่าง
 * แยกเป็น pure เพราะเนื้อหารายงานคือของที่ลูกค้าเห็นเป็นอย่างแรก — ผิดแล้วเสียความน่าเชื่อถือ
 * และต้องแก้ถ้อยคำได้โดยไม่ต้อง deploy ฟังก์ชันใหม่ทุกครั้ง
 *
 * หลักการเขียนรายงาน (ต่างจากรายงานอัตโนมัติทั่วไป):
 *   1. เปิดด้วยสิ่งที่เขาทำได้ดีก่อน — คนที่เพิ่งรู้ว่าตัวเองขาด 20 ข้อจะปิดอีเมลทันที
 *   2. บอกลำดับ ไม่ใช่บอกทุกอย่างพร้อมกัน — รายการยาวคือรายการที่ไม่มีใครเริ่ม
 *   3. ไม่เร่ง ไม่ขู่ ไม่มีเส้นตายปลอม
 *   4. เสนอคุยเฉพาะตอนที่มีอะไรให้คุยจริง (คะแนนต่ำ) — คะแนนสูงส่งรายงานแล้วจบ
 */

export interface ReportGap {
  id: string;      // เช่น '9.2' หรือ 'audit'
  title: string;
  fix: string;     // สิ่งที่ควรทำ
  mandatory: boolean;
}

export interface CheckupReportInput {
  company?: string | null;
  standardCode: string;   // 'ISO 9001:2015' หรือ 'แบบตรวจเร็ว 12 ข้อ'
  pct: number;
  bandLabel: string;
  summary: string;
  gaps: ReportGap[];
  effortDays: [number, number];
  /** ลิงก์กลับไปทำใหม่/ดูผลอีกครั้ง */
  checkupUrl: string;
  /** อีเมลติดต่อกลับ */
  contactEmail: string;
  disclaimer: string;
}

export interface RenderedReport {
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** ประโยคเปิด — ต้องพูดถึงสิ่งที่ทำได้ก่อนเสมอ ไม่ใช่เปิดด้วยสิ่งที่ขาด */
export function openingLine(pct: number, gapsCount: number): string {
  if (pct >= 80) return 'ระบบของคุณอยู่ในสภาพที่ดีกว่าค่าเฉลี่ยมาก สิ่งที่เหลือเป็นการเก็บรายละเอียด';
  if (pct >= 55) return 'ระบบของคุณมีฐานที่ใช้งานได้จริงอยู่แล้ว ไม่ได้เริ่มจากศูนย์';
  if (pct >= 30) return 'มีหลายอย่างที่ทำอยู่แล้วแต่ยังไม่ได้เขียนไว้ ซึ่งแปลว่างานที่เหลือคือการรวบรวม ไม่ใช่สร้างใหม่ทั้งหมด';
  return gapsCount > 0
    ? 'จุดเริ่มต้นแบบนี้มักใช้เวลาน้อยกว่าที่คิด เพราะไม่ต้องรื้อของเก่าที่ทำไว้ผิดทาง'
    : 'ขอบคุณที่ทำแบบประเมินครับ';
}

/** 3 อย่างแรกที่ควรทำ — ตัดให้สั้นเสมอ รายการยาวคือรายการที่ไม่มีใครเริ่ม */
export function firstThreeSteps(gaps: readonly ReportGap[]): ReportGap[] {
  return gaps.slice(0, 3);
}

export function renderCheckupReport(input: CheckupReportInput): RenderedReport {
  const who = input.company?.trim() ? input.company.trim() : 'ธุรกิจของคุณ';
  const first3 = firstThreeSteps(input.gaps);
  const rest = Math.max(0, input.gaps.length - first3.length);
  const mand = input.gaps.filter((g) => g.mandatory).length;
  const opening = openingLine(input.pct, input.gaps.length);
  const wantsTalk = input.pct < 70 && input.gaps.length > 0;

  const subject = `ผลตรวจสุขภาพระบบ ${who} — ${input.pct}% (${input.bandLabel})`;

  const textLines = [
    `ผลตรวจสุขภาพระบบบริหาร — ${who}`,
    `มาตรฐานอ้างอิง: ${input.standardCode}`,
    '',
    `คะแนนความพร้อม: ${input.pct}%  (${input.bandLabel})`,
    '',
    opening,
    '',
    input.summary,
    '',
    '── 3 อย่างแรกที่ควรทำ ──',
    ...first3.flatMap((g, i) => [
      `${i + 1}) ${g.title}${g.mandatory ? '  [เอกสารที่มาตรฐานกำหนดให้ต้องมี]' : ''}`,
      `   ${g.fix}`,
      '',
    ]),
    rest > 0 ? `ยังมีอีก ${rest} จุดที่พบ — แต่แนะนำให้ทำ 3 ข้อบนให้เสร็จก่อน` : '',
    mand > 0 ? `หมายเหตุ: มีเอกสารที่มาตรฐานกำหนดให้ต้องมี ${mand} รายการที่ยังขาด` : '',
    '',
    `ประมาณการเวลา: ${input.effortDays[0]}–${input.effortDays[1]} วันทำงาน`,
    '',
    wantsTalk
      ? 'ถ้าอยากให้ช่วยดูว่าควรเริ่มตรงไหน ตอบกลับอีเมลนี้ได้เลยครับ ไม่มีค่าใช้จ่ายในการคุยครั้งแรก'
      : 'ถ้ามีคำถามเพิ่มเติม ตอบกลับอีเมลนี้ได้เลยครับ',
    '',
    `ทำแบบประเมินอีกครั้ง: ${input.checkupUrl}`,
    `ติดต่อ: ${input.contactEmail}`,
    '',
    input.disclaimer,
  ];

  const stepsHtml = first3.map((g, i) => `
      <tr><td style="padding:14px 0;border-bottom:1px solid #e2e8f0">
        <div style="font-weight:600;color:#0f172a;font-size:15px">
          ${i + 1}. ${esc(g.title)}
          ${g.mandatory ? '<span style="color:#b91c1c;font-size:12px;font-weight:500"> · เอกสารที่มาตรฐานกำหนดให้ต้องมี</span>' : ''}
        </div>
        <div style="color:#475569;font-size:14px;line-height:1.7;margin-top:5px">${esc(g.fix)}</div>
      </td></tr>`).join('');

  const html = `<!doctype html><html lang="th"><body style="margin:0;padding:0;background:#f1f5f9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:'Kanit',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <tr><td style="padding:26px 26px 6px">
    <div style="font-size:12px;letter-spacing:1px;color:#0891b2">CEO AI THAILAND · B. TRAINING CONSULTANT</div>
    <h1 style="font-size:21px;color:#0f172a;margin:8px 0 4px;line-height:1.35">ผลตรวจสุขภาพระบบบริหาร</h1>
    <div style="color:#64748b;font-size:14px">${esc(who)} · อ้างอิง ${esc(input.standardCode)}</div>
  </td></tr>

  <tr><td style="padding:18px 26px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:11px">
      <tr><td style="padding:18px;text-align:center">
        <div style="font-size:40px;font-weight:700;color:#0f172a;line-height:1">${input.pct}<span style="font-size:20px;color:#94a3b8">%</span></div>
        <div style="color:#0891b2;font-weight:600;font-size:15px;margin-top:4px">${esc(input.bandLabel)}</div>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 26px">
    <p style="color:#0f172a;font-size:15px;line-height:1.8;margin:0 0 12px">${esc(opening)}</p>
    <p style="color:#475569;font-size:14.5px;line-height:1.8;margin:0">${esc(input.summary)}</p>
  </td></tr>

  <tr><td style="padding:22px 26px 4px">
    <h2 style="font-size:16px;color:#0f172a;margin:0 0 2px">3 อย่างแรกที่ควรทำ</h2>
    <div style="color:#64748b;font-size:13px">ทำให้เสร็จทีละข้อ ดีกว่าเริ่มพร้อมกันทั้งหมด</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${stepsHtml}</table>
  </td></tr>

  ${rest > 0 ? `<tr><td style="padding:12px 26px 0">
    <div style="color:#64748b;font-size:13.5px;line-height:1.7">
      ยังมีอีก ${rest} จุดที่พบ — แนะนำให้ทำ 3 ข้อบนให้เสร็จก่อน
      ${mand > 0 ? `<br>มีเอกสารที่มาตรฐานกำหนดให้ต้องมี ${mand} รายการที่ยังขาด` : ''}
    </div>
  </td></tr>` : ''}

  <tr><td style="padding:16px 26px 0">
    <div style="background:#f8fafc;border-radius:10px;padding:14px 16px;color:#475569;font-size:14px">
      ประมาณการเวลา <b style="color:#0f172a">${input.effortDays[0]}–${input.effortDays[1]} วันทำงาน</b>
    </div>
  </td></tr>

  <tr><td style="padding:20px 26px">
    <p style="color:#0f172a;font-size:14.5px;line-height:1.8;margin:0">
      ${wantsTalk
        ? 'ถ้าอยากให้ช่วยดูว่าควรเริ่มตรงไหน ตอบกลับอีเมลนี้ได้เลยครับ ไม่มีค่าใช้จ่ายในการคุยครั้งแรก'
        : 'ถ้ามีคำถามเพิ่มเติม ตอบกลับอีเมลนี้ได้เลยครับ'}
    </p>
  </td></tr>

  <tr><td style="padding:0 26px 24px">
    <a href="${esc(input.checkupUrl)}" style="color:#0891b2;font-size:14px">ทำแบบประเมินอีกครั้ง</a>
    <div style="color:#94a3b8;font-size:12.5px;line-height:1.7;margin-top:16px;border-top:1px solid #e2e8f0;padding-top:14px">
      ${esc(input.disclaimer)}<br><br>
      ติดต่อ ${esc(input.contactEmail)} · คุณได้รับอีเมลนี้เพราะขอรายงานจากแบบประเมินที่ ${esc(input.checkupUrl)}
    </div>
  </td></tr>
</table>
</td></tr></table></body></html>`;

  return { subject, text: textLines.filter((l) => l !== undefined).join('\n'), html };
}
