// ===== Refund (คืนเงิน) — pure logic, ทดสอบได้ =====
// Admin คืนเงิน invoice ที่จ่ายผ่าน Xendit (เต็ม/บางส่วน) — validate + ปรับ subscription state
// ใช้ร่วม edge function refund-invoice (หลังยิง Xendit /refunds สำเร็จ) และ record-only ฝั่ง client

import { type InvoiceRec, type SubState } from "./subscription.ts";

/** ยอดที่ยังคืนได้ของ invoice (ยอดจ่าย − ที่คืนไปแล้ว) */
export function refundableAmount(inv: InvoiceRec): number {
  return Math.max(0, (inv.amount ?? 0) - (inv.refunded ?? 0));
}

/** หา invoice จาก xenditId หรือ id ภายใน */
export function findInvoice(state: SubState, ref: string): InvoiceRec | undefined {
  const invoices = state.subscription?.invoices ?? [];
  return invoices.find((i) => i.xenditId === ref || i.id === ref);
}

export interface RefundValidation { ok: boolean; error?: string; invoice?: InvoiceRec }

/** ตรวจก่อนคืนเงิน: ต้องเจอ invoice, จำนวน > 0 และไม่เกินยอดที่ยังคืนได้ */
export function validateRefund(state: SubState, ref: string, amount: number): RefundValidation {
  const inv = findInvoice(state, ref);
  if (!inv) return { ok: false, error: "invoice_not_found" };
  if (!(amount > 0)) return { ok: false, error: "invalid_amount" };
  if (amount > refundableAmount(inv)) return { ok: false, error: "amount_exceeds_refundable" };
  return { ok: true, invoice: inv };
}

export interface RefundInput {
  ref: string;        // xenditId หรือ invoice id
  amount: number;
  reason?: string;
  refundId: string;   // id อ้างอิงการคืน (จาก Xendit หรือ generate)
  now: Date;
}

export interface RefundResult { state: SubState; refunded: boolean; fullyRefunded: boolean; error?: string }

/**
 * บันทึกการคืนเงินลง state:
 *  - เพิ่ม invoice.refunded + ตั้ง status='refunded' เมื่อคืนครบ
 *  - เก็บ audit ใน subscription.refunds[]
 *  - ถ้าคืนเต็มจำนวน (fullyRefunded) → subscription.status='canceled' (เพิกถอนสิทธิ์)
 */
export function applyRefund(state: SubState, p: RefundInput): RefundResult {
  const v = validateRefund(state, p.ref, p.amount);
  if (!v.ok || !v.invoice) return { state, refunded: false, fullyRefunded: false, error: v.error };

  const target = v.invoice;
  const sub = state.subscription ?? {};
  const invoices = sub.invoices ?? [];
  const newRefunded = (target.refunded ?? 0) + p.amount;
  const fully = newRefunded >= (target.amount ?? 0);

  const nextInvoices: InvoiceRec[] = invoices.map((i) =>
    i === target ? { ...i, refunded: newRefunded, status: fully ? "refunded" : i.status } : i
  );

  const refunds = Array.isArray((sub as Record<string, unknown>).refunds)
    ? ((sub as Record<string, unknown>).refunds as unknown[])
    : [];

  return {
    state: {
      ...state,
      subscription: {
        ...sub,
        invoices: nextInvoices,
        refunds: [
          { id: p.refundId, invoiceRef: p.ref, amount: p.amount, reason: p.reason ?? "", date: p.now.toISOString() },
          ...refunds,
        ],
        ...(fully ? { status: "canceled" } : {}),
      },
    },
    refunded: true,
    fullyRefunded: fully,
  };
}
