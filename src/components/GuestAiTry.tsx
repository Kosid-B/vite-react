import { useState } from 'react';
import { useLandingTheme } from '../lib/landingTheme';
import { guestAskAi, type GuestAiResult } from '../lib/guestAi';
import { track } from '../lib/analytics';

/* GuestAiTry — "ลองสั่งงาน CEO AI จริง" บนหน้า Landing โดยไม่ต้องสมัคร (แก้ pain #1: คิดว่าต้องสมัครถึงใช้ AI)
 * เรียก AI จริงผ่าน Worker (cap ต่อ IP/วัน) → เห็นค่าจริงก่อน แล้วค่อยชวนสมัคร (PLG aha)
 * degrade สุภาพเมื่อไม่มี Worker (local/preview) → พาไปสมัคร */
export default function GuestAiTry({ onGetStarted }: { onGetStarted: () => void }) {
  const light = useLandingTheme() === 'minimal';
  const C = light
    ? { bg: '#ffffff', panel: '#f8fafc', ink: '#0f172a', sub: '#475569', border: '#e2e8f0', cyan: '#0891b2', amber: '#f59e0b', field: '#ffffff' }
    : { bg: '#020617', panel: '#0f172a', ink: '#ffffff', sub: '#94a3b8', border: '#1e293b', cyan: '#22d3ee', amber: '#fbbf24', field: '#0b1324' };

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<GuestAiResult | null>(null);
  const [noWorker, setNoWorker] = useState(false);

  const examples = ['ร้านกาแฟเล็ก ๆ อยากเพิ่มลูกค้า', 'ขายเสื้อผ้ามือสองออนไลน์', 'รับทำอาหารคลีนส่งออฟฟิศ'];

  async function ask() {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true); setRes(null); setNoWorker(false);
    track('guest_ai_try', {});
    const r = await guestAskAi(q);
    setBusy(false);
    if (!r) { setNoWorker(true); track('guest_ai_unavailable', {}); return; }
    setRes(r);
    track(r.capped ? 'guest_ai_capped' : 'guest_ai_result', {});
  }

  const btn: React.CSSProperties = { padding: '13px 26px', borderRadius: 12, border: 'none', background: C.amber, color: '#020617', fontFamily: 'inherit', fontWeight: 700, fontSize: 15.5, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 };

  return (
    <section style={{ padding: '64px 24px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 720, margin: '0 auto', border: `1px solid ${C.border}`, borderRadius: 18, background: C.panel, padding: '28px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 999, border: `1px solid ${C.cyan}`, color: C.cyan, fontSize: 12.5, fontWeight: 700, marginBottom: 12 }}>
            ⚡ ลองใช้ AI จริง — ไม่ต้องสมัคร
          </div>
          <h2 style={{ fontSize: 'clamp(21px, 3vw, 27px)', fontWeight: 800, color: C.ink, margin: '0 0 6px' }}>
            พิมพ์ธุรกิจของคุณ → ทีม AI แนะนำให้ทันที
          </h2>
          <p style={{ color: C.sub, fontSize: 14, margin: 0 }}>ใช้ได้เลยฟรี ไม่ต้องล็อกอิน · สมัครทีหลังเพื่อให้ทีม AI ทำงานต่อแบบเต็ม</p>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="เช่น: ร้านกาแฟเล็ก ๆ อยากเพิ่มลูกค้า ควรเริ่มยังไง"
          rows={3}
          maxLength={1000}
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 15px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.field, color: C.ink, fontFamily: 'inherit', fontSize: 15, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0 14px' }}>
          {examples.map((ex) => (
            <button key={ex} onClick={() => setText(ex)} type="button"
              style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${C.border}`, background: 'transparent', color: C.sub, fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer' }}>
              {ex}
            </button>
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <button onClick={ask} disabled={busy} style={btn}>
            {busy ? 'ทีม AI กำลังคิด…' : '🤖 ให้ทีม AI แนะนำ (ฟรี)'}
          </button>
        </div>

        {/* ผลลัพธ์ AI จริง */}
        {res && (
          <div style={{ marginTop: 20, border: `1px solid ${C.border}`, borderRadius: 14, background: C.bg, padding: '18px 18px' }}>
            <div style={{ color: C.ink, fontSize: 15.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{res.summary}</div>
            {res.suggestions.length > 0 && (
              <ul style={{ margin: '12px 0 0', paddingLeft: 4, listStyle: 'none', display: 'grid', gap: 8 }}>
                {res.suggestions.map((s, i) => (
                  <li key={i} style={{ display: 'flex', gap: 8, color: C.sub, fontSize: 14.5, lineHeight: 1.55 }}>
                    <span style={{ color: C.cyan, fontWeight: 700, flexShrink: 0 }}>✦</span> {s}
                  </li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <span style={{ color: C.sub, fontSize: 12.5 }}>
                {res.capped ? '🎉 ครบโควตาฟรีวันนี้แล้ว' : (typeof res.guestRemaining === 'number' ? `เหลือลองฟรีอีก ${res.guestRemaining} ครั้งวันนี้` : 'ลองฟรีต่อได้')}
              </span>
              <button onClick={() => { track('guest_ai_signup_click', {}); onGetStarted(); }} style={btn}>
                สมัครฟรีเพื่อให้ทีม AI ทำงานต่อ →
              </button>
            </div>
          </div>
        )}

        {/* degrade: ไม่มี worker (local/preview) */}
        {noWorker && (
          <div style={{ marginTop: 18, textAlign: 'center', color: C.sub, fontSize: 14, lineHeight: 1.7 }}>
            เดโมนี้ทำงานบนเว็บจริง (ceoaithailand.org) — หรือ{' '}
            <button onClick={() => { track('guest_ai_signup_click', { via: 'noworker' }); onGetStarted(); }}
              style={{ background: 'none', border: 'none', color: C.cyan, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, padding: 0, textDecoration: 'underline' }}>
              สมัครฟรีเพื่อเริ่มใช้ทีม AI เต็มรูปแบบ
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
