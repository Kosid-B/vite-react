import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════
 * ด่านชื่อไฟล์ migration — ADR-0017
 *
 * 🔴 ความผิดที่กัน (ledger #108 · #110 · #111 — สามครั้งในวันเดียว 26 พ.ย. 2569):
 *    สองเซสชันเขียน production เดียวกันได้ทั้งคู่ และ **ทั้งคู่ตั้งเลข migration
 *    จากรายการไฟล์ในรีโป** ซึ่งเก่าทันทีที่อีกฝ่าย apply โดยยังไม่ commit
 *    ⇒ วัดสดบน production 26 พ.ย. 69: เลขชนกัน **3 เลข (0071 · 0072 · 0075) · 6 migration**
 *
 * 🔑 รากคือ **"ตัวจัดเลข" กับ "ตัวบันทึก" อยู่คนละที่** — เลขถูกจองตอน apply
 *    แต่ถูกบันทึกตอน commit ⇒ ไม่มีใครล็อกช่วงระหว่างนั้นได้
 *    ⇒ ทางปิดที่ไม่ต้องขอความร่วมมือจากใคร: **เลิกมี "เลขถัดไป"** ใช้ timestamp UTC
 *      ตอนสร้างไฟล์ — สองเซสชันห่างกัน 15 นาที ชนกันไม่ได้โดยโครงสร้าง
 *
 * ⚠️ ของเก่า 0001–0077 **ไม่แตะ** (เปลี่ยนชื่อย้อนหลัง = ทุบการอ้างอิงในเทสต์/เอกสาร
 *    และไม่ได้กันอะไรเพิ่ม เพราะของที่ชนแล้วก็ชนไปแล้ว)
 * ══════════════════════════════════════════════════════════════════════ */

const DIR = resolve(__dirname, '../../../supabase/migrations');

/** 🔒 เส้นแบ่งกติกา — ไฟล์ 4 หลักที่เลขเกินค่านี้ = ตั้งชื่อแบบเก่าหลังเปลี่ยนกติกา */
export const LEGACY_LAST = 77;

const LEGACY = /^(\d{4})_[a-z0-9_]+\.sql$/;
const STAMPED = /^(\d{14})_[a-z0-9_]+\.sql$/;

/** timestamp ต้องอ่านเป็นเวลาจริงได้ — กัน `99999999999999_x.sql` ที่เข้ารูปแต่ไม่มีความหมาย */
const readsAsUtcTime = (v: string): boolean => {
  const [y, mo, d, h, mi, s] = [
    +v.slice(0, 4), +v.slice(4, 6), +v.slice(6, 8),
    +v.slice(8, 10), +v.slice(10, 12), +v.slice(12, 14),
  ];
  if (y < 2026 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  if (h > 23 || mi > 59 || s > 59) return false;
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
};

/** ตัวตรวจจริง — pure เพื่อยิงเคสสังเคราะห์ได้ (ด่านที่ตรวจแต่ของจริง พิสูจน์ไม่ได้ว่ามันจับผิดเป็น) */
export function migrationNameIssues(names: string[]): string[] {
  const out: string[] = [];
  const seen = new Map<string, string>();
  for (const n of names) {
    const legacy = LEGACY.exec(n);
    const stamped = STAMPED.exec(n);
    if (!legacy && !stamped) {
      out.push(`${n}: ชื่อไม่เข้ารูป — ต้องเป็น <YYYYMMDDHHMMSS>_<ชื่อ_พิมพ์เล็ก>.sql`);
      continue;
    }
    const key = (legacy ?? stamped)![1];
    if (legacy && Number(key) > LEGACY_LAST) {
      out.push(`${n}: ตั้งเลขลำดับ 4 หลักหลังเปลี่ยนกติกา (ADR-0017) — ของใหม่ต้องใช้ timestamp UTC`);
    }
    if (stamped && !readsAsUtcTime(key)) {
      out.push(`${n}: ${key} อ่านเป็นเวลา UTC จริงไม่ได้`);
    }
    const prev = seen.get(key);
    if (prev) out.push(`${n}: เลข ${key} ซ้ำกับ ${prev}`);
    else seen.set(key, n);
  }
  return out;
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();

describe('ชื่อไฟล์ migration — ห้ามมี "เลขถัดไป" ให้สองเซสชันแย่งกันจอง (ADR-0017)', () => {
  it('เจอไฟล์จริง (กันผ่านเพราะโฟลเดอร์ว่าง/อ่านผิดที่)', () => {
    expect(files.length).toBeGreaterThanOrEqual(LEGACY_LAST);
  });

  it('🔴 ไฟล์ทุกตัวในรีโปผ่านด่าน', () => {
    expect(migrationNameIssues(files)).toEqual([]);
  });

  it('ของเก่า 0001–0077 ยังอยู่ครบ — ไม่ได้เปลี่ยนชื่อย้อนหลัง', () => {
    const legacy = files.filter((f) => LEGACY.test(f));
    expect(legacy.length).toBe(LEGACY_LAST);
    expect(Math.max(...legacy.map((f) => Number(f.slice(0, 4))))).toBe(LEGACY_LAST);
  });

  /* ── พิสูจน์ว่าตัวตรวจจับผิดเป็น (ไม่ใช่ฟังก์ชันที่คืน [] ตลอด) ───────── */
  it.each([
    ['0078_something_new.sql', /ตั้งเลขลำดับ 4 หลัก/],
    ['0100_later.sql', /ตั้งเลขลำดับ 4 หลัก/],
    ['20261399104500_bad_month.sql', /อ่านเป็นเวลา UTC จริงไม่ได้/],
    ['20260231104500_feb_31.sql', /อ่านเป็นเวลา UTC จริงไม่ได้/],
    ['20261126999999_bad_clock.sql', /อ่านเป็นเวลา UTC จริงไม่ได้/],
    ['0078-dashes-not-underscore.sql', /ชื่อไม่เข้ารูป/],
    ['20261126104500_Mixed_Case.sql', /ชื่อไม่เข้ารูป/],
    ['add_table.sql', /ชื่อไม่เข้ารูป/],
  ])('🔒 จับได้: %s', (name, re) => {
    const issues = migrationNameIssues([name]);
    expect(issues.length, `ควรจับ ${name} ได้`).toBeGreaterThan(0);
    expect(issues.join(' | ')).toMatch(re);
  });

  it('🔒 จับเลขซ้ำได้ทั้งสองรูปแบบ (นี่คือความผิดตัวจริงของ ledger #110/#111)', () => {
    expect(migrationNameIssues(['0075_a.sql', '0075_b.sql']).join(' | ')).toMatch(/ซ้ำกับ/);
    expect(
      migrationNameIssues(['20261126104500_a.sql', '20261126104500_b.sql']).join(' | '),
    ).toMatch(/ซ้ำกับ/);
  });

  it('🟢 ชื่อแบบใหม่ที่ถูกต้องต้องผ่าน (ด่านที่ปฏิเสธทุกอย่าง = ด่านที่ใช้ไม่ได้)', () => {
    expect(migrationNameIssues(['20261126104500_marketing_os_pen.sql'])).toEqual([]);
    expect(migrationNameIssues(['20270101000000_new_year.sql'])).toEqual([]);
  });

  it('🔴 สองเซสชันที่ต่างกัน 15 นาที ชนกันไม่ได้โดยโครงสร้าง (เหตุผลทั้งหมดของ ADR-0017)', () => {
    // 26 พ.ย. 69 ของจริง: เขา apply 09:30:11 · ผม 09:43:33 — แบบเก่าได้เลข 0075 ทั้งคู่
    const theirs = '20261126093011_member_read_results.sql';
    const mine = '20261126094333_funnel_summary_member_access.sql';
    expect(migrationNameIssues([theirs, mine])).toEqual([]);
    expect(theirs.slice(0, 14)).not.toBe(mine.slice(0, 14));
  });
});
