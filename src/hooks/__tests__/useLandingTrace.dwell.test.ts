import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

/* เทสต์นี้มีเพราะข้อมูลจริงในฐานข้อมูลฟ้อง (17 ส.ค. 2569):
 *   67 ผู้เข้าชม · 57 คน max_scroll = 0 · แต่ 22 คนถูกบันทึกว่า "อยู่ ≥30 วินาที"
 *   ทั้งที่ไม่เลื่อนเลยแม้แต่พิกเซลเดียว
 * ต้นเหตุ: setTimeout ของ dwell ยังเดินต่อหลังผู้ใช้สลับแอป/ซ่อนแท็บ
 *   → คนดู 5 วิแล้วสลับแอป (ปกติมากบนมือถือ) ถูกนับเป็น 30/60 วิ
 *   → ค่า "หยุดดูเฉลี่ย" บนแผงแอดมินสูงกว่าความจริง = ตัวเลขที่เอาไปตัดสินใจไม่ได้
 */

const markDwell = vi.fn();
vi.mock('../../lib/landingFunnel', () => ({
  initLandingFunnel: vi.fn(),
  markLandingScroll: vi.fn(),
  markLandingDwell: (...a: unknown[]) => markDwell(...a),
  flush: vi.fn(),
  markSectionEnter: vi.fn(),
  markSectionExit: vi.fn(),
  closeOpenSections: vi.fn(),
}));
vi.mock('../../lib/analytics', () => ({ track: vi.fn() }));

import { useLandingTrace } from '../useLandingTrace';

function setVisibility(v: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: v, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useLandingTrace — เวลาที่บันทึกต้องเป็นเวลาที่เขาดูจริง', () => {
  beforeEach(() => { markDwell.mockClear(); vi.useFakeTimers(); setVisibility('visible'); });
  afterEach(() => { vi.useRealTimers(); });

  it('อยู่ดูจริงครบ 30 วิ → บันทึก 10 และ 30', () => {
    renderHook(() => useLandingTrace('seller', true));
    vi.advanceTimersByTime(30_000);
    expect(markDwell.mock.calls.map(c => c[0])).toEqual(expect.arrayContaining([10, 30]));
  });

  it('ดู 5 วิแล้วสลับแอป → ต้องไม่ถูกบันทึกว่าอยู่ 30 หรือ 60 วิ', () => {
    renderHook(() => useLandingTrace('seller', true));
    vi.advanceTimersByTime(5_000);
    setVisibility('hidden');           // สลับไปแอปอื่น = จบการดูรอบนี้
    vi.advanceTimersByTime(120_000);   // ปล่อยเวลาผ่านไปอีก 2 นาที

    const recorded = markDwell.mock.calls.map(c => c[0] as number);
    expect(Math.max(0, ...recorded)).toBeLessThan(10);
    expect(recorded).not.toContain(30);
    expect(recorded).not.toContain(60);
  });

  /* 🔴 อีกด้านของบั๊กเดียวกัน (26 ส.ค. 2569): ของเดิม "ซ่อนแท็บครั้งแรก = จบถาวร"
   *    ⇒ คนที่สลับไปแอปอื่นแล้วกลับมาอ่านต่อ — ซึ่งคือคนที่สนใจมากที่สุด — ถูกบันทึกเวลาต่ำกว่าจริง
   *    การแก้รอบก่อน (ledger #12) แก้ทิศ "สูงเกินจริง" แล้วเลยไปอีกด้าน */
  it('สลับแอปแล้วกลับมาอ่านต่อ → เวลาที่ดูจริงต้องเดินต่อ ไม่ใช่หยุดถาวร', () => {
    renderHook(() => useLandingTrace('seller', true));
    vi.advanceTimersByTime(5_000);
    setVisibility('hidden');
    vi.advanceTimersByTime(600_000); // ไปทำอย่างอื่น 10 นาที
    setVisibility('visible');        // กลับมาอ่านต่อ
    vi.advanceTimersByTime(25_000);  // ดูจริงอีก 25 วิ → รวมเวลาที่ดูจริง = 30 วิ

    const recorded = markDwell.mock.calls.map(c => c[0] as number);
    expect(recorded, 'กลับมาแล้วเวลาไม่เดินต่อ').toContain(10);
    expect(recorded, 'เวลาที่ดูจริงครบ 30 แล้วแต่ไม่ถูกบันทึก').toContain(30);
    expect(recorded, '10 นาทีที่อยู่เบื้องหลังถูกนับเป็นเวลาดู').not.toContain(60);
  });

  it('🔴 เวลาที่อยู่เบื้องหลังต้องไม่ถูกนับ แม้จะกลับมาแล้ว', () => {
    renderHook(() => useLandingTrace('seller', true));
    vi.advanceTimersByTime(2_000);
    setVisibility('hidden');
    vi.advanceTimersByTime(3_600_000); // หายไป 1 ชั่วโมง
    setVisibility('visible');
    vi.advanceTimersByTime(1_000);     // กลับมาดูอีก 1 วิ (รวมดูจริง 3 วิ)

    const recorded = markDwell.mock.calls.map(c => c[0] as number);
    expect(Math.max(0, ...recorded), 'เวลาที่อยู่เบื้องหลังรั่วเข้ามา').toBeLessThan(10);
  });

  it('unmount แล้ว timer ต้องไม่ยิงตามมาทีหลัง', () => {
    const { unmount } = renderHook(() => useLandingTrace('seller', true));
    unmount();
    markDwell.mockClear();
    vi.advanceTimersByTime(120_000);
    expect(markDwell).not.toHaveBeenCalled();
  });
});
