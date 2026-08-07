import { describe, it, expect } from 'vitest';
import { slugify, slugifyInput } from '../slug';

describe('slugify', () => {
  it('วาง URL เต็ม → ไม่มี "https--" อีก (แก้บั๊ก /b/https--...)', () => {
    expect(slugify('https://ceoaithailand.org/b/xyz')).toBe('ceoaithailand-org-b-xyz');
    expect(slugify('https://ceoaithailand.org/')).toBe('ceoaithailand-org');
    expect(slugify('www.example.com')).toBe('example-com');
  });

  it('ชื่อธุรกิจปกติ → slug สะอาด', () => {
    expect(slugify('ร้าน กาแฟ ดีดี')).toBe('ร้าน-กาแฟ-ดีดี');
    expect(slugify('  Cool Shop!!  ')).toBe('cool-shop');
  });

  it('ตัดขีดหัว-ท้าย + รวมขีดซ้ำ', () => {
    expect(slugify('--a---b--')).toBe('a-b');
  });

  it('ว่าง/สัญลักษณ์ล้วน → fallback', () => {
    expect(slugify('')).toBe('my-business');
    expect(slugify('!!!')).toBe('my-business');
  });

  it('จำกัดความยาว ~60', () => {
    expect(slugify('a'.repeat(100)).length).toBeLessThanOrEqual(60);
  });
});

describe('slugifyInput (ระหว่างพิมพ์)', () => {
  it('ไม่ตัดขีดท้าย (พิมพ์ต่อได้)', () => {
    expect(slugifyInput('my-shop-')).toBe('my-shop-');
  });
  it('วาง URL → ตัด protocol', () => {
    expect(slugifyInput('https://a.com/x')).toBe('a-com-x');
  });
  it('ช่องว่าง/สแลช → ขีด', () => {
    expect(slugifyInput('a b/c')).toBe('a-b-c');
  });
});
