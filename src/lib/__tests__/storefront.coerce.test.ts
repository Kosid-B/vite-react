import { describe, it, expect } from 'vitest';
import { coerceStorefront } from '../storefront';

/* coerceStorefront = boundary เดียวที่ทำให้ storefront ครบชนิด
 * (DB/localStorage อาจคืน null/หาย field) → ทุก consumer (หน้าร้าน/ตลาด/matching) ไม่ล่ม */

describe('coerceStorefront — เติม field ให้ครบชนิด', () => {
  it('object ว่าง/null/undefined → ได้ storefront ครบทุกช่อง (string=\'\' , array=[])', () => {
    for (const input of [null, undefined, {}]) {
      const sf = coerceStorefront(input);
      expect(sf.name).toBe('');
      expect(sf.dbd).toBe('');
      expect(sf.description).toBe('');
      expect(sf.phone).toBe('');
      expect(sf.kind).toBe('both');
      expect(Array.isArray(sf.services)).toBe(true);
      expect(Array.isArray(sf.images)).toBe(true);
      expect(sf.published).toBe(false);
    }
  });

  it('field ผิดชนิด (services/images ไม่ใช่ array, name เป็น number) → coerce ปลอดภัย', () => {
    const sf = coerceStorefront({
      name: 123 as unknown as string,
      services: 'ไม่ใช่ array' as unknown as string[],
      images: null as unknown as string[],
      dbd: undefined,
    });
    expect(sf.name).toBe('');
    expect(sf.services).toEqual([]);
    expect(sf.images).toEqual([]);
    // ยืนยันว่าเรียก string/array method ได้โดยไม่ throw (จำลอง consumer)
    expect(() => sf.name.trim()).not.toThrow();
    expect(() => sf.dbd.startsWith('[A]')).not.toThrow();
    expect(() => sf.services.join(' ')).not.toThrow();
    expect(() => sf.description.slice(0, 90)).not.toThrow();
  });

  it('array services กรองเฉพาะ string (ทิ้งค่าที่ไม่ใช่ string)', () => {
    const sf = coerceStorefront({ services: ['ก', 2 as unknown as string, null as unknown as string, 'ข'] });
    expect(sf.services).toEqual(['ก', 'ข']);
  });

  it('เก็บค่า valid ไว้ครบ (ไม่ทำลายข้อมูลดี)', () => {
    const sf = coerceStorefront({
      slug: 'shop', name: 'ร้านA', dbd: '[A] เกษตร', kind: 'product',
      services: ['ปุ๋ย'], description: 'ขายดี', phone: '0812345678', published: true,
    });
    expect(sf).toMatchObject({ slug: 'shop', name: 'ร้านA', kind: 'product', published: true });
    expect(sf.services).toEqual(['ปุ๋ย']);
  });
});
