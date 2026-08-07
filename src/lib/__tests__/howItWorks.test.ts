import { describe, it, expect } from 'vitest';
import { HOW_STEPS, STEP_MS, HOW_TOTAL_MS, stepIndexAt } from '../howItWorks';

describe('howItWorks', () => {
  it('รวม 30 วินาที (6 สเต็ป × 5 วิ)', () => {
    expect(HOW_STEPS.length).toBe(6);
    expect(HOW_TOTAL_MS).toBe(30000);
    expect(STEP_MS).toBe(5000);
  });

  it('ทุกสเต็ปมี icon/title/caption + id ไม่ซ้ำ', () => {
    HOW_STEPS.forEach(s => {
      expect(s.icon.length).toBeGreaterThan(0);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.caption.length).toBeGreaterThan(0);
    });
    expect(new Set(HOW_STEPS.map(s => s.id)).size).toBe(HOW_STEPS.length);
  });

  it('stepIndexAt แม็พเวลา → index (วนซ้ำ)', () => {
    expect(stepIndexAt(0)).toBe(0);
    expect(stepIndexAt(4999)).toBe(0);
    expect(stepIndexAt(5000)).toBe(1);
    expect(stepIndexAt(29999)).toBe(5);
    expect(stepIndexAt(30000)).toBe(0);   // วนกลับ
    expect(stepIndexAt(35000)).toBe(1);
  });
});
