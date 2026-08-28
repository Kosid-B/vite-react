import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SEARCH_CATEGORY } from '../brandEntity';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 บั๊กจริงที่เทสต์ชุดนี้กัน (เจ้าของส่งภาพอีเมลมา 28 ส.ค. 2569):
 *   รายงานขึ้น "งานที่ทีม AI ทำเสร็จสัปดาห์นี้ 0 งาน" ทั้งที่มี 27 เรื่องรออนุมัติ
 *   สาเหตุ: นับ "สัปดาห์นี้" จาก `executedAt` (เวลาที่ AI ลงมือ)
 *           แต่เงื่อนไขที่นับคือ status === 'done' (เวลาที่ **คน** อนุมัติ)
 *   ⇒ งานที่รออนุมัตินานเกิน 7 วัน จะไม่ถูกนับในสัปดาห์ไหนเลย **ตลอดกาล**
 *      (ยังอยู่ review = ไม่นับ · พออนุมัติแล้ว executedAt ก็เก่าเกิน 7 วันไปแล้ว)
 *
 * เทสต์อ่าน **ไฟล์ตัวจริง** ไม่ใช่สำเนา — เพราะ Edge Function เป็น Deno
 * import เข้ามารันตรง ๆ ไม่ได้ (รูปแบบเดียวกับ checkupReportDrift.test.ts)
 * ══════════════════════════════════════════════════════════════════════════ */

const FN = readFileSync(join(process.cwd(), 'supabase/functions/weekly-report/index.ts'), 'utf8');
const TYPES = readFileSync(join(process.cwd(), 'src/types.ts'), 'utf8');
const AICOMPANY = readFileSync(join(process.cwd(), 'src/pages/AICompany.tsx'), 'utf8');

/** บรรทัดที่คำนวณ tasksDoneWeek (รวมบล็อกจนถึงปีกกาปิด) */
const doneWeekBlock = /tasksDoneWeek:[\s\S]*?\n {4}\}\)\.length,/.exec(FN)?.[0] ?? '';

describe('รายงานรายสัปดาห์ — "เสร็จ" ต้องนับจากเวลาที่เสร็จจริง', () => {
  it('มีช่องเวลาที่บอร์ดอนุมัติ (doneAt) แยกจากเวลาที่ AI ลงมือ (executedAt)', () => {
    expect(TYPES).toMatch(/doneAt\?: string;/);
    expect(TYPES).toMatch(/executedAt\?: string;/);
  });

  it('🔴 tasksDoneWeek ต้องนับจาก doneAt — ไม่ใช่ executedAt เพียว ๆ', () => {
    expect(doneWeekBlock).not.toBe('');
    expect(doneWeekBlock).toMatch(/doneAt/);
    // fallback ไป executedAt ได้เฉพาะกรณีไม่มี doneAt (ข้อมูลเก่า) — ต้องเขียนเป็น ?? เท่านั้น
    expect(doneWeekBlock).toMatch(/doneAt\s*\?\?\s*t\.executedAt/);
  });

  it('ตอนอนุมัติงาน ต้องประทับเวลา doneAt จริง (ทั้งอนุมัติเดี่ยวและอนุมัติรวด)', () => {
    const stamps = AICOMPANY.match(/status: 'done' as const[^}]*doneAt/g) ?? [];
    expect(stamps.length).toBe(2); // ปุ่มอนุมัติทีละงาน + ปุ่มอนุมัติทั้งหมด
    // ห้ามมีทางไหนที่เปลี่ยนเป็น done โดยไม่ประทับเวลา
    const unstamped = AICOMPANY.match(/status: 'done' as const \}/g) ?? [];
    expect(unstamped).toEqual([]);
  });
});

describe('รายงานรายสัปดาห์ — ต้องบอกว่า "อะไร" รออยู่ ไม่ใช่แค่ "กี่เรื่อง"', () => {
  it('ส่งชื่อเรื่องที่รออนุมัติมาด้วย ไม่ใช่แค่ตัวนับ', () => {
    expect(FN).toMatch(/approvalTop/);
    expect(FN).toMatch(/pending\.slice\(0, 3\)/);
  });

  it('บอกด้วยว่าค้างนานสุดกี่วัน — null = ตรวจไม่ได้ ห้ามเป็น 0', () => {
    expect(FN).toMatch(/oldestWaitDays/);
    expect(FN).toMatch(/oldestWaitDays: number \| null/);
    // ต้องมีการเช็ก !== null ก่อนเอาไปแสดง (ไม่ใช่ปล่อยให้ 0 กับ null ปนกัน)
    expect(FN).toMatch(/oldestWaitDays !== null/);
  });

  it('แยก "AI ลงมือทำ" ออกจาก "ส่งมอบแล้ว" — ตัวเลขสองความหมายห้ามยุบเป็นตัวเดียว', () => {
    expect(FN).toMatch(/tasksActedWeek/);
  });
});

describe('รายงานรายสัปดาห์ — ความปลอดภัยและสารแบรนด์', () => {
  it('ชื่อเรื่องที่ผู้ใช้พิมพ์เอง ต้องถูก escape ก่อนยัดลง HTML ของอีเมล', () => {
    expect(FN).toMatch(/function esc\(/);
    expect(FN).toMatch(/esc\(a\.title\)/);
    expect(FN).toMatch(/esc\(a\.impact\)/);
  });

  it('ท้ายอีเมลต้องใช้สารเดียวกับที่ประกาศให้เครื่องอ่าน — ห้ามเป็นสารเก่าที่ยกเลิกแล้ว', () => {
    expect(FN).toContain(SEARCH_CATEGORY);
    // "แพลตฟอร์มสร้างบริษัท AI อัตโนมัติ" = หนึ่งใน 4 คำอธิบายที่ขัดกันเอง (brandEntity)
    expect(FN).not.toMatch(/สร้างบริษัท AI อัตโนมัติ/);
  });
});
