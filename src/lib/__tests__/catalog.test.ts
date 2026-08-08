import { describe, it, expect } from 'vitest';
import {
  emptyCatalogItem, coerceItems, validateItem, addItem, updateItem, removeItem,
  catalogSummary, formatBaht, priceLabel, type CatalogItem,
} from '../catalog';

const mk = (id: string, name: string, price = 0, unit = ''): CatalogItem => ({ id, name, price, unit });

describe('catalog', () => {
  it('add/update/remove (immutable)', () => {
    const a: CatalogItem[] = [];
    const b = addItem(a, mk('1', ' กาแฟ ', 60));
    expect(a).toEqual([]);                 // ไม่ mutate ของเดิม
    expect(b[0].name).toBe('กาแฟ');        // trim ชื่อ
    const c = updateItem(b, '1', { price: 70 });
    expect(c[0].price).toBe(70);
    expect(removeItem(c, '1')).toEqual([]);
  });

  it('validateItem: ต้องมีชื่อ + ราคาไม่ติดลบ', () => {
    expect(validateItem(mk('1', 'ชา', 40)).ok).toBe(true);
    expect(validateItem(mk('1', '', 40)).ok).toBe(false);
    expect(validateItem({ ...mk('1', 'x'), price: -5 }).ok).toBe(false);
  });

  it('coerceItems: กันของเสีย + ตัดชื่อว่าง + แปลงชนิด', () => {
    const raw = [{ id: '1', name: 'A', price: '120', unit: 'ชิ้น' }, { name: '' }, null, { id: '2', name: 'B', price: -3 }];
    const items = coerceItems(raw);
    expect(items.map(i => i.name)).toEqual(['A', 'B']);   // ตัดชื่อว่าง/null
    expect(items[0].price).toBe(120);                      // string → number
    expect(items[1].price).toBe(0);                        // ลบ → 0
    expect(coerceItems('nope')).toEqual([]);
  });

  it('catalogSummary: นับ + ช่วงราคา (เฉพาะที่ตั้งราคา)', () => {
    const s = catalogSummary([mk('1', 'A', 60), mk('2', 'B', 0), mk('3', 'C', 200)]);
    expect(s.count).toBe(3);
    expect(s.priced).toBe(2);
    expect(s.minPrice).toBe(60);
    expect(s.maxPrice).toBe(200);
  });

  it('formatBaht + priceLabel (0 = สอบถามราคา)', () => {
    expect(formatBaht(1234)).toBe('฿1,234');
    expect(priceLabel(mk('1', 'A', 120, 'ชิ้น'))).toBe('฿120/ชิ้น');
    expect(priceLabel(mk('1', 'A', 0))).toBe('สอบถามราคา');
  });

  it('emptyCatalogItem มี id ตามที่ส่ง + ค่าเริ่มต้นว่าง', () => {
    expect(emptyCatalogItem('x')).toMatchObject({ id: 'x', name: '', price: 0 });
  });
});
