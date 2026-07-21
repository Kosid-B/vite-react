import { describe, it, expect } from 'vitest';
import { challengerIndex, CHALLENGER_HEADLINES } from '../challengerRotation';

/** สร้าง epoch ms จากเวลาไทย (UTC+7) ที่กำหนด */
function thTime(y: number, m: number, d: number, h: number): number {
  // Date.UTC ให้เวลา UTC → ลบ 7 ชม. เพื่อให้เวลาไทยตรงกับ h
  return Date.UTC(y, m - 1, d, h - 7, 0, 0);
}

describe('challengerRotation', () => {
  it('มี 4 headline', () => {
    expect(CHALLENGER_HEADLINES).toHaveLength(4);
  });

  it('สลับเฉพาะที่ 11:00 และ 20:00 (ไม่เปลี่ยนช่วง 11:00–19:59)', () => {
    const a = challengerIndex(thTime(2026, 7, 20, 11));
    const b = challengerIndex(thTime(2026, 7, 20, 15));
    const c = challengerIndex(thTime(2026, 7, 20, 19));
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('เปลี่ยนค่าเมื่อข้าม 11:00 และ 20:00', () => {
    const morning = challengerIndex(thTime(2026, 7, 20, 10)); // ก่อน 11:00
    const day = challengerIndex(thTime(2026, 7, 20, 12));     // หลัง 11:00
    const evening = challengerIndex(thTime(2026, 7, 20, 21)); // หลัง 20:00
    expect(day).not.toBe(morning);
    expect(evening).not.toBe(day);
  });

  it('ไม่เปลี่ยนตอนข้ามเที่ยงคืน (ต่อเนื่องจาก 20:00 → 10:59)', () => {
    const evening = challengerIndex(thTime(2026, 7, 20, 21)); // 20:00–23:59
    const afterMidnight = challengerIndex(thTime(2026, 7, 21, 2)); // 00:00–10:59 วันถัดไป
    expect(afterMidnight).toBe(evening);
  });

  it('วนครบทั้ง 4 headline ภายใน 2 วัน (ทุก slot)', () => {
    const seen = new Set<number>();
    seen.add(challengerIndex(thTime(2026, 7, 20, 12))); // วัน0 กลางวัน
    seen.add(challengerIndex(thTime(2026, 7, 20, 21))); // วัน0 ค่ำ
    seen.add(challengerIndex(thTime(2026, 7, 21, 12))); // วัน1 กลางวัน
    seen.add(challengerIndex(thTime(2026, 7, 21, 21))); // วัน1 ค่ำ
    expect(seen.size).toBe(4);
  });

  it('คืน index ในช่วง 0..3 เสมอ', () => {
    for (let h = 0; h < 24; h++) {
      const i = challengerIndex(thTime(2026, 7, 20, h));
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(4);
    }
  });
});
