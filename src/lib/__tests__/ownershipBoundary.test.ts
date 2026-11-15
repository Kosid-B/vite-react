import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════════
 * เส้นแบ่งความเป็นเจ้าของ (เจ้าของตัดสิน 24 ส.ค. 2569)
 *
 *   Marketing OS (ตาราง marketing_* 33 ตาราง) = **อีกระบบเป็นเจ้าของ**
 *   รีโปนี้ = ตัวผลิตภัณฑ์ + สมองที่ทำงานให้ "ธุรกิจของผู้ใช้"
 *
 * ทำไมต้องมีเทสต์: ของสองระบบอยู่ใน org Supabase เดียวกัน และ production (waigsnxhrlwtiotspaim)
 *   มีตาราง marketing_* 33 ตารางค้างอยู่จริง (apply ไว้ แต่ 0 แถวทุกตาราง — ตรวจสด 15 พ.ย. 69)
 *   ส่วนข้อมูลจริงของอีกระบบอยู่คนละ project: bjozpwdtqbpwcxnqguka "CEOAITHAILAND Marketing"
 *   ⇒ ถ้ารีโปนี้เผลอสร้างตาราง/อ่านตารางของอีกฝั่ง จะได้ของซ้ำสองที่ทันที
 *      ซึ่งเป็นความสิ้นเปลืองที่ Architecture Consolidation Audit ถูกสั่งให้มาหาพอดี
 *
 * 🔓 ข้อยกเว้นเดียวที่ได้รับอนุญาต (เจ้าของยืนยัน 15 พ.ย. 2569):
 *    **อ่านอย่างเดียว** 3 ตารางของ project bjozpwdtqbpwcxnqguka —
 *    marketing_brands · marketing_audience_segments · marketing_message_pillars
 *    เพื่อจับว่าสำเนา brand truth ฝั่งเราเพี้ยนจากแหล่งจริงหรือยัง
 *    ✅ ทำได้เฉพาะใน scripts/brand-sync-check.mjs  ❌ ห้ามเขียน ❌ ห้ามอยู่ในโค้ดแอป
 *    (เหตุผลที่ไม่ให้อยู่ในแอป: ผลิตภัณฑ์ต้องทำงานได้แม้อีกระบบล่ม)
 *
 * ⚠️ ห้ามแก้เทสต์นี้ให้ผ่านโดยไม่มีคำสั่งใหม่จากเจ้าของ — ถ้าเส้นแบ่งเปลี่ยนจริง
 *    ให้แก้ทั้งเทสต์ + §0 ของเอกสาร audit + CLAUDE.md ในคอมมิตเดียวกัน
 * ══════════════════════════════════════════════════════════════════════════ */

const ROOT = resolve(__dirname, '../../..');
const AUDIT = 'docs/product/ARCHITECTURE-CONSOLIDATION-AUDIT.md';

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== '__tests__' && e !== 'node_modules') walk(p, out); }
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

describe('🔴 เส้นแบ่งเจ้าของ — Marketing OS เป็นของอีกระบบ', () => {
  /** 0016–0018 = TIS Automate (project galtbbkcddugnsfkgyqm) — คนละฐานข้อมูลกันคนละใบ
   *  เก็บไว้ในรีโปเพื่อประวัติเท่านั้น และ **ห้าม apply กับ production หลัก** (กฎใน CLAUDE.md)
   *  มันมีตาราง `marketing_events` ของตัวเอง ซึ่งบังเอิญชื่อชนกับของ Marketing OS — คนละใบ ไม่ใช่การข้ามเส้น */
  const TIS_ONLY = /_tis_|tis_automate/;

  it('รีโปนี้ต้องไม่มี migration ที่สร้าง/แก้ตาราง marketing_* ของ production หลัก', () => {
    const dir = resolve(ROOT, 'supabase/migrations');
    const offenders = readdirSync(dir).filter((f) => {
      if (!f.endsWith('.sql') || TIS_ONLY.test(f)) return false;
      const sql = readFileSync(join(dir, f), 'utf8');
      return /\b(create|alter|drop)\s+table\s+(if\s+(not\s+)?exists\s+)?(public\.)?marketing_/i.test(sql);
    });
    expect(offenders, `migration ที่ข้ามเส้นแบ่ง: ${offenders.join(', ')}`).toEqual([]);
  });

  it('ไฟล์ที่ยกเว้นต้องเป็นของ TIS จริง ๆ — ห้ามใช้ชื่อไฟล์เลี่ยงเทสต์', () => {
    const dir = resolve(ROOT, 'supabase/migrations');
    const skipped = readdirSync(dir).filter((f) => f.endsWith('.sql') && TIS_ONLY.test(f));
    expect(skipped.length, 'ไม่เจอไฟล์ TIS — รูปแบบชื่อเปลี่ยนไปแล้ว ให้ตรวจซ้ำ').toBeGreaterThan(0);
    for (const f of skipped) {
      expect(f, `${f} ไม่ใช่ไฟล์ในช่วง 0016–0018 ของ TIS`).toMatch(/^001[678]_/);
    }
  });

  it('โค้ดในรีโปนี้ต้องไม่อ่าน/เขียนตาราง marketing_* โดยตรง', () => {
    const offenders = [...walk(resolve(ROOT, 'src')), ...walk(resolve(ROOT, 'supabase/functions'))]
      .filter((p) => /\.from\(\s*['"`]marketing_|rpc\(\s*['"`]marketing_/.test(readFileSync(p, 'utf8')))
      .map((p) => p.slice(ROOT.length + 1));
    expect(offenders, `ไฟล์ที่แตะตารางของอีกระบบ: ${offenders.join(', ')}`).toEqual([]);
  });

  /* ── ข้อยกเว้น 15 พ.ย. 2569 — อ่านอย่างเดียว 3 ตาราง ───────────────────
   * 🔴 ข้อยกเว้นที่ไม่มีเทสต์ล้อม = ประตูที่เปิดแล้วลืมปิด
   *    สามข้อล่างนี้บังคับว่า "เปิดแค่ที่เปิด" ไม่ใช่ "เปิดแล้วปล่อย" */
  const SYNC_SCRIPT = 'scripts/brand-sync-check.mjs';

  it('🔓 ข้อยกเว้นต้องอยู่ในสคริปต์เดียว และอ่านได้แค่ 3 ตารางที่เจ้าของอนุญาต', () => {
    const js = readFileSync(resolve(ROOT, SYNC_SCRIPT), 'utf8');
    const lib = readFileSync(resolve(ROOT, 'src/lib/brandSync.ts'), 'utf8');
    for (const t of ['marketing_brands', 'marketing_audience_segments', 'marketing_message_pillars']) {
      expect(js, `${SYNC_SCRIPT} ต้องประกาศ ${t} ไว้ในรายการที่อนุญาต`).toContain(t);
      expect(lib).toContain(t);
    }
    // ตารางอื่นของอีกระบบต้องไม่โผล่ในสคริปต์เลย
    const others = js.match(/marketing_[a-z_]+/g) ?? [];
    const illegal = [...new Set(others)].filter(
      (t) => !['marketing_brands', 'marketing_audience_segments', 'marketing_message_pillars'].includes(t),
    );
    expect(illegal, `สคริปต์แตะตารางนอกขอบเขต: ${illegal.join(', ')}`).toEqual([]);
  });

  it('🔴 ข้อยกเว้นเป็น "อ่าน" เท่านั้น — ห้ามมีคำสั่งเขียนในสคริปต์', () => {
    const js = readFileSync(resolve(ROOT, SYNC_SCRIPT), 'utf8');
    expect(/method:\s*['"`](POST|PATCH|PUT|DELETE)/i.test(js), 'พบ HTTP method ที่เขียนข้อมูล').toBe(false);
    expect(/service[_-]?role/i.test(js) && !/ห้ามใช้ service-role/.test(js), 'ใช้ service-role key').toBe(false);
  });

  it('🔴 ห้ามแตะ production ของเราจากสคริปต์นี้ — คนละฐาน คนละเจ้าของ', () => {
    const js = readFileSync(resolve(ROOT, SYNC_SCRIPT), 'utf8');
    expect(js).toContain('bjozpwdtqbpwcxnqguka');
    /* ⚠️ เจตนาคือห้าม **ใช้** production ไม่ใช่ห้าม **เอ่ยถึง** —
     *    คอมเมนต์ที่เตือนว่า "ไม่แตะ production <ref>" คือสิ่งที่เราอยากให้มี ไม่ใช่สิ่งที่ต้องห้าม
     *    (เทสต์เวอร์ชันแรกจับคอมเมนต์ตัวเองแล้วแดง — ตัดคอมเมนต์ออกก่อนตรวจ) */
    const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code, 'สคริปต์ใช้ production หลักจริง = ข้ามเส้นคนละเส้น').not.toContain('waigsnxhrlwtiotspaim');
  });

  it('เอกสาร audit ต้องบันทึกคำตัดสินและเส้นแบ่งไว้ ไม่ใช่อยู่แค่ในแชต (ledger #41)', () => {
    const doc = readFileSync(resolve(ROOT, AUDIT), 'utf8');
    expect(doc).toMatch(/เจ้าของตัดสินแล้ว \(24 ส\.ค\. 2569\)/);
    expect(doc).toMatch(/"อีกระบบ" เป็นเจ้าของ Marketing OS/);
    expect(doc).toMatch(/ห้ามพัฒนาต่อ/);
  });

  it('CLAUDE.md ต้องบอกเส้นแบ่งด้วย — รอบถัดไปอ่าน CLAUDE.md ก่อนเสมอ', () => {
    const md = readFileSync(resolve(ROOT, 'CLAUDE.md'), 'utf8');
    expect(md).toMatch(/Marketing OS/);
    expect(md).toMatch(/อีกระบบ/);
    expect(md).toMatch(/marketing_\*/);
  });

  it('🟢 สิ่งที่รีโปนี้ยังเป็นเจ้าของ ต้องยังอยู่ครบ — เส้นแบ่งห้ามกินสมองของผลิตภัณฑ์', () => {
    for (const f of ['founderConstitution.ts', 'founderMindset.ts', 'dmaic.ts', 'businessGenome.ts']) {
      expect(() => readFileSync(resolve(ROOT, 'src/lib', f), 'utf8'), f).not.toThrow();
    }
  });
});
