import { useState } from 'react';
import { pmfScore, PMF_THRESHOLD } from '../lib/pmfSurvey';
import { track } from '../lib/analytics';

/* PMF Survey (Sean Ellis 40% rule) — เครื่องมือพรีเมียม (Superorganism §Viral Growth)
 * เจ้าของธุรกิจถามลูกค้า: "จะรู้สึกยังไงถ้าใช้ <สินค้า> ไม่ได้อีก?" แล้วกรอกจำนวนคำตอบ → รู้ว่าถึง PMF หรือยัง */
export default function PmfSurveyPanel() {
  const [v, setV] = useState('');
  const [s, setS] = useState('');
  const [n, setN] = useState('');
  const r = pmfScore({ veryDisappointed: +v || 0, somewhat: +s || 0, notDisappointed: +n || 0 });
  const pct = (x: number) => (r.total > 0 ? Math.round((x / r.total) * 100) : 0);
  const nv = +v || 0, ns = +s || 0, nn = +n || 0;

  const inp = (val: string, set: (x: string) => void, label: string, color: string) => (
    <div style={{ flex: '1 1 140px' }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink3)', display: 'block', marginBottom: 4 }}>
        <span style={{ color }}>●</span> {label}
      </label>
      <input type="number" min={0} value={val} placeholder="0"
        onChange={e => set(e.target.value)}
        onBlur={() => { if (r.total > 0) track('pmf_calculated', { verdict: r.verdict, pct: r.veryPct }); }}
        style={{ width: '100%', padding: '9px 11px', borderRadius: 'var(--r)', border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 15, fontVariantNumeric: 'tabular-nums' }} />
    </div>
  );

  return (
    <div style={{ background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 'var(--r)', padding: '18px 20px', marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>🎯</span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>PMF Survey — วัด Product-Market Fit</h3>
        <span style={{ fontSize: 10.5, fontWeight: 700, background: 'var(--cream3)', color: 'var(--ink4)', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.05em' }}>Premium</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink3)', margin: '0 0 14px', lineHeight: 1.6 }}>
        ถามลูกค้าจริง: <em>"คุณจะรู้สึกยังไงถ้าใช้ {`{ธุรกิจของคุณ}`} ไม่ได้อีก?"</em> แล้วกรอกจำนวนคำตอบแต่ละแบบ —
        ถ้า <strong style={{ color: 'var(--ink)' }}>"ผิดหวังมาก" ≥ {PMF_THRESHOLD}%</strong> = ถึง PMF (พร้อม scale)
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {inp(v, setV, 'ผิดหวังมาก', 'var(--green)')}
        {inp(s, setS, 'ผิดหวังบ้าง', '#f59e0b')}
        {inp(n, setN, 'ไม่ผิดหวัง', '#ef4444')}
      </div>

      {r.total > 0 && (
        <div style={{ marginTop: 16 }}>
          {/* bar */}
          <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', border: '1px solid var(--sand)' }}>
            <div style={{ width: pct(nv) + '%', background: 'var(--green)' }} />
            <div style={{ width: pct(ns) + '%', background: '#f59e0b' }} />
            <div style={{ width: pct(nn) + '%', background: '#ef4444' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--ink4)', fontVariantNumeric: 'tabular-nums' }}>
            <span>ผิดหวังมาก {pct(nv)}%</span>
            <span>รวม {r.total} คน</span>
          </div>

          {/* verdict */}
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 'var(--r)', background: 'var(--cream)', border: '1px solid var(--sand)', borderLeft: `3px solid ${r.color}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: r.color }}>{r.label}</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: r.color, fontVariantNumeric: 'tabular-nums', marginLeft: 'auto' }}>{r.veryPct}%</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink3)', marginTop: 6, lineHeight: 1.6 }}>{r.guidance}</div>
          </div>
        </div>
      )}
    </div>
  );
}
