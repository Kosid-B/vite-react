import { describe, it, expect } from 'vitest';
import { clvSummary, clvText } from '../clv';
import { DEFAULT_DATA } from '../../data';
import type { AppData, Deal } from '../../types';

/* CLV/LTV — CMO เสนอทุกศุกร์ · สูตร AOV×freq×lifespan×margin, LTV:CAC 3:1 */

const withDeals = (deals: Deal[]): AppData => ({
  ...DEFAULT_DATA,
  marketplace: { ...DEFAULT_DATA.marketplace, deals },
});
const closed = (amount: number, i: number): Deal =>
  ({ id: `d${i}`, partnerId: `p${i}`, title: 't', amount, status: 'closed' });

describe('clvSummary', () => {
  it('AOV = ค่าเฉลี่ยดีลที่ปิด + CLV ตามสูตร (freq 2 × life 2 × margin 60%)', () => {
    const c = clvSummary(withDeals([closed(10000, 1), closed(20000, 2)]));
    expect(c.aov).toBe(15000);                       // (10k+20k)/2
    expect(c.clvGross).toBe(15000 * 2 * 2);          // AOV × freq × lifespan
    expect(c.clvMargin).toBe(Math.round(c.clvGross * 0.6));
    expect(c.maxCac).toBe(Math.round(c.clvMargin / 3)); // LTV:CAC 3:1
    expect(c.hasData).toBe(true);
    expect(c.customers).toBe(2);
  });

  it('ดีลที่ยังไม่ปิด ไม่นับเป็น AOV', () => {
    const c = clvSummary(withDeals([
      closed(10000, 1),
      { id: 'd9', partnerId: 'p9', title: 't', amount: 999999, status: 'negotiating' },
    ]));
    expect(c.aov).toBe(10000);
    expect(c.customers).toBe(1);
  });

  it('ไม่มีดีล/รายได้ → hasData false', () => {
    const c = clvSummary(withDeals([]));
    expect(c.hasData).toBe(false);
    expect(clvText(withDeals([]))).toContain('ยังไม่มีข้อมูล');
  });

  it('clvText มีสัญลักษณ์เงินบาทเมื่อมีข้อมูล', () => {
    expect(clvText(withDeals([closed(50000, 1)]))).toContain('฿');
  });
});
