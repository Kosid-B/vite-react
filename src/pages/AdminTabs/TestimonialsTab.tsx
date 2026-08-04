import { useEffect, useState } from 'react';
import { isSupabaseEnabled } from '../../lib/supabase';
import {
  listPendingTestimonials, listApprovedTestimonials, moderateTestimonial,
  starString, type Testimonial,
} from '../../lib/testimonials';

/* Admin moderation — คิวรีวิวจากสมาชิกจริง: อนุมัติ/ปฏิเสธ/ปักหมุด ก่อนขึ้น landing
 * (RLS ที่ DB บังคับ is_app_admin จริง — ตรงนี้เป็น UI เท่านั้น) */

function Card({ t, children }: { t: Testimonial; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 10, padding: '14px 16px', background: 'var(--cream2)', display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: '#f59e0b', fontSize: 15 }}>{starString(t.rating)}</span>
        <strong style={{ color: 'var(--ink)', fontSize: 14 }}>{t.authorName || '(ไม่ระบุชื่อ)'}</strong>
        {t.companyName && <span style={{ color: 'var(--ink3)', fontSize: 13 }}>· {t.companyName}</span>}
        {t.role && <span style={{ color: 'var(--ink3)', fontSize: 12.5 }}>· {t.role}</span>}
        {t.featured && <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0891b2' }}>📌 ปักหมุด</span>}
        {t.at && <span style={{ marginLeft: 'auto', color: 'var(--ink3)', fontSize: 12 }}>{t.at}</span>}
      </div>
      <p style={{ margin: 0, color: 'var(--ink)', fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{t.body}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

const btn = (bg: string): React.CSSProperties => ({ background: bg, color: '#fff', border: 0, borderRadius: 8, padding: '7px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' });
const btnGhost: React.CSSProperties = { background: 'transparent', color: 'var(--ink)', border: '1px solid var(--sand)', borderRadius: 8, padding: '7px 14px', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' };

export default function TestimonialsTab() {
  const [pending, setPending] = useState<Testimonial[]>([]);
  const [approved, setApproved] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    if (!isSupabaseEnabled) return;
    setLoading(true);
    const [p, a] = await Promise.all([listPendingTestimonials(), listApprovedTestimonials(50)]);
    setPending(p); setApproved(a); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function act(id: string, patch: Parameters<typeof moderateTestimonial>[1]) {
    setBusyId(id);
    await moderateTestimonial(id, patch);
    setBusyId(null);
    load();
  }

  if (!isSupabaseEnabled) {
    return <p style={{ color: 'var(--ink3)', fontSize: 14 }}>โหมด local — คิวรีวิวใช้ได้เฉพาะ production (มี Supabase)</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>⭐ รีวิวจากสมาชิก</h3>
        <button onClick={load} style={btnGhost}>{loading ? 'กำลังโหลด…' : '↻ รีเฟรช'}</button>
      </div>

      {/* คิวรออนุมัติ */}
      <section style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>⏳ รออนุมัติ ({pending.length})</div>
        {pending.length === 0 && <p style={{ color: 'var(--ink3)', fontSize: 13, margin: 0 }}>ไม่มีรีวิวรออนุมัติ</p>}
        {pending.map(t => (
          <Card key={t.id} t={t}>
            <button disabled={busyId === t.id} onClick={() => act(t.id, { status: 'approved' })} style={btn('#16a34a')}>✅ อนุมัติ (ขึ้น landing)</button>
            <button disabled={busyId === t.id} onClick={() => act(t.id, { status: 'approved', featured: true })} style={btn('#0891b2')}>📌 อนุมัติ + ปักหมุด</button>
            <button disabled={busyId === t.id} onClick={() => act(t.id, { status: 'rejected' })} style={btn('#dc2626')}>↩️ ปฏิเสธ</button>
          </Card>
        ))}
      </section>

      {/* อนุมัติแล้ว (โชว์บน landing) — จัดการปักหมุด/ถอด */}
      <section style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>✅ กำลังแสดงบน landing ({approved.length})</div>
        {approved.length === 0 && <p style={{ color: 'var(--ink3)', fontSize: 13, margin: 0 }}>ยังไม่มีรีวิวที่อนุมัติ</p>}
        {approved.map(t => (
          <Card key={t.id} t={t}>
            {t.featured
              ? <button disabled={busyId === t.id} onClick={() => act(t.id, { featured: false })} style={btnGhost}>ถอดปักหมุด</button>
              : <button disabled={busyId === t.id} onClick={() => act(t.id, { featured: true })} style={btn('#0891b2')}>📌 ปักหมุด</button>}
            <button disabled={busyId === t.id} onClick={() => act(t.id, { status: 'rejected' })} style={btnGhost}>🚫 ถอดออกจาก landing</button>
          </Card>
        ))}
      </section>
    </div>
  );
}
