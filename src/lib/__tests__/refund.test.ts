import { describe, it, expect } from 'vitest';
import { refundableAmount, findInvoice, validateRefund, applyRefund } from '../../../supabase/functions/_shared/refund';
import type { SubState, InvoiceRec } from '../../../supabase/functions/_shared/subscription';

/* Refund — Admin คืนเงิน (เต็ม/บางส่วน) · ยอดต้องไม่เกินที่จ่าย + คืนเต็ม = เพิกถอนสิทธิ์ */

const inv = (over: Partial<InvoiceRec> = {}): InvoiceRec =>
  ({ id: 'inv1', xenditId: 'xnd_1', date: '2026-07-01', plan: 'growth', amount: 1490, status: 'paid', ...over });
const withInvoices = (invoices: InvoiceRec[], status = 'active'): SubState =>
  ({ subscription: { plan: 'growth', status, invoices } });

const NOW = new Date('2026-07-08T00:00:00.000Z');
const rid = 'rf_1';

describe('refundableAmount / findInvoice', () => {
  it('ยอดคืนได้ = จ่าย − คืนแล้ว (ไม่ติดลบ)', () => {
    expect(refundableAmount(inv())).toBe(1490);
    expect(refundableAmount(inv({ refunded: 500 }))).toBe(990);
    expect(refundableAmount(inv({ refunded: 9999 }))).toBe(0);
  });
  it('หา invoice ด้วย xenditId หรือ id', () => {
    const s = withInvoices([inv()]);
    expect(findInvoice(s, 'xnd_1')?.id).toBe('inv1');
    expect(findInvoice(s, 'inv1')?.xenditId).toBe('xnd_1');
    expect(findInvoice(s, 'nope')).toBeUndefined();
  });
});

describe('validateRefund', () => {
  const s = withInvoices([inv({ refunded: 490 })]);   // เหลือคืนได้ 1000
  it('เจอ invoice + จำนวนพอดี → ok', () => {
    expect(validateRefund(s, 'xnd_1', 1000).ok).toBe(true);
  });
  it('ไม่เจอ / จำนวน ≤ 0 / เกินยอดคืนได้ → error', () => {
    expect(validateRefund(s, 'zzz', 100).error).toBe('invoice_not_found');
    expect(validateRefund(s, 'xnd_1', 0).error).toBe('invalid_amount');
    expect(validateRefund(s, 'xnd_1', 1001).error).toBe('amount_exceeds_refundable');
  });
});

describe('applyRefund', () => {
  it('คืนบางส่วน → เพิ่ม refunded, invoice ยัง paid, subscription ยัง active', () => {
    const { state, refunded, fullyRefunded } = applyRefund(withInvoices([inv()]), { ref: 'xnd_1', amount: 500, refundId: rid, now: NOW });
    expect(refunded).toBe(true);
    expect(fullyRefunded).toBe(false);
    expect(state.subscription?.invoices?.[0].refunded).toBe(500);
    expect(state.subscription?.invoices?.[0].status).toBe('paid');
    expect(state.subscription?.status).toBe('active');
  });

  it('คืนเต็มจำนวน → invoice refunded + subscription canceled + audit', () => {
    const { state, fullyRefunded } = applyRefund(withInvoices([inv()]), { ref: 'xnd_1', amount: 1490, reason: 'ลูกค้ายกเลิก', refundId: rid, now: NOW });
    expect(fullyRefunded).toBe(true);
    expect(state.subscription?.invoices?.[0].status).toBe('refunded');
    expect(state.subscription?.status).toBe('canceled');
    const refunds = (state.subscription as Record<string, unknown>).refunds as Array<Record<string, unknown>>;
    expect(refunds[0]).toMatchObject({ id: rid, amount: 1490, reason: 'ลูกค้ายกเลิก' });
  });

  it('คืน 2 ครั้งรวมเป็นเต็ม → ครั้งที่สองทำให้ canceled', () => {
    const s1 = applyRefund(withInvoices([inv()]), { ref: 'xnd_1', amount: 490, refundId: 'r1', now: NOW }).state;
    expect(s1.subscription?.status).toBe('active');
    const s2 = applyRefund(s1, { ref: 'xnd_1', amount: 1000, refundId: 'r2', now: NOW });
    expect(s2.fullyRefunded).toBe(true);
    expect(s2.state.subscription?.invoices?.[0].refunded).toBe(1490);
    expect(s2.state.subscription?.status).toBe('canceled');
  });

  it('invalid (เกินยอด) → ไม่เปลี่ยน state', () => {
    const s = withInvoices([inv()]);
    const r = applyRefund(s, { ref: 'xnd_1', amount: 99999, refundId: rid, now: NOW });
    expect(r.refunded).toBe(false);
    expect(r.state).toBe(s);
  });
});
