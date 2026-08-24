import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════════
 * เส้นแบ่งความเป็นเจ้าของ (เจ้าของตัดสิน 24 ส.ค. 2569)
 *
 *   Marketing OS (ตาราง marketing_* 33 ตาราง) = **อีกระบบเป็นเจ้าของ**
 *   รีโปนี้ = ตัวผลิตภัณฑ์ + สมองที่ทำงานให้ "ธุรกิจของผู้ใช้"
 *
 * ทำไมต้องมีเทสต์: ทั้งสองระบบเขียนลง production เดียวกัน (waigsnxhrlwtiotspaim)
 *   ⇒ ถ้ารีโปนี้เผลอสร้างตาราง/อ่านตารางของอีกฝั่ง จะได้ของซ้ำสองที่ทันที
 *      ซึ่งเป็นความสิ้นเปลืองที่ Architecture Consolidation Audit ถูกสั่งให้มาหาพอดี
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
