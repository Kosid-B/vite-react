import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/* สัญญาเรื่อง RLS — เทสต์นี้มีเพราะเสียหายจริงและเงียบมานาน (พบ 19 ส.ค. 2569)
 *
 * บั๊กที่ 1: public.workspaces เปิด RLS ไว้แต่ **ไม่มี policy INSERT เลย**
 *   ⇒ ผู้ใช้ที่สมัครใหม่สร้างเวิร์กสเปซไม่ได้ → งานไม่ถูกบันทึกขึ้นเซิร์ฟเวอร์
 *   ⇒ แอปได้ error แล้ว `console.warn` เฉย ๆ → **เดินต่อเงียบ ๆ เหมือนไม่มีอะไรเกิดขึ้น**
 *
 * บั๊กที่ 2: is_member() ถูกใช้ใน policy ของตารางที่ตัวมันเอง select อยู่ และเป็น SECURITY INVOKER
 *   ⇒ วนซ้ำไม่รู้จบ → 54001 stack depth limit exceeded
 *
 * ⚠️ ทั้งสองอย่าง **บัญชีแอดมินไม่เจอ** (is_app_admin ลัดวงจร OR ออกไปก่อน)
 *    ⇒ เจ้าของระบบทดสอบเองแล้วผ่านทุกครั้ง แต่ผู้ใช้จริงพังทุกคน
 *    ผลจริง: ผู้ใช้ภายนอก 2 คน (24 ก.ค. · 28 ก.ค.) ไม่เคยมีเวิร์กสเปซเลยแม้แต่วันเดียว
 *
 * บทเรียนที่เทสต์นี้ล็อกไว้: **ทดสอบด้วยบัญชีที่ไม่ใช่แอดมินเสมอ**
 */

const MIGRATIONS = join(process.cwd(), 'supabase', 'migrations');

function allSql(): { file: string; sql: string }[] {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ file: f, sql: readFileSync(join(MIGRATIONS, f), 'utf8') }));
}

const joined = allSql().map((f) => f.sql).join('\n');

describe('RLS — ตารางที่แอปเขียนลงไป ต้องมีทางเขียนจริง', () => {
  it('public.workspaces ต้องมี policy INSERT (ws_insert) — ถ้าหาย คนสมัครใหม่ใช้ระบบไม่ได้', () => {
    expect(/create\s+policy\s+ws_insert\s+on\s+public\.workspaces/i.test(joined)).toBe(true);
  });

  it('ห้ามมี migration ไหนมาลบ ws_insert ทิ้งภายหลัง', () => {
    expect(/drop\s+policy[^;]*ws_insert/i.test(joined)).toBe(false);
  });

  it('policy INSERT ของ workspaces ต้องแคบ — สร้างได้เฉพาะของที่ตัวเองเป็นเจ้าของ', () => {
    const m = joined.match(/create\s+policy\s+ws_insert\s+on\s+public\.workspaces[\s\S]{0,300}/i);
    expect(m).toBeTruthy();
    expect(m![0]).toMatch(/owner_id\s*=\s*\(?\s*select\s+auth\.uid\(\)/i);
  });
});

describe('RLS — helper ที่ใช้ใน policy ห้ามวนเรียกตัวเอง', () => {
  /** ฟังก์ชันที่ถูกอ้างใน policy ของตารางที่ตัวมันเอง query อยู่ → ต้องเป็น SECURITY DEFINER */
  const HELPERS = ['is_member', 'is_app_admin'] as const;

  it.each(HELPERS)('%s ต้องถูกประกาศเป็น SECURITY DEFINER ในนิยามล่าสุด', (fn) => {
    const files = allSql().filter((f) =>
      new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${fn}\\b`, 'i').test(f.sql));
    expect(files.length, `ไม่พบนิยามของ ${fn} ใน migrations`).toBeGreaterThan(0);
    const latest = files[files.length - 1];
    const body = latest.sql.match(
      new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${fn}\\b[\\s\\S]*?\\$\\$`, 'i'))![0];
    expect(body.toLowerCase(), `${latest.file}: ${fn} เป็น SECURITY INVOKER → policy จะวนเรียกตัวเอง (54001)`)
      .toContain('security definer');
  });

  it.each(HELPERS)('%s ต้องปักหมุด search_path (กันโดนสลับ schema)', (fn) => {
    const files = allSql().filter((f) =>
      new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${fn}\\b`, 'i').test(f.sql));
    const latest = files[files.length - 1];
    const body = latest.sql.match(
      new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${fn}\\b[\\s\\S]*?\\$\\$`, 'i'))![0];
    expect(body.toLowerCase()).toMatch(/set\s+search_path/);
  });

  it('SECURITY DEFINER ที่เพิ่มเข้ามา ต้องไม่เปิดให้ anon', () => {
    const m = joined.match(/revoke\s+all\s+on\s+function\s+public\.is_member[^;]*;/i);
    expect(m, 'ต้อง revoke is_member จาก anon').toBeTruthy();
    expect(m![0].toLowerCase()).toContain('anon');
  });
});
