import { describe, it, expect } from 'vitest';
import { scrollPct, crossedMilestones, createRageDetector } from '../funnelTrace';

describe('scrollPct', () => {
  it('คำนวณ % ปกติ', () => {
    expect(scrollPct(0, 2000, 1000)).toBe(0);
    expect(scrollPct(500, 2000, 1000)).toBe(50);
    expect(scrollPct(1000, 2000, 1000)).toBe(100);
  });
  it('หน้าสั้นกว่าจอ → 100 (เห็นครบ)', () => {
    expect(scrollPct(0, 800, 1000)).toBe(100);
  });
  it('clamp + กัน NaN', () => {
    expect(scrollPct(9999, 2000, 1000)).toBe(100);
    expect(scrollPct(-50, 2000, 1000)).toBe(0);
    expect(scrollPct(NaN, 2000, 1000)).toBe(0);
  });
});

describe('crossedMilestones', () => {
  it('คืนเฉพาะ milestone ที่เพิ่งข้าม (> prevMax และ ≤ pct)', () => {
    expect(crossedMilestones(0, 60, [25, 50, 75, 90])).toEqual([25, 50]);
    expect(crossedMilestones(50, 60, [25, 50, 75, 90])).toEqual([]);
    expect(crossedMilestones(50, 95, [25, 50, 75, 90])).toEqual([75, 90]);
  });
  it('ยังไม่ถึง milestone → ว่าง', () => {
    expect(crossedMilestones(0, 10, [25, 50])).toEqual([]);
  });
});

describe('createRageDetector', () => {
  it('คลิกถี่ถึงเกณฑ์ → true แล้วรีเซ็ต', () => {
    const d = createRageDetector(1000, 3);
    expect(d.push(0)).toBe(false);
    expect(d.push(200)).toBe(false);
    expect(d.push(400)).toBe(true);   // 3 คลิกใน 1 วิ
    expect(d.push(600)).toBe(false);  // รีเซ็ตแล้ว เริ่มนับใหม่
  });
  it('คลิกห่างเกินหน้าต่างเวลา → ไม่ rage', () => {
    const d = createRageDetector(1000, 3);
    expect(d.push(0)).toBe(false);
    expect(d.push(2000)).toBe(false);
    expect(d.push(4000)).toBe(false);
  });
});
