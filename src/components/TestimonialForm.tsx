import { useEffect, useMemo, useState } from 'react';
import type { AppData } from '../types';
import { isSupabaseEnabled } from '../lib/supabase';
import {
  submitTestimonial, myTestimonials, validateTestimonial, starString,
  BODY_MAX, type Testimonial,
} from '../lib/testimonials';
import { track } from '../lib/analytics';

/* TestimonialForm — ช่องทางให้ "สมาชิกที่ใช้งานจริง" เขียนรีวิวตัวระบบ → แอดมินอนุมัติ → โชว์บน landing
 * แสดงเฉพาะโหมด production (มี Supabase) + ล็อกอินแล้ว (มี wsId) — โหมด local ไม่มีสมาชิกจริงจึงซ่อน */

const STATUS_LABEL: Record<Testimonial['status'], { text: string; color: string }> = {
  pending:  { text: '⏳ ส่งแล้ว — รอแอดมินตรวจอนุมัติ', color: '#f59e0b' },
  approved: { text: '✅ อนุมัติแล้ว — แสดงบนหน้าแรกของเว็บ', color: '#16a34a' },
  rejected: { text: '↩️ รีวิวนี้ยังไม่ผ่าน — แก้ไขแล้วส่งใหม่ได้', color: '#dc2626' },
};

export default function TestimonialForm({ data, wsId }: { data: AppData; wsId: string | null }) {
  const eligible = isSupabaseEnabled && !!wsId;
  const [mine, setMine] = useState<Testimonial[] | null>(null);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [companyName, setCompanyName] = useState((data.aiCompany?.name || '').trim());
  const role = (data.aiCompany?.industry || '').trim();  // ประเภทธุรกิจจากโปรไฟล์ (ไม่ให้แก้ในฟอร์ม)
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!eligible || !wsId) return;
    myTestimonials(wsId).then(setMine).catch(() => setMine([]));
  }, [eligible, wsId]);

  const existing = mine?.[0];
  const canReviewAgain = !existing || existing.status === 'rejected';
  const valid = useMemo(
    () => validateTestimonial({ workspaceId: wsId ?? '', authorName, rating, body }).ok,
    [wsId, authorName, rating, body],
  );

  if (!eligible) return null;

  async function submit() {
    if (!wsId) return;
    setBusy(true); setMsg(null);
    const res = await submitTestimonial({ workspaceId: wsId, authorName, companyName, role, rating, body });
    setBusy(false);
    if (res.ok) {
      track('testimonial_submitted', { rating });
      setMsg({ ok: true, text: 'ขอบคุณครับ! ส่งรีวิวแล้ว รอแอดมินอนุมัติก่อนขึ้นหน้าเว็บ' });
      setBody(''); setShowForm(false);
      myTestimonials(wsId).then(setMine).catch(() => {});
    } else {
      setMsg({ ok: false, text: res.error || 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง' });
    }
  }

  const cardStyle = { background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 'var(--r)', padding: '18px 20px', marginTop: 20 };
  const stars = hover || rating;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 18 }}>⭐</span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>รีวิวจากคุณ — เสียงจริงของผู้ใช้จริง</h3>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink3)', margin: '0 0 14px', lineHeight: 1.6 }}>
        ใช้ระบบแล้วเป็นยังไงบ้าง? เขียนรีวิวสั้น ๆ — เมื่อแอดมินอนุมัติ รีวิวของคุณจะ<strong style={{ color: 'var(--ink)' }}>ขึ้นหน้าแรกของเว็บ</strong> ช่วยให้ SME คนอื่นกล้าเริ่ม 🙌
      </p>

      {/* สถานะรีวิวที่เคยส่ง */}
      {existing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 9, background: 'var(--cream)', border: '1px solid var(--sand)', marginBottom: 12 }}>
          <span style={{ color: STATUS_LABEL[existing.status].color, fontWeight: 700, fontSize: 13 }}>{STATUS_LABEL[existing.status].text}</span>
          <span style={{ marginLeft: 'auto', color: '#f59e0b', fontSize: 14 }}>{starString(existing.rating)}</span>
        </div>
      )}

      {msg && (
        <div style={{ padding: '9px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, marginBottom: 12, background: msg.ok ? '#dcfce7' : '#fee2e2', color: msg.ok ? '#166534' : '#991b1b' }}>
          {msg.text}
        </div>
      )}

      {canReviewAgain && !showForm && (
        <button onClick={() => setShowForm(true)} style={{ background: '#06b6d4', color: '#fff', border: 0, borderRadius: 9, padding: '10px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
          ✍️ เขียนรีวิว
        </button>
      )}

      {canReviewAgain && showForm && (
        <div style={{ display: 'grid', gap: 12 }}>
          {/* ให้ดาว */}
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>ให้คะแนน</label>
            <div onMouseLeave={() => setHover(0)} style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}
                  aria-label={`${n} ดาว`}
                  style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 26, lineHeight: 1, padding: 0, color: n <= stars ? '#f59e0b' : 'var(--sand)' }}>★</button>
              ))}
            </div>
          </div>
          {/* รีวิว */}
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>รีวิวของคุณ</label>
            <textarea value={body} onChange={e => setBody(e.target.value.slice(0, BODY_MAX))} rows={3}
              placeholder="เล่าสั้น ๆ ว่าระบบช่วยธุรกิจคุณยังไง เช่น ช่วยวางแผน หาลูกค้า เปิดร้าน ฯลฯ"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 13.5, resize: 'vertical' }} />
            <div style={{ fontSize: 11, color: 'var(--ink3)', textAlign: 'right' }}>{body.trim().length}/{BODY_MAX}</div>
          </div>
          {/* ชื่อ + บริษัท */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="ชื่อที่จะแสดง (เช่น คุณสมชาย)"
              style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 13 }} />
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="ชื่อธุรกิจ/ร้าน (ไม่บังคับ)"
              style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 13 }} />
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--ink3)', margin: 0, lineHeight: 1.5 }}>
            🔒 รีวิวจะแสดงต่อสาธารณะเฉพาะ<strong> ชื่อที่แสดง + ชื่อธุรกิจ</strong>ที่คุณกรอกเท่านั้น (ไม่เปิดเผยอีเมล/ข้อมูลอื่น) และต้องผ่านแอดมินก่อน
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button disabled={!valid || busy} onClick={submit}
              style={{ background: valid && !busy ? '#16a34a' : 'var(--sand)', color: '#fff', border: 0, borderRadius: 9, padding: '10px 20px', fontWeight: 700, fontSize: 13.5, cursor: valid && !busy ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
              {busy ? 'กำลังส่ง…' : 'ส่งรีวิว'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', color: 'var(--ink3)', border: '1px solid var(--sand)', borderRadius: 9, padding: '10px 16px', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
