import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 ความผิดที่เทสต์นี้กัน (ledger #50 · 24 ส.ค. 2569)
 *
 *    ผมสร้าง `src/lib/founderMindset.ts` ขึ้นมาใหม่ทั้งไฟล์ ทั้งที่ `main` มีอยู่แล้ว
 *    ชื่อไฟล์เดียวกัน เจตนาเดียวกัน แต่กติกาแกนตรงข้ามกัน (ของ main บล็อกได้ · ของผมเตือนอย่างเดียว)
 *    สาเหตุ: branch ตามหลัง main 137 คอมมิต และผมไม่ได้ `git fetch` ก่อนลงมือ
 *
 *    เกิดขึ้น **ขณะกำลังสร้างรัฐธรรมนูญที่มีข้อว่า Evidence > Opinion**
 *    — ผมไม่ได้หาหลักฐานว่ามีของอยู่แล้วไหม ก่อนจะเชื่อว่ายังไม่มี
 *
 * ⚠️ เทสต์นี้กันอะไรได้จริง และกันอะไรไม่ได้:
 *    กันได้  — ของซ้ำ "ในรีโปเดียวกัน" (รวมถึงตอน merge สองสายเข้าด้วยกัน)
 *    กันไม่ได้ — ของซ้ำที่อยู่คนละ branch และยังไม่ merge
 *              ข้อนั้นกันด้วยเทสต์ไม่ได้ ต้องกันด้วยนิสัย: `git fetch` แล้วค้นชื่อก่อนสร้าง
 *              (เขียนไว้ใน CLAUDE.md แล้ว — ตรงนี้บอกไว้ให้ชัดว่ามันไม่ได้ครอบคลุมทั้งหมด)
 *
 * ทำไมจับที่ "ค่าคงที่ตัวพิมพ์ใหญ่": ค่าคงที่ที่ถูกประกาศสองที่คือรูปแบบที่ชัดที่สุด
 * ของ "แหล่งความจริงสองแหล่ง" — และเป็นชนิดที่พังเงียบที่สุด เพราะแก้ที่หนึ่ง
 * อีกที่หนึ่งยังเป็นค่าเดิม โดยไม่มี error ไม่มีเทสต์แดง
 * (ราคา ฿590 ที่โผล่ในเอกสารวินิจฉัยการตลาด ทั้งที่ระบบคิด ฿790 คือความผิดตระกูลนี้)
 * ══════════════════════════════════════════════════════════════════════════ */

const LIB = resolve(__dirname, '..');

/**
 * ของซ้ำที่ยังแก้ไม่ได้ตอนนี้ พร้อมเหตุผล — ห้ามเพิ่มโดยไม่เขียนว่าทำไม
 *
 * ⚠️ ทั้งสามข้อนี้ **ไม่ได้แก้ในรอบนี้โดยตั้งใจ** — การเปลี่ยนชื่อค่าคงที่
 * ต้องแก้ทุกจุดที่เรียกใช้ ซึ่งบน branch ที่ตามหลัง main อยู่ 137 คอมมิต
 * จะสร้าง merge conflict เพิ่ม = ตรงข้ามกับเป้าหมาย "รวมให้เหลือแกนเดียว"
 * ปล่อยไว้เป็นหนี้ที่ถูกตรึงไว้ ดีกว่าแก้แล้วทำให้การรวมสองสายยากขึ้น
 */
const ALLOWED_DUPES: Record<string, { files: string[]; reason: string }> = {
  PLAN_PRICE: {
    files: ['access.ts', 'finance.ts'],
    reason:
      'finance.ts เก็บเป็นตัวเลข (790) · access.ts เก็บเป็นข้อความ ("฿790/เดือน") — ' +
      'คนละชนิดข้อมูล ควรเปลี่ยนชื่อฝั่ง access เป็น PLAN_PRICE_LABEL ตอน merge',
  },
  USD_THB: {
    files: ['aiCost.ts', 'tokenEconomics.ts'],
    reason:
      'ทั้งคู่ประกาศ 36 เท่ากัน — ควรให้ aiCost.ts เป็นเจ้าของแล้วอีกฝั่ง import ' +
      '(แก้ตอน merge เพราะ tokenEconomics.ts ต่างจาก main แล้ว)',
  },
  BMC_BLOCKS: {
    files: ['bmcOutcomes.ts', 'bmcSync.ts'],
    reason:
      'bmcOutcomes.ts มี emoji · bmcSync.ts มี hints — คนละรูปร่าง ใช้คนละงาน ' +
      'ควรแยกชื่อให้ตรงกับหน้าที่จริง',
  },
};

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === '__tests__') continue;
      out.push(...tsFiles(path));
    } else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) {
      out.push(path);
    }
  }
  return out;
}

/** จับเฉพาะ `export const ชื่อตัวพิมพ์ใหญ่` ที่ระดับบนสุดของไฟล์ */
const EXPORTED_CONST = /^export\s+const\s+([A-Z][A-Z0-9_]{2,})\b/gm;

function ownersOfConstants(): Map<string, string[]> {
  const owners = new Map<string, string[]>();

  for (const file of tsFiles(LIB)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(EXPORTED_CONST)) {
      const name = match[1];
      const list = owners.get(name) ?? [];
      list.push(relative(LIB, file));
      owners.set(name, list);
    }
  }

  return owners;
}

describe('แหล่งความจริงเดียวต่อค่าคงที่หนึ่งตัว', () => {
  it('ห้ามมีค่าคงที่ตัวเดียวกันถูกประกาศในสองไฟล์', () => {
    const offenders: string[] = [];

    for (const [name, files] of ownersOfConstants()) {
      if (files.length < 2) continue;

      const allowed = ALLOWED_DUPES[name];
      /**
       * ⚠️ ยกเว้น "คู่ไฟล์" ไม่ใช่ยกเว้น "ชื่อ"
       *
       * เวอร์ชันแรกของเทสต์นี้ยกเว้นทั้งชื่อ ผลคือพอลองฉีด USD_THB เข้าไฟล์ที่สาม
       * เทสต์ยังเขียว — รายการยกเว้นกลายเป็นใบอนุญาตให้ซ้ำได้ไม่จำกัด
       * (เจอตอนทดสอบว่าเทสต์แดงจริงไหม ซึ่งเป็นเหตุผลที่ต้องทดสอบทุกครั้ง)
       */
      if (allowed && [...files].sort().join() === [...allowed.files].sort().join()) continue;

      offenders.push(`${name}: ${files.join(' · ')}`);
    }

    expect(offenders).toEqual([]);
  });

  /**
   * รายการยกเว้นที่ไม่มีวันหมดอายุ คือรายการที่ไม่มีใครกลับมาดู
   * แก้ของซ้ำเสร็จแล้วต้องเอาชื่อออกจากรายการ ไม่งั้นรายการนี้จะค่อย ๆ
   * กลายเป็นของประดับที่ไม่ได้บอกอะไรอีกต่อไป
   */
  it('รายการยกเว้นต้องยังซ้ำอยู่จริง — แก้แล้วต้องเอาออก', () => {
    const owners = ownersOfConstants();
    const stale = Object.keys(ALLOWED_DUPES).filter(
      (name) => (owners.get(name)?.length ?? 0) < 2,
    );

    expect(stale).toEqual([]);
  });

  it('ทุกรายการยกเว้นต้องมีเหตุผลกำกับ', () => {
    for (const [name, entry] of Object.entries(ALLOWED_DUPES)) {
      expect(entry.reason.trim().length, `${name} ไม่มีเหตุผล`).toBeGreaterThan(30);
      expect(entry.files.length, `${name} ไม่ได้ระบุไฟล์`).toBeGreaterThan(1);
    }
  });

  /** ตัวเทสต์เองต้องจับได้จริง ไม่งั้นมันคือเทสต์ที่ผ่านเปล่า ๆ */
  it('รูปแบบที่ใช้จับ ต้องจับของผิดได้และปล่อยของถูกไป', () => {
    const bad = 'export const GOLDEN_QUESTION = "…";';
    const good = [
      'const GOLDEN_QUESTION = "…";',          // ไม่ได้ export
      'export const goldenQuestion = "…";',    // ไม่ใช่ค่าคงที่ตัวพิมพ์ใหญ่
      '  export const INNER = 1;',             // ไม่ได้อยู่ระดับบนสุด
    ];

    expect([...bad.matchAll(new RegExp(EXPORTED_CONST.source, 'gm'))]).toHaveLength(1);
    for (const line of good) {
      expect([...line.matchAll(new RegExp(EXPORTED_CONST.source, 'gm'))]).toHaveLength(0);
    }
  });
});
