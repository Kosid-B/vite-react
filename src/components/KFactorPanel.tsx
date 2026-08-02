import { useState } from 'react';
import { kFactor, type KRegime } from '../lib/kFactor';
import { track } from '../lib/analytics';

/* KFactorPanel — K-factor / viral growth dashboard (Superorganism เสา 2)
 * K = i × c · ใส่ตัวเลขจริงจาก GA (aha_invite_click/referral) + claim_referral → รู้ระบอบไวรัล
 * เครื่องมือพรีเมียม (คู่กับ PMF Survey) — โฟกัส "ไวรัลยั่งยืนไหมเทียบ churn" */

const REGIME: Record<KRegime, { label: string; color: string; ico: string }> = {
  viral: { label: 'ไวรัลทวีคูณ (K>1)', color: '#16a34a', ico: '🚀' },
  'sub-viral': { label: 'Sub-viral (0<K<1)', color: '#d97706', ico: '📈' },
  flat: { label: 'ยังไม่มีไวรัล', color: '#64748b', ico: '➖' },
};

export default function KFactorPanel() {
  const [f, setF] = useState({ activeUsers: '', invitesSent: '', conversions: '', churn: '' });
  const n = (s: string) => (+s || 0);
  const r = kFactor({ activeUsers: n(f.activeUsers), invitesSent: n(f.invitesSent), conversions: n(f.conversions), churnRatePct: f.churn ? n(f.churn) : undefined });
  const g = REGIME[r.regime];
  const filled = n(f.activeUsers) > 0 && n(f.invitesSent) > 0;

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(p => ({ ...p, [k]: e.target.value }));
  const inp = (label: string, k: keyof typeof f, ph: string) => (
    <div style={{ flex: '1 1 130px' }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink3)', display: 'block', marginBottom: 4 }}>{label}</label>
      <input type="number" min={0} value={f[k]} placeholder={ph} onChange={set(k)}
        onBlur={() => { if (filled) track('kfactor_calculated', { regime: r.regime, k: Math.round(r.k * 100) / 100 }); }}
        style={{ width: '100%', padding: '9px 11px', borderRadius: 'var(--r)', border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 15, fontVariantNumeric: 'tabular-nums' }} />
    </div>
  );

  return (
    <div style={{ background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 'var(--r)', padding: '18px 20px', marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 18 }}>🦠</span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>K-factor — วัดการเติบโตแบบไวรัส</h3>
        <span style={{ fontSize: 10.5, fontWeight: 700, background: 'var(--cream3)', color: 'var(--ink4)', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.05em' }}>Premium</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink3)', margin: '0 0 14px', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--ink)' }}>K = i × c</strong> (คำเชิญต่อผู้ใช้ × อัตราแปลง) — ใส่ตัวเลขจาก GA (<em>aha_invite_click, referral</em>) + ผู้สมัครที่ชวนมา · <strong>K &gt; 1 = ทวีคูณ</strong> และต้อง &gt; churn
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        {inp('ผู้ใช้ active', 'activeUsers', '100')}
        {inp('คำเชิญที่ส่ง', 'invitesSent', '200')}
        {inp('สมัครจากคำเชิญ', 'conversions', '40')}
        {inp('churn %/รอบ', 'churn', '20')}
      </div>

      {filled && (
        <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 'var(--r)', background: 'var(--cream)', border: '1px solid var(--sand)', borderLeft: `4px solid ${g.color}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: g.color }}>{g.ico} {g.label}</span>
            <span style={{ marginLeft: 'auto', fontSize: 24, fontWeight: 800, color: g.color, fontVariantNumeric: 'tabular-nums' }}>K = {r.k.toFixed(2)}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 6 }}>{r.headline}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 12.5, color: 'var(--ink3)', fontVariantNumeric: 'tabular-nums' }}>
            <span>i (เชิญ/คน): <b>{r.invitesPerUser.toFixed(2)}</b></span>
            <span>c (แปลง): <b>{(r.conversionRate * 100).toFixed(0)}%</b></span>
            <span>ตัวคูณไวรัส: <b>{r.amplification === Infinity ? '∞' : r.amplification.toFixed(1) + '×'}</b></span>
          </div>
          {r.notes.length > 0 && (
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.6 }}>
              {r.notes.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
