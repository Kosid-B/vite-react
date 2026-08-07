import { useMemo } from 'react';
import { gainPointsFor, GAIN_HEADLINE, GAIN_SUB } from '../lib/gainPoints';
import { track } from '../lib/analytics';

/* GainPointsPanel — สื่อสาร "คุณจะได้อะไร" เป็น pain → gain (แก้ปัญหาคนไม่เข้าใจ→ไม่กล้าสมัคร)
 * วางบนหน้า Landing ก่อนส่วนอื่น · จัดลำดับตามกลุ่ม (seg) ให้เห็นสิ่งที่ตรงใจก่อน */

const C = { border: '#1e293b', panel: 'rgba(15,23,42,0.6)', card: 'rgba(2,6,23,0.5)', white: '#fff', slate: '#94a3b8', cyan: '#22d3ee', green: '#4ade80', amber: '#f59e0b', dark: '#020617' };

export default function GainPointsPanel({ seg, onGetStarted }: { seg?: string; onGetStarted: () => void }) {
  const items = useMemo(() => gainPointsFor(seg), [seg]);

  return (
    <section style={{ padding: '20px 24px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', borderRadius: 16, border: `1px solid ${C.border}`, background: C.panel, padding: '24px 24px 22px' }}>
        <div style={{ textAlign: 'center', fontSize: 'clamp(18px, 2.6vw, 24px)', fontWeight: 800, color: C.white }}>
          {GAIN_HEADLINE}
        </div>
        <div style={{ textAlign: 'center', color: C.slate, fontSize: 13.5, margin: '6px 0 18px' }}>{GAIN_SUB}</div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {items.map(g => (
            <div key={g.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', background: C.card, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 24, lineHeight: 1, flex: 'none' }} aria-hidden="true">{g.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: C.amber, marginBottom: 3 }}>
                  <span style={{ opacity: 0.85 }}>ถ้าคุณ:</span> {g.pain}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.white, lineHeight: 1.4 }}>
                  <span style={{ color: C.green }}>คุณจะได้:</span> {g.gain}
                </div>
                <div style={{ fontSize: 11.5, color: C.slate, marginTop: 5 }}>▸ {g.how}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <button onClick={() => { track('gainpoints_cta_click', { seg: seg ?? 'default' }); onGetStarted(); }}
                  style={{ background: C.amber, color: C.dark, border: 0, borderRadius: 12, padding: '13px 30px', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
            เริ่มฟรี — ลองก่อนได้เลย ไม่ต้องใส่บัตร
          </button>
          <div style={{ fontSize: 11.5, color: C.slate, marginTop: 8 }}>
            ไม่ต้องเข้าใจทุกอย่างก่อน — เข้าไปลอง แล้วระบบพาไปทีละขั้น
          </div>
        </div>
      </div>
    </section>
  );
}
