import { useState } from 'react';
import type { PersonaView } from '../lib/behaviorPersona';
import { dismissPersona, clearBehavior } from '../lib/behaviorPersona';
import { track } from '../lib/analytics';

/* PersonaBanner — แถบส่วนตัวใต้ hero ที่ "ปรับตามพฤติกรรมจริง" ของผู้เข้าชม
 * Dark AI Marketing #5/#6/#7 (Dynamic Persona · Hyper-Personalization · พฤติกรรม>ประชากร)
 * จริยธรรม: โปร่งใส (กดดู "ทำไมเห็นข้อความนี้") · ปิดได้ · ล้างข้อมูลส่วนตัวได้ (PDPA) */

const C = { border: '#334155', panel: 'rgba(6,182,212,0.08)', white: '#fff', slate: '#94a3b8', slate5: '#8b96a9', cyan3: '#67e8f9', cyan4: '#22d3ee', cyan5: '#06b6d4', amber5: '#f59e0b', dark: '#020617' };

interface Props {
  persona: PersonaView;
  onGetStarted: () => void;
  onClose: () => void;
}

export default function PersonaBanner({ persona, onGetStarted, onClose }: Props) {
  const [showReason, setShowReason] = useState(false);

  const close = () => { dismissPersona(); track('persona_banner_dismissed', { persona: persona.id }); onClose(); };
  const clear = () => { clearBehavior(); track('persona_data_cleared', { persona: persona.id }); onClose(); };
  const cta = () => { track('landing_cta_click', { cta: 'persona_banner', persona: persona.id }); onGetStarted(); };

  return (
    <section style={{ padding: '10px 24px 0' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', borderRadius: 14, border: `1px solid ${C.cyan5}`, background: C.panel, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>{persona.emoji}</span>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <div style={{ color: C.white, fontWeight: 800, fontSize: 15.5, lineHeight: 1.4 }}>{persona.headline}</div>
          <div style={{ color: C.slate, fontSize: 13.5, lineHeight: 1.55, marginTop: 3 }}>{persona.sub}</div>
          <div style={{ marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setShowReason(v => !v)}
              style={{ background: 'none', border: 'none', color: C.slate5, fontSize: 11.5, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: 'inherit' }}>
              {showReason ? 'ซ่อน' : 'ทำไมเห็นข้อความนี้?'}
            </button>
            {showReason && (
              <span style={{ color: C.slate5, fontSize: 11.5, lineHeight: 1.5 }}>
                {persona.reason} — ข้อมูลนี้อยู่ในเครื่องคุณเท่านั้น ·{' '}
                <button onClick={clear} style={{ background: 'none', border: 'none', color: C.cyan4, fontSize: 11.5, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: 'inherit' }}>ล้างข้อมูลส่วนตัว</button>
              </span>
            )}
          </div>
        </div>
        <button onClick={cta}
          style={{ flex: 'none', padding: '11px 22px', borderRadius: 10, border: 'none', background: C.amber5, color: C.dark, fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {persona.ctaLabel}
        </button>
        <button onClick={close} aria-label="ปิดข้อความส่วนตัว"
          style={{ flex: 'none', background: 'none', border: 'none', color: C.slate5, fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
      </div>
    </section>
  );
}
