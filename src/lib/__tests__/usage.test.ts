import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PLAN_AI_CALLS, getAiUsage, trackAiCall, usagePct } from '../usage';

/* usage meter → ชวนอัปเกรดเมื่อใกล้เต็มโควตา — นับต่อเดือน + reset ข้ามเดือน */

describe('usage — AI call quota', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T00:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); localStorage.clear(); });

  it('โควตาเรียงตามแพ็ก free < starter < growth < scale', () => {
    expect(PLAN_AI_CALLS.free).toBeLessThan(PLAN_AI_CALLS.starter);
    expect(PLAN_AI_CALLS.starter).toBeLessThan(PLAN_AI_CALLS.growth);
    expect(PLAN_AI_CALLS.growth).toBeLessThan(PLAN_AI_CALLS.scale);
  });

  it('เริ่มต้นเดือนนี้ count = 0', () => {
    const u = getAiUsage();
    expect(u.month).toBe('2026-07');
    expect(u.count).toBe(0);
  });

  it('trackAiCall เพิ่มทีละ 1', () => {
    trackAiCall(); trackAiCall(); trackAiCall();
    expect(getAiUsage().count).toBe(3);
  });

  it('ข้ามเดือน → reset นับใหม่', () => {
    trackAiCall(); trackAiCall();
    vi.setSystemTime(new Date('2026-08-01T00:00:00Z'));
    expect(getAiUsage().count).toBe(0);        // เดือนใหม่
    expect(getAiUsage().month).toBe('2026-08');
  });

  it('usagePct = round(count/quota×100) และไม่เกิน 100', () => {
    for (let i = 0; i < 150; i++) trackAiCall();     // free quota 200
    expect(usagePct('free')).toBe(75);               // 150/200
    for (let i = 0; i < 100; i++) trackAiCall();      // รวม 250 > 200
    expect(usagePct('free')).toBe(100);              // cap
  });
});
