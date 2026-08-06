import { describe, it, expect } from 'vitest';
import { dueEmail, isEmail, TOTAL_STAGES, STAGE_DELAY_HOURS } from '../leadNurture';

const H = 3600_000;
const base = 1_000_000_000_000; // เวลาอ้างอิงคงที่ (ไม่ใช้ Date.now)

describe('isEmail', () => {
  it('อีเมลจริง → true', () => {
    expect(isEmail('a@b.com')).toBe(true);
    expect(isEmail('  user.name@sub.domain.co.th ')).toBe(true);
  });
  it('LINE/เบอร์/ว่าง → false (ส่งอีเมลไม่ได้)', () => {
    expect(isEmail('0812345678')).toBe(false);
    expect(isEmail('@lineid')).toBe(false);
    expect(isEmail('no-at-sign')).toBe(false);
    expect(isEmail('')).toBe(false);
  });
});

describe('dueEmail', () => {
  it('stage 0 → ส่ง welcome (1) ได้ทันที', () => {
    expect(dueEmail({ createdAtMs: base, stage: 0, lastAtMs: null }, base)).toBe(1);
  });

  it('stage 1 → ยังไม่ถึง 48ชม. = null · ครบ 48ชม. = ส่ง value (2)', () => {
    const sentAt = base;
    expect(dueEmail({ createdAtMs: base, stage: 1, lastAtMs: sentAt }, sentAt + 47 * H)).toBeNull();
    expect(dueEmail({ createdAtMs: base, stage: 1, lastAtMs: sentAt }, sentAt + 48 * H)).toBe(2);
  });

  it('stage 2 → ครบ 96ชม.หลัง value = ส่ง final (3)', () => {
    const sentAt = base;
    expect(dueEmail({ createdAtMs: base, stage: 2, lastAtMs: sentAt }, sentAt + 95 * H)).toBeNull();
    expect(dueEmail({ createdAtMs: base, stage: 2, lastAtMs: sentAt }, sentAt + 96 * H)).toBe(3);
  });

  it('stage 3 (จบแล้ว) → null เสมอ', () => {
    expect(dueEmail({ createdAtMs: base, stage: 3, lastAtMs: base }, base + 1000 * H)).toBeNull();
  });

  it('stage 1 ที่ lastAtMs เป็น null → fallback ใช้ createdAt', () => {
    expect(dueEmail({ createdAtMs: base, stage: 1, lastAtMs: null }, base + 48 * H)).toBe(2);
  });

  it('ค่า stage เพี้ยน (ติดลบ) → null', () => {
    expect(dueEmail({ createdAtMs: base, stage: -1, lastAtMs: null }, base + 1000 * H)).toBeNull();
  });

  it('config ครบ TOTAL_STAGES', () => {
    expect(STAGE_DELAY_HOURS.length).toBe(TOTAL_STAGES);
  });
});
