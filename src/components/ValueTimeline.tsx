import { useLandingTheme } from '../lib/landingTheme';
import { VALUE_TIMELINE, TIMELINE_NOTE } from '../lib/valueTimeline';

/* ValueTimeline — "เส้นทางเห็นผล วันที่ 1/3/7/15" (บทวิเคราะห์ item #3)
 * ทำให้ time-to-value จับต้องได้ · รองรับธีมเข้ม/มินิมอล · การ์ดไหลตามแนวนอนบนจอเล็ก (overflow-x) */
export default function ValueTimeline({ onGetStarted }: { onGetStarted: () => void }) {
  const light = useLandingTheme() === 'minimal';
  const C = light
    ? { bg: '#ffffff', card: '#f8fafc', ink: '#0f172a', sub: '#475569', border: '#e2e8f0', cyan: '#0891b2', amber: '#f59e0b', line: '#cbd5e1' }
    : { bg: '#020617', card: '#0f172a', ink: '#ffffff', sub: '#94a3b8', border: '#1e293b', cyan: '#22d3ee', amber: '#fbbf24', line: '#334155' };

  return (
    <section style={{ padding: '72px 24px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px, 3.4vw, 32px)', fontWeight: 700, color: C.ink, marginBottom: 12 }}>
          หลังเริ่มทดลอง — <span style={{ color: C.cyan }}>คุณจะเห็นอะไรบ้าง</span>
        </h2>
        <p style={{ textAlign: 'center', color: C.sub, fontSize: 15, maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.6 }}>
          ไม่ใช่แค่ “สมัครแล้วจบ” — นี่คือเส้นทางที่ทีม AI พาเดินทีละขั้น จากแผนถึงเห็นดีมานด์จริง
        </p>

        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(210px, 1fr)', gap: 16, minWidth: 680 }}>
            {VALUE_TIMELINE.map((s, i) => (
              <div key={s.day} style={{ position: 'relative', border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 18px', background: C.card }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 26 }}>{s.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.amber, letterSpacing: '0.04em', border: `1px solid ${C.border}`, borderRadius: 999, padding: '3px 10px' }}>{s.day}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: C.ink, marginBottom: 6 }}>{s.title}</div>
                <div style={{ color: C.sub, fontSize: 13.5, lineHeight: 1.6 }}>{s.desc}</div>
                {i < VALUE_TIMELINE.length - 1 && (
                  <span aria-hidden="true" style={{ position: 'absolute', right: -12, top: '50%', color: C.line, fontSize: 20, fontWeight: 700 }}>→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <p style={{ textAlign: 'center', color: C.sub, fontSize: 12, margin: '18px auto 0', maxWidth: 600, lineHeight: 1.6 }}>{TIMELINE_NOTE}</p>
        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <button
            onClick={onGetStarted}
            style={{ padding: '13px 32px', borderRadius: 12, border: 'none', background: C.amber, color: '#020617', fontFamily: 'inherit', fontWeight: 700, fontSize: 15.5, cursor: 'pointer' }}
          >
            เริ่มวันที่ 1 ของคุณ — ฟรี
          </button>
        </div>
      </div>
    </section>
  );
}
