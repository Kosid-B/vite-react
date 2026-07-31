import { describe, it, expect } from 'vitest';
import { computeNudge, TRIAL_NUDGE_DAYS, QUOTA_NUDGE_PCT } from '../nudge';

const base = { status: 'active' as const, trialDaysLeft: null, aiPct: 0, plan: 'starter' as const, foundingActive: false };

describe('computeNudge — trial', () => {
  it('trial เหลือ ≤ 3 วัน → โชว์', () => {
    const n = computeNudge({ ...base, status: 'trial', trialDaysLeft: 2 });
    expect(n?.tone).toBe('trial');
    expect(n?.goto).toBe('billing');
    expect(n?.message).toContain('2 วัน');
  });
  it('trial เหลือ 0 วัน → ข้อความ "หมดวันนี้"', () => {
    expect(computeNudge({ ...base, status: 'trial', trialDaysLeft: 0 })?.message).toContain('หมดวันนี้');
  });
  it('trial เหลือ > 3 วัน → ไม่โชว์', () => {
    expect(computeNudge({ ...base, status: 'trial', trialDaysLeft: TRIAL_NUDGE_DAYS + 1 })).toBeNull();
  });
  it('id เปลี่ยนตามวันคงเหลือ (dismiss แยกวัน)', () => {
    expect(computeNudge({ ...base, status: 'trial', trialDaysLeft: 3 })?.id).not.toBe(
      computeNudge({ ...base, status: 'trial', trialDaysLeft: 1 })?.id);
  });
});

describe('computeNudge — quota', () => {
  it('ใช้ ≥ 80% (active starter) → โชว์ quota', () => {
    const n = computeNudge({ ...base, aiPct: 85 });
    expect(n?.tone).toBe('quota');
    expect(n?.message).toContain('85%');
  });
  it('ต่ำกว่า 80% → ไม่โชว์', () => {
    expect(computeNudge({ ...base, aiPct: QUOTA_NUDGE_PCT - 1 })).toBeNull();
  });
  it('scale = ไม่เตือนโควตา (สูงสุดแล้ว)', () => {
    expect(computeNudge({ ...base, plan: 'scale', aiPct: 95 })).toBeNull();
  });
  it('founding/growth → ข้อความชวนเติมเครดิต (ไม่ใช่ "อัปเกรด")', () => {
    expect(computeNudge({ ...base, plan: 'growth', aiPct: 90 })?.message).toContain('เติมเครดิต');
    expect(computeNudge({ ...base, foundingActive: true, aiPct: 90 })?.message).toContain('เติมเครดิต');
  });
});

describe('computeNudge — priority & empty', () => {
  it('trial ใกล้หมด สำคัญกว่า quota', () => {
    expect(computeNudge({ ...base, status: 'trial', trialDaysLeft: 1, aiPct: 95 })?.tone).toBe('trial');
  });
  it('ระหว่าง trial ไม่โชว์ quota (ทดลองได้ scale เต็ม)', () => {
    expect(computeNudge({ ...base, status: 'trial', trialDaysLeft: 10, aiPct: 99 })).toBeNull();
  });
  it('ปกติ (ไม่ trial, quota ต่ำ) → null', () => {
    expect(computeNudge(base)).toBeNull();
  });
});
