import { describe, it, expect } from 'vitest';
import { readableOn, contrastRatio, SURFACE_DARK, SURFACE_DARKEST, SURFACE_LIGHT, AA_NORMAL } from '../readableColor';

/* บั๊กจริง 22 ส.ค. 2569 — สีจากข้อมูลถูกใส่ผ่าน inline style
 * ⇒ CSS override เอาชนะไม่ได้ · วัดได้ contrast 1.01 (เกือบดำบนกรมท่า) */
describe('readableColor', () => {
  it('สีที่ผ่านเกณฑ์อยู่แล้ว ต้องคืนค่าเดิมไม่แตะ', () => {
    expect(readableOn('#ffffff', SURFACE_DARK)).toBe('#ffffff');
  });

  it('🔴 เคสจริงที่วัดได้ 1.01 — เกือบดำบนกรมท่า ต้องถูกแก้ให้อ่านออก', () => {
    const fixed = readableOn('#1c1814', SURFACE_DARK);
    expect(contrastRatio(fixed, SURFACE_DARK)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('ทุกสีในพาเลตต์ที่ลองแล้ว ต้องอ่านออกบนพื้นเข้มทั้งสองระดับ', () => {
    const palette = ['#1c1814', '#374151', '#0f172a', '#22c55e', '#3b5bdb', '#10b981', '#c44b2b', '#1a4f8a'];
    for (const surface of [SURFACE_DARK, SURFACE_DARKEST]) {
      for (const c of palette) {
        expect(contrastRatio(readableOn(c, surface), surface),
          `${c} บน ${surface}`).toBeGreaterThanOrEqual(AA_NORMAL);
      }
    }
  });

  it('บนพื้นสว่างต้องทำให้เข้มลง ไม่ใช่สว่างขึ้น', () => {
    const fixed = readableOn('#a5f3fc', SURFACE_LIGHT);
    expect(contrastRatio(fixed, SURFACE_LIGHT)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('คงเฉดสีเดิม — เขียวต้องยังเป็นเขียว ไม่กลายเป็นดำ/ขาว', () => {
    const fixed = readableOn('#22c55e', SURFACE_LIGHT);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(fixed.slice(i, i + 2), 16));
    expect(g, `${fixed} ควรยังเขียวเด่น`).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });

  it('ค่าที่ไม่ใช่ hex ต้องปล่อยผ่าน ไม่เดา', () => {
    expect(readableOn('var(--ink)', SURFACE_DARK)).toBe('var(--ink)');
    expect(readableOn('rgba(0,0,0,.5)', SURFACE_DARK)).toBe('rgba(0,0,0,.5)');
  });

  it('ไม่มีสีจากข้อมูล → คืน inherit ไม่เดาสี', () => {
    expect(readableOn(undefined)).toBe('inherit');
    expect(readableOn(null)).toBe('inherit');
    expect(readableOn('')).toBe('inherit');
  });

  it('contrastRatio ตรงกับค่าที่รู้แน่ ๆ', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#0f172a', '#0f172a')).toBeCloseTo(1, 3);
  });
});
