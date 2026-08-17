import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeLandingAgg, toCell } from '../landingFunnel';

/* สัญญาระหว่าง SQL กับ TypeScript — เทสต์นี้มีเพราะเสียหายจริงมาแล้ว (17 ส.ค. 2569)
 *
 * migration 0057 เขียน landing_funnel_agg ใหม่ทั้งก้อน แล้ว:
 *   ① ทำคีย์ engaged/bounce หายไป → client `?? 0` เปลี่ยนคีย์ที่หายให้กลายเป็นเลข 0
 *      ที่ดูเหมือนข้อมูลจริง → แผงแอดมินโชว์ "สนใจจริง 0 คน" ทั้งที่ไม่ใช่
 *   ② เปลี่ยน by_seg/by_ref จากตัวเลข เป็นก้อน {total,cta,signup} แต่ UI ยังเรนเดอร์ตรง ๆ
 *      → React error #31 = แอดมินเปิดแท็บการเติบโตแล้วจอพังทั้งหน้า
 *
 * ทั้งสองอย่าง TypeScript จับไม่ได้ เพราะฝั่ง client ใช้ `as Partial<LandingAgg>`
 * ซึ่งเป็นการ "ประกาศ" ว่าข้อมูลหน้าตาแบบนี้ ไม่ใช่การ "ตรวจ" ว่าจริงไหม
 * เทสต์นี้จึงไปอ่าน SQL ตัวจริงในโฟลเดอร์ migrations แทนการเชื่อ type
 */

/** คีย์ที่หน้าเว็บอ่านจริง — เพิ่มคีย์ใหม่ใน LandingAgg ต้องมาเพิ่มที่นี่ด้วย */
const REQUIRED_KEYS = [
  'days', 'total', 'engaged', 'cta', 'signup', 'avg_scroll', 'avg_dwell', 'bounce',
  'by_seg', 'by_ref', 'by_ab', 'by_hero_ab', 'by_layout_ab', 'sections',
] as const;

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');

/** เนื้อ SQL ของนิยาม landing_funnel_agg ตัวล่าสุด (ไฟล์เลขมากสุดที่นิยามมันไว้) */
function latestAggSql(): { file: string; sql: string } {
  const files = readdirSync(MIGRATIONS)
    .filter(f => f.endsWith('.sql'))
    .sort();
  let found: { file: string; sql: string } | null = null;
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS, f), 'utf8');
    if (/create\s+or\s+replace\s+function\s+public\.landing_funnel_agg/i.test(sql)) {
      found = { file: f, sql };
    }
  }
  if (!found) throw new Error('หา migration ที่นิยาม landing_funnel_agg ไม่เจอ');
  return found;
}

describe('สัญญา landing_funnel_agg — SQL ต้องคืนทุกคีย์ที่หน้าเว็บอ่าน', () => {
  it.each(REQUIRED_KEYS)("SQL ตัวล่าสุดต้องมีคีย์ '%s'", (key) => {
    const { file, sql } = latestAggSql();
    // jsonb_build_object เขียนคีย์เป็น literal เสมอ เช่น  'engaged', (select …
    expect(sql, `${file} ไม่มีคีย์ '${key}' — หน้าเว็บจะได้ค่า 0/ว่าง โดยไม่มีใครรู้`)
      .toMatch(new RegExp(`'${key}'\\s*,`));
  });

  it('เป็น 0059 หรือใหม่กว่า (0057 คือตัวที่ทำคีย์หาย)', () => {
    expect(latestAggSql().file >= '0059').toBe(true);
  });
});

describe('normalizeLandingAgg — ทนได้ทั้งสคีมาเก่าและใหม่', () => {
  it('by_ref แบบตัวเลข (0051) → กลายเป็นก้อน ไม่พัง', () => {
    const a = normalizeLandingAgg({ total: 10, by_ref: { social: 7, direct: 3 } });
    expect(a.by_ref.social).toEqual({ total: 7, cta: 0, signup: 0 });
    expect(a.by_ref.direct.total).toBe(3);
  });

  it('by_ref แบบก้อน (0057) → อ่านครบทั้ง 3 ค่า', () => {
    const a = normalizeLandingAgg({ by_ref: { social: { total: 7, cta: 2, signup: 1 } } });
    expect(a.by_ref.social).toEqual({ total: 7, cta: 2, signup: 1 });
  });

  it('ส่งค่าขยะมาก็ต้องไม่ throw — หน้าแอดมินต้องไม่พังเพราะข้อมูลแปลก', () => {
    for (const junk of [null, undefined, 'ข้อความ', 42, [], { by_ref: 'ไม่ใช่ก้อน' }]) {
      expect(() => normalizeLandingAgg(junk)).not.toThrow();
    }
    expect(toCell(NaN)).toEqual({ total: 0, cta: 0, signup: 0 });
    expect(toCell({ total: 'ห้า' })).toEqual({ total: 0, cta: 0, signup: 0 });
  });

  it('ส่งต่อ sections + by_hero_ab + by_layout_ab (เดิมถูกลืม → แผงว่างทั้งที่ DB มีข้อมูล)', () => {
    const a = normalizeLandingAgg({
      sections: { hero: { viewers: 3, seconds: 30, signups: 1 } },
      by_hero_ab: { a: { total: 5, cta: 2, signup: 1 } },
      by_layout_ab: { explain_first: { total: 4, cta: 1, signup: 0 } },
      days: 7,
    });
    expect(a.sections?.hero.viewers).toBe(3);
    expect(a.by_hero_ab?.a.total).toBe(5);
    expect(a.by_layout_ab?.explain_first.total).toBe(4);
    expect(a.days).toBe(7);
  });
});
