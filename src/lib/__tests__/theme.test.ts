import { describe, it, expect } from 'vitest';
import { normalizeTheme, nextTheme, themeLabel, themeIcon, THEMES } from '../theme';

describe('theme (pure)', () => {
  it('normalizeTheme: รับค่าแปลก → dark, minimal → minimal', () => {
    expect(normalizeTheme('minimal')).toBe('minimal');
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme(null)).toBe('dark');
    expect(normalizeTheme('xxx')).toBe('dark');
  });

  it('nextTheme สลับไปมา', () => {
    expect(nextTheme('dark')).toBe('minimal');
    expect(nextTheme('minimal')).toBe('dark');
  });

  it('label/icon ครบทั้งสองธีม', () => {
    expect(themeLabel('dark')).toBe('เข้ม');
    expect(themeLabel('minimal')).toBe('มินิมอล');
    expect(themeIcon('minimal')).toBe('☀️');
    expect(THEMES).toHaveLength(2);
  });
});
