import { describe, it, expect } from 'vitest';
import { baht } from '../utils';

/* baht ต้องทน input ไม่ครบ (undefined/NaN) โดยไม่ throw — data จริงอาจ field หาย
 * (เดิม undefined.toLocaleString() โยน TypeError ทำหน้าเพจล่ม) */

describe('baht — ทน input ผิดปกติ', () => {
  it('ค่าเลขปกติ = format ถูก', () => {
    expect(baht(1000)).toBe('฿1,000');
    expect(baht(0)).toBe('฿0');
  });

  it('undefined/null → ฿0 (ไม่ throw)', () => {
    expect(() => baht(undefined as unknown as number)).not.toThrow();
    expect(baht(undefined as unknown as number)).toBe('฿0');
    expect(baht(null as unknown as number)).toBe('฿0');
  });

  it('NaN/Infinity → ฿0 (ไม่ throw)', () => {
    expect(baht(NaN)).toBe('฿0');
    expect(baht(Infinity)).toBe('฿0');
  });
});
