import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 เจ้าของส่งภาพผลค้นหา Google มา 7 ก.ย. 2569 — หน้าแรกยังขึ้นสารเก่า:
 *   *"CEO AI Thailand — แพลตฟอร์มสร้างบริษัท AI อัตโนมัติ"*
 *   *"จ้าง AI เป็นทีมงานบริษัทคุณ — … ทำ ISO …"*
 *
 * 🟢 ตรวจแล้ว: `index.html` แก้ถูกตั้งแต่ 27 ส.ค. และหน้า `/about` ที่ Google index แล้ว
 *    ก็ขึ้นสารใหม่ ⇒ **นั่นคือแคชของ Google เก่า ไม่ใช่ของเราผิด**
 *
 * 🔴 แต่ระหว่างตรวจ เจอสารเก่า **ตกค้างจริงอีก 5 จุด** ที่การแก้รอบ 27 ส.ค. พลาดไป
 *    (`config.tagline` ที่โชว์ใน Sidebar/Auth · footer 3 หน้า · **ภาพ OG**)
 *    ⇒ ledger #41 บอกไว้แล้วว่า *"จบงานเมื่อ grep ครบทุกไฟล์"* — รอบนั้นผม grep ไม่ครบ
 * ══════════════════════════════════════════════════════════════════════════ */

const ROOT = process.cwd();

/** สารที่เจ้าของยกเลิกแล้ว — ห้ามโผล่บนพื้นผิวที่คน/เครื่องเห็น
 *
 * 🔴 เส้นแบ่งที่ตรวจของจริงแล้วถึงได้ (7 ก.ย. 2569): คำว่า **"ทีมผู้บริหาร AI" ห้ามไม่ได้**
 *   รอบแรกผมใส่มันลงรายการ ⇒ แดง 12 ไฟล์ ซึ่ง **ส่วนใหญ่ถูกต้องอยู่แล้ว**
 *   เพราะ CLAUDE.md เขียนไว้ชัดว่า *"ทีม AI" = **กลไกสนับสนุน*** (ผลิตภัณฑ์มีเอเจนต์จริง)
 *   สิ่งที่ถูกยกเลิกคือ **กรอบ "จ้าง"** — ขายว่าจ้างทีม AI ทั้งบริษัท ไม่ใช่การเอ่ยถึงเอเจนต์
 *   ⇒ ห้ามเฉพาะ **กรอบการจ้าง** · การอธิบายกลไกยังใช้ได้ (กับดักเดียวกับ ledger #62)
 *
 *   ของจริงที่ตัวกันแคบ ๆ นี้จับได้: `seoData` title หน้าราคาเขียนว่า
 *   *"แพ็กเกจและราคา — **จ้างทีมผู้บริหาร AI** เดือนละเท่าไร"* ⇒ แก้แล้ว */
const SUPERSEDED: readonly string[] = [
  'แพลตฟอร์มสร้างบริษัท AI อัตโนมัติ',
  'จ้าง AI เป็นทีมงาน',
  'จ้างทีมผู้บริหาร AI',
  'จ้างทีม AI',
  'Automated AI Company',
];

/** ไฟล์ที่ **นิยาม/อธิบาย** สารเก่าได้ (หัวไฟล์ประวัติ + เทสต์ที่เฝ้ามันเอง) */
const ALLOWED = [
  'src/lib/brandEntity.ts',
  'src/config.ts',                                  // คอมเมนต์เตือนห้ามกลับไปใช้
  'src/lib/__tests__/supersededMessage.test.ts',
  'src/lib/__tests__/brandEntity.test.ts',
  'src/lib/__tests__/weeklyReportContract.test.ts',
  'src/lib/__tests__/constitutionReach.test.ts',
  // 🔴 `brandBrief` เป็น **บ้านของกฎ** — ข้อความ `'ไม่ใช่ "จ้างทีม AI ทั้งบริษัท"'`
  //    เป็นตัวกฎเอง ไม่ใช่คำโฆษณา ⇒ ยกเว้นทั้งไฟล์
  //    ⚠️ แต่ `seoData` **ห้ามยกเว้นทั้งไฟล์** — ลองแล้วพบว่าเปิดรูให้ title หน้าราคา
  //       กลับไปใช้สารเก่าได้เงียบ ๆ (M1 ไม่แดง) ⇒ ใช้วิธีตัดคอมเมนต์ออกก่อนสแกนแทน
  'src/lib/brandBrief.ts',
];

/** ตัดคอมเมนต์ออกก่อนสแกน — ไฟล์ที่ **อธิบายว่าห้ามใช้สารนี้** ต้องเขียนคำนั้นได้
 *  แต่ **ค่าจริงในโค้ด** (title/description/ข้อความบนจอ) ห้ามมี */
function stripComments(path: string, text: string): string {
  if (!/\.(ts|tsx)$/.test(path)) return text;
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

function walk(d: string, out: string[] = []): string[] {
  for (const n of readdirSync(d)) {
    const f = join(d, n);
    if (statSync(f).isDirectory()) { if (n !== 'node_modules') walk(f, out); }
    else if (/\.(ts|tsx|html|svg|json|txt)$/.test(n)) out.push(f);
  }
  return out;
}

const SURFACES = [
  ...walk(join(ROOT, 'src')),
  ...walk(join(ROOT, 'public')),
  join(ROOT, 'index.html'),
].map((f) => relative(ROOT, f).replace(/\\/g, '/'));

describe('สารที่ยกเลิกแล้ว ต้องไม่เหลือบนพื้นผิวที่คนหรือเครื่องเห็น', () => {
  for (const phrase of SUPERSEDED) {
    it(`ไม่มี "${phrase}" หลงเหลือ`, () => {
      const found = SURFACES
        .filter((p) => !ALLOWED.includes(p))
        .filter((p) => stripComments(p, readFileSync(join(ROOT, p), 'utf8')).includes(phrase));
      expect(found, `พบสารเก่าที่: ${found.join(', ')}`).toEqual([]);
    });
  }
});

describe('ภาพ OG — พื้นผิวสาธารณะที่สุด และเป็นที่ที่ลืมง่ายที่สุด', () => {
  const OG = readFileSync(join(ROOT, 'public/og-image.svg'), 'utf8');

  it('🔴 ห้ามมีตัวเลขผลลัพธ์ทางธุรกิจ — ลูกค้าจ่ายจริงยัง 0 ราย', () => {
    // เคยมีจริง: "Monthly Revenue +32%" · "AI Tasks Done 1,248" บนการ์ดที่แชร์ทุกที่
    expect(OG).not.toMatch(/\+\d+%/);
    expect(OG).not.toMatch(/Monthly Revenue|Tasks Done/);
    expect(OG).not.toMatch(/>\s*[\d,]{4,}\s*</);
  });

  it('ธุรกิจนำ · ISO ตาม — ISO ห้ามเป็นบรรทัดแรกของรายการ', () => {
    const agents = [...OG.matchAll(/>([^<]*Agent)</g)].map((m) => m[1]);
    expect(agents.length).toBeGreaterThan(1);
    expect(agents[0], `บรรทัดแรกคือ ${agents[0]}`).not.toMatch(/ISO|PDPA|Compliance/);
  });

  it('ภาพ PNG ที่เสิร์ฟจริงต้องถูกสร้างใหม่หลังแก้ SVG (ขนาด OG มาตรฐาน)', () => {
    const png = readFileSync(join(ROOT, 'public/og-image.png'));
    const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
    expect([w, h]).toEqual([1200, 630]);
  });
});
