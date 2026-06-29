import { useState } from 'react';

interface Props {
  onGetStarted: () => void;
}

const C = {
  bg:       '#020617',
  bg2:      'rgba(15,23,42,0.6)',
  bg3:      '#0f172a',
  border:   '#1e293b',
  border2:  '#334155',
  white:    '#ffffff',
  slate4:   '#94a3b8',
  slate5:   '#64748b',
  cyan3:    '#67e8f9',
  cyan4:    '#22d3ee',
  cyan5:    '#06b6d4',
  amber4:   '#fbbf24',
  amber5:   '#f59e0b',
  dark:     '#020617',
};

const steps = [
  { n: '01', title: 'จ้าง', desc: 'เลือกทักษะ AI ที่คุณขาด — ISO, กลยุทธ์, การเงิน, การตลาด' },
  { n: '02', title: 'รัน', desc: 'AI เริ่มทำงานให้คุณ 24 ชม. ตั้งแต่วินาทีแรก ไม่มีวันหยุด' },
  { n: '03', title: 'รับ', desc: 'เอกสารมาตรฐาน, แผนธุรกิจ ที่พร้อมยื่นได้ทันที' },
];

const stats = [
  { value: '500+', label: 'บริษัทในไทย' },
  { value: '24/7', label: 'ทำงานไม่หยุด' },
  { value: '3 วัน', label: 'ผ่าน ISO เร็วขึ้น 10x' },
  { value: '฿0', label: 'ค่าที่ปรึกษา' },
];

const features = [
  { icon: '🛡️', title: 'ISO / TIS อัตโนมัติ', desc: 'สร้างเอกสารมาตรฐาน ISO 9001, TIS ครบชุดในไม่กี่นาที' },
  { icon: '🧠', title: 'AI กลยุทธ์ธุรกิจ', desc: 'วิเคราะห์ VRIO, 24 Steps MIT, Business Model Canvas' },
  { icon: '📊', title: 'Dashboard อัจฉริยะ', desc: 'ติดตามความคืบหน้าทุก KPI แบบเรียลไทม์' },
  { icon: '🚀', title: 'ขยายธุรกิจอย่างเป็นระบบ', desc: 'ระบบ 6G Growth Intelligence พร้อมแผนขยาย TAM' },
];

export default function LandingPage({ onGetStarted }: Props) {
  const [ctaHover, setCtaHover] = useState(false);
  const [navHover, setNavHover] = useState(false);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, color: C.white, fontFamily: "'Kanit', sans-serif", overflowX: 'hidden' }}>

      {/* ─── Nav ─── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${C.border}`, backgroundColor: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(12px)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <span style={{ fontWeight: 700, fontSize: 18, color: C.cyan4, letterSpacing: '-0.5px' }}>
          CEO AI Thailand
        </span>
        <button
          onClick={onGetStarted}
          onMouseEnter={() => setNavHover(true)}
          onMouseLeave={() => setNavHover(false)}
          style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${C.cyan5}`, background: navHover ? 'rgba(6,182,212,0.15)' : 'transparent', color: C.cyan4, fontFamily: 'inherit', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all .2s' }}
        >
          เข้าสู่ระบบ
        </button>
      </nav>

      {/* ─── Hero ─── */}
      <section style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(90vh - 60px)', padding: '80px 24px', textAlign: 'center' }}>
        {/* Glow */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%' }} />

        <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, border: `1px solid rgba(6,182,212,0.4)`, background: 'rgba(6,182,212,0.08)', color: C.cyan4, fontSize: 13, fontWeight: 500, marginBottom: 28, letterSpacing: '0.05em' }}>
          ✦ &nbsp;OFFICIALLY POWERED BY CEO AI THAILAND&nbsp; ✦
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 700, lineHeight: 1.15, marginBottom: 24, maxWidth: 800 }}>
          ธุรกิจคุณโตได้…<br />
          <span style={{ color: C.cyan4 }}>ถ้าไม่ต้องรอพนักงาน<br />ทำเอกสาร</span>
        </h1>

        <p style={{ fontSize: 18, color: C.slate4, marginBottom: 48, maxWidth: 600, lineHeight: 1.7 }}>
          เลิกจ้างที่ปรึกษาหลักแสนเพื่อมานั่งทำ ISO/TIS แบบเดิมๆ<br />
          เปลี่ยนมาจ้าง <strong style={{ color: C.white }}>'พนักงาน AI'</strong> ที่รู้จบทุกขั้นตอนมาตรฐานไทยใน 3 วินาที
        </p>

        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={onGetStarted}
            onMouseEnter={() => setCtaHover(true)}
            onMouseLeave={() => setCtaHover(false)}
            style={{
              padding: '16px 40px',
              borderRadius: 12,
              border: 'none',
              background: ctaHover ? C.amber4 : C.amber5,
              color: C.dark,
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 18,
              cursor: 'pointer',
              transition: 'all .2s',
              transform: ctaHover ? 'scale(1.05)' : 'scale(1)',
              boxShadow: '0 0 32px rgba(245,158,11,0.45)',
            }}
          >
            จ้าง AI พนักงานตัวแรกของคุณ — ฟรี 7 วัน
          </button>
          <div style={{ marginTop: 12, color: C.slate5, fontSize: 13 }}>
            เหลือสิทธิ์จ้างงานวันนี้อีก <strong style={{ color: C.amber4 }}>8 บริษัท</strong>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, backgroundColor: C.bg2, padding: '48px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 32, textAlign: 'center' }}>
          {stats.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 36, fontWeight: 700, color: C.cyan4, marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 14, color: C.slate4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Social Proof ─── */}
      <section style={{ padding: '64px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.cyan5, marginBottom: 12 }}>
          บริษัทชั้นนำในไทยกว่า 500 แห่ง กำลังรันมาตรฐานด้วยระบบอัตโนมัติ
        </p>
        <p style={{ color: C.slate5, fontSize: 14 }}>TRUSTED BY INDUSTRY LEADERS</p>
      </section>

      {/* ─── Steps ─── */}
      <section style={{ padding: '64px 24px', backgroundColor: C.bg2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 48, color: C.white }}>
            เริ่มต้น <span style={{ color: C.cyan4 }}>3 ขั้นตอน</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
            {steps.map(s => (
              <div key={s.n} style={{ borderLeft: `3px solid ${C.cyan5}`, paddingLeft: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.cyan5, letterSpacing: '0.1em', marginBottom: 8 }}>STEP {s.n}</div>
                <h3 style={{ fontSize: 28, fontWeight: 700, color: C.cyan3, marginBottom: 10 }}>{s.title}</h3>
                <p style={{ color: C.slate4, lineHeight: 1.65, fontSize: 15 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 48 }}>
            ทุกอย่างที่ธุรกิจ<span style={{ color: C.cyan4 }}>ต้องการ</span> — อยู่ที่เดียว
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            {features.map(f => (
              <div key={f.title} style={{ padding: 24, borderRadius: 12, border: `1px solid ${C.border}`, backgroundColor: C.bg2, transition: 'border-color .2s' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: C.white }}>{f.title}</h3>
                <p style={{ color: C.slate4, fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section style={{ padding: '80px 24px', textAlign: 'center', borderTop: `1px solid ${C.border}`, background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.06) 0%, transparent 70%)' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, marginBottom: 16 }}>
          พร้อมจ้าง AI <span style={{ color: C.amber5 }}>ทำงานแทนคุณ</span> แล้วหรือยัง?
        </h2>
        <p style={{ color: C.slate4, marginBottom: 40, fontSize: 16 }}>ทดลองฟรี 7 วัน ไม่ต้องใช้บัตรเครดิต</p>
        <button
          onClick={onGetStarted}
          style={{ padding: '16px 48px', borderRadius: 12, border: 'none', background: C.cyan5, color: C.white, fontFamily: 'inherit', fontWeight: 700, fontSize: 18, cursor: 'pointer', boxShadow: '0 0 32px rgba(6,182,212,0.4)' }}
        >
          เริ่มต้นฟรีเลย →
        </button>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '24px', textAlign: 'center', color: C.slate5, fontSize: 13 }}>
        © 2026 CEO AI Thailand · ceoaithailand.org · B. Training Consultant Co., Ltd.
      </footer>
    </div>
  );
}
