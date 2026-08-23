import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════
 * skill `theme-safe-color` — ตัวอักษรกลืนพื้นหลัง
 *
 * 🔴 บั๊กจริง เกิด **2 รอบ** (21 และ 22 ส.ค. 2569) เจ้าของแจ้งเองทั้งสองครั้ง
 *    รูปแบบรอบที่ 2: ธีมสว่าง override **สีตัวอักษร** ให้เข้ม
 *                    แต่ไม่ได้ override **พื้นหลัง** ที่เขียนตายตัวเป็นสีเข้ม
 *    ⇒ เข้มบนเข้ม = contrast 1.00 มองไม่เห็นเลย
 *    ตัวอย่างจริง: .start-h2 (ตัวอักษรถูก override) อยู่ใน .start-why-sec (พื้นไม่ถูก override)
 *
 * เทสต์นี้จับ "คู่ที่ขาดครึ่ง" แบบนั้นโดยตรง — ตรวจจากไฟล์ได้ ไม่ต้องเปิดเบราว์เซอร์
 * (ส่วนที่ไฟล์ตรวจไม่ได้ ใช้ `npm run contrast-audit` ซึ่งวัดในเบราว์เซอร์จริง)
 * ══════════════════════════════════════════════════════════════════════ */

const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');

/** สีพื้นเข้มที่โปรเจกต์ใช้ — ถ้าธีมสว่างไม่ override จะกลายเป็นเข้มบนเข้ม */
const DARK_BG = /background(-color)?\s*:[^;]*(#0f172a|#020617|#1e293b|#0b1324|rgba\(\s*15\s*,\s*23\s*,\s*42)/i;

type Rule = { sel: string; body: string };
function rules(text: string): Rule[] {
  return [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
}
const all = rules(css);
const base = all.filter((r) => !r.sel.includes('data-theme="minimal"'));
const light = all.filter((r) => r.sel.includes('data-theme="minimal"'));

const classesIn = (sel: string) => [...sel.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1]);

/** คลาสที่ "พื้นหลังเป็นสีเข้มแบบเขียนตายตัว" ในธีมฐาน */
const darkBgClasses = new Set<string>();
for (const r of base) if (DARK_BG.test(r.body)) classesIn(r.sel).forEach((c) => darkBgClasses.add(c));

/** คลาสที่ธีมสว่าง override พื้นหลังให้แล้ว */
const lightBgClasses = new Set<string>();
for (const r of light) if (/background(-color)?\s*:/.test(r.body)) classesIn(r.sel).forEach((c) => lightBgClasses.add(c));

describe('theme-safe-color — ธีมสว่างต้องไม่ทิ้งพื้นเข้มไว้', () => {
  it('อ่าน index.css เจอจริง (กันเทสต์ผ่านเพราะ regex พัง)', () => {
    expect(all.length).toBeGreaterThan(500);
    expect(light.length).toBeGreaterThan(20);
    expect(darkBgClasses.size).toBeGreaterThan(5);
  });

  it('🔴 ทุกคลาสที่พื้นหลังเป็นสีเข้มตายตัว ต้องมี override พื้นหลังในธีมสว่าง', () => {
    // จำกัดขอบเขตที่กลุ่ม .start-* ซึ่งเป็นหน้าสาธารณะที่ผู้ใช้ภายนอกเห็นก่อนใคร
    // (ส่วนอื่นยังเป็นหนี้ที่ประกาศไว้ — ดู contrast-audit · ห้ามขยายหนี้เพิ่ม)
    const missing = [...darkBgClasses]
      .filter((c) => c.startsWith('start-'))
      .filter((c) => !lightBgClasses.has(c));
    expect(missing, 'พื้นเข้ม + ตัวอักษรเข้ม = มองไม่เห็น · ต้องเพิ่ม :root[data-theme="minimal"] ให้พื้นหลังด้วย').toEqual([]);
  });
});

describe('theme-safe-color — เครื่องมือตรวจต้องเดินครบ', () => {
  const audit = readFileSync(resolve(__dirname, '../../../scripts/contrast-audit.mjs'), 'utf8');

  it('ตัวตรวจต้องบอก "จำนวนหน้าที่เดินจริง" และล้มถ้าเดินไม่ครบ', () => {
    // 🔴 รอบที่ 2 หลุดมาได้เพราะตัวตรวจเดินแค่ 6 หน้าแล้วรายงานเขียว โดยไม่มีใครอ่านบรรทัดนั้น
    expect(audit).toMatch(/MIN_PAGES/);
    expect(audit).toMatch(/เดินไม่ครบ/);
  });

  it('ตัวตรวจต้องวนทุกธีม ไม่ใช่ธีมเดียว', () => {
    expect(audit).toMatch(/\['minimal',\s*'dark'\]/);
  });

  it('ตัวตรวจต้องกางเมนูที่ยุบอยู่ + ปิดโหมดโฟกัสก่อนสแกน', () => {
    expect(audit).toMatch(/nav-group-toggle/);
    expect(audit).toMatch(/focus-unlock/);
  });

  it('ตัวตรวจต้องเลื่อนหน้าจนสุด (เนื้อหาใต้ขอบจอ)', () => {
    expect(audit).toMatch(/scrollHeight/);
  });

  it('🔴 ตัวตรวจต้องลบ overlay ที่บังการคลิกก่อนเดินเมนู', () => {
    /* CLAUDE.md GOTCHA #2 เขียนไว้ตั้งแต่ ก.ค. ว่า "ต้องลบ .onb-overlay/.goal-overlay ก่อน"
       แต่ตัวตรวจไม่ได้ถูกเขียนตามนั้น ⇒ ทุกการคลิก timeout เงียบ ๆ ใน catch
       ⇒ เดินได้ 6 หน้าจาก 30 แล้วรายงานเขียว · คำตอบอยู่ในเอกสารของเราเองมาตลอด */
    expect(audit).toMatch(/onb-overlay/);
    expect(audit).toMatch(/goal-overlay/);
  });

  it('🔴 ตัวตรวจต้องไม่ใช้ el.remove() กับ overlay — React จะเรนเดอร์จน sidebar หาย', () => {
    /* วัดได้จริง: ใช้ el.remove() แล้วคลิกได้ 1 ปุ่ม หลังจากนั้น sidebar เหลือ **0 ปุ่มจาก 22**
       เพราะ element พวกนี้ React เป็นเจ้าของ — ลบทิ้งแล้ว virtual DOM ไม่ตรงกับของจริง
       ที่ถูกคือปิด pointer-events + ซ่อนด้วย CSS (ไม่แตะโครงสร้าง DOM) */
    expect(audit).not.toMatch(/querySelectorAll\((?:'|")\[class\*="overlay"\]/);
    expect(audit).toMatch(/pointer-events:\s*none/);
    expect(audit).toMatch(/addStyleTag/);
  });

  it('🔴 ตัวตรวจห้ามข้ามหน้าแบบเงียบ — ทั้ง catch และ continue ต้องบันทึกไว้', () => {
    // `continue` ก็เป็นการข้ามแบบเงียบเหมือน catch ว่าง ๆ — พลาดจุดนี้มาแล้ว
    expect(audit).toMatch(/skipped\.push/);
    expect(audit).toMatch(/เดินไม่ถึง/);
    expect(audit).not.toMatch(/if \(!btns\[i\]\) continue;/);
  });

  it('ตัวตรวจต้องข้ามข้อความที่เป็นอีโมจิล้วน (CSS color ไม่ได้ระบายสีอีโมจิ)', () => {
    // เคสจริง: <SPAN.city-card-ico>"🏛️" ถูกรายงาน contrast 1.04 ทั้งที่มองเห็นชัด
    expect(audit).toMatch(/\\p\{L\}/);
  });

  it('ตัวตรวจต้องไม่อ่าน gradient โปร่งใสเป็นสีพื้นทึบ', () => {
    // เคยพลาด: อ่าน rgba(52,211,153,.08) เป็นเขียวทึบ ⇒ รายงาน "เขียวบนเขียว" ผิด ๆ
    expect(audit).toMatch(/g\.a > 0\.5/);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * โทเคนที่ถูกอ้างแต่ไม่เคยถูกประกาศ — บั๊กธีมที่ซ่อนตัวได้ดีที่สุด (23 ส.ค. 2569)
 * ═══════════════════════════════════════════════════════════════════════════
 * `var(--bg, #0f172a)` **อ่านเหมือนพลิกตามธีม แต่ไม่เคยพลิกเลย** เพราะ `--bg` ไม่มีอยู่จริง
 * ⇒ ค่าสำรอง (ซึ่งมักเป็นค่าธีมเข้ม) ชนะเสมอทั้งสองธีม
 *
 * ของจริงที่เกิด: `.sip-stage{ background:var(--bg,#0f172a) }` ⇒ การ์ดเป็นพื้นดำในธีมสว่าง
 *   ตัวหนังสือข้างในใช้ `--ink` ซึ่งพลิกเป็นดำ ⇒ **ดำบนดำ contrast 1.00**
 *   และ `.pb-btn.ghost{ color:var(--text,#e5e7eb) }` ⇒ เทาอ่อนบนขาว = 1.24
 *
 * เทสต์นี้ **ไม่บังคับให้แก้ของเดิมทั้งหมด** (19 ตัว ณ วันตั้ง — เป็นหนี้ที่บันทึกไว้)
 * แต่ **ห้ามเพิ่มตัวใหม่** — เจอตัวที่ไม่อยู่ในรายการ = แดงทันที
 */
describe('โทเคน CSS ที่มีค่าสำรอง ต้องมีอยู่จริง (ไม่งั้นไม่พลิกตามธีม)', () => {
  /** หนี้ที่มีอยู่ ณ 23 ส.ค. 2569 — ห้ามเพิ่ม · ลบออกได้เมื่อแก้แล้ว */
  const KNOWN_DEBT = new Set([
    '--active-border', '--bg', '--bg2', '--border', '--brand', '--card', '--card-border',
    '--card-color', '--card2', '--gold', '--ink-mut', '--line-soft', '--mono', '--muted',
    '--panel', '--paper', '--rust-light', '--tab-color', '--text', '--text-soft',
  ]);

  const referenced = [...css.matchAll(/var\((--[a-z0-9-]+)\s*,/g)].map((m) => m[1]);
  const declared = new Set([...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));

  it('อ่านชื่อโทเคนออกจริง (กันเทสต์ผ่านเพราะ regex พัง)', () => {
    expect(referenced.length).toBeGreaterThan(10);
    expect(declared.has('--ink')).toBe(true);
  });

  it('🔴 ห้ามอ้างโทเคนตัวใหม่ที่ไม่ได้ประกาศ — ค่าสำรองจะชนะทั้งสองธีมโดยไม่มีใครรู้', () => {
    const undeclaredNew = [...new Set(referenced)].filter((v) => !declared.has(v) && !KNOWN_DEBT.has(v));
    expect(undeclaredNew, `โทเคนใหม่ที่ยังไม่ประกาศ: ${undeclaredNew.join(' ')}`).toEqual([]);
  });

  it('หนี้ที่บันทึกไว้ต้องไม่โตขึ้น (แก้แล้วให้ลบออกจากรายการ)', () => {
    const stillUndeclared = [...KNOWN_DEBT].filter((v) => !declared.has(v));
    expect(stillUndeclared.length, 'หนี้โตขึ้น — มีโทเคนใหม่ถูกเพิ่มเข้ารายการ').toBeLessThanOrEqual(20);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * ตัวอักษรบน "พื้นหลังสีตายตัว" ห้ามใช้โทเคนที่พลิกตามธีม (23 ส.ค. 2569)
 * ═══════════════════════════════════════════════════════════════════════════
 * ของจริงที่เกิด: บล็อกที่สร้างอัตโนมัติทำให้ตัวอักษรเข้มขึ้น "เทียบพื้นหน้าเว็บ"
 * แต่ปุ่มพวกนี้มีพื้นหลังม่วง/น้ำเงินตายตัว ⇒ ได้ contrast 1.17–1.42 (มองไม่เห็นเลย)
 * และคอมเมนต์ที่ตัวสร้างเขียนเองก็บันทึกค่านั้นไว้แล้ว — แต่ยังปล่อยผ่าน
 */
describe('ปุ่มที่พื้นหลังเป็นสีตายตัว ห้ามถูกธีมสว่างเปลี่ยนสีตัวอักษร', () => {
  const SOLID_BG_BUTTONS = ['.pb-btn', '.brd-btn', '.skm-btn', '.mk-stat-lbl'];

  it('ต้องไม่มีกฎธีมสว่างที่เปลี่ยน color/background ของปุ่มพื้นทึบแบบเหมารวม', () => {
    for (const cls of SOLID_BG_BUTTONS) {
      const bad = new RegExp(`:root\\[data-theme="minimal"\\] \\${cls} \\{[^}]*\\}\\s*/\\* [0-3]\\.`, 'g');
      expect(css.match(bad), `${cls}: ยังมีกฎที่ตัวสร้างเขียนไว้ทั้งที่รู้ว่า contrast ไม่ผ่าน`).toBeNull();
    }
  });

  it('สีสถานะที่มาจากข้อมูลต้องเป็นโทเคน ไม่ใช่เลขฐานสิบหก (inline ชนะ CSS เสมอ)', () => {
    const factory = readFileSync(resolve(__dirname, '../../pages/Factory.tsx'), 'utf8');
    for (const hex of ["'#f59e0b'", "'#22c55e'", "'#ef4444'", "'#3b82f6'"]) {
      expect(factory.includes(hex), `Factory.tsx ยังเขียนสี ${hex} ตายตัว — ธีมสว่างแก้ไม่ได้`).toBe(false);
    }
    for (const tok of ['--st-warn', '--st-ok', '--st-bad', '--st-info']) {
      expect(css.includes(`${tok}:`), `index.css ไม่ได้ประกาศ ${tok}`).toBe(true);
    }
  });
});
