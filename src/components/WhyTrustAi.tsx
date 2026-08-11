import { useLandingTheme } from '../lib/landingTheme';
import { AI_OBJECTIONS, AI_OBJECTIONS_TITLE, AI_OBJECTIONS_SUB } from '../lib/aiObjections';

/* WhyTrustAi — objection handling: จัดการความกลัว AI ที่บล็อกการสมัคร (ใช้ไม่เป็น/ถูกต้องไหม/ไม่เคยใช้)
 * วางคู่กับ GuestAiTry (ลองเห็นเองว่าง่าย) · รองรับธีมเข้ม/มินิมอล */
export default function WhyTrustAi({ onGetStarted }: { onGetStarted: () => void }) {
  const light = useLandingTheme() === 'minimal';
  const C = light
    ? { bg: '#f8fafc', card: '#ffffff', ink: '#0f172a', sub: '#475569', border: '#e2e8f0', cyan: '#0891b2', amber: '#f59e0b' }
    : { bg: '#020617', card: '#0f172a', ink: '#ffffff', sub: '#94a3b8', border: '#1e293b', cyan: '#22d3ee', amber: '#fbbf24' };

  return (
    <section style={{ padding: '72px 24px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(23px, 3.3vw, 31px)', fontWeight: 800, color: C.ink, margin: '0 0 12px' }}>
          {AI_OBJECTIONS_TITLE}
        </h2>
        <p style={{ textAlign: 'center', color: C.sub, fontSize: 15, maxWidth: 620, margin: '0 auto 40px', lineHeight: 1.6 }}>
          {AI_OBJECTIONS_SUB}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          {AI_OBJECTIONS.map((o) => (
            <div key={o.fear} style={{ border: `1px solid ${C.border}`, borderRadius: 16, background: C.card, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 30 }}>{o.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 16.5, color: C.ink, lineHeight: 1.4 }}>{o.fear}</div>
              <div style={{ display: 'flex', gap: 8, color: C.sub, fontSize: 14.5, lineHeight: 1.65 }}>
                <span style={{ color: C.cyan, fontWeight: 800, flexShrink: 0 }}>→</span>
                <span>{o.answer}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 30 }}>
          <button
            onClick={onGetStarted}
            style={{ padding: '14px 34px', borderRadius: 12, border: 'none', background: C.amber, color: '#020617', fontFamily: 'inherit', fontWeight: 700, fontSize: 15.5, cursor: 'pointer' }}
          >
            เริ่มแบบไม่ต้องเก่ง AI — ฟรี 15 วัน
          </button>
        </div>
      </div>
    </section>
  );
}
