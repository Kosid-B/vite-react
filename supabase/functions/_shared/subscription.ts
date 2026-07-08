// ===== ตรรกะ subscription state (pure, ไม่มี Deno/network) — ใช้ร่วม webhook + ทดสอบได้ =====
// แยกออกจาก edge function เพื่อให้ unit-test ได้ (vitest) และรับประกัน idempotency ของ webhook
// ปัญหาเดิม: Xendit ยิง callback ซ้ำได้ (retry) → invoice ซ้ำ + reset subscription/period ซ้ำ
// ทางแก้: dedupe ด้วย xenditId (invoice id ของ Xendit) ก่อนบันทึก

export interface InvoiceRec {
  id: string;
  xenditId: string;   // idempotency key จาก Xendit (evt.id / external_id)
  date: string;
  plan: string;
  amount: number;
  status: string;
}

export interface SubState {
  subscription?: {
    plan?: string;
    status?: string;
    billingCycle?: string;
    trialEndDate?: unknown;
    invoices?: InvoiceRec[];
    currentPeriodEnd?: string;
    recurringPlanId?: string;   // Xendit recurring plan id (auto-renew)
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

/** วันสิ้นสุดรอบบิล (รายเดือน +1 / รายปี +12) — คำนวณจาก now ที่ส่งเข้า (ทดสอบได้) */
export function periodEndFrom(cycle: string, now: Date): string {
  const d = new Date(now.getTime());
  d.setMonth(d.getMonth() + (cycle === 'yearly' ? 12 : 1));
  return d.toISOString();
}

export interface PaidInput {
  plan: string;
  cycle: string;
  amount: number;
  xenditId: string;   // ตัวระบุจาก Xendit เพื่อกันซ้ำ
  invoiceId: string;  // id ภายในของเรา (สร้างใหม่ต่อครั้ง)
  now: Date;
}

/**
 * ใช้ผลการชำระเงินกับ state แบบ idempotent
 * - ถ้า xenditId นี้เคยบันทึกแล้ว → alreadyProcessed=true, คืน state เดิม (ไม่แตะ)
 * - ถ้าใหม่ → เพิ่ม invoice + เปิดใช้งานแพ็ก + ตั้ง period end
 */
export function applyPaidInvoice(
  state: SubState,
  p: PaidInput,
): { state: SubState; alreadyProcessed: boolean } {
  const sub = state.subscription ?? {};
  const invoices: InvoiceRec[] = Array.isArray(sub.invoices) ? sub.invoices : [];

  if (p.xenditId && invoices.some((i) => i.xenditId === p.xenditId)) {
    return { state, alreadyProcessed: true };
  }

  const nextInvoices: InvoiceRec[] = [
    { id: p.invoiceId, xenditId: p.xenditId, date: p.now.toISOString(), plan: p.plan, amount: p.amount, status: 'paid' },
    ...invoices,
  ];

  return {
    state: {
      ...state,
      subscription: {
        ...sub,
        plan: p.plan,
        status: 'active',
        billingCycle: p.cycle,
        trialEndDate: null,
        invoices: nextInvoices,
        currentPeriodEnd: periodEndFrom(p.cycle, p.now),
      },
    },
    alreadyProcessed: false,
  };
}
