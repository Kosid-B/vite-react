import { describe, it, expect } from 'vitest';
import { revenueSplit, isRealPayment, NON_REVENUE_PAY_METHODS, type SkillPurchaseEvent } from '../skillStats';

const ev = (payMethod: string, price = 1000): SkillPurchaseEvent => ({
  skillId: 's', skillName: 'ทดสอบ', category: '', tier: 1, price, payMethod,
  userEmail: null, createdAt: '2026-08-16T00:00:00Z',
});

describe('แยกรายได้จริงออกจากของที่แอดมินเปิดให้ฟรี', () => {
  it('admin-free ไม่นับเป็นรายได้ (เคสจริง: 146 รายการ ฿239,290 = เงินจริง ฿0)', () => {
    const r = revenueSplit(Array.from({ length: 146 }, () => ev('admin-free', 1639)));
    expect(r.real).toBe(0);
    expect(r.realCount).toBe(0);
    expect(r.compedCount).toBe(146);
    expect(r.comped).toBeGreaterThan(0);
  });

  it('การจ่ายจริงนับเข้ารายได้', () => {
    const r = revenueSplit([ev('promptpay', 2490), ev('card', 1500), ev('transfer', 990)]);
    expect(r.real).toBe(4980);
    expect(r.realCount).toBe(3);
    expect(r.comped).toBe(0);
  });

  it('ปนกัน → แยกถูก', () => {
    const r = revenueSplit([ev('promptpay', 2490), ev('admin-free', 9999), ev('card', 510)]);
    expect(r.real).toBe(3000);
    expect(r.comped).toBe(9999);
  });

  it.each([...NON_REVENUE_PAY_METHODS])('"%s" ไม่ใช่การจ่ายจริง', (m) => {
    expect(isRealPayment(m)).toBe(false);
  });

  it('ตัวพิมพ์ใหญ่/ช่องว่าง ก็ยังจับได้ (ข้อมูลเก่าอาจไม่สม่ำเสมอ)', () => {
    expect(isRealPayment(' Admin-Free ')).toBe(false);
    expect(isRealPayment('ADMIN-FREE')).toBe(false);
  });

  it('ไม่ระบุวิธีจ่าย → ถือว่าเป็นการจ่ายจริง (ไม่ซ่อนรายได้ที่อาจมีจริง)', () => {
    expect(isRealPayment('')).toBe(true);
    expect(revenueSplit([ev('', 500)]).real).toBe(500);
  });

  it('ราคาเพี้ยน/ไม่ใช่ตัวเลข → ไม่ทำให้ผลรวมเป็น NaN', () => {
    const bad = { ...ev('promptpay'), price: NaN as unknown as number };
    expect(revenueSplit([bad]).real).toBe(0);
  });

  it('ไม่มีรายการ → ศูนย์ทุกช่อง', () => {
    expect(revenueSplit([])).toEqual({ real: 0, comped: 0, realCount: 0, compedCount: 0 });
  });
});
