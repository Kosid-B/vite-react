import { describe, it, expect } from 'vitest';
import { aggregateRating } from '../reviews';

describe('aggregateRating — สะสมรีวิวจริง (ปิด I ของ SEO)', () => {
  it('ไม่มีรีวิว → null (ไม่ปั้นดาว)', () => {
    expect(aggregateRating([])).toBeNull();
    expect(aggregateRating(undefined)).toBeNull();
  });
  it('เฉลี่ย + ปัด 1 ทศนิยม + นับจำนวน', () => {
    const r = aggregateRating([{ rating: 5 }, { rating: 4 }, { rating: 4 }]);
    expect(r).toEqual({ rating: 4.3, reviewCount: 3 });
  });
  it('กรองคะแนนนอกช่วง 1..5 ทิ้ง', () => {
    const r = aggregateRating([{ rating: 5 }, { rating: 0 }, { rating: 9 }, { rating: 3 }]);
    expect(r).toEqual({ rating: 4, reviewCount: 2 });
  });
});
