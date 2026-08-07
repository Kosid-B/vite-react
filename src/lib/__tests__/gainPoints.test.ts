import { describe, it, expect } from 'vitest';
import { gainPointsFor, GAIN_POINTS, GAIN_HEADLINE } from '../gainPoints';

describe('gainPoints', () => {
  it('คืนครบทุกข้อเสมอ (ไม่หาย) + มี headline', () => {
    expect(gainPointsFor()).toHaveLength(GAIN_POINTS.length);
    expect(gainPointsFor('seller')).toHaveLength(GAIN_POINTS.length);
    expect(GAIN_HEADLINE.length).toBeGreaterThan(0);
  });

  it('ทุกข้อเป็น pain → gain (มีทั้ง pain/gain/how)', () => {
    GAIN_POINTS.forEach(g => {
      expect(g.pain.length).toBeGreaterThan(0);
      expect(g.gain.length).toBeGreaterThan(0);
      expect(g.how.length).toBeGreaterThan(0);
    });
  });

  it('seller → ดันเรื่องหาลูกค้าขึ้นก่อน', () => {
    expect(gainPointsFor('seller')[0].id).toBe('customers');
  });
  it('newbie → ดันเรื่องทดสอบไอเดียขึ้นก่อน', () => {
    expect(gainPointsFor('newbie')[0].id).toBe('validate');
  });
  it('owner → ดันเรื่องทีม AI ขึ้นก่อน', () => {
    expect(gainPointsFor('owner')[0].id).toBe('team');
  });

  it('seg ไม่รู้จัก → ใช้ default (ทดสอบไอเดียก่อน)', () => {
    expect(gainPointsFor('xxx')[0].id).toBe('validate');
    expect(gainPointsFor(undefined)[0].id).toBe('validate');
  });
});
