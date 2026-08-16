import { describe, it, expect } from 'vitest';
import {
  priceScenario, priceLadder, PRICE_STEPS, costPlusSignal,
  positionOf, positionText, pricingInsights,
} from '../pricingAnalysis';
import type { ProductInput } from '../productQuickCheck';

const P = (o: Partial<ProductInput> = {}): ProductInput => ({
  biz: 'food', price: 50, cost: 30, ...o,
});

describe('จุดคุ้มทุนเมื่อเปลี่ยนราคา — ต้องตรงกับสูตร y = 1 − m/m′', () => {
  it('ขึ้นราคา 10% ที่กำไรต่อหน่วย 20 → เสียลูกค้าได้ 20%', () => {
    // ราคา 50 ต้นทุน 30 → m = 20 · ขึ้น 10% → ราคา 55, m′ = 25
    // y = 1 − 20/25 = 20%
    const s = priceScenario(P(), 10);
    expect(s.newPrice).toBe(55);
    expect(s.newMarginPerUnit).toBe(25);
    expect(s.breakEvenVolumePct).toBe(20);
  });

  it('ลดราคา 10% → ต้องขายเพิ่ม 33.33% (ค่าติดลบ = ต้องเพิ่ม)', () => {
    // ราคา 45, m′ = 15 → y = 1 − 20/15 = −33.33%
    const s = priceScenario(P(), -10);
    expect(s.newPrice).toBe(45);
    expect(s.newMarginPerUnit).toBe(15);
    expect(s.breakEvenVolumePct).toBeCloseTo(-33.33, 1);
  });

  it('กำไรบางกว่า → ลดราคาแล้วต้องขายเพิ่มมากกว่ามาก (หัวใจของโมดูลนี้)', () => {
    const thin = priceScenario(P({ price: 50, cost: 45 }), -10);  // m = 5 → m′ = 0
    const fat = priceScenario(P({ price: 50, cost: 10 }), -10);   // m = 40 → m′ = 35
    // กำไรหนา เสียน้อย · กำไรบาง เสียเยอะ (หรือคำนวณไม่ได้เพราะ m′ ≤ 0)
    expect(fat.breakEvenVolumePct).toBeCloseTo(-14.29, 1);
    expect(thin.breakEvenVolumePct).toBeNull(); // m′ = 0 → ไม่มีทางคุ้มไม่ว่าขายเท่าไหร่
  });

  it('ราคาใหม่ต่ำกว่าต้นทุน → ธงขึ้นและไม่คืนตัวเลขจุดคุ้มทุนหลอก ๆ', () => {
    const s = priceScenario(P({ price: 50, cost: 48 }), -20); // ราคา 40 < ต้นทุน 48
    expect(s.belowCost).toBe(true);
    expect(s.breakEvenVolumePct).toBeNull();
  });

  it('เดิมขาดทุนอยู่แล้ว → ไม่คำนวณจุดคุ้มทุน (จุดอ้างอิงเดิมไม่มีความหมาย)', () => {
    expect(priceScenario(P({ price: 30, cost: 50 }), 10).breakEvenVolumePct).toBeNull();
  });

  it('รู้ยอดขาย → บอกกำไรรวมถ้าขายได้เท่าเดิม', () => {
    const s = priceScenario(P({ unitsPerMonth: 1000 }), 10);
    expect(s.profitIfVolumeSame).toBe(25_000);
    expect(priceScenario(P(), 10).profitIfVolumeSame).toBeNull();
  });

  it('บันไดราคาครบทุกขั้นตามที่กำหนด', () => {
    expect(priceLadder(P()).map((s) => s.changePct)).toEqual([...PRICE_STEPS]);
  });
});

describe('ตรวจการตั้งราคาแบบต้นทุน+บวก (anti-pattern อันดับ 1 ของ skill)', () => {
  it('ราคา = ต้นทุน × 2 พอดี → เตือน', () => {
    const c = costPlusSignal(P({ price: 60, cost: 30 }));
    expect(c.multiple).toBe(2);
    expect(c.looksCostPlus).toBe(true);
    expect(c.nearest).toBe(2);
  });

  it('ตัวคูณไม่กลม → ไม่เตือน (เตือนผิดเสียความน่าเชื่อถือ)', () => {
    expect(costPlusSignal(P({ price: 79, cost: 30 })).looksCostPlus).toBe(false);
    expect(costPlusSignal(P({ price: 50, cost: 30 })).looksCostPlus).toBe(false); // 1.67
  });

  it('ไม่มีต้นทุน/ราคา → ไม่เดา', () => {
    expect(costPlusSignal(P({ cost: 0 })).multiple).toBeNull();
    expect(costPlusSignal(P({ price: 0 })).looksCostPlus).toBe(false);
  });
});

describe('ตำแหน่งราคา — ใช้ได้เฉพาะราคาที่ผู้ใช้กรอกเอง', () => {
  it('เทียบได้เมื่อมีคู่แข่งอย่างน้อย 2 เจ้า', () => {
    expect(positionOf(40, [50, 60, 70])).toBe('budget');
    expect(positionOf(60, [50, 70])).toBe('mid');
    expect(positionOf(90, [50, 70])).toBe('premium');
  });

  it('คู่แข่งน้อยกว่า 2 เจ้า → ไม่สรุป (ตัวอย่างเล็กเกินไป)', () => {
    expect(positionOf(60, [50])).toBe('unknown');
    expect(positionOf(60, [])).toBe('unknown');
    expect(positionText('unknown')).toContain('อย่างน้อย 2 เจ้า');
  });

  it('กรองค่าที่ใช้ไม่ได้ทิ้ง', () => {
    expect(positionOf(60, [0, -5, NaN, 50, 70])).toBe('mid');
    expect(positionOf(0, [50, 70])).toBe('unknown');
  });
});

describe('ข้อสังเกตเรื่องราคา — ห้ามอ้างตัวเลขที่ไม่มีแหล่ง', () => {
  const cases: ProductInput[] = [
    P(), P({ price: 30, cost: 50 }), P({ price: 60, cost: 30 }),
    P({ price: 50, cost: 45, unitsPerMonth: 500 }), P({ price: 0, cost: 0 }),
  ];
  const all = cases.flatMap((c) => pricingInsights(c));

  it('ทุกตัวเลขอ้างที่มาจากช่องที่ผู้ใช้กรอกได้', () => {
    for (const i of all) if (i.kind === 'calc') expect(i.from, i.text).toBeTruthy();
  });

  it('ไม่มีการอ้างราคาคู่แข่งหรือค่าเฉลี่ยตลาด — เราไม่มีฐานข้อมูลนั้น', () => {
    const banned = ['ราคาตลาด', 'คู่แข่งตั้งราคา', 'ค่าเฉลี่ยอุตสาหกรรม', 'ราคาเฉลี่ย', 'ทั่วประเทศ'];
    for (const i of all) for (const b of banned) expect(i.text, i.text).not.toContain(b);
  });

  it('ขายต่ำกว่าทุน → บอกให้แก้ราคาก่อน ไม่พูดเรื่องกลยุทธ์', () => {
    const ins = pricingInsights(P({ price: 30, cost: 50 }));
    expect(ins.some((i) => i.kind === 'action' && i.text.includes('แก้ราคา'))).toBe(true);
    expect(ins.some((i) => i.text.includes('ขึ้นราคา 10%'))).toBe(false);
  });

  it('บอกทั้งด้านขึ้นราคาและด้านลดราคา (ด้านลดคือด้านที่ทำให้เจ๊ง)', () => {
    const t = pricingInsights(P()).map((i) => i.text).join(' | ');
    expect(t).toContain('ขึ้นราคา 10%');
    expect(t).toContain('ลดราคา 10%');
  });

  it('ถามเสมอว่าเคยมีใครบ่นว่าแพงไหม (สัญญาณตั้งราคาต่ำเกิน)', () => {
    expect(pricingInsights(P()).some((i) => i.text.includes('บ่นว่าแพง'))).toBe(true);
  });

  it('ไม่มีราคา → ถามก่อน ไม่เดา', () => {
    const ins = pricingInsights(P({ price: 0 }));
    expect(ins).toHaveLength(1);
    expect(ins[0].kind).toBe('question');
  });
});
