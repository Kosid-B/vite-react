import { describe, it, expect } from 'vitest';
import { isLight, LIGHT } from '../landingTheme';

describe('landingTheme', () => {
  it('isLight แยกธีมถูก', () => {
    expect(isLight('minimal')).toBe(true);
    expect(isLight('dark')).toBe(false);
  });

  it('LIGHT palette มีโทเคนหลักครบ + เป็นค่าสี', () => {
    for (const k of ['page', 'panel', 'card', 'border', 'ink', 'slate', 'cyan', 'amber'] as const) {
      expect(LIGHT[k]).toMatch(/^#[0-9a-f]{3,8}$/i);
    }
  });
});
