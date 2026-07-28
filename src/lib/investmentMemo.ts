/** Investment Memo generator (prototype · สำรวจความเป็นไปได้ Equity Research)
 *  โฟกัสความสามารถที่ "ทำได้เลย" = งานเขียน/สังเคราะห์/จัดโครง (ไม่ใช่ valuation เชิงตัวเลขที่ต้องมี data feed)
 *  pure · ทดสอบได้ · ยังไม่ผูกเข้า nav/UI (exploratory) — ใช้รูปแบบเดียวกับ src/lib/openShop.ts
 *
 *  ⚠️ ไม่ใช่คำแนะนำการลงทุน · ตัวเลข/valuation ใด ๆ ต้องยืนยันกับข้อมูลการเงินจริงก่อนใช้ */

export type Stance = 'long' | 'short' | 'hold';
export type Conviction = 'low' | 'medium' | 'high';

export interface MemoCatalyst { what: string; when?: string }

export interface MemoInput {
  company: string;                 // ชื่อบริษัท
  ticker?: string;                 // สัญลักษณ์หุ้น (ถ้ามี)
  stance: Stance;
  oneLiner: string;                // thesis 1 บรรทัด ("ทำไมตลาดมองผิด")
  drivers?: string[];              // ตัวขับเคลื่อนหลักของ thesis
  catalysts?: MemoCatalyst[];      // ตัวเร่ง + กรอบเวลา → catalyst calendar
  risks?: string[];                // ความเสี่ยงหลัก
  target?: string;                 // เป้า (ราคา/ผลตอบแทน) — อธิบายเชิงคุณภาพได้
  timeframe?: string;              // กรอบเวลา
  conviction?: Conviction;
}

const STANCE_LABEL: Record<Stance, string> = {
  long: 'LONG (ซื้อ/ถือ)', short: 'SHORT (ขาย/ชอร์ต)', hold: 'HOLD (คงสถานะ)',
};
export function stanceLabel(s: Stance): string { return STANCE_LABEL[s] ?? s; }

const clampArr = (a: string[] | undefined, n: number) =>
  (a ?? []).map(s => s.trim()).filter(Boolean).slice(0, n);

/** instruction ให้ ai-assist เขียน memo คม ๆ — ยึดเฉพาะข้อเท็จจริงที่ให้ + ข้อมูลสาธารณะ ห้ามแต่งตัวเลข */
export function investmentMemoPrompt(input: MemoInput): string {
  const name = input.ticker ? `${input.company} (${input.ticker})` : input.company;
  const drivers = clampArr(input.drivers, 6);
  const risks = clampArr(input.risks, 6);
  const cats = (input.catalysts ?? []).slice(0, 6)
    .map(c => `- ${c.what}${c.when ? ` [${c.when}]` : ''}`).join('\n');
  return [
    `เขียน Investment Memo แบบนักวิเคราะห์บายไซด์ สำหรับ ${name}`,
    `จุดยืน (stance): ${stanceLabel(input.stance)}${input.conviction ? ` · conviction: ${input.conviction}` : ''}`,
    input.target ? `เป้าหมาย: ${input.target}` : '',
    input.timeframe ? `กรอบเวลา: ${input.timeframe}` : '',
    `Thesis 1 บรรทัด: ${input.oneLiner}`,
    drivers.length ? `ตัวขับเคลื่อนที่ผู้ใช้ให้มา:\n${drivers.map(d => `- ${d}`).join('\n')}` : '',
    risks.length ? `ความเสี่ยงที่ผู้ใช้ให้มา:\n${risks.map(r => `- ${r}`).join('\n')}` : '',
    cats ? `Catalysts:\n${cats}` : '',
    '',
    'ข้อกำหนดการเขียน:',
    '1. โครง: สรุป/คำแนะนำ → Thesis (ทำไมตลาดมองผิด) → ตัวขับเคลื่อน → กรอบ valuation (เชิงวิธี ไม่แต่งตัวเลข) → Catalysts + กรอบเวลา → ความเสี่ยง → Kill criteria (อะไรทำให้ thesis พัง) → ขนาดสถานะ/ขั้นถัดไป',
    '2. ห้ามแต่งตัวเลขงบการเงิน/ราคา/มัลติเปิล ที่ไม่ได้ให้มาหรือยืนยันไม่ได้ — ถ้าจำเป็นให้เขียนเป็น "ต้องตรวจกับงบจริง"',
    '3. ต้องมี "Kill criteria" ที่วัดได้ชัด (เงื่อนไขที่จะทำให้เลิก thesis)',
    '4. กระชับ ตรงประเด็น น้ำเสียงนักวิเคราะห์มืออาชีพ · ปิดท้ายด้วย disclaimer ว่าไม่ใช่คำแนะนำการลงทุน',
  ].filter(Boolean).join('\n');
}

/** โครง memo แบบ local (deterministic) — ไม่ต้องมี AI ก็เห็นรูปได้ + เป็น fallback
 *  คืน markdown ที่จัดโครงจาก input (ช่องว่างเติมด้วยคำเตือนให้ผู้ใช้กรอก/ตรวจ) */
export function renderMemoOutline(input: MemoInput): string {
  const name = input.ticker ? `${input.company} (${input.ticker})` : input.company;
  const drivers = clampArr(input.drivers, 6);
  const risks = clampArr(input.risks, 6);
  const cats = (input.catalysts ?? []).slice(0, 6);
  const bullets = (arr: string[], empty: string) =>
    arr.length ? arr.map(x => `- ${x}`).join('\n') : `- _(${empty})_`;

  return [
    `# Investment Memo — ${name}`,
    ``,
    `**คำแนะนำ:** ${stanceLabel(input.stance)}` +
      `${input.conviction ? ` · conviction: **${input.conviction}**` : ''}` +
      `${input.target ? ` · เป้า: **${input.target}**` : ''}` +
      `${input.timeframe ? ` · กรอบเวลา: ${input.timeframe}` : ''}`,
    ``,
    `## Thesis`,
    input.oneLiner.trim() || '_(ยังไม่ระบุ thesis 1 บรรทัด)_',
    ``,
    `## ตัวขับเคลื่อนหลัก (ทำไมตลาดมองผิด)`,
    bullets(drivers, 'เติมตัวขับเคลื่อน 2-4 ข้อ'),
    ``,
    `## กรอบ Valuation`,
    `- วิธีที่ควรใช้: (DCF / Comparables / Sum-of-parts — เลือกตามธุรกิจ)`,
    `- ⚠️ ตัวเลขต้องดึงจาก **งบการเงินจริง + ราคาตลาด** ก่อนสรุป (prototype นี้ยังไม่ต่อ data feed)`,
    ``,
    `## Catalysts (ตัวเร่ง + กรอบเวลา)`,
    cats.length ? cats.map(c => `- ${c.what}${c.when ? ` — **${c.when}**` : ''}`).join('\n') : `- _(เติม catalyst + วันที่คาดการณ์)_`,
    ``,
    `## ความเสี่ยงหลัก`,
    bullets(risks, 'เติมความเสี่ยง 2-4 ข้อ'),
    ``,
    `## Kill criteria (อะไรทำให้เลิก thesis)`,
    `- _(เงื่อนไขที่วัดได้ เช่น "ถ้า margin ต่ำกว่า X 2 ไตรมาสติด" — เติมให้ชัด)_`,
    ``,
    `---`,
    `_⚠️ เอกสารช่วยจัดโครงเท่านั้น ไม่ใช่คำแนะนำการลงทุน · ตัวเลข/valuation ต้องยืนยันกับข้อมูลการเงินจริงก่อนใช้_`,
  ].join('\n');
}
