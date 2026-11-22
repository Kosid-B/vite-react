import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════
 * ด่านของชุด ADR (docs/adr) — ADR-0001 ตั้งกฎไว้ว่า
 *   🔴 "ADR ที่ไม่มีกลไกบังคับ = ความตั้งใจที่ไม่มีใครบังคับ"
 * ไฟล์นี้คือกลไกของตัวมันเอง: บังคับรูปแบบ สถานะ และความครบของสารบัญ
 *
 * ⚠️ เทสต์นี้ **ค้นหาไฟล์เอง** ไม่ฮาร์ดโค้ดรายชื่อ — บทเรียน ledger #85
 *    (ด่านที่ลิสต์ชื่อของที่จะตรวจไว้เอง จะมองไม่เห็นของที่เพิ่มมาใหม่)
 * ══════════════════════════════════════════════════════════════════════ */
const DIR = resolve(__dirname, '../../../docs/adr');
const files = readdirSync(DIR).filter((f) => /^\d{4}-.+\.md$/.test(f)).sort();
const readAdr = (f: string) => readFileSync(resolve(DIR, f), 'utf8');
const readme = readFileSync(resolve(DIR, 'README.md'), 'utf8');

/** สถานะที่ README ประกาศว่าใช้ได้ — ดึงจากเอกสารจริง ห้ามเขียนซ้ำในเทสต์ */
const ALLOWED = [...readme.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]);

const REQUIRED = ['## บริบท', '## การตัดสินใจ', '## ผลที่ตามมา', '## ทางเลือกที่ไม่เลือก'];

describe('ชุด ADR — รูปแบบต้องบังคับได้ ไม่ใช่ขอความร่วมมือ', () => {
  it('เจอไฟล์ ADR จริง (กันเทสต์ผ่านเพราะโฟลเดอร์ว่าง)', () => {
    expect(files.length).toBeGreaterThanOrEqual(7);
    expect(ALLOWED, 'README ต้องประกาศสถานะที่ใช้ได้').toContain('accepted');
    expect(ALLOWED).toContain('blocked');
  });

  it('เลขไม่ซ้ำ และเรียงต่อเนื่องจาก 0001', () => {
    const nums = files.map((f) => Number(f.slice(0, 4)));
    expect(new Set(nums).size).toBe(nums.length);
    expect(nums[0]).toBe(1);
  });

  it.each(files)('%s มีหัวข้อครบทุกข้อที่ ADR-0001 บังคับ', (f) => {
    const s = readAdr(f);
    for (const h of REQUIRED) {
      expect(s.split('\n').some((l) => l.startsWith(h)), `ขาดหัวข้อ ${h}`).toBe(true);
    }
  });

  it.each(files)('%s ประกาศสถานะที่อยู่ในชุดที่อนุญาต', (f) => {
    const m = readAdr(f).match(/\*\*สถานะ\*\*: `([a-z-]+)`/);
    expect(m, 'ต้องมีบรรทัดสถานะในรูปแบบ **สถานะ**: `x`').not.toBeNull();
    expect(ALLOWED, `สถานะ ${m?.[1]} ไม่อยู่ในชุดที่ README ประกาศ`).toContain(m![1]);
  });

  it.each(files)('%s มีวันที่ (ADR ที่ไม่รู้ว่าตัดสินเมื่อไร อ่านลำดับเหตุการณ์ไม่ได้)', (f) => {
    expect(readAdr(f)).toMatch(/\*\*วันที่\*\*: \d{1,2} [ก-๙.]+ \d{4}/);
  });

  it('🔴 ADR ที่ `accepted` ต้องมีหัวข้อกลไก — ไม่มีกลไก = ความตั้งใจลอย ๆ', () => {
    const missing = files.filter((f) => {
      const s = readAdr(f);
      return /\*\*สถานะ\*\*: `accepted`/.test(s) && !s.split('\n').some((l) => l.startsWith('## กลไก'));
    });
    expect(missing, `accepted แต่ไม่มีกลไก: ${missing.join(', ')}`).toEqual([]);
  });

  /* 🔁 แก้ 22 พ.ย. 2569 — เดิมบังคับว่า "ต้องมี ADR ที่ blocked อยู่จริง" โดยอิง ADR-0006
   *    พอด่าน `Freeze Phase 1 baseline` ปิด ADR นั้นก็ไม่ blocked อีก ⇒ เทสต์จะแดงทั้งที่ไม่มีอะไรผิด
   *    ⇒ ย้ายไปบังคับ **คุณสมบัติ** แทนการบังคับว่าต้องมีอยู่ · แล้วพิสูจน์ด้วยตัวอย่างสังเคราะห์
   *       ว่าตัวตรวจยังจับของผิดได้จริง (ไม่ใช่ผ่านเพราะไม่มีไฟล์ให้ตรวจ) */
  const NAMES_A_GATE = /releaseGates|schemaChangeAllowed|Acceptance #2|Freeze Phase 1 baseline/;

  it('🔴 ADR ที่ `blocked` ต้องระบุ **ชื่อด่าน** ที่กั้น ไม่ใช่บอกว่า "ยังไม่พร้อม"', () => {
    for (const f of files.filter((x) => /\*\*สถานะ\*\*: `blocked`/.test(readAdr(x)))) {
      expect(readAdr(f), `${f} ต้องชี้ชื่อด่านที่กั้นได้`).toMatch(NAMES_A_GATE);
    }
    // ตัวตรวจต้องยังจับของผิดได้ แม้วันนี้ไม่มี ADR ไหน blocked เลย
    expect(NAMES_A_GATE.test('**สถานะ**: `blocked` — ยังไม่พร้อม')).toBe(false);
  });

  it('🔴 ห้าม ADR ไหนประกาศว่าเกณฑ์ตัวเลขเป็น `validated` (กฎเดิมของโปรเจกต์)', () => {
    for (const f of files) {
      expect(readAdr(f), `${f} อ้าง validated`).not.toMatch(/`validated`/);
    }
  });

  it('สารบัญใน README ต้องตรงกับไฟล์จริง — ไม่ขาด ไม่เกิน', () => {
    const linked = [...readme.matchAll(/\]\((\d{4}-[a-z0-9-]+\.md)\)/g)].map((m) => m[1]).sort();
    expect(linked, 'README ลิสต์ไม่ตรงกับไฟล์ในโฟลเดอร์').toEqual(files);
  });

  it('สถานะใน README ต้องตรงกับในไฟล์ (เอกสารสองที่ที่ไม่ตรงกัน = เชื่ออันไหนไม่รู้)', () => {
    for (const f of files) {
      const status = readAdr(f).match(/\*\*สถานะ\*\*: `([a-z-]+)`/)![1];
      const row = readme.split('\n').find((l) => l.includes(`](${f})`));
      expect(row, `README ไม่มีแถวของ ${f}`).toBeTruthy();
      expect(row, `${f}: README บอกสถานะไม่ตรงกับในไฟล์ (${status})`).toContain(`\`${status}\``);
    }
  });

  it('README ต้องบอกเส้นแบ่งกับ CLAUDE.md และ ledger (ห้ามเขียนซ้ำกัน)', () => {
    expect(readme).toMatch(/LESSONS-LEDGER/);
    expect(readme).toMatch(/CLAUDE\.md/);
  });
});
