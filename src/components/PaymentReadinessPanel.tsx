import { useEffect, useState } from 'react';
import { paymentReadiness, type PaymentReadiness } from '../lib/paymentReadiness';
import { paymentProofStats } from '../lib/payments';
import { PAYMENT } from '../config';

/* แผง "รับเงินได้จริงไหม" — เฟสสุดท้ายของวงจรที่เดิมไม่มีใครวัด
 *
 * วงจร PDCA ของการเติบโตวัดถึงแค่ "สมัคร" แล้วจบ ทั้งที่ปลายทางจริงคือ **เงินเข้าบัญชี**
 * และ ณ 19 ส.ค. 2569 เส้นทางนั้นยังไม่เคยถูกใช้จริงสักครั้ง (payment_submissions = 0 แถว)
 */

const TONE: Record<PaymentReadiness['state'], { color: string; label: string }> = {
  ok:       { color: '#16a34a', label: 'พร้อมรับเงิน' },
  at_risk:  { color: '#d97706', label: 'รับได้ แต่มีเงื่อนไขที่จะทำให้ล้ม' },
  unproven: { color: '#d97706', label: 'ยังไม่เคยพิสูจน์' },
  blocked:  { color: '#dc2626', label: 'ยังพิสูจน์ไม่ได้ว่ารับเงินได้' },
};

export default function PaymentReadinessPanel() {
  const [st, setSt] = useState<PaymentReadiness | null>(null);

  useEffect(() => {
    let dead = false;
    paymentProofStats().then((s) => {
      if (dead || !s) return;
      setSt(paymentReadiness({
        slipOkLive: PAYMENT.slipOkLive,
        slipsTotal: s.total,
        slipsVerified: s.verified,
        // ⚠️ null โดยตั้งใจ = "ตรวจจากในแอปไม่ได้" ไม่ใช่ "ไม่มีปัญหา"
        //    โควตาอยู่ที่ SlipOK ต้องเรียก edge function slipok-quota-check (ไม่กินโควตา)
        quotaLeft: null,
      }));
    }).catch(() => { /* เงียบ — ไม่ทำแผงอื่นพัง */ });
    return () => { dead = true; };
  }, []);

  if (!st) return null;
  const tone = TONE[st.state];

  return (
    <div style={{ border: `1px solid ${tone.color}`, borderRadius: 12, padding: '16px 18px', background: 'var(--cream2)' }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
        💰 เส้นทางรับเงิน (SlipOK) — <span style={{ color: tone.color }}>{tone.label}</span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3, lineHeight: 1.7 }}>{st.headline}</div>

      {st.risks.length > 0 && (
        <div style={{ display: 'grid', gap: 5, marginTop: 10 }}>
          {st.risks.map((r, i) => (
            <div key={i} style={{ fontSize: 11.5, color: 'var(--ink3)', lineHeight: 1.65 }}>{r}</div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 11, border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 13px', background: 'var(--cream)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>ทำอะไรต่อ</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink)', marginTop: 4, lineHeight: 1.7 }}>{st.nextAction}</div>
      </div>
    </div>
  );
}
