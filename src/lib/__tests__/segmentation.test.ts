import { describe, it, expect } from 'vitest';
import { weekTag, shouldRunWeekly, segmentationInstruction } from '../segmentation';
import { DEFAULT_DATA } from '../../data';
import type { AppData } from '../../types';

/* CMO วิเคราะห์ตลาดรายสัปดาห์ — gate ด้วย ISO week + วันศุกร์ (ต้องรันสัปดาห์ละครั้ง ไม่ซ้ำ) */

describe('weekTag — ISO week', () => {
  it('คืนรูปแบบ YYYY-Www + ค่าที่รู้ผลแน่นอน', () => {
    expect(weekTag(new Date(2026, 0, 1))).toBe('2026-W01');   // 1 ม.ค. 2026 = พฤหัส → W01
    expect(weekTag(new Date(2026, 0, 5))).toBe('2026-W02');   // 5 ม.ค. 2026 = จันทร์ → W02
    expect(weekTag(new Date(2026, 0, 8))).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('วันในสัปดาห์ ISO เดียวกัน → tag เดียวกัน', () => {
    expect(weekTag(new Date(2026, 0, 5))).toBe(weekTag(new Date(2026, 0, 7))); // จันทร์–พุธ สัปดาห์เดียว
  });
});

describe('shouldRunWeekly', () => {
  const friday = new Date(2026, 0, 2);      // 2 ม.ค. 2026 = ศุกร์
  const wednesday = new Date(2026, 0, 7);   // พุธ

  it('ศุกร์ + ยังไม่ได้ทำสัปดาห์นี้ → true', () => {
    expect(shouldRunWeekly(DEFAULT_DATA, friday)).toBe(true);
  });

  it('ทำสัปดาห์นี้ไปแล้ว → false', () => {
    const done: AppData = { ...DEFAULT_DATA, cmoMarket: { analysis: '', webUsed: false, updatedAt: '', weekTag: weekTag(friday) } };
    expect(shouldRunWeekly(done, friday)).toBe(false);
  });

  it('ยังไม่ถึงศุกร์ (วันพุธ) → false', () => {
    expect(shouldRunWeekly(DEFAULT_DATA, wednesday)).toBe(false);
  });
});

describe('segmentationInstruction', () => {
  it('ใส่ชื่อบริษัท + คำสั่ง segmentation ครบหัวข้อหลัก', () => {
    const d: AppData = { ...DEFAULT_DATA, aiCompany: { ...DEFAULT_DATA.aiCompany, name: 'บริษัททดสอบ', industry: 'ค้าปลีก' } };
    const txt = segmentationInstruction(d);
    expect(txt).toContain('บริษัททดสอบ');
    expect(txt).toContain('Segmentation');
    expect(txt).toMatch(/CLV|LTV/);
  });
});
