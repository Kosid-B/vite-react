import { useEffect, useState } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { listWorkspaces } from '../lib/workspaces';
import { submitTestimonial, validateTestimonial, BODY_MAX } from '../lib/testimonials';
import { track } from '../lib/analytics';
import { useLandingTheme } from '../lib/landingTheme';

/* LandingReviewWidget — UI ให้ดาว 1–5 + เขียนรีวิว บนหน้า landing
 * คงหลัก "สมาชิกจริงเท่านั้น": ล็อกอินเป็นสมาชิก → เขียนส่งได้เลย (รออนุมัติ) · ยังไม่ล็อกอิน → ชวนเข้าสู่ระบบก่อน
 * (RLS ที่ DB เป็นด่านจริง — วิดเจ็ตนี้แค่ประสบการณ์ใช้งาน) */

const DARK_C = {
  bg: 'rgba(15,23,42,0.6)', panel: 'rgba(2,6,23,0.5)', border: '#1e293b', border2: '#334155',
  white: '#ffffff', slate: '#94a3b8', slateDim: '#8b96a9', cyan: '#22d3ee', cyan5: '#06b6d4',
  amber: '#fbbf24', star: '#475569', green: '#16a34a',
};

const LIGHT_C: typeof DARK_C = {
  bg: '#ffffff', panel: '#f1f5f9', border: '#e2e8f0', border2: '#cbd5e1',
  white: '#0f172a', slate: '#475569', slateDim: '#64748b', cyan: '#0891b2', cyan5: '#0e7490',
  amber: '#d97706', star: '#cbd5e1', green: '#16a34a',
};

export default function LandingReviewWidget({ onGetStarted }: { onGetStarted: () => void }) {
  const C = useLandingTheme() === 'minimal' ? LIGHT_C : DARK_C;
  const [memberWs, setMemberWs] = useState<string | null | undefined>(undefined); // undefined=loading
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isSupabaseEnabled || !supabase) { if (alive) setMemberWs(null); return; }
      const { data } = await supabase.auth.getSession();
      if (!data.session) { if (alive) setMemberWs(null); return; }
      const ws = await listWorkspaces();
      if (alive) setMemberWs(ws[0]?.id ?? null);
    })().catch(() => { if (alive) setMemberWs(null); });
    return () => { alive = false; };
  }, []);

  const isMember = !!memberWs;

  function pickStar(n: number) {
    setRating(n);
    track('landing_review_star', { rating: n, member: isMember ? 1 : 0 });
    if (isMember) setOpen(true);
  }

  async function submit() {
    if (!memberWs) return;
    const v = validateTestimonial({ workspaceId: memberWs, authorName: name, rating, body });
    if (!v.ok) { setMsg({ ok: false, text: v.error || 'กรอกข้อมูลให้ครบ' }); return; }
    setBusy(true); setMsg(null);
    const res = await submitTestimonial({ workspaceId: memberWs, authorName: name, companyName: company, rating, body });
    setBusy(false);
    if (res.ok) {
      track('testimonial_submitted', { rating, from: 'landing' });
      setDone(true);
    } else {
      setMsg({ ok: false, text: res.error || 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง' });
    }
  }

  const lit = hover || rating;
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9,
    border: `1px solid ${C.border2}`, background: C.panel, color: C.white,
    fontFamily: 'inherit', fontSize: 14,
  };

  return (
    <div style={{ maxWidth: 640, margin: '28px auto 0', padding: '24px 26px', borderRadius: 16, border: `1px solid ${C.border}`, background: C.bg, textAlign: 'center' }}>
      {done ? (
        <div>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🙏</div>
          <h4 style={{ margin: '0 0 6px', color: C.white, fontSize: 18, fontWeight: 700 }}>ขอบคุณสำหรับรีวิว!</h4>
          <p style={{ color: C.slate, fontSize: 14.5, margin: 0, lineHeight: 1.6 }}>
            รีวิวของคุณส่งเข้าระบบแล้ว — จะแสดงบนหน้านี้หลังทีมงานตรวจอนุมัติ
          </p>
        </div>
      ) : (
        <>
          <h4 style={{ margin: '0 0 4px', color: C.white, fontSize: 18, fontWeight: 700 }}>ใช้งานอยู่แล้ว? ให้คะแนนเราสิ ⭐</h4>
          <p style={{ color: C.slate, fontSize: 14, margin: '0 0 16px', lineHeight: 1.6 }}>
            รีวิวจากสมาชิกจริงช่วยให้ SME คนอื่นกล้าเริ่ม — ให้ดาวแล้วเล่าสั้น ๆ ได้เลย
          </p>

          {/* ดาว 1–5 (interactive) */}
          <div onMouseLeave={() => setHover(0)} style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onMouseEnter={() => setHover(n)} onClick={() => pickStar(n)}
                aria-label={`ให้ ${n} ดาว`}
                style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 34, lineHeight: 1, padding: 0, color: n <= lit ? C.amber : C.star, transition: 'color .12s, transform .12s', transform: n <= hover ? 'scale(1.12)' : 'none' }}>★</button>
            ))}
          </div>

          {/* ยังไม่ล็อกอิน → ชวนเข้าสู่ระบบ (กันรีวิวปลอม) */}
          {memberWs === null && rating > 0 && (
            <div>
              <p style={{ color: C.slate, fontSize: 13.5, margin: '0 0 12px', lineHeight: 1.6 }}>
                🔒 รีวิวได้เฉพาะสมาชิกที่ใช้งานจริง — เข้าสู่ระบบด้วยบัญชีของคุณเพื่อรีวิว (รีวิวทุกชิ้นจึงเชื่อถือได้ 100%)
              </p>
              <button onClick={onGetStarted} style={{ background: C.cyan5, color: '#fff', border: 0, borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                เข้าสู่ระบบเพื่อรีวิว →
              </button>
            </div>
          )}

          {/* เป็นสมาชิก + เลือกดาวแล้ว → ฟอร์มรีวิว */}
          {isMember && open && (
            <div style={{ display: 'grid', gap: 10, textAlign: 'left', marginTop: 4 }}>
              <textarea value={body} onChange={e => setBody(e.target.value.slice(0, BODY_MAX))} rows={3}
                placeholder="ระบบช่วยธุรกิจคุณยังไงบ้าง? เล่าสั้น ๆ ได้เลย"
                style={{ ...inputStyle, resize: 'vertical' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อที่จะแสดง" style={inputStyle} />
                <input value={company} onChange={e => setCompany(e.target.value)} placeholder="ชื่อธุรกิจ (ไม่บังคับ)" style={inputStyle} />
              </div>
              <p style={{ color: C.slateDim, fontSize: 11.5, margin: 0, lineHeight: 1.5 }}>
                🔒 แสดงต่อสาธารณะเฉพาะชื่อ + ชื่อธุรกิจที่กรอก และต้องผ่านทีมงานตรวจก่อน
              </p>
              {msg && (
                <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'rgba(220,38,38,.15)', color: '#fca5a5' }}>{msg.text}</div>
              )}
              <div>
                <button disabled={busy} onClick={submit}
                  style={{ background: C.green, color: '#fff', border: 0, borderRadius: 10, padding: '11px 22px', fontWeight: 700, fontSize: 14.5, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.7 : 1 }}>
                  {busy ? 'กำลังส่ง…' : 'ส่งรีวิว'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
