import { describe, it, expect } from 'vitest';
import { partnerDevelopmentMap, cityStats } from '../companyCity';
import { DEFAULT_DATA } from '../../data';

describe('partnerDevelopmentMap (แผนผังพัฒนาสำหรับคู่ค้า)', () => {
  const map = partnerDevelopmentMap(DEFAULT_DATA);

  it('มี 6 ด้านธุรกิจ', () => {
    expect(map.dimensions).toHaveLength(6);
    expect(map.dimensions.map(d => d.id)).toEqual(
      ['team', 'output', 'skill', 'market', 'quality', 'finance'],
    );
  });

  it('ทุกด้าน pct อยู่ 0..100 และเป็นขั้นละ 5 (กัน fingerprint ตัวเลขลับ)', () => {
    for (const d of map.dimensions) {
      expect(d.pct).toBeGreaterThanOrEqual(0);
      expect(d.pct).toBeLessThanOrEqual(100);
      expect(d.pct % 5).toBe(0);
      expect(d.tier).toBeTruthy();
      expect(d.blurb).toBeTruthy();
    }
  });

  it('overall อยู่ 0..100 และไม่มีตัวเลขลับหลุด (ไม่มี ฿)', () => {
    expect(map.overall).toBeGreaterThanOrEqual(0);
    expect(map.overall).toBeLessThanOrEqual(100);
    const blob = JSON.stringify(map);
    expect(blob).not.toContain('฿');   // การเงินแสดงเป็นระดับ ไม่ใช่จำนวนเงิน
  });
});

describe('cityStats', () => {
  it('คืนอาคาร + ระดับเมือง โดยไม่ throw', () => {
    const s = cityStats(DEFAULT_DATA);
    expect(Array.isArray(s.buildings)).toBe(true);
    expect(s.buildings.length).toBeGreaterThan(0);
    expect(s.pctToNext).toBeGreaterThanOrEqual(0);
    expect(s.pctToNext).toBeLessThanOrEqual(100);
  });
});
