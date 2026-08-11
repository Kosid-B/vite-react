import { describe, it, expect } from 'vitest';
import { replaySampleRate } from '../amplitude';

describe('replaySampleRate', () => {
  it('ค่าปกติ 0..1 ผ่านตรง', () => {
    expect(replaySampleRate('1')).toBe(1);
    expect(replaySampleRate('0')).toBe(0);
    expect(replaySampleRate('0.3')).toBe(0.3);
  });
  it('ไม่มีค่า/พาร์สไม่ได้ → 1 (อัดทุกเซสชัน)', () => {
    expect(replaySampleRate(undefined)).toBe(1);
    expect(replaySampleRate('abc')).toBe(1);
    expect(replaySampleRate('')).toBe(1);
  });
  it('clamp เกินช่วง', () => {
    expect(replaySampleRate('2')).toBe(1);
    expect(replaySampleRate('-0.5')).toBe(0);
  });
});
