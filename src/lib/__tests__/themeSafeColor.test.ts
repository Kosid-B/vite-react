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

  it('ตัวตรวจต้องไม่อ่าน gradient โปร่งใสเป็นสีพื้นทึบ', () => {
    // เคยพลาด: อ่าน rgba(52,211,153,.08) เป็นเขียวทึบ ⇒ รายงาน "เขียวบนเขียว" ผิด ๆ
    expect(audit).toMatch(/g\.a > 0\.5/);
  });
});
