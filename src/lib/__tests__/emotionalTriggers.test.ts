import { describe, it, expect } from 'vitest';
import { detectEmotionalMoment } from '../emotionalTriggers';
import { DEFAULT_DATA } from '../../data';
import type { AppData } from '../../types';

const clone = (): AppData => structuredClone(DEFAULT_DATA);

describe('detectEmotionalMoment', () => {
  it('ไม่มีการเปลี่ยนแปลง → null', () => {
    expect(detectEmotionalMoment(DEFAULT_DATA, DEFAULT_DATA)).toBeNull();
  });

  it('จ้างเอเจนต์ตัวแรก (0 → 1) → ฉลอง (badge First Hire, triumph)', () => {
    const prev = clone(); prev.aiCompany.agents = [];
    const next = clone(); // มีเอเจนต์อยู่แล้วใน DEFAULT_DATA
    const m = detectEmotionalMoment(prev, next);
    expect(m).not.toBeNull();
    expect(m!.tone).toBe('triumph');
    expect(m!.id).toContain('first-hire');
  });

  it('streak แตะหมุด 3 วัน → ให้กำลังใจ (encourage)', () => {
    const prev = clone(); prev.streak = { count: 2, lastDay: '2026-07-04' };
    const next = clone(); next.streak = { count: 3, lastDay: '2026-07-05' };
    const m = detectEmotionalMoment(prev, next);
    expect(m).not.toBeNull();
    expect(m!.id).toBe('streak-3');
    expect(m!.tone).toBe('encourage');
  });

  it('streak เพิ่มแต่ไม่ถึงหมุด (4 → 5) → null', () => {
    const prev = clone(); prev.streak = { count: 4, lastDay: '2026-07-04' };
    const next = clone(); next.streak = { count: 5, lastDay: '2026-07-05' };
    expect(detectEmotionalMoment(prev, next)).toBeNull();
  });
});
