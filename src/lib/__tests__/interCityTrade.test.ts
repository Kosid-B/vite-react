import { describe, it, expect } from 'vitest';
import { tradeOpportunities, tradeReport, closeTrade } from '../interCityTrade';
import { DEFAULT_DATA } from '../../data';
import type { AppData, MarketPartner, Deal } from '../../types';

/* การค้าระหว่างเมือง → ลงบัญชีจริง (fee 3%) — เลขเงินต้องแม่น ไม่งั้นคลังเมืองเพี้ยน */

const partner = (over: Partial<MarketPartner>): MarketPartner => ({
  id: 'p1', name: 'ร้านA', category: 'สินค้า', desc: '', rating: 4, priceFrom: 5000,
  location: 'กรุงเทพ', verified: true, ...over,
});

const withMarket = (partners: MarketPartner[], deals: Deal[] = [], feePct = 3): AppData => ({
  ...DEFAULT_DATA,
  marketplace: { ...DEFAULT_DATA.marketplace, feePct, partners, deals },
});

describe('tradeOpportunities', () => {
  it('เว้นพาร์ตเนอร์ที่ปิดดีลไปแล้ว + เรียงตาม score มาก→น้อย', () => {
    const d = withMarket(
      [partner({ id: 'p1', rating: 3 }), partner({ id: 'p2', rating: 5 }), partner({ id: 'p3', rating: 4 })],
      [{ id: 'd1', partnerId: 'p3', title: 'x', amount: 1000, status: 'closed' }],
    );
    const ops = tradeOpportunities(d);
    expect(ops.map(o => o.partnerId)).toEqual(['p2', 'p1']);        // p3 ปิดแล้ว → ตัดออก
    expect(ops[0].score).toBeGreaterThanOrEqual(ops[1].score);       // เรียง desc
  });

  it('หมวดบริการ (ที่ปรึกษา/การตลาด) = ทิศ buy, อื่น ๆ = sell', () => {
    const d = withMarket([partner({ id: 'a', category: 'บริการที่ปรึกษา' }), partner({ id: 'b', category: 'อาหาร' })]);
    const byId = Object.fromEntries(tradeOpportunities(d).map(o => [o.partnerId, o.direction]));
    expect(byId.a).toBe('buy');
    expect(byId.b).toBe('sell');
  });

  it('ทนพาร์ตเนอร์ข้อมูลไม่ครบ (category/rating/name ขาด) โดยไม่ throw — กันหน้าเพจล่ม', () => {
    // จำลอง data จริงจาก localStorage/Supabase ที่ field หาย (TS type ไม่การันตี runtime)
    const bad = [
      { id: 'x1', priceFrom: 1000, verified: false } as unknown as MarketPartner,          // ไม่มี category/rating/name
      { id: 'x2', category: 'อาหาร', rating: NaN, priceFrom: undefined } as unknown as MarketPartner,
      null as unknown as MarketPartner,                                                      // partner ว่าง
    ];
    const d = withMarket(bad);
    expect(() => tradeOpportunities(d)).not.toThrow();
    const ops = tradeOpportunities(d);
    expect(ops.length).toBe(2);                     // null ถูกกรองออก
    expect(ops.every(o => Number.isFinite(o.estValue) && Number.isFinite(o.score))).toBe(true);
    expect(ops.every(o => o.direction === 'sell' || o.direction === 'buy')).toBe(true);
  });

  it('tradeReport กับพาร์ตเนอร์เสีย → ตัวเลขไม่เป็น NaN', () => {
    const d = withMarket([{ id: 'x1', verified: true } as unknown as MarketPartner]);
    const r = tradeReport(d);
    expect(Number.isFinite(r.gmv)).toBe(true);
    expect(Number.isFinite(r.fee)).toBe(true);
    expect(Number.isFinite(r.net)).toBe(true);
  });
});

describe('tradeReport — fee/net invariant', () => {
  it('fee = round(gmv × feePct/100), net = gmv − fee', () => {
    const r = tradeReport(withMarket([partner({ id: 'p1' }), partner({ id: 'p2', rating: 5 })], [], 3));
    expect(r.fee).toBe(Math.round((r.gmv * r.feePct) / 100));
    expect(r.net).toBe(r.gmv - r.fee);
    expect(r.count).toBe(r.opportunities.length);
  });
});

describe('closeTrade — ลงบัญชี', () => {
  it('sell → เพิ่ม deal(closed) + รายได้ = estValue − fee', () => {
    const d = withMarket([partner({ id: 'p1' })]);
    const op = tradeOpportunities(d).find(o => o.direction === 'sell')!;
    const fee = Math.round((op.estValue * 3) / 100);
    const next = closeTrade(d, op);
    expect(next.marketplace.deals.length).toBe(d.marketplace.deals.length + 1);
    const entry = next.finance!.find(e => e.id.startsWith('f_trade_'))!;
    expect(entry.kind).toBe('revenue');
    expect(entry.amount).toBe(op.estValue - fee);
  });

  it('buy → รายจ่าย = estValue เต็ม (ไม่หัก fee)', () => {
    const d = withMarket([partner({ id: 'p1', category: 'บริการการตลาด' })]);
    const op = tradeOpportunities(d).find(o => o.direction === 'buy')!;
    const entry = closeTrade(d, op).finance!.find(e => e.id.startsWith('f_trade_'))!;
    expect(entry.kind).toBe('expense');
    expect(entry.amount).toBe(op.estValue);
  });

  it('ไม่กลายพันธุ์ AppData เดิม (immutability)', () => {
    const d = withMarket([partner({ id: 'p1' })]);
    const beforeDeals = d.marketplace.deals.length;
    closeTrade(d, tradeOpportunities(d)[0]);
    expect(d.marketplace.deals.length).toBe(beforeDeals);
  });
});
