import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { STANDARDS, STANDARD_ORDER } from '../isoStandards';

/* กันชื่อฉบับมาตรฐาน "ดริฟต์" ระหว่างหน้าเว็บกับอีเมลรายงาน
 *
 * เคยเกิดจริง: อัปเดต ISO 14001 เป็น :2026 ในเว็บแล้ว แต่ Edge Function
 * ยังส่งอีเมลว่า :2015 → ผู้อ่านที่เป็นคนทำระบบจับได้ทันที และเสียความน่าเชื่อถือ
 * ทั้งที่เนื้อหาที่เหลือถูกหมด
 *
 * เทสต์นี้อ่านไฟล์ Edge Function เป็นข้อความ (import ข้าม runtime ไม่ได้ — เป็น Deno)
 * แล้วเทียบ label กับ source of truth ใน isoStandards.ts */
describe('checkup-report — ชื่อฉบับมาตรฐานต้องตรงกับเว็บ', () => {
  const src = readFileSync('supabase/functions/checkup-report/index.ts', 'utf8');

  it('ทุกมาตรฐานใน STANDARDS ต้องมี label ในอีเมล และตรงกับ code', () => {
    for (const id of STANDARD_ORDER) {
      const expected = STANDARDS[id].code;
      const m = src.match(new RegExp(`${id}:\\s*"([^"]+)"`));
      expect(m, `ไม่พบ label ของ ${id} ใน checkup-report`).toBeTruthy();
      expect(m![1], `${id}: เว็บใช้ "${expected}" แต่อีเมลใช้ "${m![1]}"`).toBe(expected);
    }
  });
});
