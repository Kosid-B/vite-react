import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REACH_FLOOR_PER_WEEK, MIN_FOR_RATE } from '../growthPdca';

/* ══════════════════════════════════════════════════════════════════════
 * skill `case-study-stage-fit` อ้าง "เส้นแบ่งเฟส" เป็นตัวเลข
 * ถ้าค่าคงที่ในโค้ดเปลี่ยนแล้ว skill ไม่เปลี่ยนตาม → skill กลายเป็น
 * "เอกสารที่จริงเมื่อวาน" ซึ่งอันตรายกว่าไม่มีเอกสาร เพราะคนอ่านแล้วเชื่อ
 *
 * เทสต์นี้ผูก skill เข้ากับค่าคงที่จริงใน growthPdca.ts
 * (รูปแบบเดียวกับ deployToolchain.test.ts ที่ผูกเวอร์ชันเครื่องมือ dev↔CI)
 * ══════════════════════════════════════════════════════════════════════ */

const SKILL = resolve(__dirname, '../../../.claude/skills/case-study-stage-fit/SKILL.md');
const text = readFileSync(SKILL, 'utf8').replace(/\r\n/g, '\n');

describe('skill case-study-stage-fit ต้องไม่หลุดจากค่าคงที่จริงในโค้ด', () => {
  it('อ่านไฟล์ skill เจอจริง (กันเทสต์ผ่านเพราะไฟล์หาย)', () => {
    expect(text.length).toBeGreaterThan(2000);
  });

  it('เส้นแบ่ง "ไม่มีคนมา" ตรงกับ REACH_FLOOR_PER_WEEK', () => {
    expect(text).toContain('REACH_FLOOR_PER_WEEK');
    expect(text, `skill ต้องระบุตัวเลข ${REACH_FLOOR_PER_WEEK} ให้ตรงกับโค้ด`)
      .toContain(`(${REACH_FLOOR_PER_WEEK})`);
  });

  it('เส้นแบ่ง "อ่านอัตราส่วนได้หรือยัง" ตรงกับ MIN_FOR_RATE', () => {
    expect(text).toContain('MIN_FOR_RATE');
    expect(text, `skill ต้องระบุตัวเลข ${MIN_FOR_RATE} ให้ตรงกับโค้ด`)
      .toContain(`(${MIN_FOR_RATE})`);
  });

  it('ยังคงข้อห้ามหลัก: ห้ามลอก "ไม่ต้องยิงแอด"', () => {
    // ข้อนี้คือข้อที่ทำให้เจ๊งเร็วที่สุดถ้าเชื่อ — ถ้าใครลบออกจาก skill ต้องรู้ตัว
    expect(text).toContain('ไม่ต้องยิงแอด');
    expect(text).toMatch(/ห้ามลอก/);
  });

  it('ยังคงเส้นแบ่งจริยธรรมของ lock-in: "ย้ายแล้วเสียดาย" ไม่ใช่ "ย้ายไม่ได้"', () => {
    expect(text).toContain('ย้ายแล้วเสียดาย');
    expect(text).toContain('ย้ายไม่ได้');
  });

  it('ตัวเลขจากคลิปต้องติดป้าย 🟡 (ยังไม่ได้ตรวจ) ตามกฎสูงสุดของโปรเจกต์', () => {
    expect(text).toContain('🟡');
    expect(text).toMatch(/ยังไม่ได้ตรวจ|ยังไม่ได้เปิดแหล่งตรวจ/);
  });
});
