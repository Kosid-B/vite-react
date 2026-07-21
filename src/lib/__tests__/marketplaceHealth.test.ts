import { describe, it, expect } from 'vitest';
import { marketplaceHealth } from '../marketplaceHealth';
import type { Rfq, Order } from '../trade';

const rfq = (id: string, status: Rfq['status']): Rfq => ({
  id, buyerWs: 'b', buyerName: 'B', sellerSlug: 's', sector: '', title: 't', detail: '',
  budget: 100, contact: '', status, quoteAmount: 90, quoteNote: '', createdAt: '2026-07-01',
});
const order = (id: string, status: Order['status'], amount: number): Order => ({
  id, rfqId: null, buyerWs: 'b', sellerWs: 's', title: 't', amount, fee: 0, status, createdAt: '2026-07-01',
});

describe('marketplaceHealth', () => {
  it('ว่างเปล่า → stage none', () => {
    const h = marketplaceHealth([], []);
    expect(h.stage).toBe('none');
    expect(h.rfqTotal).toBe(0);
    expect(h.quoteRate).toBe(0);
  });
  it('มี RFQ แต่ยังไม่ตอบ → waiting', () => {
    expect(marketplaceHealth([rfq('1', 'open')], []).stage).toBe('waiting');
  });
  it('มีใบเสนอราคา → quoted + quoteRate', () => {
    const h = marketplaceHealth([rfq('1', 'open'), rfq('2', 'quoted')], []);
    expect(h.stage).toBe('quoted');
    expect(h.quoted).toBe(1);
    expect(h.quoteRate).toBeCloseTo(0.5);
  });
  it('มีออเดอร์ (accepted) แต่ยังไม่ completed → near', () => {
    const h = marketplaceHealth([rfq('1', 'accepted')], [order('o1', 'paid', 90)]);
    expect(h.stage).toBe('near');
    expect(h.accepted).toBe(1);
  });
  it('ปิดดีลสำเร็จ → flowing + GMV รวม', () => {
    const h = marketplaceHealth([rfq('1', 'accepted')], [order('o1', 'completed', 90), order('o2', 'completed', 10)]);
    expect(h.stage).toBe('flowing');
    expect(h.dealsCompleted).toBe(2);
    expect(h.gmvCompleted).toBe(100);
    expect(h.closeRate).toBeCloseTo(2 / 1); // completed/accepted (ตามนิยาม funnel)
  });
  it('dedupe RFQ ซ้ำ id', () => {
    const h = marketplaceHealth([rfq('1', 'quoted'), rfq('1', 'quoted')], []);
    expect(h.rfqTotal).toBe(1);
  });
});
