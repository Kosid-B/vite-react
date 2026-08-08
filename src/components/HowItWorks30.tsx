import { useEffect, useRef, useState } from 'react';
import { HOW_STEPS, STEP_MS, HOW_TOTAL_MS } from '../lib/howItWorks';
import { track } from '../lib/analytics';
import { useLandingTheme } from '../lib/landingTheme';

/* HowItWorks30 — explainer เคลื่อนไหว "ระบบทำงานยังไงใน 30 วินาที" บน Landing
 * auto-play + progress bar + วนซ้ำ + กดหยุด/เล่นได้ · ช่วยให้เข้าใจภาพรวมเร็ว (แก้คนไม่กล้าสมัคร) */

const DARK_C = { border: '#1e293b', panel: 'rgba(15,23,42,0.6)', card: 'rgba(2,6,23,0.55)', white: '#fff', slate: '#94a3b8', cyan: '#22d3ee', amber: '#f59e0b', dark: '#020617', track: '#0b1220' };
const LIGHT_C: typeof DARK_C = { border: '#e2e8f0', panel: '#ffffff', card: '#f1f5f9', white: '#0f172a', slate: '#475569', cyan: '#0891b2', amber: '#f59e0b', dark: '#020617', track: '#e2e8f0' };
const TICK = 100; // ms
const fmt = (ms: number) => `0:${String(Math.floor(ms / 1000)).padStart(2, '0')}`;

export default function HowItWorks30({ onGetStarted }: { onGetStarted: () => void }) {
  const C = useLandingTheme() === 'minimal' ? LIGHT_C : DARK_C;
  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0); // ในสเต็ปปัจจุบัน
  const [playing, setPlaying] = useState(true);
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) { started.current = true; track('howitworks_view', {}); }
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setElapsed(e => {
        if (e + TICK >= STEP_MS) { setIdx(i => (i + 1) % HOW_STEPS.length); return 0; }
        return e + TICK;
      });
    }, TICK);
    return () => clearInterval(t);
  }, [playing]);

  const step = HOW_STEPS[idx];
  const totalElapsed = idx * STEP_MS + elapsed;

  const goto = (i: number) => { setIdx(i); setElapsed(0); };

  return (
    <section style={{ padding: '20px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', borderRadius: 16, border: `1px solid ${C.border}`, background: C.panel, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 'clamp(15px, 2.2vw, 19px)', fontWeight: 800, color: C.white }}>▶︎ ระบบทำงานยังไง — ใน 30 วินาที</div>
          <div style={{ fontSize: 12, color: C.slate, fontVariantNumeric: 'tabular-nums' }}>{fmt(totalElapsed)} / {fmt(HOW_TOTAL_MS)}</div>
        </div>

        {/* จอ explainer */}
        <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: '26px 20px', textAlign: 'center', minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 15, color: C.cyan, fontWeight: 700, marginBottom: 6 }}>ขั้นที่ {idx + 1}/{HOW_STEPS.length}</div>
          <div key={step.id} style={{ animation: 'howPop .4s ease' }}>
            <div style={{ fontSize: 44, lineHeight: 1 }} aria-hidden="true">{step.icon}</div>
            <div style={{ fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 800, color: C.white, margin: '8px 0 4px' }}>{step.title}</div>
            <div style={{ fontSize: 13.5, color: C.slate, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>{step.caption}</div>
          </div>
        </div>

        {/* progress ต่อสเต็ป (จุด + แถบ) */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {HOW_STEPS.map((s, i) => (
            <button key={s.id} onClick={() => goto(i)} aria-label={s.title}
              style={{ flex: 1, height: 6, borderRadius: 999, border: 0, padding: 0, cursor: 'pointer', background: C.track, overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', borderRadius: 999, background: C.cyan, width: i < idx ? '100%' : i === idx ? `${(elapsed / STEP_MS) * 100}%` : '0%', transition: i === idx ? `width ${TICK}ms linear` : 'none' }} />
            </button>
          ))}
        </div>

        {/* controls + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button onClick={() => setPlaying(p => !p)}
            style={{ background: 'transparent', color: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {playing ? '❚❚ หยุด' : '▶︎ เล่น'}
          </button>
          <button onClick={() => { track('howitworks_cta_click', { step: step.id }); onGetStarted(); }}
            style={{ flex: '1 1 auto', background: C.amber, color: C.dark, border: 0, borderRadius: 10, padding: '11px 20px', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
            เริ่มฟรี — ลองก่อนได้เลย ไม่ต้องใส่บัตร
          </button>
        </div>
      </div>
      <style>{`@keyframes howPop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
    </section>
  );
}
