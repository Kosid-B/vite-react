import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════
 * สัญญาระหว่างโค้ดกับเครื่องมือวัดผล — skill `tracking-contract`
 *
 * 🔴 ความผิดพลาดจริง 22 ส.ค. 2569: ผู้ช่วยบอกเจ้าของให้ลบ key event
 *    `paid_growth` / `paid_scale` / `paid_starter` ออกจาก GA4 โดยอ้างว่า "ไม่มีในโค้ด"
 *    ทั้งที่ `Billing.tsx` ยิงมันจริงด้วย `track('paid_' + sub.plan, …)`
 *    ⇒ grep หาชื่อเต็มไม่มีวันเจอ · ถ้าทำตามจะเสียการวัดรายได้รายแพ็กถาวร
 *
 * เทสต์นี้ไม่ได้ล็อกรายชื่อ event (จะกลายเป็นภาระที่ต้องแก้ทุกครั้งที่เพิ่มปุ่ม)
 * แต่ล็อก **สิ่งที่ทำให้ตรวจสอบไม่ได้**:
 *   ① ชื่อ event ที่ประกอบจากตัวแปร ต้องมีคอมเมนต์กำกับว่าแตกออกเป็นชื่ออะไรบ้าง
 *   ② พารามิเตอร์ที่ GA4 สงวนไว้ ต้องถูก remap (ห้ามมีใครลบชั้นนี้ทิ้ง)
 * ══════════════════════════════════════════════════════════════════════ */

const SRC = resolve(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== '__tests__') walk(p, out); }
    else if (['.ts', '.tsx'].includes(extname(e))) out.push(p);
  }
  return out;
}
const files = walk(SRC);

/** จุดที่เรียก track() โดยชื่อ event ไม่ใช่ literal — คือจุดที่ grep มองไม่เห็น */
function dynamicTrackCalls(): { file: string; line: number; code: string }[] {
  const hits: { file: string; line: number; code: string }[] = [];
  for (const f of files) {
    if (f.endsWith('analytics.ts') || f.endsWith('amplitude.ts')) continue; // ตัว wrapper เอง
    const lines = readFileSync(f, 'utf8').split('\n');
    lines.forEach((ln, i) => {
      const m = ln.match(/\btrack\(\s*([^'")\s][^,]*)/);
      if (m) hits.push({ file: f.replace(SRC, 'src'), line: i + 1, code: ln.trim() });
    });
  }
  return hits;
}

describe('tracking-contract — ชื่อ event ที่ประกอบจากตัวแปร', () => {
  it('พบจุดที่ประกอบชื่อจริง (กันเทสต์ผ่านเพราะ regex พัง)', () => {
    // ถ้าวันหนึ่งไม่เหลือสักจุด ให้ลบเทสต์นี้ทิ้งอย่างตั้งใจ ไม่ใช่ปล่อยให้ผ่านเงียบ ๆ
    expect(dynamicTrackCalls().length).toBeGreaterThan(0);
  });

  it('🔴 ทุกจุดที่ประกอบชื่อ event จากตัวแปร ต้องมีคอมเมนต์บอกว่าแตกเป็นชื่ออะไรบ้าง', () => {
    const bad: string[] = [];
    for (const h of dynamicTrackCalls()) {
      const lines = readFileSync(resolve(SRC, '..', h.file), 'utf8').split('\n');
      // คอมเมนต์ต้องอยู่บรรทัดเดียวกัน หรือ 2 บรรทัดก่อนหน้า
      const around = [lines[h.line - 1], lines[h.line - 2], lines[h.line - 3]].filter(Boolean).join('\n');
      if (!/\/\/|\/\*|\*/.test(around)) bad.push(`${h.file}:${h.line}  ${h.code}`);
    }
    expect(bad, 'ชื่อ event ที่ grep หาไม่เจอ ต้องมีคอมเมนต์กำกับ ไม่งั้นคนตรวจจะสั่งลบของจริงทิ้ง').toEqual([]);
  });
});

describe('tracking-contract — ชั้น remap ของ GA4', () => {
  const analytics = readFileSync(join(SRC, 'lib/analytics.ts'), 'utf8');

  it('ยังมีชั้น remap พารามิเตอร์ที่ GA4 สงวนไว้', () => {
    expect(analytics).toMatch(/GA_RESERVED/);
    expect(analytics).toMatch(/'ev_'\s*\+/);
  });

  it('รายชื่อที่สงวนต้องครอบคลุมทั้ง 5 ตัวหลักของ GA4 attribution', () => {
    for (const k of ['source', 'medium', 'campaign', 'term', 'content']) {
      expect(analytics, `GA_RESERVED ต้องมี ${k} — ไม่งั้นจะไปปนแหล่งที่มาของเซสชัน`)
        .toMatch(new RegExp(`'${k}'`));
    }
  });

  it('มีเอกสารบอกว่าชื่อไหนถูกเปลี่ยนเป็นอะไร (ให้คนตั้งค่า GA4 อ่านได้)', () => {
    const doc = readFileSync(resolve(SRC, '../docs/analytics/GA4-CUSTOM-DEFINITIONS.md'), 'utf8');
    expect(doc).toMatch(/ev_source/);
    expect(doc).toMatch(/ev_medium/);
  });
});
