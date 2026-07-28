import { describe, it, expect } from 'vitest';
import { buildBrandKit } from '../brandKit';

describe('brandKit', () => {
  it('สร้างพาเลต 5 สี + swatches + โลโก้ + คู่ฟอนต์', () => {
    const b = buildBrandKit('Nova Labs', '[G] การค้าปลีก');
    expect(b.palette.primary).toMatch(/^hsl/);
    expect(b.palette.swatches).toHaveLength(5);
    expect(b.fonts.heading.length).toBeGreaterThan(0);
    expect(b.fonts.body.length).toBeGreaterThan(0);
    expect(b.logoSvg.startsWith('<svg')).toBe(true);
    expect(b.monogram).toBe('NL');
    expect(b.guidelines.length).toBeGreaterThanOrEqual(4);
  });

  it('deterministic ต่อชื่อเดียว + ต่างชื่อได้สีต่าง', () => {
    expect(buildBrandKit('A').palette.primary).toBe(buildBrandKit('A').palette.primary);
    expect(buildBrandKit('A').palette.primary).not.toBe(buildBrandKit('Zzzz').palette.primary);
  });

  it('accent = complementary (ต่างจาก primary)', () => {
    const b = buildBrandKit('Verity Group');
    expect(b.palette.accent).not.toBe(b.palette.primary);
  });

  it('ชื่อว่างไม่พัง', () => {
    const b = buildBrandKit('');
    expect(b.palette.swatches).toHaveLength(5);
  });
});
