import { describe, it, expect } from 'vitest';
import { applyPaidInvoice, periodEndFrom, type SubState } from '../../../supabase/functions/_shared/subscription';

/* กัน Xendit webhook ประมวลผลซ้ำ (callback retry) — invoice/period ต้องไม่ซ้ำ (idempotent) */

const NOW = new Date('2026-07-08T00:00:00.000Z');
const base = (over: Partial<PaidArg> = {}) => ({
  plan: 'growth', cycle: 'monthly', amount: 1490,
  xenditId: 'xnd_inv_1', invoiceId: 'inv_a', now: NOW, ...over,
});
type PaidArg = Parameters<typeof applyPaidInvoice>[1];

describe('applyPaidInvoice — idempotency', () => {
  it('ครั้งแรก → เปิดแพ็ก + เพิ่ม invoice + ตั้ง period end (+1 เดือน)', () => {
    const { state, alreadyProcessed } = applyPaidInvoice({}, base());
    expect(alreadyProcessed).toBe(false);
    expect(state.subscription?.status).toBe('active');
    expect(state.subscription?.plan).toBe('growth');
    expect(state.subscription?.invoices).toHaveLength(1);
    expect(state.subscription?.invoices?.[0].xenditId).toBe('xnd_inv_1');
    expect(state.subscription?.currentPeriodEnd).toBe('2026-08-08T00:00:00.000Z');
    expect(state.subscription?.trialEndDate).toBeNull();
  });

  it('callback ซ้ำ (xenditId เดิม) → alreadyProcessed + state เดิมไม่แตะ', () => {
    const first = applyPaidInvoice({}, base()).state;
    const again = applyPaidInvoice(first, base({ invoiceId: 'inv_b' }));
    expect(again.alreadyProcessed).toBe(true);
    expect(again.state).toBe(first);                       // อ้างอิงเดิม (ไม่สร้างใหม่)
    expect(again.state.subscription?.invoices).toHaveLength(1); // ไม่เพิ่มซ้ำ
  });

  it('invoice ใหม่ (xenditId ต่าง) → เพิ่มต่อท้ายด้านหน้า (ไม่ทับของเดิม)', () => {
    const first = applyPaidInvoice({}, base()).state;
    const second = applyPaidInvoice(first, base({ xenditId: 'xnd_inv_2', invoiceId: 'inv_c' }));
    expect(second.alreadyProcessed).toBe(false);
    expect(second.state.subscription?.invoices).toHaveLength(2);
    expect(second.state.subscription?.invoices?.[0].xenditId).toBe('xnd_inv_2'); // ใหม่อยู่บนสุด
  });

  it('รายปี → period end +12 เดือน', () => {
    const { state } = applyPaidInvoice({}, base({ cycle: 'yearly' }));
    expect(state.subscription?.currentPeriodEnd).toBe('2027-07-08T00:00:00.000Z');
  });

  it('รักษา key อื่นใน state ไว้ (ไม่ล้างข้อมูล workspace)', () => {
    const prev: SubState = { finance: [{ x: 1 }], subscription: { plan: 'free' } } as unknown as SubState;
    const { state } = applyPaidInvoice(prev, base());
    expect((state as Record<string, unknown>).finance).toEqual([{ x: 1 }]);
  });
});

describe('periodEndFrom', () => {
  it('monthly +1 / yearly +12', () => {
    expect(periodEndFrom('monthly', NOW)).toBe('2026-08-08T00:00:00.000Z');
    expect(periodEndFrom('yearly', NOW)).toBe('2027-07-08T00:00:00.000Z');
  });
});
