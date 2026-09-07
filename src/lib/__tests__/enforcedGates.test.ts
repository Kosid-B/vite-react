import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 ความผิดที่เทสต์นี้กัน — และผมทำซ้ำเองสองรอบ (ledger #63 แล้ว #70):
 *   เขียนฟังก์ชันที่ "ตัดสิน/กั้น" พร้อมเทสต์ครบ แล้ว **ไม่มีใครเรียกมันเลย**
 *   ⇒ เทสต์เขียวเต็มจอ · ระบบจริงไม่เปลี่ยนอะไร · และไม่มีอะไรบอกให้รู้
 *
 * ⚠️ ทำไมไม่สแกนทั้งรีโป: ลองแล้ว (7 ก.ย. 2569) — **89 จาก 225 ไฟล์** มี export
 *   ที่ไม่ถูกเรียกนอกตัวเอง ซึ่งส่วนใหญ่ **ถูกต้องแล้ว** (ตัวช่วยภายใน · ตัวที่เทสต์เอง
 *   คือกลไกบังคับ) ⇒ ตัวกันเหมารวม = ผลบวกปลอมมหาศาล (กับดักเดียวกับ ledger #62)
 *
 * ⇒ เส้นแบ่งที่ใช้จริง: **เฝ้าเฉพาะฟังก์ชันที่เอกสารอ้างว่า "กั้นได้จริง"**
 *   ถ้าเราบอกว่ามันเป็นด่าน มันต้องถูกเรียก · ถ้ายังไม่ถูกเรียก ต้องอยู่ในรายการหนี้ที่มีวันหมดอายุ
 * ══════════════════════════════════════════════════════════════════════════ */

const ROOT = process.cwd();

function walk(d: string, out: string[] = []): string[] {
  for (const n of readdirSync(d)) {
    const f = join(d, n);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (/\.(ts|tsx)$/.test(n)) out.push(f);
  }
  return out;
}
const FILES = walk(join(ROOT, 'src')).map((f) => [relative(ROOT, f).replace(/\\/g, '/'), readFileSync(f, 'utf8')] as const);

/** ฟังก์ชันที่เอกสาร/CLAUDE.md อ้างว่าเป็น "ด่าน" — ต้องมีผู้เรียกจริง */
const CLAIMED_GATES: { fn: string; from: string; claim: string }[] = [
  { fn: 'schemaChangeAllowed', from: 'src/lib/releaseGates.ts', claim: 'กั้นการเปลี่ยน schema' },
  { fn: 'violatesBrand', from: 'src/lib/brandBrief.ts', claim: 'กั้นคำต้องห้ามก่อนปล่อยคอนเทนต์' },
  { fn: 'investmentGateStatus', from: 'src/lib/financialTruth.ts', claim: 'กั้นการปล่อยเงินลงทุน' },
  { fn: 'cacTrap', from: 'src/lib/financialTruth.ts', claim: 'เตือนกับดักต้นทุนต่อคลิก' },
  { fn: 'econMetrics', from: 'src/lib/financialTruth.ts', claim: 'ตัวชี้วัดเศรษฐศาสตร์ของลูกค้า' },
  { fn: 'showAsActual', from: 'src/lib/financialTruth.ts', claim: 'ห้ามแสดงค่าสมมติเป็นตัวเลขจริง' },
  { fn: 'ringVerdict', from: 'src/lib/searchOwnership.ts', claim: 'กั้นการข้ามวงของการยึดพื้นที่ค้นหา' },
  { fn: 'checkComparison', from: 'src/lib/searchOwnership.ts', claim: 'กั้นคอนเทนต์เปรียบเทียบที่ไม่เป็นกลาง' },
  { fn: 'brandHealth', from: 'src/lib/brandVisibility.ts', claim: 'ห้ามให้คะแนนรวมตอนตาบอดเกินครึ่ง' },
  { fn: 'founderGate', from: 'src/lib/founderMindset.ts', claim: 'กั้นคำขอที่ยังไม่มีหลักฐาน (6 ด่าน)' },
  { fn: 'dmaicGate', from: 'src/lib/dmaic.ts', claim: 'คืนเฟสแรกที่ยังไม่ผ่านของ DMAIC' },
];

/** 🔴 หนี้ที่รู้ตัวแล้ว — ด่านที่ยัง **ไม่ถูกเรียกจากโค้ดจริง**
 *
 *  ทั้งสองตัวนี้มีแต่ **บล็อกข้อความ** (`founderMindsetBlock`/`dmaicBlock`) ที่ถูกแปะเข้า prompt
 *  ⇒ กฎเดินทางไปถึง AI ในรูป "คำอธิบาย" แต่ **ตัวตัดสินที่เป็นโค้ดไม่เคยทำงาน**
 *  ⇒ วันนี้การกั้นเกิดจาก "ขอให้ AI ทำตาม" ไม่ใช่ "โค้ดกั้น"
 *
 *  ⚠️ รายการนี้ **ลดได้อย่างเดียว ห้ามเพิ่ม** (เทสต์บังคับ) */
const KNOWN_UNWIRED: readonly string[] = ['founderGate', 'dmaicGate'];

/** ไฟล์ที่ไม่ใช่เทสต์ ซึ่งเรียกฟังก์ชันนี้จริง
 *
 * ⚠️ **ตัวนี้ตรวจได้แค่ "มีโค้ดเรียก" ไม่ได้ตรวจว่า "ถูก render จริง"**
 *    ลองทำแบบไล่กราฟ import จากจุดตั้งต้นแล้ว (7 ก.ย. 2569) — พังทันที เพราะ
 *    `App.tsx` ใช้ `lazy(() => import(...))` **40 จุด** ซึ่ง regex แบบ `from '...'` มองไม่เห็น
 *    ⇒ สร้างตัววิเคราะห์กราฟเองแล้วเชื่อไม่ได้ อันตรายกว่าไม่มี (บทเรียนเดียวกับ contrast-audit ที่เดินไม่ครบ)
 *
 * 🔴 ช่องที่เหลือ: คอมโพเนนต์ที่มีอยู่แต่ **ไม่ถูกวางบนหน้า** จะยังนับว่า "มีผู้เรียก"
 *    ⇒ อุดด้วยเทสต์ประจำคอมโพเนนต์ที่ยืนยันว่ามันถูก render จริง
 *      (`FinancialTruthPanel.test.tsx` · `BrandVisibilityPanel.test.tsx` — ทั้งคู่พิสูจน์แล้วว่าแดงจริง) */
function callersOf(fn: string, ownFile: string): string[] {
  const testFile = ownFile.replace('src/lib/', 'src/lib/__tests__/').replace(/\.ts$/, '.test.ts');
  const re = new RegExp(`\\b${fn}\\s*\\(`);
  return FILES
    .filter(([p]) => p !== ownFile && p !== testFile && !p.includes('__tests__'))
    .filter(([, t]) => re.test(t))
    .map(([p]) => p);
}
describe('ด่านที่เราอ้างว่ากั้นได้จริง ต้องถูกเรียกจากโค้ดจริง', () => {
  for (const g of CLAIMED_GATES.filter((x) => !KNOWN_UNWIRED.includes(x.fn))) {
    it(`${g.fn} (${g.claim}) — มีผู้เรียกจริง`, () => {
      const callers = callersOf(g.fn, g.from);
      expect(callers.length, `${g.fn} ไม่มีใครเรียก — "${g.claim}" จึงยังไม่เกิดขึ้นจริง`).toBeGreaterThan(0);
    });
  }
});

describe('รายการหนี้ต้องซื่อสัตย์และลดได้อย่างเดียว', () => {
  it('ทุกตัวใน KNOWN_UNWIRED ต้องอยู่ใน CLAIMED_GATES ด้วย (ห้ามซ่อนของที่ไม่ได้ประกาศ)', () => {
    for (const fn of KNOWN_UNWIRED) {
      expect(CLAIMED_GATES.some((g) => g.fn === fn), `${fn} อยู่ในหนี้แต่ไม่ได้ประกาศเป็นด่าน`).toBe(true);
    }
  });

  it('🔴 ตัวที่อยู่ในหนี้ ต้องยัง "ไม่ถูกเรียก" จริง — พอต่อสายแล้วต้องเอาออกจากรายการ', () => {
    for (const fn of KNOWN_UNWIRED) {
      const g = CLAIMED_GATES.find((x) => x.fn === fn)!;
      const callers = callersOf(fn, g.from);
      expect(callers, `${fn} ถูกเรียกแล้วที่ ${callers.join(', ')} ⇒ เอาออกจาก KNOWN_UNWIRED`).toEqual([]);
    }
  });

  it('เพดานหนี้ลดได้อย่างเดียว — ห้ามเพิ่มด่านใหม่เข้ารายการนี้', () => {
    expect(KNOWN_UNWIRED.length).toBeLessThanOrEqual(2);
  });
});
