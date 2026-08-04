import { describe, it, expect } from 'vitest';
import {
  validateTestimonial, starString, aggregateRating, orderForDisplay,
  BODY_MIN, BODY_MAX, type Testimonial,
} from '../testimonials';

const base = { workspaceId: 'ws1', authorName: 'สมชาย', rating: 5, body: 'ระบบช่วยผมวางแผนธุรกิจได้จริง ใช้งานง่ายมาก' };

describe('validateTestimonial', () => {
  it('ผ่านเมื่อครบถ้วน', () => {
    expect(validateTestimonial(base).ok).toBe(true);
  });
  it('ปฏิเสธคะแนนนอกช่วง 1–5', () => {
    expect(validateTestimonial({ ...base, rating: 0 }).ok).toBe(false);
    expect(validateTestimonial({ ...base, rating: 6 }).ok).toBe(false);
  });
  it('ปฏิเสธรีวิวสั้นเกินไป', () => {
    expect(validateTestimonial({ ...base, body: 'สั้น' }).ok).toBe(false);
  });
  it('ปฏิเสธรีวิวยาวเกิน BODY_MAX', () => {
    expect(validateTestimonial({ ...base, body: 'ก'.repeat(BODY_MAX + 1) }).ok).toBe(false);
  });
  it('ยอมรับความยาวขอบเขตพอดี', () => {
    expect(validateTestimonial({ ...base, body: 'ก'.repeat(BODY_MIN) }).ok).toBe(true);
    expect(validateTestimonial({ ...base, body: 'ก'.repeat(BODY_MAX) }).ok).toBe(true);
  });
  it('ปฏิเสธเมื่อไม่มีชื่อ', () => {
    expect(validateTestimonial({ ...base, authorName: '  ' }).ok).toBe(false);
  });
  it('ปฏิเสธเมื่อไม่ล็อกอิน (ไม่มี workspaceId)', () => {
    expect(validateTestimonial({ ...base, workspaceId: '' }).ok).toBe(false);
  });
});

describe('starString', () => {
  it('แปลงคะแนนเป็นดาว 5 ดวงเสมอ', () => {
    expect(starString(5)).toBe('★★★★★');
    expect(starString(3)).toBe('★★★☆☆');
    expect(starString(0)).toBe('☆☆☆☆☆');
  });
  it('clamp ค่านอกช่วง', () => {
    expect(starString(9)).toBe('★★★★★');
    expect(starString(-2)).toBe('☆☆☆☆☆');
  });
});

describe('aggregateRating', () => {
  it('ว่าง → 0/0 (ไม่โชว์ดาวปลอม)', () => {
    expect(aggregateRating([])).toEqual({ average: 0, count: 0 });
  });
  it('เฉลี่ยปัดทศนิยม 1 ตำแหน่ง', () => {
    expect(aggregateRating([{ rating: 5 }, { rating: 4 }, { rating: 4 }])).toEqual({ average: 4.3, count: 3 });
  });
});

describe('orderForDisplay', () => {
  it('featured ขึ้นก่อน', () => {
    const list = [
      { id: 'a', featured: false },
      { id: 'b', featured: true },
      { id: 'c', featured: false },
    ] as Testimonial[];
    expect(orderForDisplay(list).map(t => t.id)).toEqual(['b', 'a', 'c']);
  });
  it('ไม่กลายพันธุ์ input เดิม', () => {
    const list = [{ id: 'a', featured: false }, { id: 'b', featured: true }] as Testimonial[];
    orderForDisplay(list);
    expect(list.map(t => t.id)).toEqual(['a', 'b']);
  });
});
