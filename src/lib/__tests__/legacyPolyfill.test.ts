import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { installLegacyPolyfills } from '../legacyPolyfill';

/** `lib` ของโปรเจกต์เป็น ES2020 ⇒ ชนิดของ `.at()` ยังไม่มี — เรียกผ่านชนิดนี้แทน
 *  (ห้ามยก `lib` เป็น ES2022 เพื่อให้เทสต์ผ่าน — นั่นจะทำให้ tsc **เลิกเตือน**
 *   ตอนมีใครเผลอใช้ `.at()` ในโค้ดจริง ซึ่งคือบั๊กที่เรากำลังแก้อยู่พอดี) */
type HasAt<T> = { at(i: number): T | undefined };

/* 🔴 บั๊กจริงจาก production: `t.entries.at is not a function` (client_errors · 27 ส.ค. 2569)
 *    ผู้ใช้เบราว์เซอร์เก่าเห็น **หน้าขาว** — ไม่ใช่แค่ฟีเจอร์เสีย */

const MAIN = readFileSync(join(process.cwd(), 'src/main.tsx'), 'utf8');

describe('polyfill สำหรับเบราว์เซอร์เก่า', () => {
  it('ทำงานได้ถูกต้องเมื่อ .at() หายไป (จำลองเบราว์เซอร์เก่า)', () => {
    const proto = Array.prototype as unknown as Record<string, unknown>;
    const orig = proto.at;
    delete proto.at;   // จำลองเบราว์เซอร์ที่ไม่มีเมธอดนี้
    installLegacyPolyfills();
    expect(([10, 20, 30] as unknown as HasAt<number>).at(0)).toBe(10);
    expect(([10, 20, 30] as unknown as HasAt<number>).at(-1)).toBe(30);
    expect(([10, 20, 30] as unknown as HasAt<number>).at(5)).toBeUndefined();
    expect(('abc' as unknown as HasAt<string>).at(-1)).toBe('c');
    Object.defineProperty(Array.prototype, 'at', { value: orig, writable: true, configurable: true });
  });

  it('ไม่ทับของเดิมถ้าเบราว์เซอร์มีอยู่แล้ว', () => {
    const p = Array.prototype as unknown as Record<string, unknown>;
    const before = p.at;
    installLegacyPolyfills();
    expect(p.at).toBe(before);
  });

  it('🔴 ต้องถูกเรียกใน main.tsx **ก่อน** โค้ดอื่น (เขียนไว้เฉย ๆ = ไม่ช่วยอะไร)', () => {
    expect(MAIN).toMatch(/installLegacyPolyfills\(\)/);
    expect(MAIN.indexOf('installLegacyPolyfills()'))
      .toBeLessThan(MAIN.indexOf('installGlobalErrorReporting()'));
  });

  it('⚠️ ลด build.target ไม่ช่วย — เหตุผลต้องเขียนไว้ในโค้ด กันคนมาแก้ผิดทาง', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/legacyPolyfill.ts'), 'utf8');
    expect(src).toMatch(/build\.target/);
    expect(src).toMatch(/ไวยากรณ์|syntax/);
  });
});
