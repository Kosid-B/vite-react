import { useState } from 'react';
import type { AppData, PlanId, Invoice, SubStatus } from '../types';
import { promptPayPayload, promptPayQrUrl, baht } from '../utils';
import { BRAND, COMPANY, PAYMENT } from '../config';

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
}

interface Plan {
  id: PlanId;
  name: string;
  price: number;      // บาท/เดือน (รวม VAT 7% แล้ว)
  tagline: string;
  features: string[];
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free', name: 'ทดลองใช้', price: 0,
    tagline: 'เริ่มต้นฟรี เหมาะกับการลองสร้างทีม AI',
    features: ['เอเจนต์ AI สูงสุด 3 ตัว', 'งานในระบบ 20 งาน/เดือน', 'เชื่อมต่อ 1 เครื่องมือ', 'รองรับภาษาไทย'],
  },
  {
    id: 'growth', name: 'Growth', price: 990,
    tagline: 'สำหรับ SME ที่อยากให้ทีม AI ทำงานจริงจัง',
    features: ['เอเจนต์ AI ไม่จำกัด', 'งานในระบบไม่จำกัด', 'เชื่อมต่อทุกเครื่องมือ', 'บอร์ดอนุมัติ + แจ้งเตือน LINE', 'รายงานผลรายสัปดาห์'],
    highlight: true,
  },
  {
    id: 'scale', name: 'Scale', price: 2990,
    tagline: 'สำหรับธุรกิจที่ต้องการหลายทีม AI พร้อมกัน',
    features: ['ทุกอย่างในแพ็ก Growth', 'หลายบริษัท AI พร้อมกัน', 'API ส่วนตัว + Webhook', 'ออกใบกำกับภาษีเต็มรูปแบบ', 'ผู้ดูแลบัญชีเฉพาะ'],
  },
];

export default function Billing({ data, onUpdate }: Props) {
  const sub = data.subscription;
  const [selected, setSelected] = useState<PlanId>(sub.plan);
  const [copied, setCopied] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState<Invoice | null>(null);

  const selectedPlan = PLANS.find(p => p.id === selected)!;
  const needPayment = selectedPlan.price > 0;
  // ผู้รับเงินคือบริษัทผู้ขาย (จาก config) — ลูกค้าไม่ต้องกรอกเอง
  const payload = needPayment ? promptPayPayload(PAYMENT.promptpayId, selectedPlan.price) : '';
  const qrUrl = needPayment ? promptPayQrUrl(PAYMENT.promptpayId, selectedPlan.price) : '';

  function choosePlan(id: PlanId) {
    setSelected(id);
    const plan = PLANS.find(p => p.id === id)!;
    onUpdate({ ...data, subscription: { ...sub, plan: id, status: plan.price === 0 ? 'active' : 'pending_payment' } });
  }

  function confirmPaid() {
    const now = new Date().toISOString();
    const invoice: Invoice = {
      id: 'inv-' + Date.now().toString(36), date: now,
      plan: selectedPlan.id, amount: selectedPlan.price, status: 'paid',
    };
    onUpdate({ ...data, subscription: {
      ...sub, plan: selectedPlan.id, status: 'active',
      currentPeriodEnd: addMonths(now, 1),
      invoices: [invoice, ...sub.invoices],
    } });
  }

  function renewNow() {
    const base = sub.currentPeriodEnd && daysLeft(sub.currentPeriodEnd) > 0 ? sub.currentPeriodEnd : new Date().toISOString();
    const price = PLANS.find(p => p.id === sub.plan)?.price ?? 0;
    const invoice: Invoice = {
      id: 'inv-' + Date.now().toString(36), date: new Date().toISOString(),
      plan: sub.plan, amount: price, status: 'paid',
    };
    onUpdate({ ...data, subscription: {
      ...sub, status: 'active', currentPeriodEnd: addMonths(base, 1), invoices: [invoice, ...sub.invoices],
    } });
  }

  function setAutoRenew(v: boolean) {
    onUpdate({ ...data, subscription: { ...sub, autoRenew: v } });
  }

  function cancelSub() {
    if (!window.confirm('ยกเลิกการต่ออายุอัตโนมัติ? แพ็กจะใช้ได้จนถึงวันครบรอบบิลปัจจุบัน')) return;
    onUpdate({ ...data, subscription: { ...sub, autoRenew: false, status: 'cancelled' } });
  }

  function copyPayload() {
    navigator.clipboard?.writeText(payload).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

  const isActivePlan = (id: PlanId) => sub.plan === id && (sub.status === 'active' || sub.status === 'cancelled');

  // สถานะที่คำนวณจริงจากวันครบรอบบิล
  const dLeft = sub.currentPeriodEnd ? daysLeft(sub.currentPeriodEnd) : null;
  const effective: SubStatus = sub.status === 'active' && dLeft !== null && dLeft < 0 ? 'past_due' : sub.status;
  const STATUS_BADGE: Record<SubStatus, { label: string; cls: string }> = {
    none: { label: 'ยังไม่สมัคร', cls: 'sb-none' },
    pending_payment: { label: 'รอชำระเงิน', cls: 'sb-pending' },
    active: { label: dLeft !== null && dLeft <= 7 ? `ใกล้ครบรอบ (${dLeft} วัน)` : 'ใช้งานอยู่', cls: dLeft !== null && dLeft <= 7 ? 'sb-expiring' : 'sb-active' },
    past_due: { label: 'เกินกำหนดชำระ', cls: 'sb-pastdue' },
    cancelled: { label: 'ยกเลิกการต่ออายุแล้ว', cls: 'sb-cancel' },
  };
  const showSubCard = sub.plan !== 'free' && sub.status !== 'none' && sub.status !== 'pending_payment';
  const INV_BADGE: Record<string, string> = { paid: 'ชำระแล้ว', pending: 'รอชำระ', failed: 'ล้มเหลว' };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">แพ็กเกจ & การชำระเงิน</div>
        <div className="page-meta">
          <span className="meta-chip">ราคารวม VAT 7% แล้ว</span>
          <span className="meta-chip">ชำระผ่าน PromptPay</span>
          {sub.status === 'active' && <span className="meta-chip" style={{ borderColor: 'var(--green)', color: 'var(--green)' }}>แพ็กปัจจุบัน: {PLANS.find(p => p.id === sub.plan)?.name}</span>}
          <span className="law-badge" data-tip={"Hick's Law: ให้เลือกแค่ 3 แพ็ก\nยิ่งตัวเลือกน้อย ยิ่งตัดสินใจซื้อเร็ว"}>Hick's Law</span>
          <span className="law-badge" data-tip={"Von Restorff Effect: แพ็ก Growth\nถูกไฮไลต์ด้วยป้าย 'ยอดนิยม' + สีเด่น\nนำสายตาไปยังตัวเลือกที่อยากให้เลือก"}>Von Restorff</span>
          <span className="law-badge" data-tip={"Law of Proximity: ราคา-ฟีเจอร์-ปุ่ม\nอยู่ในการ์ดเดียวกัน สมองจับเป็นชุดเดียว"}>Proximity</span>
        </div>
      </div>

      {/* ===== การ์ดสถานะการสมัคร (Automated billing) ===== */}
      {showSubCard && (
        <div className="bill-sub-card">
          <div className="bill-sub-main">
            <div className="bill-sub-top">
              <span className="bill-sub-plan">แพ็ก {PLANS.find(p => p.id === sub.plan)?.name}</span>
              <span className={`bill-sub-badge ${STATUS_BADGE[effective].cls}`}>{STATUS_BADGE[effective].label}</span>
            </div>
            <div className="bill-sub-meta">
              {sub.currentPeriodEnd
                ? (effective === 'past_due'
                    ? <>ครบกำหนดเมื่อ <b>{thaiDate(sub.currentPeriodEnd)}</b> — กรุณาต่ออายุ</>
                    : <>ต่ออายุครั้งถัดไป <b>{thaiDate(sub.currentPeriodEnd)}</b>{dLeft !== null && ` (อีก ${dLeft} วัน)`}</>)
                : 'ยังไม่มีรอบบิล'}
            </div>
          </div>
          <div className="bill-sub-actions">
            <label className="bill-autorenew">
              <input type="checkbox" checked={sub.autoRenew} onChange={e => setAutoRenew(e.target.checked)} />
              ต่ออายุอัตโนมัติ
            </label>
            {(effective === 'past_due' || (dLeft !== null && dLeft <= 7) || sub.status === 'cancelled') && (
              <button className="bill-renew-btn" onClick={renewNow}>ต่ออายุทันที</button>
            )}
            {sub.status !== 'cancelled' && (
              <button className="bill-cancel-btn" onClick={cancelSub}>ยกเลิกต่ออายุ</button>
            )}
          </div>
        </div>
      )}

      <div className="bill-plans">
        {PLANS.map(p => (
          <div key={p.id} className={`bill-plan${p.highlight ? ' featured' : ''}${selected === p.id ? ' selected' : ''}`}>
            {p.highlight && <div className="bill-ribbon">ยอดนิยม</div>}
            <div className="bill-plan-name">{p.name}</div>
            <div className="bill-plan-price">
              {p.price === 0 ? 'ฟรี' : baht(p.price)}
              {p.price > 0 && <span className="bill-plan-per">/เดือน</span>}
            </div>
            <div className="bill-plan-tag">{p.tagline}</div>
            <ul className="bill-feat">
              {p.features.map((f, i) => (
                <li key={i}><span className="bill-check">✓</span>{f}</li>
              ))}
            </ul>
            {isActivePlan(p.id) ? (
              <button className="bill-choose current" disabled>✓ กำลังใช้งาน</button>
            ) : (
              <button className={`bill-choose${p.highlight ? ' primary' : ''}`} onClick={() => choosePlan(p.id)}>
                {p.price === 0 ? 'เริ่มใช้ฟรี' : 'เลือกแพ็กนี้'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ===== แผงชำระเงิน PromptPay ===== */}
      {needPayment && selected === sub.plan && sub.status !== 'active' && (
        <div className="bill-pay">
          <div className="bill-pay-left">
            <div className="bill-pay-hd">ชำระเงินแพ็ก {selectedPlan.name}</div>
            <div className="bill-pay-sub">สแกน PromptPay QR หรือโอนเข้าบัญชีธนาคารด้านล่าง</div>

            <div className="bill-bank">
              <div className="bill-bank-hd">โอนเข้าบัญชีธนาคาร</div>
              <div className="bill-bank-row"><span>ธนาคาร</span><b>{PAYMENT.bankName}</b></div>
              <div className="bill-bank-row"><span>ชื่อบัญชี</span><b>{PAYMENT.accountName}</b></div>
              <div className="bill-bank-row"><span>เลขที่บัญชี</span><b>{PAYMENT.accountNo}</b></div>
              <div className="bill-bank-row"><span>สาขา</span><b>{PAYMENT.bankBranch}</b></div>
            </div>

            <div className="bill-amount-row">
              <span>ยอดชำระ</span>
              <span className="bill-amount">{baht(selectedPlan.price)}</span>
            </div>

            {payload ? (
              <>
                <button className="bill-copy" onClick={copyPayload}>{copied ? '✓ คัดลอกแล้ว' : 'คัดลอกข้อมูล PromptPay QR (payload)'}</button>
                <button className="bill-confirm" onClick={confirmPaid}>ฉันชำระเงินแล้ว — เปิดใช้งาน</button>
                <div className="bill-note">* เมื่อเชื่อม Payment Gateway/บัญชีธนาคารจริง ระบบจะยืนยันยอดอัตโนมัติ (เดโมนี้กดยืนยันเองได้)</div>
              </>
            ) : (
              <div className="bill-warn">ตั้งค่า PromptPay ID ของผู้รับใน <code>src/config.ts</code> ให้ถูกต้อง (เบอร์ 10 หลัก หรือเลขผู้เสียภาษี 13 หลัก)</div>
            )}
          </div>

          <div className="bill-pay-qr">
            {qrUrl ? (
              <>
                <div className="bill-qr-frame">
                  <div className="bill-qr-brand">PromptPay</div>
                  <img src={qrUrl} alt="PromptPay QR" width={196} height={196}
                    onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                </div>
                <div className="bill-qr-cap">Thai QR Payment</div>
              </>
            ) : (
              <div className="bill-qr-frame placeholder">รอข้อมูลพร้อมเพย์</div>
            )}
          </div>
        </div>
      )}

      {sub.status === 'active' && sub.plan !== 'free' && (
        <div className="bill-success">
          🎉 เปิดใช้งานแพ็ก <b>{PLANS.find(p => p.id === sub.plan)?.name}</b> เรียบร้อยแล้ว — ทีม AI ของคุณพร้อมทำงานเต็มรูปแบบ
        </div>
      )}

      {/* ===== ประวัติใบแจ้งหนี้ ===== */}
      {sub.invoices.length > 0 && (
        <div className="bill-invoices">
          <div className="bill-inv-hd">ประวัติใบแจ้งหนี้</div>
          <div className="bill-inv-table">
            <div className="bill-inv-row bill-inv-head">
              <div>วันที่</div><div>แพ็ก</div><div className="bill-inv-amt">ยอด</div><div className="bill-inv-st">สถานะ</div><div />
            </div>
            {sub.invoices.map(inv => (
              <div key={inv.id} className="bill-inv-row">
                <div>{thaiDate(inv.date)}</div>
                <div>{PLANS.find(p => p.id === inv.plan)?.name ?? inv.plan}</div>
                <div className="bill-inv-amt">{baht(inv.amount)}</div>
                <div className="bill-inv-st"><span className={`bill-inv-badge inv-${inv.status}`}>{INV_BADGE[inv.status]}</span></div>
                <div className="bill-inv-view"><button onClick={() => setInvoiceModal(inv)}>ใบกำกับภาษี</button></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bill-auto-note">
        ⚙️ <b>Automate billing:</b> เมื่อเปิด "ต่ออายุอัตโนมัติ" ระบบจะออกใบแจ้งหนี้และต่ออายุให้ทุกรอบบิล
        งานเบื้องหลังจะรันด้วย Supabase Edge Function <code>billing-cron</code> (ตั้งเวลาด้วย pg_cron รายวัน)
        เพื่อสร้างรายการเรียกเก็บผ่าน PromptPay และอัปเดตสถานะอัตโนมัติ — ดูรายละเอียดใน <code>supabase/README.md</code>
      </div>

      {/* ===== ใบกำกับภาษี / ใบเสร็จ (พิมพ์ได้) ===== */}
      {invoiceModal && (() => {
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
                    <div className="inv-doc-sub">ใบกำกับภาษี / ใบเสร็จรับเงิน<br/>Tax Invoice / Receipt</div>
                  </div>
                  <div className="inv-doc-no">
                    เลขที่: <b>{inv.id.toUpperCase()}</b><br/>
                    วันที่: {thaiDate(inv.date)}
                  </div>
                </div>
                <div className="inv-doc-parties">
                  <div>
                    <span className="inv-doc-lbl">ผู้ให้บริการ / ผู้ขาย</span>
                    {COMPANY.nameTh}<br/>
                    {COMPANY.address}<br/>
                    โทร {COMPANY.tel} · {COMPANY.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}<br/>
                    เลขประจำตัวผู้เสียภาษี: {COMPANY.taxId || '(โปรดระบุใน config)'}<br/>
                    {PAYMENT.bankName} เลขที่ {PAYMENT.accountNo}<br/>
                    PromptPay: {PAYMENT.promptpayId}
                  </div>
                  <div><span className="inv-doc-lbl">ลูกค้า</span>ผู้ใช้ระบบ<br/>(แก้ชื่อ/เลขผู้เสียภาษีได้ในการตั้งค่าบริษัท)</div>
                </div>
                <table className="inv-doc-table">
                  <thead><tr><th>รายการ</th><th>จำนวนเงิน</th></tr></thead>
                  <tbody>
                    <tr><td>แพ็กเกจ {planName} — รอบบิล 1 เดือน</td><td>{baht(base)}</td></tr>
                  </tbody>
                </table>
                <div className="inv-doc-totals">
                  <div><span>มูลค่าก่อนภาษี</span><span>{baht(base)}</span></div>
                  <div><span>ภาษีมูลค่าเพิ่ม 7%</span><span>{baht(vat)}</span></div>
                  <div className="inv-doc-grand"><span>ยอดรวมทั้งสิ้น</span><span>{baht(inv.amount)}</span></div>
                </div>
                <div className="inv-doc-foot">
                  สถานะการชำระเงิน: <b>{INV_BADGE[inv.status]}</b> · ชำระผ่าน PromptPay (Thai QR)
                </div>
              </div>
              <div className="inv-actions">
                <button className="inv-close" onClick={() => setInvoiceModal(null)}>ปิด</button>
                <button className="inv-print" onClick={() => window.print()}>พิมพ์ / บันทึก PDF</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
