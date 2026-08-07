import { TRUST_SIGNALS } from '../lib/trustSignals';

/* TrustBar — แถบความน่าเชื่อถือ "ของจริง" ใต้ hero (Dark AI Marketing #17 เชิงจริยธรรม)
 * ไม่ปั้นตัวเลข/โลโก้ปลอม — authority + PDPA + risk-reversal · แก้ "ไม่เชื่อใจ → ไม่สมัคร" */
export default function TrustBar() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'center', padding: '4px 20px 24px' }}>
      {TRUST_SIGNALS.map((s, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#cbd5e1', background: 'rgba(15,23,42,0.6)', border: '1px solid #1e293b', borderRadius: 999, padding: '7px 14px', lineHeight: 1.3 }}>
          <span aria-hidden="true" style={{ fontSize: 14 }}>{s.icon}</span>{s.label}
        </span>
      ))}
    </div>
  );
}
