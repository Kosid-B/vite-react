import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════
 * `supabase functions deploy` (ไม่ระบุชื่อ) = deploy ทุกโฟลเดอร์ใน supabase/functions
 * และอ่าน verify_jwt จาก config.toml — **ตัวที่ไม่ได้ประกาศ CLI จะ default เป็น true**
 *
 * 🔴 เหตุการณ์จริง 20 พ.ย. 2569: เทียบ config.toml (26 ตัว) กับของที่รันอยู่จริง (24 ตัว)
 *    พบ 4 ตัวที่ live เป็น verify_jwt=false แต่ไม่มีใน config.toml:
 *    checkup-report · hubspot-sync · lead-nurture · market-snapshot
 *    ⇒ ถ้าตั้ง workflow deploy อัตโนมัติตามตัวอย่างในเอกสาร Supabase ตรง ๆ
 *      cron ทั้ง 4 จะพัง 401 แบบเงียบ (ไม่มีอาการ จนกว่ารายงานจะไม่มา)
 *
 * ไฟล์ config.toml เขียนกติกานี้ไว้เองที่บรรทัด 7 แล้ว ("ระบุทุกฟังก์ชันไว้ที่นี่")
 * แต่ไม่มีใครบังคับ ⇒ เทสต์นี้คือตัวบังคับ
 * ══════════════════════════════════════════════════════════════════════ */

const root = resolve(__dirname, '../../..');
const FN_DIR = join(root, 'supabase/functions');
const cfg = readFileSync(join(root, 'supabase/config.toml'), 'utf8');

/** โฟลเดอร์ฟังก์ชันจริงในรีโป (ไม่นับ _shared ที่เป็นโค้ดร่วม ไม่ใช่ฟังก์ชัน) */
const localFns = readdirSync(FN_DIR)
  .filter((d) => d !== '_shared' && statSync(join(FN_DIR, d)).isDirectory())
  .sort();

/** { ชื่อฟังก์ชัน: verify_jwt } ที่ประกาศไว้ใน config.toml */
const declared = new Map<string, boolean>(
  [...cfg.matchAll(/\[functions\.([\w-]+)\]\s*\n\s*verify_jwt\s*=\s*(true|false)/g)]
    .map(([, name, v]) => [name, v === 'true']),
);

describe('supabase/config.toml ต้องครอบคลุมทุกฟังก์ชัน (กัน bulk deploy พัง)', () => {
  it('อ่านเจอของจริงทั้งสองฝั่ง (กันเทสต์ผ่านเพราะหาไฟล์ไม่เจอ)', () => {
    expect(localFns.length, 'ไม่เจอโฟลเดอร์ฟังก์ชัน = ตัวตรวจพัง').toBeGreaterThan(20);
    expect(declared.size, 'parse config.toml ไม่ได้ = ตัวตรวจพัง').toBeGreaterThan(20);
    expect(cfg).toContain('project_id = "waigsnxhrlwtiotspaim"');
  });

  it('🔴 ทุกฟังก์ชันในรีโปต้องประกาศ verify_jwt ไว้ใน config.toml', () => {
    const missing = localFns.filter((f) => !declared.has(f));
    expect(
      missing,
      `ไม่ได้ประกาศ: ${missing.join(', ')} — CLI จะ default true แล้ว webhook/cron พัง 401 เงียบ ๆ`,
    ).toEqual([]);
  });

  /** header ของแต่ละฟังก์ชันเขียนวิธี deploy ไว้เอง — ใช้เป็นแหล่งเทียบที่สอง
   *  (config.toml บรรทัด 8 เขียนกติกานี้ไว้: "ค่าที่ตั้งต้องตรงกับ comment header ในแต่ละ index.ts") */
  it('🔴 ค่าใน config.toml ต้องตรงกับ `--no-verify-jwt` ที่เขียนใน header ของแต่ละฟังก์ชัน', () => {
    const conflict: string[] = [];
    for (const fn of localFns) {
      let src: string;
      try { src = readFileSync(join(FN_DIR, fn, 'index.ts'), 'utf8'); } catch { continue; }
      const head = src.slice(0, 1600);
      const headerSaysPublic = head.includes('--no-verify-jwt');
      const cfgSaysPublic = declared.get(fn) === false;
      if (headerSaysPublic && !cfgSaysPublic) conflict.push(`${fn}: header=public แต่ config=ต้องล็อกอิน`);
      if (!headerSaysPublic && cfgSaysPublic && head.includes('Deploy:')) {
        conflict.push(`${fn}: config=public แต่ header ไม่ได้เขียน --no-verify-jwt`);
      }
    }
    expect(conflict, conflict.join(' · ')).toEqual([]);
  });

  it('4 ตัวที่เคยหายต้องยังอยู่ และต้องเป็น false (ห้ามถอยกลับ)', () => {
    for (const fn of ['checkup-report', 'hubspot-sync', 'lead-nurture', 'market-snapshot']) {
      expect(declared.get(fn), `${fn} ต้องประกาศเป็น verify_jwt=false`).toBe(false);
    }
  });
});
