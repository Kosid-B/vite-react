import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bumpStreak, streakCount } from '../streak';
import { DEFAULT_DATA } from '../../data';
import type { AppData } from '../../types';

/* streak = แรงจูงใจกลับมาใช้ต่อรายวัน — ตรรกะวันติดกัน/ขาดวันต้องเป๊ะ (ผูก reward/gamification) */

const withStreak = (s?: { count: number; lastDay: string }): AppData =>
  ({ ...DEFAULT_DATA, streak: s });

describe('streak — ต่อเนื่องรายวัน', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-07-08T10:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('ยังไม่เคยมี streak → เริ่มนับ 1 วันนี้', () => {
    const d = bumpStreak(withStreak(undefined));
    expect(d.streak).toEqual({ count: 1, lastDay: '2026-07-08' });
  });

  it('ล่าสุด = เมื่อวาน → ต่อเนื่อง +1', () => {
    const d = bumpStreak(withStreak({ count: 4, lastDay: '2026-07-07' }));
    expect(d.streak).toEqual({ count: 5, lastDay: '2026-07-08' });
  });

  it('ล่าสุด = วันนี้แล้ว → idempotent (คืน object เดิม ไม่ ++)', () => {
    const input = withStreak({ count: 3, lastDay: '2026-07-08' });
    expect(bumpStreak(input)).toBe(input);
  });

  it('ขาดวัน (ล่าสุด 3 วันก่อน) → รีเซ็ตเป็น 1', () => {
    const d = bumpStreak(withStreak({ count: 9, lastDay: '2026-07-05' }));
    expect(d.streak).toEqual({ count: 1, lastDay: '2026-07-08' });
  });

  it('streakCount: วันนี้/เมื่อวานยังนับ, เก่ากว่านั้น = 0', () => {
    expect(streakCount(withStreak({ count: 6, lastDay: '2026-07-08' }))).toBe(6);
    expect(streakCount(withStreak({ count: 6, lastDay: '2026-07-07' }))).toBe(6);
    expect(streakCount(withStreak({ count: 6, lastDay: '2026-07-01' }))).toBe(0);
    expect(streakCount(withStreak(undefined))).toBe(0);
  });
});
