import { describe, it, expect } from 'vitest';
import { aggregate, statForText, roiEstimate, OPPORTUNITY_LABEL } from '../marketDemandSupply';

describe('aggregate', () => {
  it('รวม demand/supply ต่อ kind + คิด gap + opportunity', () => {
    const demand = ['ร้านอาหารตามสั่ง', 'ก๋วยเตี๋ยว', 'คาเฟ่'];   // 3 → food
    const supply = ['ร้านกาแฟ'];                                   // 1 → food
    const stats = aggregate(demand, supply);
    const food = stats.find(s => s.kind === 'food')!;
    expect(food.demand).toBe(3);
    expect(food.supply).toBe(1);
    expect(food.gap).toBe(2);
    expect(food.opportunity).toBe('high'); // ดีมานด์ > ซัพพลาย
  });

  it('ซัพพลายเยอะกว่าดีมานด์มาก → saturated', () => {
    const stats = aggregate(['ร้านอาหาร'], ['ร้านอาหาร', 'คาเฟ่', 'ก๋วยเตี๋ยว', 'เบเกอรี']); // 1 vs 4
    expect(stats[0].opportunity).toBe('saturated');
  });

  it('เรียงตามดีมานด์มากสุดก่อน', () => {
    const stats = aggregate(['ขนส่ง', 'ร้านอาหาร', 'ร้านอาหาร'], []);
    expect(stats[0].kind).toBe('food'); // 2 > 1
  });

  it('OPPORTUNITY_LABEL ครบ', () => {
    expect(OPPORTUNITY_LABEL.high).toContain('โอกาส');
  });
});

describe('statForText', () => {
  it('แปลงข้อความธุรกิจ → stat ของ kind นั้น', () => {
    const stats = aggregate(['ร้านกาแฟ', 'ร้านกาแฟ'], ['คาเฟ่']);
    const s = statForText('อยากเปิดร้านกาแฟสด', stats);
    expect(s?.kind).toBe('food');
    expect(s?.demand).toBe(2);
  });
  it('ไม่มีในสถิติ → null', () => {
    expect(statForText('ขนส่ง', aggregate(['ร้านอาหาร'], []))).toBeNull();
  });
});

describe('roiEstimate', () => {
  it('คำนวณ current/extra/upside ถูก', () => {
    const r = roiEstimate({ walkinPerDay: 20, avgTicket: 50, extraOrdersPerMonth: 100 });
    expect(r.currentMonthly).toBe(30000);   // 20*50*30
    expect(r.extraMonthly).toBe(5000);       // 100*50
    expect(r.totalMonthly).toBe(35000);
    expect(r.upsidePct).toBe(17);            // 5000/30000
    expect(r.note).toContain('ไม่ใช่การรับประกัน');
  });
  it('ค่าติดลบ/ศูนย์ → กันหาร 0', () => {
    const r = roiEstimate({ walkinPerDay: 0, avgTicket: -5, extraOrdersPerMonth: 10 });
    expect(r.currentMonthly).toBe(0);
    expect(r.upsidePct).toBe(0);
  });
});
