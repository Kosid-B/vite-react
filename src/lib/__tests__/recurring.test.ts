import { describe, it, expect } from 'vitest';
import {
  recurringSchedule, recurringPlanPayload, workspaceIdFromReference,
  parseRecurringEvent, applyRecurringEvent,
} from '../../../supabase/functions/_shared/recurring';
import type { SubState } from '../../../supabase/functions/_shared/subscription';

/* Recurring/auto-renew — payload builder + state machine ตาม event (idempotent) */

const NOW = new Date('2026-07-08T00:00:00.000Z');
const ctx = { now: NOW, invoiceId: 'inv_x' };

describe('recurringSchedule / payload', () => {
  it('monthly = 1 เดือน, yearly = 12 เดือน', () => {
    expect(recurringSchedule('monthly')).toEqual({ interval: 'MONTH', interval_count: 1 });
    expect(recurringSchedule('yearly')).toEqual({ interval: 'MONTH', interval_count: 12 });
  });

  it('recurringPlanPayload มี field ครบตาม Xendit Recurring API', () => {
    const p = recurringPlanPayload({
      referenceId: 'rec_ws1_growth_monthly_abc', customerId: 'cust_1',
      plan: 'growth', cycle: 'monthly', amount: 1490,
      successUrl: 'https://x/ok', failureUrl: 'https://x/no',
    });
    expect(p.reference_id).toBe('rec_ws1_growth_monthly_abc');
    expect(p.customer_id).toBe('cust_1');
    expect(p.amount).toBe(1490);
    expect(p.currency).toBe('THB');
    expect((p.schedule as Record<string, unknown>).interval_count).toBe(1);
    expect((p.metadata as Record<string, unknown>).plan_id).toBe('growth');
  });
});

describe('workspaceIdFromReference', () => {
  it('ถอด workspaceId จาก reference_id', () => {
    expect(workspaceIdFromReference('rec_ws-123_growth_yearly_zz')).toBe('ws-123');
    expect(workspaceIdFromReference('garbage')).toBe('');
  });
});

describe('parseRecurringEvent', () => {
  it('strip prefix recurring. + ถอด plan/cycle จาก reference เมื่อ metadata ว่าง', () => {
    const evt = parseRecurringEvent({
      event: 'recurring.cycle.succeeded',
      data: { id: 'cyc_1', plan_id: 'plan_1', amount: 1490, reference_id: 'rec_ws9_scale_yearly_tt' },
    });
    expect(evt.type).toBe('cycle.succeeded');
    expect(evt.id).toBe('cyc_1');
    expect(evt.plan).toBe('scale');
    expect(evt.cycle).toBe('yearly');
    expect(workspaceIdFromReference(evt.referenceId)).toBe('ws9');
  });

  it('event ที่ไม่รู้จัก → type unknown', () => {
    expect(parseRecurringEvent({ event: 'recurring.something.else', data: {} }).type).toBe('unknown');
  });
});

describe('applyRecurringEvent', () => {
  const cycleOk = parseRecurringEvent({
    event: 'recurring.cycle.succeeded',
    data: { id: 'cyc_1', plan_id: 'plan_1', amount: 1490, metadata: { plan_id: 'growth', cycle: 'monthly' } },
  });

  it('cycle.succeeded → active + invoice + period +1 เดือน', () => {
    const { state, changed } = applyRecurringEvent({}, cycleOk, ctx);
    expect(changed).toBe(true);
    expect(state.subscription?.status).toBe('active');
    expect(state.subscription?.plan).toBe('growth');
    expect(state.subscription?.currentPeriodEnd).toBe('2026-08-08T00:00:00.000Z');
    expect(state.subscription?.invoices?.[0].xenditId).toBe('cyc_1');
  });

  it('cycle.succeeded ซ้ำ (id เดิม) → ไม่เปลี่ยน (idempotent)', () => {
    const first = applyRecurringEvent({}, cycleOk, ctx).state;
    const again = applyRecurringEvent(first, cycleOk, { ...ctx, invoiceId: 'inv_y' });
    expect(again.changed).toBe(false);
    expect(again.state).toBe(first);
  });

  it('cycle.failed → past_due (และซ้ำ = ไม่เปลี่ยน)', () => {
    const failed = parseRecurringEvent({ event: 'recurring.cycle.failed', data: { id: 'c2' } });
    const r1 = applyRecurringEvent({ subscription: { status: 'active' } } as SubState, failed, ctx);
    expect(r1.state.subscription?.status).toBe('past_due');
    expect(applyRecurringEvent(r1.state, failed, ctx).changed).toBe(false);
  });

  it('plan.inactivated → canceled', () => {
    const off = parseRecurringEvent({ event: 'recurring.plan.inactivated', data: { id: 'p1' } });
    const r = applyRecurringEvent({ subscription: { status: 'active' } } as SubState, off, ctx);
    expect(r.state.subscription?.status).toBe('canceled');
  });

  it('unknown → ไม่เปลี่ยน', () => {
    const u = parseRecurringEvent({ event: 'recurring.x', data: {} });
    expect(applyRecurringEvent({ subscription: { status: 'active' } } as SubState, u, ctx).changed).toBe(false);
  });
});
