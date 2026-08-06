import { useMemo, useState } from 'react';
import { submitLead, validateLead, readUtm } from '../lib/platformLead';
import { segmentFor } from '../lib/heroVariant';
import { track } from '../lib/analytics';

/* LeadCapture — ดักเก็บ "คนที่ยังไม่พร้อมสมัคร แต่สนใจ" บน landing (First-party data + PDPA consent)
 * ธีมมืดเข้ากับ landing · เก็บ utm อัตโนมัติ (รู้ว่ามาจากช่องไหน) */

const C = {
  bg: 'rgba(15,23,42,0.6)', panel: 'rgba(2,6,23,0.5)', border: '#1e293b', border2: '#334155',
  white: '#fff', slate: '#94a3b8', slateDim: '#8b96a9', cyan: '#22d3ee', cyan5: '#06b6d4', green: '#16a34a',
};

export default function LeadCapture({ onPrivacy }: { onPrivacy?: () => void }) {
  const utm = useMemo(() => readUtm(typeof window !== 'undefined' ? window.location.search : ''), []);
  const seg = useMemo(() => (typeof window !== 'undefined' ? segmentFor(window.location.search, document.referrer) : 'default'), []);
  const [contact, setContact] = useState('');
  const [name, setName] = useState('');
  const [interest, setInterest] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valid = validateLead({ contact, consent }).ok;

  async function submit() {
    setBusy(true); setErr(null);
    const res = await submitLead({ contact, name, interest, consent }, utm, seg);
    setBusy(false);
    if (res) { setErr(res); return; }
    track('lead_submitted', { medium: utm.medium || 'direct', seg });
    setDone(true);
  }

  const input: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10,
    border: `1px solid ${C.border2}`, background: C.panel, color: C.white, fontFamily: 'inherit', fontSize: 15,
  };

  return (
    <section style={{ padding: '56px 24px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 26px', borderRadius: 18, border: `1px solid ${C.border}`, background: C.bg, textAlign: 'center' }}>
        {done ? (
          <div>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
            <h3 style={{ margin: '0 0 6px', color: C.white, fontSize: 20, fontWeight: 800 }}>ได้รับข้อมูลแล้ว ขอบคุณครับ!</h3>
            <p style={{ color: C.slate, fontSize: 15, margin: 0, lineHeight: 1.6 }}>
              เราจะส่งเคล็ดเริ่มธุรกิจ + สิทธิ์รุ่นก่อตั้งให้ทางช่องทางที่คุณให้ไว้
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.cyan5, marginBottom: 10 }}>ยังไม่พร้อมเริ่มตอนนี้?</p>
            <h3 style={{ margin: '0 0 8px', color: C.white, fontSize: 'clamp(20px,3vw,26px)', fontWeight: 800, lineHeight: 1.35 }}>
              รับเคล็ด “เริ่มธุรกิจด้วย AI” ฟรี + สิทธิ์รุ่นก่อตั้ง
            </h3>
            <p style={{ color: C.slate, fontSize: 14.5, margin: '0 0 20px', lineHeight: 1.6 }}>
              ทิ้งอีเมล/LINE ไว้ เราส่งเคล็ดเริ่มธุรกิจให้ + แจ้งก่อนใครเมื่อเปิดรุ่นก่อตั้ง (ไม่สแปม ยกเลิกได้)
            </p>
            <div style={{ display: 'grid', gap: 12, textAlign: 'left' }}>
              <input value={contact} onChange={e => setContact(e.target.value)} placeholder="อีเมล หรือ LINE ID (จำเป็น)" style={input} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อ (ไม่บังคับ)" style={input} />
                <input value={interest} onChange={e => setInterest(e.target.value)} placeholder="อยากทำธุรกิจอะไร (ไม่บังคับ)" style={input} />
              </div>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: C.slate, fontSize: 12.5, lineHeight: 1.5, cursor: 'pointer' }}>
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3, flex: 'none' }} />
                <span>
                  ยินยอมให้ CEO AI Thailand (บ.บี.เทรนนิ่ง คอนซัลแทนท์) เก็บและใช้ข้อมูลติดต่อเพื่อส่งข่าว/เคล็ดธุรกิจ ตาม
                  {onPrivacy
                    ? <button type="button" onClick={onPrivacy} style={{ background: 'none', border: 0, color: C.cyan, cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline' }}> นโยบายความเป็นส่วนตัว (PDPA)</button>
                    : <span style={{ color: C.cyan }}> นโยบายความเป็นส่วนตัว (PDPA)</span>}
                  {' '}· ถอนความยินยอมได้ทุกเมื่อ
                </span>
              </label>
              {err && <div style={{ padding: '9px 12px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'rgba(220,38,38,.15)', color: '#fca5a5' }}>{err}</div>}
              <button disabled={!valid || busy} onClick={submit}
                style={{ background: valid && !busy ? C.cyan5 : C.border2, color: '#fff', border: 0, borderRadius: 10, padding: '13px 22px', fontWeight: 800, fontSize: 15.5, cursor: valid && !busy ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                {busy ? 'กำลังส่ง…' : 'รับเคล็ด + สิทธิ์รุ่นก่อตั้ง'}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
