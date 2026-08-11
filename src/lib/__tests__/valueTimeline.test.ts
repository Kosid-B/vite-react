import { describe, it, expect } from 'vitest';
import { VALUE_TIMELINE, TIMELINE_NOTE } from '../valueTimeline';

describe('valueTimeline', () => {
  it('มี 4 ขั้น (วันที่ 1/3/7/15) ครบฟิลด์', () => {
    expect(VALUE_TIMELINE).toHaveLength(4);
    for (const s of VALUE_TIMELINE) {
      expect(s.day).toMatch(/วันที่ \d+/);
      expect(s.icon.length).toBeGreaterThan(0);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.desc.length).toBeGreaterThan(0);
    }
  });
  it('เรียงวันจากน้อยไปมาก', () => {
    const nums = VALUE_TIMELINE.map((s) => Number(s.day.replace(/\D/g, '')));
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
  });
  it('มีหมายเหตุ (ไม่รับประกันผล)', () => {
    expect(TIMELINE_NOTE).toContain('ไม่ใช่การรับประกัน');
  });
});
