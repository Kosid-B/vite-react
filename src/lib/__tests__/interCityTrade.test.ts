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
