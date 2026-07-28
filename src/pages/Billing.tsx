import { useEffect, useState } from 'react';
import type { AppData, PlanId, Invoice, SubStatus } from '../types';
import { promptPayPayload, promptPayQrUrl, baht } from '../utils';
import { BRAND, COMPANY, PAYMENT } from '../config';
import { getAiUsage, PLAN_AI_CALLS } from '../lib/usage';
import { TOPUP_PACKS, pricePerCall, type TopupPack } from '../lib/topup';
import { GRACE_DAYS, annualPrice } from '../lib/access';
import { callCostThb, CALL_PROFILE } from '../lib/aiCost';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { submitPaymentSlip, listMyPayments, verifySlip, slipReasonText } from '../lib/payments';
import { track } from '../lib/analytics';
import ExpertEdge from '../components/ExpertEdge';

function addDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}
function addMonths(iso: string, n: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString();
}
function thaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}
function daysLeft(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
  wsId?: string | null;
}

interface Plan {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  apiCalls: number;
  features: string[];
  highlight?: boolean;
  costPerMonth: number;
}

interface CostItem { label: string; amount: number; note: string; }
interface PlanCost { items: CostItem[]; total: number; price: number; margin: number; }

/* ต้นทุน AI คิดจาก "blended cost จริง" (aiCost.ts) ไม่ใช่ ฿0.76/call (เคส agent หนักสุด) —
 * mix งานจริง 50% assist / 20% plan / 30% agent → ~฿0.49/call (Sonnet)
 * ที่มา: docs/marketing/PRICING-MARGIN-ANALYSIS.md */
const BLENDED_CALL_THB =
  0.5 * callCostThb('claude-sonnet-4-6', CALL_PROFILE.assist.in, CALL_PROFILE.assist.out) +
  0.2 * callCostThb('claude-sonnet-4-6', CALL_PROFILE.plan.in, CALL_PROFILE.plan.out) +
  0.3 * callCostThb('claude-sonnet-4-6', CALL_PROFILE.agent.in, CALL_PROFILE.agent.out);

/** สร้าง PlanCost จาก quota จริง + ค่า infra/support — margin คำนวณสด (กัน hardcode ล้าสมัย) */
function buildCost(calls: number, price: number, infra: number, support: number, infraNote: string, supportNote: string): PlanCost {
  const ai = Math.round(calls * BLENDED_CALL_THB);
  const total = ai + infra + support;
  return {
    items: [
      { label: 'Claude AI API', amount: ai, note: `${calls.toLocaleString()} calls × ~฿${BLENDED_CALL_THB.toFixed(2)}/call (blended · Sonnet)` },
      { label: 'Supabase + Hosting', amount: infra, note: infraNote },
      { label: 'Support & Development', amount: support, note: supportNote },
    ],
    total, price,
    margin: +(((price - total) / price) * 100).toFixed(1),
  };
}

const COST: Record<string, PlanCost> = {
  starter: buildCost(300, 590, 60, 25, 'Database, Edge Functions, Storage', 'ทีมพัฒนาและดูแลระบบ'),
  growth: buildCost(1000, 1490, 250, 180, 'Database, Edge Functions, Storage', 'ทีมพัฒนาและดูแลระบบ'),
  scale: buildCost(5000, 5900, 550, 300, 'Database, Edge Functions, Storage (priority tier)', 'ทีมพัฒนาและดูแลระบบ (dedicated)'),
};

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'ทดลองใช้ฟรี',
    price: 0,
    tagline: 'ลองใช้ 15 วัน ไม่ต้องผูกบัตรเครดิต',
    apiCalls: 200,
    costPerMonth: 0,
    features: [
      'เอเจนต์ AI สูงสุด 3 ตัว',
      'AI calls 200 ครั้ง (ช่วงทดลอง)',
      'งาน 20 งาน/ช่วงทดลอง',
      'เชื่อมต่อ 1 เครื่องมือ',
      'รองรับภาษาไทยเต็มรูปแบบ',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 590,
    tagline: 'เพิ่งเริ่มธุรกิจ — จ่ายเบาๆ เมื่อเริ่มมีรายได้',
    apiCalls: 300,
    costPerMonth: 232,
    features: [
      'ทุกอย่างในแพ็กฟรี',
      'AI calls 300 ครั้ง/เดือน',
      'ซื้อขาย B2B (RFQ) + ออเดอร์',
      'หน้าร้านสาธารณะ + สารบัญธุรกิจ',
      'เอเจนต์ AI สูงสุด 5 ตัว',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 1490,
    tagline: 'สำหรับ SME ที่ต้องการทีม AI ทำงานจริง',
    apiCalls: 1000,
    costPerMonth: 1190,
    highlight: true,
    features: [
      'เอเจนต์ AI ไม่จำกัด',
      'AI calls 1,000 ครั้ง/เดือน',
      'งานในระบบไม่จำกัด',
      'เชื่อมต่อทุกเครื่องมือ',
      'บอร์ดอนุมัติ + แจ้งเตือน',
      'รายงานผลรายสัปดาห์',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 5900,
    tagline: 'สำหรับองค์กรที่ต้องการหลายทีม AI พร้อมกัน',
    apiCalls: 5000,
    costPerMonth: 4650,
    features: [
      'ทุกอย่างในแพ็ก Growth',
      'AI calls 5,000 ครั้ง/เดือน',
      'หลายบริษัท AI พร้อมกัน',
      'API ส่วนตัว + Webhook',
      'ใบกำกับภาษีเต็มรูปแบบ',
      'ผู้ดูแลบัญชีเฉพาะ',
    ],
  },
];

// แพ็กรายปี — จ่ายเท่า ~10 เดือน (ประหยัด ~17% และลด churn)
// ที่มาราคา = canonical helper ใน access.ts (annualPrice) กันเลขรายปี drift จาก 2 ที่
const YEARLY_PRICE: Record<PlanId, number> = {
  free: annualPrice('free'), starter: annualPrice('starter'),
  growth: annualPrice('growth'), scale: annualPrice('scale'),
};

export default function Billing({ data, onUpdate, wsId }: Props) {
  // PLG: usage meter + referral link
  const [refCopied, setRefCopied] = useState(false);
  const aiUsed = getAiUsage().count;
  const aiQuota = PLAN_AI_CALLS[data.subscription.plan];
  const aiPct = Math.min(100, Math.round((aiUsed / aiQuota) * 100));
  const refLink = 'https://ceoaithailand.org/?ref=' + (data.aiCompany.name || 'friend').replace(/\s+/g, '-');
  const copyRef = () => {
    navigator.clipboard?.writeText(refLink).then(() => {
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2000);
    });
  };
  const sub = data.subscription;
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>(sub.billingCycle ?? 'monthly');
  const priceFor = (id: PlanId) => cycle === 'yearly' ? YEARLY_PRICE[id] : (PLANS.find(p => p.id === id)?.price ?? 0);
  const [selected, setSelected] = useState<PlanId>(sub.plan === 'free' && sub.status !== 'trial' ? 'growth' : sub.plan);
  const [copied, setCopied] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState<Invoice | null>(null);
  const [showCost, setShowCost] = useState(false);
  const [topupPack, setTopupPack] = useState<TopupPack | null>(null); // แพ็ก top-up ที่เลือกซื้อ
  const [payBusy, setPayBusy] = useState(false);
  const [payErr, setPayErr] = useState<string | null>(null);
  const [slipBusy, setSlipBusy] = useState(false);
  const [slipMsg, setSlipMsg] = useState<string | null>(null);

  /** เปิดใช้งานแพ็กจากสลิป 1 ใบ (ใช้ทั้งตอนอัปทันที + ตอน re-open หน้า) — client เจ้าของ workspace ทำเอง
   *  PLG: ไม่รอ admin อนุมัติ · autoRenew=false → cron เตือน+ผ่อนผัน+ตัด (กัน 'เดือนฟรีไม่สิ้นสุด') */
  function activateFromSlip(sub: { id: string; plan: string; cycle: string; amount: number }, applied: string[], announce = false) {
    const now = new Date().toISOString();
    const invoice: Invoice = { id: 'inv-' + sub.id.slice(0, 8), date: now, plan: sub.plan as PlanId, amount: sub.amount, status: 'paid' };
    onUpdate({
      ...data,
      appliedPaymentIds: [...applied, sub.id],
      subscription: {
        ...data.subscription,
        plan: sub.plan as PlanId,
        status: 'active',
        autoRenew: false,
        billingCycle: sub.cycle as 'monthly' | 'yearly',
        currentPeriodEnd: addMonths(now, sub.cycle === 'yearly' ? 12 : 1),
        trialEndDate: null,
        invoices: [invoice, ...data.subscription.invoices],
      },
    });
    if (announce) setSlipMsg('✅ เปิดใช้งานแพ็ก ' + sub.plan.toUpperCase() + ' แล้ว! (แอดมินจะตรวจสลิปย้อนหลัง)');
    // GA4 purchase — รายได้จริง (ผู้ใช้ยืนยันด้วยสลิป)
    track('purchase', { transaction_id: invoice.id, value: sub.amount, currency: 'THB', plan: sub.plan, cycle: sub.cycle });
  }

  // ตรวจสลิปของ workspace ตัวเองเมื่อเปิดหน้า:
  //   1) สลิปที่แอดมินตรวจย้อนหลังแล้ว 'ตีกลับ' (rejected) + เคยเปิดแพ็กไปแล้ว → ถอนแพ็กกลับ free (กันสลิปปลอม)
  //   2) สลิปที่ยังไม่เปิดแพ็ก (เช่นอัปจากเครื่องอื่น) → เปิดให้ (safety net ของ PLG auto-activate)
  useEffect(() => {
    if (!isSupabaseEnabled || !wsId) return;
    let cancelled = false;
    listMyPayments(wsId).then(subs => {
      if (cancelled) return;
      const applied = data.appliedPaymentIds ?? [];
      const revoked = data.revokedPaymentIds ?? [];

      // (1) ถอนสิทธิ์: สลิปที่ถูกตีกลับหลังเปิดแพ็กไปแล้ว
      const toRevoke = subs.filter(s => s.status === 'rejected' && applied.includes(s.id) && !revoked.includes(s.id));
      if (toRevoke.length) {
        onUpdate({
          ...data,
          revokedPaymentIds: [...revoked, ...toRevoke.map(s => s.id)],
          subscription: { ...data.subscription, plan: 'free', status: 'cancelled', autoRenew: false, currentPeriodEnd: null },
        });
        setSlipMsg('⚠️ สลิปไม่ผ่านการตรวจสอบ — แพ็กถูกปรับกลับเป็น Free กรุณาชำระใหม่หรือติดต่อทีมงาน');
        track('slip_revoked', { count: toRevoke.length });
        return;
      }

      // (2) เปิดแพ็กให้สลิปที่ยังไม่เปิด (ไม่รวมที่ถูกตีกลับ) — เฉพาะโหมด PLG เชื่อผู้ใช้ (!slipOkLive)
      //     เมื่อ slipOkLive: server (verify-slip) เป็นผู้เปิดแพ็กหลังตรวจ SlipOK ผ่านเท่านั้น
      //     → ไม่เปิดฝั่ง client (กันช่องโหว่ "อัปรูปมั่วแล้ว re-open หน้าเพื่อเปิดแพ็ก")
      if (!PAYMENT.slipOkLive) {
        const toActivate = subs.find(s => s.status !== 'rejected' && !applied.includes(s.id));
        if (toActivate) activateFromSlip(toActivate, applied, false);
      }
    }).catch(() => { /* เงียบ — ไม่ทำ UX พัง */ });
    return () => { cancelled = true; };
  }, [wsId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** อัปสลิป → (slipOkLive) ตรวจกับธนาคารจริงผ่าน SlipOK แล้ว server เปิดแพ็ก
   *  (ไม่ live) เปิดแพ็กทันทีแบบ PLG เชื่อผู้ใช้ + แอดมินตรวจย้อนหลัง */
  async function uploadSlip(file?: File) {
    if (!file || !wsId) return;
    setSlipBusy(true);
    setSlipMsg(null);
    track('begin_checkout', { plan: selected, cycle, value: chargeAmount, currency: 'THB', method: 'slip' });
    const { error, id } = await submitPaymentSlip({ wsId, plan: selected, cycle, amount: chargeAmount, file });
    if (error || !id) { setSlipBusy(false); setSlipMsg('⚠️ ' + (error ?? 'อัปสลิปไม่สำเร็จ')); return; }

    if (PAYMENT.slipOkLive) {
      // 🔒 ตรวจกับ record ธนาคารจริง — server เป็นผู้เปิดแพ็ก (client ไม่เปิดเอง = ปิดช่องโหว่)
      setSlipMsg('🔎 กำลังตรวจสลิปกับธนาคาร…');
      const res = await verifySlip({ workspaceId: wsId, submissionId: id, plan: selected, cycle });
      setSlipBusy(false);
      if (!res.ok) {
        track('slip_verify_failed', { reason: res.reason ?? 'unknown' });
        setSlipMsg('⚠️ ' + slipReasonText(res.reason));
        return;
      }
      // sync สถานะจาก server (source of truth) — ไม่คำนวณซ้ำฝั่ง client
      onUpdate({
        ...data,
        appliedPaymentIds: res.appliedPaymentIds ?? [...(data.appliedPaymentIds ?? []), id],
        subscription: (res.subscription as typeof data.subscription) ?? data.subscription,
      });
      setSlipMsg('✅ ตรวจสลิปผ่าน — เปิดใช้งานแพ็ก ' + selected.toUpperCase() + ' แล้ว!');
      track('purchase', { transaction_id: 'inv-' + id.slice(0, 8), value: chargeAmount, currency: 'THB', plan: selected, cycle });
      return;
    }

    // โหมดเชื่อผู้ใช้ (ยังไม่เปิด SlipOK) — เปิดแพ็กทันที ไม่รอแอดมิน (ตรวจย้อนหลัง + ตีกลับได้)
    setSlipBusy(false);
    activateFromSlip({ id, plan: selected, cycle, amount: chargeAmount }, data.appliedPaymentIds ?? [], true);
  }

  /** จ่ายผ่าน Stripe (Checkout subscription — ตัดเงินอัตโนมัติทุกงวด) — production เท่านั้น */
  async function payWithStripe() {
    if (!supabase || !wsId) return;
    setPayBusy(true);
    setPayErr(null);
    track('begin_checkout', { plan: selected, cycle, value: chargeAmount, currency: 'THB', method: 'stripe' });
    try {
      const { data: res, error } = await supabase.functions.invoke('stripe-create-checkout', {
        body: { plan: selected, cycle, workspaceId: wsId },
      });
      if (error || !res?.checkout_url) throw new Error(res?.error ?? error?.message ?? 'สร้างหน้าชำระเงินไม่สำเร็จ');
      window.location.href = res.checkout_url as string;
    } catch (e) {
      setPayErr((e as Error).message);
      setPayBusy(false);
    }
  }

  /** จ่ายผ่าน Stripe Payment Link (static) — ทางลัดไม่ต้อง deploy edge function
   *  แนบ client_reference_id=workspaceId + prefilled_email เพื่อให้ webhook map กลับได้ (ถ้าตั้ง)
   *  method: 'card' (subscription) | 'promptpay' (one-time) — เลือกลิงก์ตามวิธีจ่าย */
  async function payWithStripeLink(method: 'card' | 'promptpay') {
    const base = method === 'promptpay' ? PAYMENT.stripePaymentLinkPromptPay : PAYMENT.stripePaymentLinkCard;
    if (!base) return;
    setPayBusy(true);
    let email = '';
    try { const { data } = await supabase!.auth.getUser(); email = data?.user?.email ?? ''; } catch { /* noop */ }
    const url = new URL(base);
    if (wsId) url.searchParams.set('client_reference_id', wsId);
    if (email) url.searchParams.set('prefilled_email', email);
    url.searchParams.set('utm_source', 'app');
    url.searchParams.set('utm_campaign', `billing_${selected}_${cycle}_${method}`);
    track('begin_checkout', { plan: selected, cycle, value: chargeAmount, currency: 'THB', method: `stripe_link_${method}` });
    window.location.href = url.toString();
  }

  const selectedPlan = PLANS.find(p => p.id === selected)!;
  const chargeAmount = priceFor(selected);
  const needPayment = chargeAmount > 0;
  // QR เลขภาษี (PromptPay) แสดงเฉพาะเมื่อ promptpayLive = true (ลงทะเบียนกับธนาคารแล้ว)
  // K BIZ ไม่มี PromptPay เลขภาษี → promptpayLive=false → ไม่โชว์ QR ที่สแกนไม่ติด ใช้โอนเข้าบัญชี+สลิปแทน
  const payload = needPayment && PAYMENT.promptpayLive ? promptPayPayload(PAYMENT.promptpayId, chargeAmount) : '';
  const qrUrl = needPayment && PAYMENT.promptpayLive ? promptPayQrUrl(PAYMENT.promptpayId, chargeAmount) : '';

  const isTrial = sub.status === 'trial';
  const trialDaysLeft = sub.trialEndDate ? daysLeft(sub.trialEndDate) : 0;
  const trialExpired = isTrial && trialDaysLeft <= 0;
  const hasUsedTrial = sub.status !== 'none';
  const trialPct = Math.max(0, Math.min(100, (trialDaysLeft / 15) * 100));

  function startTrial() {
    const now = new Date().toISOString();
    onUpdate({
      ...data,
      subscription: {
        ...sub,
        plan: 'free',
        status: 'trial',
        trialEndDate: addDays(now, 15),
      },
    });
  }

  function choosePlan(id: PlanId) {
    setSelected(id);
    const plan = PLANS.find(p => p.id === id)!;
    if (plan.price === 0) return;
    track('plan_selected', { plan: id, value: plan.price, currency: 'THB' });
    onUpdate({ ...data, subscription: { ...sub, plan: id, status: 'pending_payment' } });
  }

  function confirmPaid() {
    const now = new Date().toISOString();
    const invoice: Invoice = {
      id: 'inv-' + Date.now().toString(36),
      date: now,
      plan: selectedPlan.id,
      amount: chargeAmount,
      status: 'paid',
    };
    onUpdate({
      ...data,
      subscription: {
        ...sub,
        plan: selectedPlan.id,
        status: 'active',
        autoRenew: false, // จ่ายเอง → เตือน+ผ่อนผัน+ตัด (ไม่ auto-charge)
        billingCycle: cycle,
        currentPeriodEnd: addMonths(now, cycle === 'yearly' ? 12 : 1),
        trialEndDate: null,
        invoices: [invoice, ...sub.invoices],
      },
    });
    // GA4 purchase — ยืนยันจ่ายเอง (เช่น PromptPay manual)
    track('purchase', { transaction_id: invoice.id, value: chargeAmount, currency: 'THB', plan: selectedPlan.id, cycle });
  }

  function renewNow() {
    const base =
      sub.currentPeriodEnd && daysLeft(sub.currentPeriodEnd) > 0
        ? sub.currentPeriodEnd
        : new Date().toISOString();
    const yearly = sub.billingCycle === 'yearly';
    const price = yearly ? YEARLY_PRICE[sub.plan] : (PLANS.find(p => p.id === sub.plan)?.price ?? 0);
    const invoice: Invoice = {
      id: 'inv-' + Date.now().toString(36),
      date: new Date().toISOString(),
      plan: sub.plan,
      amount: price,
      status: 'paid',
    };
    onUpdate({
      ...data,
      subscription: {
        ...sub,
        status: 'active',
        autoRenew: false, // ต่ออายุเอง → รอบหน้าเตือน+ผ่อนผันอีกครั้ง
        currentPeriodEnd: addMonths(base, yearly ? 12 : 1),
        invoices: [invoice, ...sub.invoices],
      },
    });
  }

  function cancelSub() {
    if (!window.confirm('ยกเลิกการต่ออายุอัตโนมัติ? แพ็กจะใช้ได้จนถึงวันครบรอบบิลปัจจุบัน')) return;
    onUpdate({ ...data, subscription: { ...sub, autoRenew: false, status: 'cancelled' } });
  }

  function copyPayload() {
    navigator.clipboard
      ?.writeText(payload)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  const isActivePlan = (id: PlanId) =>
    sub.plan === id && (sub.status === 'active' || sub.status === 'cancelled');

  const dLeft = sub.currentPeriodEnd ? daysLeft(sub.currentPeriodEnd) : null;
  const effective: SubStatus =
    sub.status === 'active' && dLeft !== null && dLeft < 0 ? 'past_due' : sub.status;

  const STATUS_BADGE: Record<SubStatus, { label: string; cls: string }> = {
    none: { label: 'ยังไม่สมัคร', cls: 'sb-none' },
    trial: {
      label: trialExpired ? 'หมดอายุทดลอง' : `ทดลองใช้ (${trialDaysLeft} วัน)`,
      cls: trialExpired ? 'sb-pastdue' : 'sb-trial',
    },
    pending_payment: { label: 'รอชำระเงิน', cls: 'sb-pending' },
    active: {
      label:
        dLeft !== null && dLeft <= 7 ? `ใกล้ครบรอบ (${dLeft} วัน)` : 'ใช้งานอยู่',
      cls: dLeft !== null && dLeft <= 7 ? 'sb-expiring' : 'sb-active',
    },
    past_due: { label: 'เกินกำหนดชำระ', cls: 'sb-pastdue' },
    cancelled: { label: 'ยกเลิกการต่ออายุแล้ว', cls: 'sb-cancel' },
  };

  const showSubCard =
    sub.status === 'active' || sub.status === 'cancelled' || sub.status === 'past_due';
  const INV_BADGE: Record<string, string> = { paid: 'ชำระแล้ว', pending: 'รอชำระ', failed: 'ล้มเหลว' };

  return (
    <div>
      {data.coupon && (
        <div className="bill-coupon">
          🎁 คูปองส่วนลดจากเกมเมืองบริษัท <b>−{data.coupon.pct}%</b> ค่าแพ็กเกจ
          <span className="bill-coupon-note"> (จาก “{data.coupon.reason}”) — แจ้งแอดมินตอนชำระเพื่อรับส่วนลด</span>
        </div>
      )}
      <ExpertEdge compact />
      <div className="page-header">
        <div className="page-title">แพ็กเกจ & การสมัครสมาชิก</div>
        <div className="page-meta">
          <span className="meta-chip">ราคารวม VAT 7% แล้ว</span>
          <span className="meta-chip">ชำระผ่าน PromptPay</span>
          <a className="meta-chip bill-guide-link" href={`${import.meta.env.BASE_URL}payment-guide.pdf`}
            target="_blank" rel="noopener noreferrer">
            📄 คู่มือการชำระเงิน (PDF)
          </a>
          {isTrial && !trialExpired && (
            <span className="meta-chip" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              ทดลองใช้เหลือ {trialDaysLeft} วัน
            </span>
          )}
          {sub.status === 'active' && (
            <span
              className="meta-chip"
              style={{ borderColor: 'var(--green)', color: 'var(--green)' }}
            >
              แพ็กปัจจุบัน: {PLANS.find(p => p.id === sub.plan)?.name}
            </span>
          )}
        </div>
      </div>

      {/* PLG: usage meter (expansion loop) + referral (viral loop) */}
      <div className="plg-row">
        <div className="plg-card">
          <div className="plg-hd">⚡ การใช้งาน AI เดือนนี้</div>
          <div className="plg-bar">
            <div className="plg-fill" style={{ width: aiPct + '%', background: aiPct >= 80 ? '#f59e0b' : '#38bdf8' }} />
          </div>
          <div className="plg-txt">
            {aiUsed.toLocaleString()} / {aiQuota.toLocaleString()} AI calls ({aiPct}%)
          </div>
          {aiPct >= 80 && sub.plan !== 'scale' && (
            <div className="plg-nudge">
              🚀 ใกล้เต็มโควตาแล้ว — อัปเกรดเป็น {sub.plan === 'growth' ? 'Scale (5,000 calls/เดือน)' : 'Growth (1,000 calls/เดือน)'}
              <button className="plg-nudge-btn" onClick={() => choosePlan(sub.plan === 'growth' ? 'scale' : 'growth')}>
                อัปเกรดเลย →
              </button>
            </div>
          )}

          {/* Top-up: ซื้อ AI calls เพิ่มเป็นครั้ง (ไม่ต้องอัปแพ็กถาวร) — credits ใช้ได้เฉพาะเดือนนี้ */}
          <div className="topup-box">
            <div className="topup-hd">➕ ซื้อ AI เพิ่มเป็นครั้ง (Top-up)</div>
            <div className="topup-sub">ไม่อยากอัปแพ็กถาวร? เติมเฉพาะเดือนนี้ได้ — จ่ายครั้งเดียว credits เพิ่มทันทีหลังยืนยัน</div>
            <div className="topup-packs">
              {TOPUP_PACKS.map(p => (
                <button
                  key={p.id}
                  className={`topup-pack${topupPack?.id === p.id ? ' active' : ''}${p.best ? ' best' : ''}`}
                  onClick={() => setTopupPack(topupPack?.id === p.id ? null : p)}
                >
                  {p.best && <span className="topup-best">คุ้มสุด</span>}
                  <span className="topup-calls">{p.label}</span>
                  <span className="topup-price">{baht(p.price)}</span>
                  <span className="topup-per">เฉลี่ย ฿{pricePerCall(p)}/call</span>
                </button>
              ))}
            </div>
            {topupPack && (
              <div className="topup-pay">
                {PAYMENT.promptpayLive ? (
                  <>
                    <div className="topup-pay-hd">สแกนจ่าย {baht(topupPack.price)} ผ่าน PromptPay</div>
                    <img className="topup-qr" src={promptPayQrUrl(PAYMENT.promptpayId, topupPack.price)} alt="PromptPay QR" width={160} height={160} />
                  </>
                ) : (
                  <div className="topup-pay-hd">โอน {baht(topupPack.price)} → {PAYMENT.promptpayId} (PromptPay)</div>
                )}
                <div className="topup-pay-note">
                  โอนแล้วแจ้งทีมงาน (support@b-tctraining.com) พร้อม Workspace ID: <b>{wsId ?? '—'}</b> และแพ็ก <b>{topupPack.label}</b>
                  <br />ทีมงานยืนยันแล้วเปิด credits ให้ทันที (ระบบ auto-verify กำลังพัฒนา)
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="plg-card">
          <div className="plg-hd">🎁 ชวนเพื่อนใช้ {BRAND.product}</div>
          <div className="plg-ref-desc">
            เพื่อนสมัครผ่านลิงก์ของคุณและชำระแพ็กแรก — รับส่วนลด 10% ในรอบบิลถัดไปทั้งคู่
          </div>
          <div className="plg-ref-row">
            <input className="plg-ref-link" readOnly value={refLink} onFocus={e => e.target.select()} />
            <button className="plg-ref-copy" onClick={copyRef}>{refCopied ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์'}</button>
          </div>
        </div>
      </div>

      {/* Trial Banner */}
      {isTrial && !trialExpired && (
        <div className="bill-trial-banner">
          <div className="bill-trial-icon">🎁</div>
          <div className="bill-trial-content">
            <div className="bill-trial-title">คุณกำลังทดลองใช้งานอยู่</div>
            <div className="bill-trial-sub">
              เหลืออีก <b>{trialDaysLeft} วัน</b> จาก 15 วัน ·
              หมดอายุ {sub.trialEndDate ? thaiDate(sub.trialEndDate) : ''}
            </div>
            <div className="bill-trial-track">
              <div className="bill-trial-fill" style={{ width: `${trialPct}%` }} />
            </div>
          </div>
          <button className="bill-trial-upgrade" onClick={() => setSelected('growth')}>
            อัปเกรดเพื่อใช้ต่อ →
          </button>
        </div>
      )}

      {trialExpired && (
        <div className="bill-trial-expired">
          ⏰ หมดอายุการทดลองใช้แล้ว — เลือกแพ็กด้านล่างเพื่อใช้งานต่อ
        </div>
      )}

      {/* Active Plan Card */}
      {showSubCard && (
        <div className="bill-sub-card">
          <div className="bill-sub-main">
            <div className="bill-sub-top">
              <span className="bill-sub-plan">แพ็ก {PLANS.find(p => p.id === sub.plan)?.name}</span>
              <span className={`bill-sub-badge ${STATUS_BADGE[effective].cls}`}>
                {STATUS_BADGE[effective].label}
              </span>
            </div>
            <div className="bill-sub-meta">
              {sub.currentPeriodEnd
                ? effective === 'past_due'
                  ? (
                    <>
                      ครบกำหนดเมื่อ <b>{thaiDate(sub.currentPeriodEnd)}</b> — กรุณาต่ออายุ
                    </>
                  )
                  : (
                    <>
                      ต่ออายุครั้งถัดไป <b>{thaiDate(sub.currentPeriodEnd)}</b>
                      {dLeft !== null && ` (อีก ${dLeft} วัน)`}
                    </>
                  )
                : 'ยังไม่มีรอบบิล'}
            </div>
          </div>
          <div className="bill-sub-actions">
            <div className="bill-renew-note">
              🔔 ต่ออายุเองผ่าน PromptPay — เมื่อครบกำหนดเราจะส่งอีเมลเตือน
              และผ่อนผันให้อีก {GRACE_DAYS} วันก่อนปรับเป็นแพ็กฟรี (ไม่มีการตัดเงินอัตโนมัติ)
            </div>
            {(effective === 'past_due' ||
              (dLeft !== null && dLeft <= 7) ||
              sub.status === 'cancelled') && (
              <button className="bill-renew-btn" onClick={renewNow}>
                ต่ออายุทันที
              </button>
            )}
            {sub.status !== 'cancelled' && (
              <button className="bill-cancel-btn" onClick={cancelSub}>
                ยกเลิกแพ็ก
              </button>
            )}
          </div>
        </div>
      )}

      {/* Billing cycle toggle — รายปีจ่ายเท่า ~10 เดือน */}
      <div className="bill-cycle">
        <button className={`bill-cycle-btn${cycle === 'monthly' ? ' active' : ''}`} onClick={() => setCycle('monthly')}>รายเดือน</button>
        <button className={`bill-cycle-btn${cycle === 'yearly' ? ' active' : ''}`} onClick={() => setCycle('yearly')}>
          รายปี <span className="bill-cycle-save">ประหยัด ~17%</span>
        </button>
      </div>

      {/* Plan Cards */}
      <div className="bill-plans">
        {PLANS.map(p => (
          <div
            key={p.id}
            className={`bill-plan${p.highlight ? ' featured' : ''}${selected === p.id ? ' selected' : ''}`}
          >
            {p.highlight && <div className="bill-ribbon">ยอดนิยม</div>}
            <div className="bill-plan-name">{p.name}</div>
            <div className="bill-plan-price">
              {p.price === 0 ? 'ฟรี' : baht(priceFor(p.id))}
              {p.price > 0 && <span className="bill-plan-per">/{cycle === 'yearly' ? 'ปี' : 'เดือน'}</span>}
            </div>
            {p.price > 0 && cycle === 'yearly' && (
              <div className="bill-plan-save">เท่ากับจ่าย 10 เดือน — ฟรี 2 เดือน (จาก {baht(p.price * 12)})</div>
            )}
            {p.price > 0 && COST[p.id] && (
              <div className="bill-plan-margin-badge">
                กำไรบริษัท {COST[p.id].margin.toFixed(0)}% · ต้นทุน {baht(COST[p.id].total)}
              </div>
            )}
            <div className="bill-plan-tag">{p.tagline}</div>
            <div className="bill-plan-calls">
              🤖 {p.apiCalls.toLocaleString()} AI calls{p.price > 0 ? '/เดือน' : ' (ช่วงทดลอง)'}
            </div>
            <ul className="bill-feat">
              {p.features.map((f, i) => (
                <li key={i}>
                  <span className="bill-check">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {isActivePlan(p.id) ? (
              <button className="bill-choose current" disabled>
                ✓ กำลังใช้งาน
              </button>
            ) : p.id === 'free' ? (
              hasUsedTrial ? (
                <button className="bill-choose" disabled>
                  ทดลองใช้แล้ว
                </button>
              ) : (
                <button className="bill-choose trial-btn" onClick={startTrial}>
                  🎁 เริ่มทดลองใช้ฟรี 15 วัน
                </button>
              )
            ) : (
              <button
                className={`bill-choose${p.highlight ? ' primary' : ''}`}
                onClick={() => choosePlan(p.id)}
              >
                เลือกแพ็กนี้
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Cost Transparency */}
      <div className="bill-cost-section">
        <button className="bill-cost-toggle" onClick={() => setShowCost(!showCost)}>
          {showCost ? '▲' : '▼'} วิเคราะห์ต้นทุนระบบ — ความโปร่งใสด้านราคา
        </button>
        {showCost && (
          <div className="bill-cost-wrap">
            <div className="bill-cost-intro">
              ราคาที่คุณจ่ายประกอบด้วยต้นทุน AI API + Infrastructure + ทีมพัฒนา
              ส่วนที่เหลือคือกำไรที่นำกลับไปพัฒนาแพลตฟอร์มต่อเนื่อง (คิดจากการใช้งานจริงแบบเฉลี่ย)
            </div>
            <div className="bill-cost-grid">
              {(['starter', 'growth', 'scale'] as const).map(key => {
                const c = COST[key];
                const plan = PLANS.find(p => p.id === key)!;
                return (
                  <div key={key} className="bill-cost-card">
                    <div className="bill-cost-plan-name">แพ็ก {plan.name}</div>
                    <div className="bill-cost-subtitle">
                      ต้นทุนต่อเดือน / {plan.apiCalls.toLocaleString()} AI calls
                    </div>
                    {c.items.map((item, i) => (
                      <div key={i} className="bill-cost-row">
                        <div className="bill-cost-item">
                          <span className="bill-cost-label">{item.label}</span>
                          <span className="bill-cost-note">{item.note}</span>
                        </div>
                        <span className="bill-cost-amt">{baht(item.amount)}</span>
                      </div>
                    ))}
                    <div className="bill-cost-divider" />
                    <div className="bill-cost-row bill-cost-total">
                      <span>ต้นทุนรวม</span>
                      <span>{baht(c.total)}</span>
                    </div>
                    <div className="bill-cost-row bill-cost-price-row">
                      <span>ราคาขาย (รวม VAT 7%)</span>
                      <span>{baht(c.price)}</span>
                    </div>
                    <div className="bill-cost-margin-wrap">
                      <div className="bill-cost-margin-track">
                        <div
                          className="bill-cost-margin-fill"
                          style={{ width: `${c.margin}%` }}
                        />
                      </div>
                      <span className="bill-cost-margin-pct">กำไรบริษัท {c.margin.toFixed(1)}%</span>
                    </div>
                    <div className="bill-cost-api-note">
                      💡 Claude Sonnet ~$3/MTok input · $15/MTok output<br />
                      ≈ ฿{BLENDED_CALL_THB.toFixed(2)}/call เฉลี่ยงานจริง (อัตรา $1 = ฿36)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Payment Panel */}
      {needPayment && selected === sub.plan && sub.status !== 'active' && (
        <div className="bill-pay">
          <div className="bill-pay-left">
            <div className="bill-pay-hd">ชำระเงินแพ็ก {selectedPlan.name}</div>
            <div className="bill-pay-sub">
              {PAYMENT.promptpayLive || PAYMENT.qrImageUrl
                ? 'สแกน QR หรือโอนเข้าบัญชีธนาคารด้านล่าง'
                : 'โอนเข้าบัญชีธนาคารด้านล่าง แล้วอัปสลิป — เปิดแพ็กทันที'} ·{' '}
              <a className="bill-guide-inline" href={`${import.meta.env.BASE_URL}payment-guide.pdf`}
                target="_blank" rel="noopener noreferrer">
                ดูคู่มือทีละขั้นตอน (PDF)
              </a>
            </div>

            <div className="bill-bank">
              <div className="bill-bank-hd">โอนเข้าบัญชีบริษัท{!PAYMENT.promptpayLive && !PAYMENT.qrImageUrl && <span className="bill-bank-tag">แนะนำ</span>}</div>
              <div className="bill-bank-row">
                <span>ธนาคาร</span>
                <b>{PAYMENT.bankName}</b>
              </div>
              <div className="bill-bank-row">
                <span>ชื่อบัญชี</span>
                <b>{PAYMENT.accountName}</b>
              </div>
              <div className="bill-bank-row">
                <span>เลขที่บัญชี</span>
                <b>{PAYMENT.accountNo}</b>
              </div>
              <div className="bill-bank-row">
                <span>สาขา</span>
                <b>{PAYMENT.bankBranch}</b>
              </div>
            </div>

            <div className="bill-slip-box">
              <div className="bill-slip-hd">
                {PAYMENT.slipOkLive ? '🔒 ส่งสลิปหลังโอนเงิน → ตรวจกับธนาคารจริง → เปิดแพ็ก' : '📎 ส่งสลิปหลังโอนเงิน → เปิดแพ็กทันที'}
              </div>
              <div className="bill-slip-desc">
                {PAYMENT.slipOkLive
                  ? <>หลังโอนเงินแล้ว อัปสลิปได้เลย — ระบบ<b>ตรวจสลิปกับ record ธนาคารจริง</b> (ยอด · บัญชีผู้รับ · กันสลิปซ้ำ)
                     ผ่านแล้วเปิดแพ็กให้อัตโนมัติภายในไม่กี่วินาที</>
                  : <>หลังโอนเงินแล้ว อัปสลิปในระบบได้เลย — <b>ระบบเปิดใช้งานแพ็กให้ทันที</b> ไม่ต้องรอแอดมิน
                     (ทีมงานตรวจสลิปย้อนหลังตามปกติ)</>}
              </div>
              {isSupabaseEnabled && (
                <label className={`bill-slip-upload${slipBusy ? ' busy' : ''}`}>
                  {slipBusy ? '⏳ กำลังส่งสลิป…' : '📤 อัปสลิปในระบบ (รูป/PDF)'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden disabled={slipBusy || !wsId}
                    onChange={e => uploadSlip(e.target.files?.[0])} />
                </label>
              )}
              {slipMsg && <div className="bill-slip-msg">{slipMsg}</div>}
              <div className="bill-slip-or">หรือส่งผ่านช่องทางอื่น:</div>
              <div className="bill-slip-btns">
                <a
                  className="bill-slip-btn bill-slip-line"
                  href={`https://line.me/ti/p/0817817773`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📱 ส่งสลิปผ่าน LINE
                </a>
                <a
                  className="bill-slip-btn bill-slip-email"
                  href={`mailto:support@b-tctraining.com?subject=ยืนยันการชำระเงิน - แพ็ก ${selectedPlan.name}&body=สวัสดีครับ%0A%0Aชำระแพ็ก ${selectedPlan.name} (${cycle === 'yearly' ? 'รายปี' : 'รายเดือน'}) ฿${chargeAmount} แล้ว%0AWorkspace ID: (กรอก ID ของคุณ)%0A%0Aแนบสลิปมาด้วยครับ`}
                >
                  📧 ส่งสลิปทางอีเมล
                </a>
              </div>
            </div>

            <div className="bill-amount-row">
              <span>ยอดชำระ</span>
              <span className="bill-amount">{baht(chargeAmount)}</span>
            </div>

            {/* บัตร: dynamic checkout (เลือกแพ็ก/รอบได้ตรงราคา) ถ้า stripeLive · ไม่งั้น Payment Link (ราคาตายตัว) */}
            {isSupabaseEnabled && (PAYMENT.stripeLive || PAYMENT.stripePaymentLinkCard || PAYMENT.stripePaymentLinkPromptPay) && (
              <>
                {PAYMENT.stripeLive ? (
                  <button className="bill-xendit" onClick={payWithStripe} disabled={payBusy || !wsId}>
                    {payBusy ? 'กำลังเปิดหน้าชำระเงิน…' : '💳 จ่ายผ่าน Stripe — บัตรเครดิต/เดบิต · ตัดเงินอัตโนมัติทุกงวด'}
                  </button>
                ) : PAYMENT.stripePaymentLinkCard && (
                  <button className="bill-xendit" onClick={() => payWithStripeLink('card')} disabled={payBusy || !wsId}>
                    {payBusy ? 'กำลังเปิดหน้าชำระเงิน…' : '💳 จ่ายด้วยบัตรเครดิต/เดบิต — ตัดเงินอัตโนมัติทุกงวด'}
                  </button>
                )}
                {/* PromptPay one-time: แสดงเสมอถ้ามีลิงก์ (เสริมกับบัตร subscription — PromptPay ตัดต่อเนื่องไม่ได้) */}
                {PAYMENT.stripePaymentLinkPromptPay && (
                  <button className="bill-promptpay" onClick={() => payWithStripeLink('promptpay')} disabled={payBusy || !wsId}>
                    {payBusy ? 'กำลังเปิดหน้าชำระเงิน…' : '📱 จ่ายด้วย PromptPay QR — ครั้งเดียว'}
                  </button>
                )}
                {payErr && <div className="bill-warn">⚠️ {payErr}</div>}
                <div className="bill-note">
                  ชำระเงินปลอดภัยผ่าน Stripe · บัตร = ตัดอัตโนมัติทุก{cycle === 'yearly' ? 'ปี' : 'เดือน'} ยกเลิกได้ทุกเมื่อ
                  {PAYMENT.stripePaymentLinkPromptPay ? ' · PromptPay = จ่ายครั้งเดียว' : ''}
                  <br />หลังชำระสำเร็จ ระบบเปิดใช้งานแพ็กให้อัตโนมัติ (Stripe webhook)
                </div>
              </>
            )}
            {/* Xendit/Omise = retired (ใช้ Stripe แทน) — เก็บโค้ด adapter ไว้เผื่ออนาคต แต่ไม่แสดงปุ่ม */}
            {isSupabaseEnabled && !PAYMENT.stripeLive && !PAYMENT.stripePaymentLinkCard && !PAYMENT.stripePaymentLinkPromptPay && (
              <div className="bill-soon">
                ⏳ ระบบชำระออนไลน์อัตโนมัติกำลังเปิดใช้เร็วๆ นี้ — ระหว่างนี้โอนหรือสแกน QR ด้านบน
                แล้วอัปสลิป ระบบเปิดใช้งานแพ็กให้ทันที (ทีมงานตรวจย้อนหลัง)
              </div>
            )}
            {payload && (
              <button className="bill-copy" onClick={copyPayload}>
                {copied ? '✓ คัดลอกแล้ว' : 'คัดลอกข้อมูล PromptPay QR (payload)'}
              </button>
            )}
            {!isSupabaseEnabled && (
              <button className="bill-confirm" onClick={confirmPaid}>
                ฉันชำระเงินแล้ว — เปิดใช้งาน (เดโม)
              </button>
            )}
            <div className="bill-note">
              {payload || PAYMENT.qrImageUrl
                ? 'โอนหรือสแกน QR แล้วอัปสลิป — ระบบเปิดใช้งานแพ็กให้ทันที'
                : 'โอนเข้าบัญชีบริษัทด้านบน แล้วอัปสลิป — ระบบเปิดใช้งานแพ็กให้ทันที'}
            </div>
          </div>

          <div className="bill-pay-qr">
            {PAYMENT.qrImageUrl ? (
              <>
                <div className="bill-qr-frame">
                  <div className="bill-qr-brand">สแกนจ่าย</div>
                  <img src={PAYMENT.qrImageUrl} alt="QR ชำระเงิน" width={196} height={196}
                    onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                </div>
                <div className="bill-qr-cap">Thai QR Payment · เข้าบัญชีบริษัท</div>
              </>
            ) : qrUrl ? (
              <>
                <div className="bill-qr-frame">
                  <div className="bill-qr-brand">PromptPay</div>
                  <img
                    src={qrUrl}
                    alt="PromptPay QR"
                    width={196}
                    height={196}
                    onError={e => {
                      (e.target as HTMLImageElement).style.visibility = 'hidden';
                    }}
                  />
                </div>
                <div className="bill-qr-cap">Thai QR Payment</div>
              </>
            ) : (
              <div className="bill-qr-frame placeholder">โอนเข้าบัญชีบริษัท<br />ตามเลขด้านบน</div>
            )}
          </div>
        </div>
      )}

      {sub.status === 'active' && sub.plan !== 'free' && (
        <div className="bill-success">
          🎉 เปิดใช้งานแพ็ก <b>{PLANS.find(p => p.id === sub.plan)?.name}</b> เรียบร้อยแล้ว
          — ทีม AI ของคุณพร้อมทำงานเต็มรูปแบบ
        </div>
      )}

      {/* Invoice History */}
      {sub.invoices.length > 0 && (
        <div className="bill-invoices">
          <div className="bill-inv-hd">ประวัติใบแจ้งหนี้</div>
          <div className="bill-inv-table">
            <div className="bill-inv-row bill-inv-head">
              <div>วันที่</div>
              <div>แพ็ก</div>
              <div className="bill-inv-amt">ยอด</div>
              <div className="bill-inv-st">สถานะ</div>
              <div />
            </div>
            {sub.invoices.map(inv => (
              <div key={inv.id} className="bill-inv-row">
                <div>{thaiDate(inv.date)}</div>
                <div>{PLANS.find(p => p.id === inv.plan)?.name ?? inv.plan}</div>
                <div className="bill-inv-amt">{baht(inv.amount)}</div>
                <div className="bill-inv-st">
                  <span className={`bill-inv-badge inv-${inv.status}`}>
                    {INV_BADGE[inv.status]}
                  </span>
                </div>
                <div className="bill-inv-view">
                  <button onClick={() => setInvoiceModal(inv)}>ใบกำกับภาษี</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ISO 9001 Add-on */}
      <div className="bill-addon-section">
        <div className="bill-addon-hd">🏆 Add-on พิเศษ — ระบบมาตรฐานสากล</div>
        <div className="bill-addon-cards">
          <div className="bill-addon-card">
            <div className="bill-addon-badge">ISO 9001:2015 Add-on</div>
            <div className="bill-addon-name">ระบบบริหารคุณภาพ ISO 9001</div>
            <div className="bill-addon-tagline">สำหรับองค์กรที่มีหรือกำลังเตรียมรับรอง ISO 9001:2015</div>
            <div className="bill-addon-price-row">
              <span className="bill-addon-price">฿30,000</span>
              <span className="bill-addon-per">–49,999/ปี</span>
            </div>
            <ul className="bill-addon-feats">
              <li>ตรวจสอบ 28 ข้อกำหนด ISO 9001:2015 (ข้อ 4–10)</li>
              <li>บันทึก NC Log (ความไม่เป็นไปตามข้อกำหนด)</li>
              <li>ระบบควบคุมเอกสาร QMS ครบวงจร</li>
              <li>ตารางวางแผนการตรวจประเมินภายใน</li>
              <li>Readiness Score พร้อมใช้กับทุกหน่วยรับรอง</li>
              <li>รองรับ SGS, Bureau Veritas, TÜV SÜD</li>
            </ul>
            <button
              className={`bill-addon-btn${data.iso9001?.enabled ? ' active' : ''}`}
              onClick={() => {
                if (!data.iso9001?.enabled) {
                  const updated = { ...data, iso9001: { ...data.iso9001!, enabled: true, tier: 'basic' as const } };
                  onUpdate(updated);
                }
              }}
              disabled={data.iso9001?.enabled}
            >
              {data.iso9001?.enabled ? '✓ เปิดใช้งานแล้ว' : 'ติดต่อขอใช้งาน / เปิดใช้'}
            </button>
          </div>
        </div>
      </div>

      <div className="bill-auto-note">
        ⚙️ <b>Automate billing:</b> เมื่อเปิด "ต่ออายุอัตโนมัติ"
        ระบบจะออกใบแจ้งหนี้และต่ออายุให้ทุกรอบบิล งานเบื้องหลังจะรันด้วย Supabase Edge
        Function <code>billing-cron</code> (ตั้งเวลาด้วย pg_cron รายวัน)
        เพื่อสร้างรายการเรียกเก็บผ่าน PromptPay และอัปเดตสถานะอัตโนมัติ — ดูรายละเอียดใน{' '}
        <code>supabase/README.md</code>
      </div>

      {/* Tax Invoice Modal */}
      {invoiceModal &&
        (() => {
          const inv = invoiceModal;
          const base = Math.round(inv.amount / 1.07);
          const vat = inv.amount - base;
          const planName = PLANS.find(p => p.id === inv.plan)?.name ?? inv.plan;
          return (
            <div className="inv-overlay" onClick={() => setInvoiceModal(null)}>
              <div className="inv-modal" onClick={e => e.stopPropagation()}>
                <div className="inv-doc" id="inv-doc">
                  <div className="inv-doc-hd">
                    <div>
                      <div className="inv-doc-brand">{BRAND.product}</div>
                      <div className="inv-doc-sub">
                        ใบกำกับภาษี / ใบเสร็จรับเงิน
                        <br />
                        Tax Invoice / Receipt
                      </div>
                    </div>
                    <div className="inv-doc-no">
                      เลขที่: <b>{inv.id.toUpperCase()}</b>
                      <br />
                      วันที่: {thaiDate(inv.date)}
                    </div>
                  </div>
                  <div className="inv-doc-parties">
                    <div>
                      <span className="inv-doc-lbl">ผู้ให้บริการ / ผู้ขาย</span>
                      {COMPANY.nameTh}
                      <br />
                      {COMPANY.address}
                      <br />
                      โทร {COMPANY.tel} ·{' '}
                      {COMPANY.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      <br />
                      เลขประจำตัวผู้เสียภาษี: {COMPANY.taxId || '(โปรดระบุใน config)'}
                      <br />
                      {PAYMENT.bankName} เลขที่ {PAYMENT.accountNo}
                      {PAYMENT.promptpayLive && (
                        <>
                          <br />
                          PromptPay: {PAYMENT.promptpayId}
                        </>
                      )}
                    </div>
                    <div>
                      <span className="inv-doc-lbl">ลูกค้า</span>ผู้ใช้ระบบ
                      <br />
                      (แก้ชื่อ/เลขผู้เสียภาษีได้ในการตั้งค่าบริษัท)
                    </div>
                  </div>
                  <table className="inv-doc-table">
                    <thead>
                      <tr>
                        <th>รายการ</th>
                        <th>จำนวนเงิน</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>แพ็กเกจ {planName} — รอบบิล 1 เดือน</td>
                        <td>{baht(base)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="inv-doc-totals">
                    <div>
                      <span>มูลค่าก่อนภาษี</span>
                      <span>{baht(base)}</span>
                    </div>
                    <div>
                      <span>ภาษีมูลค่าเพิ่ม 7%</span>
                      <span>{baht(vat)}</span>
                    </div>
                    <div className="inv-doc-grand">
                      <span>ยอดรวมทั้งสิ้น</span>
                      <span>{baht(inv.amount)}</span>
                    </div>
                  </div>
                  <div className="inv-doc-foot">
                    สถานะการชำระเงิน: <b>{INV_BADGE[inv.status]}</b> · ชำระผ่าน PromptPay (Thai QR)
                  </div>
                </div>
                <div className="inv-actions">
                  <button className="inv-close" onClick={() => setInvoiceModal(null)}>
                    ปิด
                  </button>
                  <button className="inv-print" onClick={() => window.print()}>
                    พิมพ์ / บันทึก PDF
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
