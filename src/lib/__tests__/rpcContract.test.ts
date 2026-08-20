import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeLandingAgg, toCell } from '../landingFunnel';

/* สัญญาระหว่าง SQL กับ TypeScript — เทสต์นี้มีเพราะเสียหายจริงมาแล้ว (17 ส.ค. 2569)
 *
 * migration 0057 เขียน landing_funnel_agg ใหม่ทั้งก้อน แล้ว:
 *   ① ทำคีย์ engaged/bounce หายไป → client `?? 0` เปลี่ยนคีย์ที่หายให้กลายเป็นเลข 0
 *      ที่ดูเหมือนข้อมูลจริง → แผงแอดมินโชว์ "สนใจจริง 0 คน · bounce 0"
 *      ทั้งที่ค่าจริงคือ bounce 22 จาก 67 (33%) — ผิดแบบเงียบ อันตรายกว่าจอพัง
 *   ② เปลี่ยน by_seg/by_ref จากตัวเลข เป็นก้อน {total,cta,signup} แต่ UI ยังเรนเดอร์ตรง ๆ
 *      → React error #31 = แอดมินเปิดแท็บการเติบโตแล้วจอพังทั้งหน้า
 *
 * ทั้งสองอย่าง TypeScript จับไม่ได้ เพราะฝั่ง client ใช้ `as Partial<...>`
 * ซึ่งเป็นการ "ประกาศ" ว่าข้อมูลหน้าตาแบบนี้ ไม่ใช่การ "ตรวจ" ว่าจริงไหม
 * เทสต์นี้จึงไปอ่าน SQL ตัวจริงในโฟลเดอร์ migrations แทนการเชื่อ type
 *
 * ⚠️ เพิ่มคีย์ใหม่ใน interface ฝั่ง TS = ต้องมาเพิ่มในตารางนี้ด้วย
 */

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');

/** RPC ที่คืน jsonb แล้วหน้าเว็บอ่านเป็นก้อน — คีย์ต้องตรงกับ interface ฝั่ง TS */
const CONTRACTS: { fn: string; consumer: string; keys: string[]; minFile?: string }[] = [
  {
    fn: 'landing_funnel_agg',
    consumer: 'LandingAgg (lib/landingFunnel.ts)',
    minFile: '0065', // 0057 ทำคีย์หาย · 0062 เพิ่ม utm · 0065 เพิ่ม by_medium — ห้ามถอยกลับ
    keys: [
      'days', 'total', 'engaged', 'cta', 'signup', 'avg_scroll', 'avg_dwell', 'bounce',
      'by_seg', 'by_ref', 'by_ab', 'by_hero_ab', 'by_layout_ab', 'sections',
      'by_utm_source', 'by_campaign', 'by_content', 'by_medium',
    ],
  },
  {
    fn: 'quickcheck_agg',
    consumer: 'QuickAgg (lib/productQuickCheck.ts)',
    keys: [
      'total', 'with_topic', 'cta', 'median_price', 'median_cost', 'median_margin_pct',
      'by_biz', 'by_verdict', 'by_topic',
    ],
  },
  {
    fn: 'client_errors_agg',
    consumer: 'ClientErrorAgg (lib/clientErrors.ts)',
    keys: ['days', 'total', 'by_source', 'by_path', 'groups'],
  },
];

/** เนื้อ SQL ของนิยามฟังก์ชันตัวล่าสุด (ไฟล์เลขมากสุดที่นิยามมันไว้) */
function latestDef(fn: string): { file: string; sql: string } {
  const files = readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort();
  let found: { file: string; sql: string } | null = null;
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS, f), 'utf8');
    if (new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${fn}\\b`, 'i').test(sql)) {
      found = { file: f, sql };
    }
  }
  if (!found) throw new Error(`หา migration ที่นิยาม ${fn} ไม่เจอ`);
  return found;
}

describe.each(CONTRACTS)('สัญญา $fn ↔ $consumer', ({ fn, keys, minFile }) => {
  it('SQL ตัวล่าสุดต้องคืนทุกคีย์ที่หน้าเว็บอ่าน', () => {
    const { file, sql } = latestDef(fn);
    const missing = keys.filter(k => !new RegExp(`'${k}'\\s*,`).test(sql));
    expect(missing, `${file} ขาดคีย์ ${missing.join(', ')} — หน้าเว็บจะได้ค่า 0/ว่าง โดยไม่มีใครรู้`)
      .toEqual([]);
  });

  if (minFile) {
    it(`นิยามล่าสุดต้องเป็น ${minFile} หรือใหม่กว่า`, () => {
      expect(latestDef(fn).file >= minFile).toBe(true);
    });
  }
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
