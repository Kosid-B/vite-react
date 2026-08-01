import { useState } from 'react';
import { track } from '../lib/analytics';
import { buildInstantPreview, type InstantPreview as Preview } from '../lib/instantPreview';

interface Props {
  /** พาเข้าสมัคร (ให้ AI ทำจริง) */
  onGetStarted: () => void;
}

const C = {
  bg: '#0b1424', bg2: '#0f172a', border: '#1e293b', border2: '#334155',
  white: '#f8fafc', slate: '#94a3b8', faint: '#64748b',
  cyan: '#22d3ee', cyan5: '#06b6d4', amber: '#f59e0b',
};

/* Black Hole "Instant Proof" — กรอกชื่อธุรกิจ → เห็นตัวอย่าง แผน/ทีม/หน้าร้าน ก่อน login
 * สร้าง client-side (deterministic · ไม่เรียก AI/ไม่ต้อง auth) — Aha ก่อนสมัคร = ทำลายกำแพง trust */
export default function InstantPreview({ onGetStarted }: Props) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  function generate() {
    const biz = name.trim();
    if (!biz || busy) return;
    setBusy(true);
    setPreview(null);
    track('instant_preview_generated', { hasName: 1 });
    // หน่วงสั้นๆ ให้รู้สึกว่า AI "กำลังคิด" (เคารพ reduced-motion ด้วยเวลาที่สั้น)
    window.setTimeout(() => {
      setPreview(buildInstantPreview(biz));
      setBusy(false);
    }, 1100);
  }
  function goSignup() {
    track('instant_preview_cta', {});
    onGetStarted();
  }

  return (
    <section style={{ padding: '72px 24px', background: C.bg, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 100, border: `1px solid rgba(6,182,212,0.4)`, background: 'rgba(6,182,212,0.08)', color: C.cyan, fontSize: 12.5, fontWeight: 600, marginBottom: 16, letterSpacing: '0.04em' }}>
            ✦ ลองฟรี ก่อนสมัคร — ไม่ต้องล็อกอิน
          </div>
          <h2 style={{ fontSize: 'clamp(24px,4.5vw,34px)', fontWeight: 800, color: C.white, margin: '0 0 10px', lineHeight: 1.2 }}>
            พิมพ์ชื่อธุรกิจคุณ — ดูตัวอย่างที่ AI จัดให้ใน 60 วินาที
          </h2>
          <p style={{ color: C.slate, fontSize: 15.5, margin: 0 }}>
            เห็นทีมผู้บริหาร AI · แผนเริ่มต้น · หน้าร้าน ของธุรกิจคุณ <strong style={{ color: C.white }}>ก่อนตัดสินใจ</strong>
          </p>
        </div>

        {/* input */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', maxWidth: 560, margin: '0 auto' }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') generate(); }}
            placeholder="เช่น ร้านกาแฟดอยคำ, รับทำบัญชี SME…"
            aria-label="ชื่อธุรกิจของคุณ"
            maxLength={60}
            style={{ flex: '1 1 260px', padding: '13px 16px', borderRadius: 11, border: `1px solid ${C.border2}`, background: C.bg2, color: C.white, fontFamily: 'inherit', fontSize: 15.5, outline: 'none' }}
          />
          <button
            onClick={generate}
            disabled={!name.trim() || busy}
            style={{ flex: 'none', padding: '13px 26px', borderRadius: 11, border: 'none', background: (!name.trim() || busy) ? '#334155' : C.amber, color: (!name.trim() || busy) ? C.faint : '#0f172a', fontFamily: 'inherit', fontWeight: 700, fontSize: 15.5, cursor: (!name.trim() || busy) ? 'default' : 'pointer', transition: 'all .2s' }}
          >
            {busy ? '⚙️ AI กำลังจัดให้…' : '✨ สร้างตัวอย่างฟรี'}
          </button>
        </div>

        {/* result */}
        {preview && (
          <div style={{ marginTop: 30, display: 'grid', gap: 16 }}>
            {/* ทีม AI */}
            <div style={card()}>
              <div style={cardHd()}>🧑‍💼 ทีมผู้บริหาร AI ของ “{preview.bizName}”</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginTop: 12 }}>
                {preview.team.map(a => (
                  <div key={a.role} style={{ padding: 12, borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg }}>
                    <div style={{ fontWeight: 700, color: C.cyan, fontSize: 14, marginBottom: 4 }}>{a.emoji} {a.role}</div>
                    <div style={{ color: C.slate, fontSize: 13, lineHeight: 1.55 }}>{a.mandate}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* แผน */}
            <div style={card()}>
              <div style={cardHd()}>🎯 แผนเริ่มต้น</div>
              <div style={{ marginTop: 10, color: C.white, fontSize: 15, fontWeight: 600 }}>{preview.plan.goal}</div>
              <div style={{ color: C.slate, fontSize: 13.5, margin: '6px 0 12px' }}>กลุ่มเป้าหมาย: {preview.plan.target}</div>
              <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
                {preview.plan.actions.map(ac => (
                  <li key={ac} style={{ color: C.slate, fontSize: 13.5, lineHeight: 1.5 }}>{ac}</li>
                ))}
              </ol>
            </div>
            {/* หน้าร้าน */}
            <div style={card()}>
              <div style={cardHd()}>🏪 หน้าร้าน (ตัวอย่าง)</div>
              <div style={{ marginTop: 10, padding: 16, borderRadius: 12, border: `1px solid ${C.border2}`, background: 'linear-gradient(135deg,rgba(6,182,212,0.08),rgba(245,158,11,0.06))' }}>
                <div style={{ fontWeight: 800, color: C.white, fontSize: 18 }}>{preview.storefront.name}</div>
                <div style={{ color: C.cyan, fontSize: 13.5, margin: '3px 0 8px' }}>{preview.storefront.category}</div>
                <div style={{ color: C.slate, fontSize: 14, fontStyle: 'italic' }}>“{preview.storefront.tagline}”</div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <div style={{ color: C.slate, fontSize: 13.5, marginBottom: 12 }}>
                นี่เป็นแค่ <strong style={{ color: C.white }}>ตัวอย่าง</strong> — สมัครฟรีเพื่อให้ AI ลงมือทำจริง (ปรับตามข้อมูลคุณ + รันงานให้)
              </div>
              <button onClick={goSignup} style={{ padding: '15px 36px', borderRadius: 12, border: 'none', background: C.cyan5, color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 17, cursor: 'pointer', boxShadow: '0 0 28px rgba(6,182,212,0.4)' }}>
                🚀 สมัครฟรี — ให้ AI ทำจริง 15 วัน
              </button>
              <div style={{ color: C.faint, fontSize: 12.5, marginTop: 10 }}>ไม่ต้องใช้บัตรเครดิต · ยกเลิกได้ทุกเมื่อ</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function card(): React.CSSProperties {
  return { padding: 18, borderRadius: 14, border: `1px solid ${C.border}`, background: C.bg2 };
}
function cardHd(): React.CSSProperties {
  return { fontWeight: 700, fontSize: 15, color: C.white };
}
