import { useState } from 'react';
import type { AppData, PlanId } from '../types';
import { promptPayPayload, promptPayQrUrl, baht } from '../utils';

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

  const selectedPlan = PLANS.find(p => p.id === selected)!;
  const needPayment = selectedPlan.price > 0;
  const payload = needPayment ? promptPayPayload(sub.promptpayId, selectedPlan.price) : '';
  const qrUrl = needPayment ? promptPayQrUrl(sub.promptpayId, selectedPlan.price) : '';

  function choosePlan(id: PlanId) {
    setSelected(id);
    const plan = PLANS.find(p => p.id === id)!;
    onUpdate({ ...data, subscription: { ...sub, plan: id, status: plan.price === 0 ? 'active' : 'pending_payment' } });
  }

  function setPromptpayId(v: string) {
    onUpdate({ ...data, subscription: { ...sub, promptpayId: v } });
  }

  function confirmPaid() {
    onUpdate({ ...data, subscription: { ...sub, plan: selected, status: 'active' } });
  }

  function copyPayload() {
    navigator.clipboard?.writeText(payload).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

  const isActivePlan = (id: PlanId) => sub.plan === id && sub.status === 'active';

  return (
    <div>
      <div className="page-header">
        <div className="page-title">แพ็กเกจ & การชำระเงิน</div>
        <div className="page-meta">
          <span className="meta-chip">ราคารวม VAT 7% แล้ว</span>
          <span className="meta-chip">ชำระผ่าน PromptPay</span>
          {sub.status === 'active' && <span className="meta-chip" style={{ borderColor: 'var(--green)', color: 'var(--green)' }}>แพ็กปัจจุบัน: {PLANS.find(p => p.id === sub.plan)?.name}</span>}
        </div>
      </div>

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
            <div className="bill-pay-hd">ชำระเงินผ่าน PromptPay</div>
            <div className="bill-pay-sub">สแกน QR ด้วยแอปธนาคารใดก็ได้ เพื่อชำระแพ็ก <b>{selectedPlan.name}</b></div>

            <div className="bill-field">
              <label>พร้อมเพย์ผู้รับ (เบอร์มือถือ / เลขผู้เสียภาษี)</label>
              <input defaultValue={sub.promptpayId} onBlur={e => setPromptpayId(e.target.value)}
                placeholder="เช่น 0812345678" spellCheck={false} />
            </div>

            <div className="bill-amount-row">
              <span>ยอดชำระ</span>
              <span className="bill-amount">{baht(selectedPlan.price)}</span>
            </div>

            {payload ? (
              <>
                <button className="bill-copy" onClick={copyPayload}>{copied ? '✓ คัดลอกแล้ว' : 'คัดลอกข้อมูล QR (payload)'}</button>
                <button className="bill-confirm" onClick={confirmPaid}>ฉันชำระเงินแล้ว — เปิดใช้งาน</button>
                <div className="bill-note">* ระบบจะยืนยันยอดอัตโนมัติเมื่อเชื่อมต่อ Payment Gateway จริง (เดโมนี้กดยืนยันเองได้)</div>
              </>
            ) : (
              <div className="bill-warn">กรุณากรอกเบอร์พร้อมเพย์ให้ถูกต้อง (10 หลัก) หรือเลขผู้เสียภาษี 13 หลัก</div>
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
    </div>
  );
}
