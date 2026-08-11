import { describe, it, expect } from 'vitest';
import { COMPARE_ROWS, COMPARE_COLS, COMPARE_VERDICT } from '../valueCompare';

describe('valueCompare data', () => {
  it('มีครบ 3 คอลัมน์ · CEO AI = คอลัมน์ของเรา', () => {
    expect(COMPARE_COLS.ours.label).toContain('CEO AI');
    expect(Object.keys(COMPARE_COLS)).toEqual(['diy', 'hire', 'ours']);
  });
  it('ทุกแถวมีค่าครบทั้ง 3 ทางเลือก + aspect/icon', () => {
    expect(COMPARE_ROWS.length).toBeGreaterThanOrEqual(4);
    for (const r of COMPARE_ROWS) {
      expect(r.aspect.length).toBeGreaterThan(0);
      expect(r.icon.length).toBeGreaterThan(0);
      expect(r.diy.length).toBeGreaterThan(0);
      expect(r.hire.length).toBeGreaterThan(0);
      expect(r.ours.length).toBeGreaterThan(0);
    }
  });
  it('มีประโยคสรุปปิดท้าย', () => {
    expect(COMPARE_VERDICT.length).toBeGreaterThan(10);
  });
});
