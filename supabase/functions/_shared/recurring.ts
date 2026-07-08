// ===== Recurring / Subscription (Xendit Recurring API v3) — pure logic, ทดสอบได้ =====
// auto-renew: ตัดเงินอัตโนมัติทุกงวด (ลด churn จากลืมจ่าย)
// ไฟล์นี้ไม่มี Deno/network — edge function (create-recurring-plan / recurring-webhook) เรียกใช้
// state transition ใช้ periodEndFrom + InvoiceRec ร่วมกับ subscription.ts (เลขตรงกันทั้งระบบ)

import { periodEndFrom, type InvoiceRec, type SubState } from "./subscription.ts";

/** งวดบิล → schedule ของ Xendit (รายปีนับเป็น 12 เดือน เพื่อให้ interval เดียวกัน) */
export function recurringSchedule(cycle: string): { interval: "MONTH"; interval_count: number } {
  return { interval: "MONTH", interval_count: cycle === "yearly" ? 12 : 1 };
}

export interface PlanPayloadInput {
  referenceId: string;   // = workspaceId + plan + cycle (unique)
  customerId: string;    // Xendit customer id
  plan: string;          // starter/growth/scale
  cycle: string;         // monthly/yearly
  amount: number;
  successUrl: string;
  failureUrl: string;
}

/** body สำหรับ POST /recurring/plans — builder บริสุทธิ์ (ทดสอบได้ ไม่ยิงเน็ต) */
export function recurringPlanPayload(p: PlanPayloadInput): Record<string, unknown> {
  return {
    reference_id: p.referenceId,
    customer_id: p.customerId,
    recurring_action: "PAYMENT",
    currency: "THB",
    amount: p.amount,
    schedule: {
      reference_id: `sch_${p.referenceId}`,
      ...recurringSchedule(p.cycle),
      total_recurrence: 0,        // 0 = ต่อเนื่องไม่จำกัด (จนกว่ายกเลิก)
    },
    immediate_action_type: "FULL_AMOUNT",   // เก็บงวดแรกทันทีที่ผูกวิธีจ่าย
    failed_cycle_action: "STOP",            // ตัดไม่สำเร็จ → หยุด (ระบบ downgrade)
    metadata: { plan_id: p.plan, cycle: p.cycle },
    success_return_url: p.successUrl,
    failure_return_url: p.failureUrl,
  };
}

/* ----- Webhook events (recurring.*) → normalized ----- */
export type RecurringEventType =
  | "cycle.succeeded" | "cycle.failed"
  | "plan.activated" | "plan.inactivated" | "unknown";

export interface RecurringEvent {
  type: RecurringEventType;
  id: string;          // cycle/event id — ใช้กันซ้ำ
  planId: string;
  referenceId: string; // reference_id ของ plan (ฝัง workspaceId ไว้)
  amount: number;
  plan: string;        // จาก metadata หรือถอดจาก referenceId
  cycle: string;       // จาก metadata หรือถอดจาก referenceId
}

const REF_RE = /^rec_(.+)_(starter|growth|scale)_(monthly|yearly)_/;

/** ถอด workspaceId จาก reference_id ของ plan (`rec_<wsId>_<plan>_<cycle>_<ts>`) — '' ถ้าไม่ตรง */
export function workspaceIdFromReference(referenceId: string): string {
  const m = REF_RE.exec(referenceId || "");
  return m ? m[1] : "";
}

/** แปลง raw webhook payload ของ Xendit → event ที่ใช้งานง่าย (บริสุทธิ์) */
export function parseRecurringEvent(raw: unknown): RecurringEvent {
  const r = (raw ?? {}) as Record<string, any>;
  const data = (r.data ?? {}) as Record<string, any>;
  const meta = (data.metadata ?? {}) as Record<string, any>;
  const evtName = String(r.event ?? "").replace(/^recurring\./, "");
  const known: RecurringEventType[] = ["cycle.succeeded", "cycle.failed", "plan.activated", "plan.inactivated"];
  const referenceId = String(data.reference_id ?? data.plan?.reference_id ?? "");
  const refMatch = REF_RE.exec(referenceId);
  return {
    type: (known.includes(evtName as RecurringEventType) ? evtName : "unknown") as RecurringEventType,
    id: String(data.id ?? ""),
    planId: String(data.plan_id ?? data.id ?? ""),
    referenceId,
    amount: Number(data.amount ?? 0),
    plan: String(meta.plan_id ?? (refMatch ? refMatch[2] : "")),
    cycle: (meta.cycle ?? (refMatch ? refMatch[3] : "monthly")) === "yearly" ? "yearly" : "monthly",
  };
}

export interface ApplyResult { state: SubState; changed: boolean }

/**
 * ปรับ subscription state ตาม event แบบ idempotent:
 *   cycle.succeeded  → active + เพิ่ม invoice (กันซ้ำด้วย id) + ต่อ period
 *   cycle.failed     → past_due (ผ่อนผัน — ยังไม่ตัดสิทธิ์ทันที)
 *   plan.activated   → active
 *   plan.inactivated → canceled
 *   unknown          → ไม่เปลี่ยน
 */
export function applyRecurringEvent(
  state: SubState,
  evt: RecurringEvent,
  ctx: { now: Date; invoiceId: string },
): ApplyResult {
  const sub = state.subscription ?? {};

  if (evt.type === "cycle.succeeded") {
    const invoices: InvoiceRec[] = Array.isArray(sub.invoices) ? sub.invoices : [];
    if (evt.id && invoices.some((i) => i.xenditId === evt.id)) {
      return { state, changed: false };           // งวดนี้บันทึกแล้ว
    }
    const plan = evt.plan || String(sub.plan ?? "");
    const cycle = evt.cycle;
    const nextInvoices: InvoiceRec[] = [
      { id: ctx.invoiceId, xenditId: evt.id, date: ctx.now.toISOString(), plan, amount: evt.amount, status: "paid" },
      ...invoices,
    ];
    return {
      state: {
        ...state,
        subscription: {
          ...sub, plan, status: "active", billingCycle: cycle,
          trialEndDate: null, invoices: nextInvoices,
          currentPeriodEnd: periodEndFrom(cycle, ctx.now),
          recurringPlanId: evt.planId || sub.recurringPlanId,
        },
      },
      changed: true,
    };
  }

  if (evt.type === "cycle.failed") {
    if (sub.status === "past_due") return { state, changed: false };
    return { state: { ...state, subscription: { ...sub, status: "past_due" } }, changed: true };
  }

  if (evt.type === "plan.activated") {
    const plan = evt.plan || String(sub.plan ?? "");
    if (sub.status === "active" && sub.recurringPlanId === evt.planId) return { state, changed: false };
    return { state: { ...state, subscription: { ...sub, plan, status: "active", recurringPlanId: evt.planId } }, changed: true };
  }

  if (evt.type === "plan.inactivated") {
    if (sub.status === "canceled") return { state, changed: false };
    return { state: { ...state, subscription: { ...sub, status: "canceled" } }, changed: true };
  }

  return { state, changed: false };   // unknown
}
