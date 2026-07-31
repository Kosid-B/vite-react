import { describe, it, expect } from 'vitest';
import { isValidRefPair, referralLink, REF_REWARD_CALLS } from '../referral';

describe('referral', () => {
  it('คู่ referrer≠referee + มีทั้งคู่ = valid', () => {
    expect(isValidRefPair('ws-a', 'ws-b')).toBe(true);
  });
  it('self-referral = invalid', () => {
    expect(isValidRefPair('ws-a', 'ws-a')).toBe(false);
  });
  it('ขาดฝั่งใดฝั่งหนึ่ง = invalid', () => {
    expect(isValidRefPair(null, 'ws-b')).toBe(false);
    expect(isValidRefPair('ws-a', undefined)).toBe(false);
    expect(isValidRefPair('', 'ws-b')).toBe(false);
  });

  it('referralLink ใส่ wsId เป็น ref code (encode)', () => {
    expect(referralLink('ws 1', 'https://x.test')).toBe('https://x.test/?ref=ws%201');
  });
  it('ไม่มี wsId = ลิงก์ origin เปล่า (referral ทำงานเฉพาะออนไลน์)', () => {
    expect(referralLink(null, 'https://x.test')).toBe('https://x.test/');
  });

  it('reward คงที่ > 0', () => {
    expect(REF_REWARD_CALLS).toBeGreaterThan(0);
  });
});
