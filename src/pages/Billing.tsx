import { useState } from 'react';
import type { AppData, PlanId, Invoice, SubStatus } from '../types';
import { promptPayPayload, promptPayQrUrl, baht } from '../utils';
import { BRAND, COMPANY, PAYMENT } from '../config';

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

const COST: Record<string, PlanCost> = {
  growth: {
    items: [
      { label: 'Claude AI API', amount: 760, note: '1,000 calls × ~฿0.76/call (Sonnet model)' },
      { label: 'Supabase + Hosting', amount: 250, note: 'Database, Edge Functions, Storage' },
      { label: 'Support & Development', amount: 180, note: 'ทีมพัฒนาและดูแลระบบ' },
    ],
    total: 1190,
    price: 1490,
    margin: 20.1,
  },
  scale: {
    items: [
      { label: 'Claude AI API', amount: 3800, note: '5,000 calls × ~฿0.76/call (Sonnet model)' },
      { label: 'Supabase + Hosting', amount: 550, note: 'Database, Edge Functions, Storage (priority tier)' },
      { label: 'Support & Development', amount: 300, note: 'ทีมพัฒนาและดูแลระบบ (dedicated)' },
    ],
    total: 4650,
    price: 5900,
    margin: 21.2,
  },
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

export default function Billing({ data, onUpdate }: Props) {
  const sub = data.subscription;
  const [selected, setSelected] = useState<PlanId>(sub.plan === 'free' && sub.status !== 'trial' ? 'growth' : sub.plan);
  const [copied, setCopied] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState<Invoice | null>(null);
  const [showCost, setShowCost] = useState(false);

  const selectedPlan = PLANS.find(p => p.id === selected)!;
  const needPayment = selectedPlan.price > 0;
  const payload = needPayment ? promptPayPayload(PAYMENT.promptpayId, selectedPlan.price) : '';
  const qrUrl = needPayment ? promptPayQrUrl(PAYMENT.promptpayId, selectedPlan.price) : '';

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
    onUpdate({ ...data, subscription: { ...sub, plan: id, status: 'pending_payment' } });
  }

  function confirmPaid() {
    const now = new Date().toISOString();
    const invoice: Invoice = {
      id: 'inv-' + Date.now().toString(36),
      date: now,
      plan: selectedPlan.id,
      amount: selectedPlan.price,
      status: 'paid',
    };
    onUpdate({
      ...data,
      subscription: {
        ...sub,
        plan: selectedPlan.id,
        status: 'active',
        currentPeriodEnd: addMonths(now, 1),
        trialEndDate: null,
        invoices: [invoice, ...sub.invoices],
      },
    });
  }

  function renewNow() {
    const base =
      sub.currentPeriodEnd && daysLeft(sub.currentPeriodEnd) > 0
        ? sub.currentPeriodEnd
        : new Date().toISOString();
    const price = PLANS.find(p => p.id === sub.plan)?.price ?? 0;
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
        currentPeriodEnd: addMonths(base, 1),
        invoices: [invoice, ...sub.invoices],
      },
    });
  }

  function setAutoRenew(v: boolean) {
    onUpdate({ ...data, subscription: { ...sub, autoRenew: v } });
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
      <div className="page-header">
        <div className="page-title">แพ็กเกจ & การสมัครสมาชิก</div>
        <div className="page-meta">
          <span className="meta-chip">ราคารวม VAT 7% แล้ว</span>
          <span className="meta-chip">ชำระผ่าน PromptPay</span>
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
            <label className="bill-autorenew">
              <input
                type="checkbox"
                checked={sub.autoRenew}
                onChange={e => setAutoRenew(e.target.checked)}
              />
              ต่ออายุอัตโนมัติ
            </label>
            {(effective === 'past_due' ||
              (dLeft !== null && dLeft <= 7) ||
              sub.status === 'cancelled') && (
              <button className="bill-renew-btn" onClick={renewNow}>
                ต่ออายุทันที
              </button>
            )}
            {sub.status !== 'cancelled' && (
              <button className="bill-cancel-btn" onClick={cancelSub}>
                ยกเลิกต่ออายุ
              </button>
            )}
          </div>
        </div>
      )}

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
              {p.price === 0 ? 'ฟรี' : baht(p.price)}
              {p.price > 0 && <span className="bill-plan-per">/เดือน</span>}
            </div>
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
              บวกกำไรบริษัท <b>~20%</b> เพื่อความยั่งยืนของแพลตฟอร์ม
            </div>
            <div className="bill-cost-grid">
              {(['growth', 'scale'] as const).map(key => {
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
                      ≈ ฿0.76/call (อัตรา $1 = ฿36)
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
              สแกน PromptPay QR หรือโอนเข้าบัญชีธนาคารด้านล่าง
            </div>

            <div className="bill-bank">
              <div className="bill-bank-hd">โอนเข้าบัญชีธนาคาร</div>
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

            <div className="bill-amount-row">
              <span>ยอดชำระ</span>
              <span className="bill-amount">{baht(selectedPlan.price)}</span>
            </div>

            {payload ? (
              <>
                <button className="bill-copy" onClick={copyPayload}>
                  {copied ? '✓ คัดลอกแล้ว' : 'คัดลอกข้อมูล PromptPay QR (payload)'}
                </button>
                <button className="bill-confirm" onClick={confirmPaid}>
                  ฉันชำระเงินแล้ว — เปิดใช้งาน
                </button>
                <div className="bill-note">
                  * เมื่อเชื่อม Payment Gateway จริง ระบบจะยืนยันยอดอัตโนมัติ (เดโมนี้กดยืนยันเองได้)
                </div>
              </>
            ) : (
              <div className="bill-warn">
                ตั้งค่า PromptPay ID ของผู้รับใน <code>src/config.ts</code> ให้ถูกต้อง (เบอร์ 10 หลัก
                หรือเลขผู้เสียภาษี 13 หลัก)
              </div>
            )}
          </div>

          <div className="bill-pay-qr">
            {qrUrl ? (
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
              <div className="bill-qr-frame placeholder">รอข้อมูลพร้อมเพย์</div>
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
                      <br />
                      PromptPay: {PAYMENT.promptpayId}
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
