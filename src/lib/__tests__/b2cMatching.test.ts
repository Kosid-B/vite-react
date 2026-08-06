import { describe, it, expect } from 'vitest';
import { audienceFor } from '../b2cMatching';

describe('audienceFor', () => {
  it('ร้านอาหาร → กลุ่มคนทำงานใกล้ร้านมาก่อน (fit สูงสุด)', () => {
    const a = audienceFor('ร้านก๋วยเตี๋ยวไก่');
    expect(a.length).toBeGreaterThan(0);
    expect(a[0].segment).toContain('ออฟฟิศ');
    expect(a[0].fit).toBeGreaterThanOrEqual(a[a.length - 1].fit); // เรียง fit มากไปน้อย
  });

  it('ทุกกลุ่มมี channels + angle ครบ', () => {
    for (const cat of ['ร้านอาหาร', 'ค้าส่งวัตถุดิบ', 'รับทำบัญชี', 'อะไรไม่รู้']) {
      for (const m of audienceFor(cat)) {
        expect(m.channels.length).toBeGreaterThan(0);
        expect(m.angle.length).toBeGreaterThan(0);
        expect(m.why.length).toBeGreaterThan(0);
      }
    }
  });

  it('หมวดไม่รู้จัก → fallback other (ไม่ throw, มีอย่างน้อย 1 กลุ่ม)', () => {
    const a = audienceFor('xyz123');
    expect(a.length).toBeGreaterThanOrEqual(1);
  });
});
