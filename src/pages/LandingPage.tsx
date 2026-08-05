import { useState, useEffect } from 'react';
import { track } from '../lib/analytics';
import LegalLinks from '../components/LegalLinks';
import IsmsBadge from '../components/IsmsBadge';
import InstantPreview from '../components/InstantPreview';
import { currentChallenger } from '../lib/challengerRotation';
import { listApprovedTestimonials, aggregateRating, starString, type Testimonial } from '../lib/testimonials';
import LandingReviewWidget from '../components/LandingReviewWidget';
import LeadCapture from '../components/LeadCapture';

interface Props {
  onGetStarted: () => void;
  /** ลองใช้แอปทันทีโดยไม่ต้องสมัคร (guest mode) — ลด friction #1 */
  onTryGuest?: () => void;
}

const C = {
  bg:       '#020617',
  bg2:      'rgba(15,23,42,0.6)',
  bg3:      '#0f172a',
  border:   '#1e293b',
  border2:  '#334155',
  white:    '#ffffff',
  slate4:   '#94a3b8',
  slate5:   '#8b96a9',   // ยกจาก #64748b (4.23:1 = ตก AA) → ~6.7:1 บนพื้น #020617 · ยังจางกว่า slate4
  cyan3:    '#67e8f9',
  cyan4:    '#22d3ee',
  cyan5:    '#06b6d4',
  amber4:   '#fbbf24',
  amber5:   '#f59e0b',
  dark:     '#020617',
};

// 6 ชั้นความน่าเชื่อถือ (จากสไลด์ "ทำไม AI เชื่อถือได้") — พูดเฉพาะฟีเจอร์ที่มีจริง
const TRUST_PILLARS = [
  { icon: '🛡️', title: 'ไม่ปล่อยให้ AI มั่ว', desc: 'AI ทำงานบนข้อมูล/เทมเพลตจริง ไม่แต่งลอย ๆ — งานที่ได้อ้างอิงของจริง เชื่อถือได้' },
  { icon: '👤', title: 'คุณคุมคำตอบสุดท้าย', desc: 'ทุกงานให้คุณตรวจ + แก้ก่อนใช้เสมอ — AI ช่วยร่าง แต่คุณเป็นคนตัดสินใจ' },
  { icon: '🔄', title: 'ไม่มีวันใช้ไม่ได้', desc: 'AI ล่ม → สลับโมเดลอัตโนมัติ → เทมเพลต ใช้งานต่อเนื่อง ไม่สะดุด' },
  { icon: '💰', title: 'ราคาที่ SME จ่ายไหว', desc: 'เลือกโมเดล AI ให้เหมาะกับงาน (ไม่ใช้ของแพงเกินจำเป็น) — แพ็กราคาเข้าถึงได้' },
  { icon: '🔒', title: 'ข้อมูลไม่รั่ว ไม่ปน', desc: 'แยกข้อมูลแต่ละธุรกิจ 100% + ควบคุมสิทธิ์เข้าถึง ปลอดภัย เป็นส่วนตัว' },
  { icon: '📤', title: 'ข้อมูลเป็นของคุณ', desc: 'ส่งออก (Export) / ลบข้อมูลได้เองทุกเมื่อ — ไม่ผูกมัด ย้าย/เลิกได้อิสระ' },
];

// พูดจากผลลัพธ์ (POD①: หาธุรกิจที่ใช่ + ลดความเสี่ยง) — ทีม AI เป็นกลไกช่วย ไม่ใช่พาดหัว
const steps = [
  { n: '01', title: 'หาธุรกิจที่ใช่', desc: 'บอกสิ่งที่คุณมี → AI ช่วยหากลุ่มลูกค้าและคุณค่าที่ยอมจ่าย (ไม่ต้องเดาเอง)' },
  { n: '02', title: 'ทดสอบก่อนเสี่ยง', desc: 'validate ตลาด/ราคา แล้วเปิดหน้าร้านขายจริง — ทีมผู้บริหาร AI ลงมือทำให้ 24 ชม.' },
  { n: '03', title: 'วางระบบให้โต', desc: 'มีลูกค้า/ดีลจริง → วาง SOP · KPI พร้อมขยายเมื่อธุรกิจติด' },
];

const stats = [
  { value: '20+ ปี', label: 'ประสบการณ์วางระบบธุรกิจไทย' },
  { value: '500+', label: 'ธุรกิจไทยที่เราให้คำปรึกษา' },
  { value: '24/7', label: 'ทีม AI ทำงานไม่หยุด' },
  { value: '฿0–1,490', label: 'เริ่มสร้างธุรกิจเองในแอป (ราคาที่ SME เอื้อมถึง)' },
];

// ป้ายความน่าเชื่อถือที่ "ตรวจสอบได้จริง" — ไม่ใช่ตัวเลขลอย (เพิ่ม trust แบบซื่อสัตย์)
const TRUST_MARKERS = [
  { icon: '🏢', text: 'บริษัทจดทะเบียนจริง — B. Training Consultant Co., Ltd.' },
  { icon: '📞', text: 'โทรคุยกับคนจริงได้ 081-7817-7773' },
  { icon: '🎫', text: 'ทดลองฟรี 15 วัน ไม่ต้องผูกบัตร · ยกเลิกได้ทุกเมื่อ' },
  { icon: '📤', text: 'ข้อมูลเป็นของคุณ — ส่งออก/ลบได้เองทุกเมื่อ' },
];

// พาดหัว = ผลลัพธ์ (benefit) ไม่ใช่ชื่อฟีเจอร์ · ISO = ฟีเจอร์เสริม วางท้าย
const features = [
  { icon: '🧠', title: 'วางแผนที่ผ่านการตรวจสอบ ไม่ใช่เดา', desc: 'ทีมผู้บริหาร AI ช่วยหาลูกค้า+วางแผน (VRIO · 24 Steps MIT · Business Model Canvas)' },
  { icon: '🏪', title: 'มีลูกค้าจริงตั้งแต่เดือนแรก', desc: 'เปิดหน้าร้าน + ตลาด B2B รับออเดอร์ ค้นเจอบน Google' },
  { icon: '📊', title: 'รู้ว่าธุรกิจไปถูกทางไหม ทุกวัน', desc: 'Dashboard ติดตาม KPI แบบเรียลไทม์' },
  { icon: '🛡️', title: 'พร้อมมาตรฐานเมื่อธุรกิจต้องใช้', desc: 'ร่าง ISO 9001 / TIS / PDPA (ฟีเจอร์เสริม)' },
];

// ─── เนื้อหาจูงใจเพิ่มเติม ───
const differentiators = [
  { icon: '🏆', title: 'พัฒนาโดยผู้เชี่ยวชาญ 20+ ปี', desc: 'สร้างโดย B. Training Consultant ผู้วางระบบธุรกิจ/มาตรฐานให้ธุรกิจไทยกว่า 20 ปี — ประสบการณ์จริงถูกใส่ลงในระบบ ไม่ใช่แค่ AI ลอย ๆ' },
  { icon: '🇹🇭', title: 'เข้าใจธุรกิจไทยจริง', desc: 'ตลาด B2B · DBD · PromptPay · ISO/มอก.ภาษาไทย — เข้าใจบริบทและกฎเกณฑ์ของไทย ต่างจาก AI ทั่วไป' },
  { icon: '🧩', title: 'ครบจบในที่เดียว', desc: 'ทีมบริหาร AI + หน้าร้าน/ตลาด B2B + การเงิน + งานมาตรฐาน — ไม่ต้องต่อหลายเครื่องมือให้ยุ่งยาก' },
];

const outcomes = [
  { icon: '🤖', text: 'ทีม AI ทำงานแทนคุณ 24 ชม. โดยไม่ต้องจ้างพนักงานเพิ่ม' },
  { icon: '🏪', text: 'หน้าร้านออนไลน์ + ช่องขาย B2B ที่ลูกค้าค้นเจอคุณบน Google' },
  { icon: '📈', text: 'เห็นทุกตัวเลขธุรกิจในที่เดียว ตัดสินใจได้เร็วและมั่นใจขึ้น' },
  { icon: '📄', text: 'เอกสาร ISO / แผนธุรกิจ ที่พร้อมใช้และยื่นได้จริง — ไม่ใช่แค่ทฤษฎี' },
];

const learnCases = [
  { icon: '🍜', name: 'Momofuku Ando', lesson: 'เริ่มใหม่หลังล้มเหลว วัย 48' },
  { icon: '🧮', name: 'Warren Buffett', lesson: 'วินัยจัดสรรทุน ไม่ตาม FOMO' },
  { icon: '💧', name: 'ร้าน “เนื้อแท้”', lesson: 'Cash is King — กำไร ≠ เงินสด' },
  { icon: '🏁', name: 'BMW × Benz', lesson: 'ใช้คู่แข่งเป็นแรงยกแบรนด์' },
];

const plans = [
  {
    id: 'free',
    name: 'ทดลองใช้ฟรี',
    price: '฿0',
    period: '15 วัน',
    tagline: 'ลองใช้ฟรี ไม่ต้องผูกบัตรเครดิต',
    features: ['เอเจนต์ AI สูงสุด 3 ตัว', 'AI calls 200 ครั้ง', 'งาน 20 งาน', 'รองรับภาษาไทยเต็มรูปแบบ'],
    highlight: false,
    cta: 'เริ่มทดลองฟรี',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '฿790',
    period: '/เดือน',
    tagline: 'เพิ่งเริ่มธุรกิจ — จ่ายเบาๆ เมื่อเริ่มมีรายได้',
    features: ['ทุกอย่างในแพ็กฟรี', 'AI calls 300 ครั้ง/เดือน', 'เอเจนต์ AI สูงสุด 5 ตัว', 'ซื้อขาย B2B (RFQ) + ออเดอร์', 'หน้าร้านสาธารณะ + สารบัญธุรกิจ'],
    highlight: false,
    cta: 'เริ่มต้นเลย',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '฿1,490',
    period: '/เดือน',
    tagline: 'สำหรับ SME ที่ต้องการทีม AI ทำงานจริง',
    features: ['เอเจนต์ AI ไม่จำกัด', 'AI calls 700 ครั้ง/เดือน', 'งานในระบบไม่จำกัด', 'บอร์ดอนุมัติ + แจ้งเตือน', 'รายงานผลรายสัปดาห์'],
    highlight: true,
    cta: 'เริ่มต้นเลย',
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '฿5,900',
    period: '/เดือน',
    tagline: 'สำหรับองค์กรที่ต้องการหลายทีม AI พร้อมกัน',
    features: ['ทุกอย่างในแพ็ก Growth', 'AI calls 5,000 ครั้ง/เดือน', 'หลายบริษัท AI พร้อมกัน', 'API ส่วนตัว + Webhook', 'ผู้ดูแลบัญชีเฉพาะ'],
    highlight: false,
    cta: 'ติดต่อทีมงาน',
  },
];

export default function LandingPage({ onGetStarted, onTryGuest }: Props) {
  const [ctaHover, setCtaHover] = useState(false);
  const [navHover, setNavHover] = useState(false);
  const [guestHover, setGuestHover] = useState(false);

  // Challenger headline — สลับ content 2 ครั้ง/วัน ที่เวลาไทย 11:00 และ 20:00 (เช็คทุกนาที)
  const [challenger, setChallenger] = useState(() => currentChallenger(Date.now()));
  useEffect(() => {
    const tick = () => setChallenger(currentChallenger(Date.now()));
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // รีวิวจริงจากสมาชิก (อนุมัติแล้ว) — ถ้ายังไม่มี ไม่โชว์ section (ไม่สร้าง social proof ปลอม)
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  useEffect(() => { listApprovedTestimonials(12).then(setTestimonials).catch(() => {}); }, []);
  const agg = aggregateRating(testimonials);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, color: C.white, fontFamily: "'Kanit', sans-serif", overflowX: 'hidden' }}>

      {/* ─── Nav ─── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${C.border}`, backgroundColor: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(12px)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <span style={{ fontWeight: 700, fontSize: 18, color: C.cyan4, letterSpacing: '-0.5px' }}>
          CEO AI Thailand
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="#pricing" style={{ color: C.slate4, fontSize: 14, textDecoration: 'none', padding: '8px 12px' }}>แพ็กเกจ</a>
          <button
            onClick={onGetStarted}
            onMouseEnter={() => setNavHover(true)}
            onMouseLeave={() => setNavHover(false)}
            style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${C.cyan5}`, background: navHover ? 'rgba(6,182,212,0.15)' : 'transparent', color: C.cyan4, fontFamily: 'inherit', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all .2s' }}
          >
            เข้าสู่ระบบ
          </button>
        </div>
      </nav>

      {/* ─── Challenger banner (สลับ 11:00 / 20:00 เวลาไทย · จุดยืน co-opetition) ─── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: 'linear-gradient(90deg, rgba(245,158,11,0.10), rgba(6,182,212,0.10))', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center' }}>
        <span style={{ flex: 'none', background: C.amber5, color: '#020617', fontWeight: 800, fontSize: 11, padding: '3px 9px', borderRadius: 999 }}>SME</span>
        <span key={challenger} style={{ color: C.white, fontSize: 14, fontWeight: 600, lineHeight: 1.5, animation: 'lpFadeIn .5s ease' }}>{challenger}</span>
      </div>
      <style>{`@keyframes lpFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }`}</style>

      {/* ─── Hero ─── */}
      <section style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(90vh - 60px)', padding: '80px 24px', textAlign: 'center' }}>
        {/* Glow */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '50%' }} />

        <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, border: `1px solid rgba(6,182,212,0.4)`, background: 'rgba(6,182,212,0.08)', color: C.cyan4, fontSize: 13, fontWeight: 500, marginBottom: 28, letterSpacing: '0.05em' }}>
          ✦ &nbsp;OFFICIALLY POWERED BY CEO AI THAILAND&nbsp; ✦
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 700, lineHeight: 1.15, marginBottom: 24, maxWidth: 820 }}>
          อยากมีธุรกิจของตัวเอง?<br />
          <span style={{ color: C.cyan4 }}>เริ่มคืนนี้ได้เลย<br />ไม่ต้องเสี่ยงเงินก้อน</span>
        </h1>

        <p style={{ fontSize: 18, color: C.slate4, marginBottom: 48, maxWidth: 620, lineHeight: 1.7 }}>
          ยังไม่รู้จะทำธุรกิจอะไร หรือเริ่มยังไง? ให้ทีม AI ช่วยหาไอเดีย วางแผน หาลูกค้า และพาเริ่มทีละสเต็ป<br />
          <strong style={{ color: C.white }}>เริ่มฟรี ไม่ต้องลาออก ไม่ต้องจ้างทีม</strong> — คุณสั่ง มันลงมือ คุณคุมทุกการตัดสินใจ
        </p>

        <div style={{ position: 'relative', display: 'inline-block' }}>
          {/* Guest-first: ปุ่มหลัก = "ลองเลยไม่ต้องสมัคร" (ลด friction ก่อนเห็นคุณค่า) · สมัคร = ปุ่มรอง
              โหมด local (ไม่มี onTryGuest) → ปุ่มหลักเป็นสมัครเหมือนเดิม */}
          <button
            onClick={() => {
              if (onTryGuest) { track('landing_cta_click', { cta: 'hero_try_guest' }); onTryGuest(); }
              else { track('landing_cta_click', { cta: 'hero_free_trial' }); onGetStarted(); }
            }}
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
            {onTryGuest ? '⚡ เริ่มใช้ฟรีทันที — ไม่ต้องสมัคร' : 'จ้าง AI พนักงานตัวแรกของคุณ — ฟรี 15 วัน'}
          </button>
          <div style={{ marginTop: 12, color: C.slate5, fontSize: 13 }}>
            {onTryGuest
              ? 'ไม่ต้องล็อกอิน · เข้าใช้ทันที · เก็บงานไว้สมัครทีหลังได้'
              : 'ไม่ต้องใช้บัตรเครดิต · เริ่มฟรี 15 วัน · ยกเลิกได้ทุกเมื่อ'}
          </div>
          {onTryGuest && (
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => { track('landing_cta_click', { cta: 'hero_signup' }); onGetStarted(); }}
                onMouseEnter={() => setGuestHover(true)}
                onMouseLeave={() => setGuestHover(false)}
                style={{
                  padding: '13px 30px', borderRadius: 12,
                  border: `1.5px solid ${C.cyan5}`,
                  background: guestHover ? 'rgba(6,182,212,0.16)' : 'rgba(6,182,212,0.06)',
                  color: C.cyan3, fontFamily: 'inherit', fontWeight: 700, fontSize: 16,
                  cursor: 'pointer', transition: 'all .2s',
                }}
              >
                หรือ สมัคร / เข้าสู่ระบบ — ฟรี 15 วัน ไม่ต้องใช้บัตร →
              </button>
              <span style={{ color: C.slate5, fontSize: 12.5 }}>อยากเก็บงานถาวร + ปลดล็อกทุกฟีเจอร์ ก็สมัครได้เลย</span>
            </div>
          )}
          <a
            href="/shop"
            onClick={() => track('landing_cta_click', { cta: 'hero_shop_signup' })}
            style={{
              display: 'inline-block',
              marginTop: 20,
              padding: '13px 32px',
              borderRadius: 12,
              border: `1px solid ${C.cyan5}`,
              background: 'rgba(6,182,212,0.08)',
              color: C.cyan4,
              fontFamily: 'inherit',
              fontWeight: 600,
              fontSize: 16,
              textDecoration: 'none',
              transition: 'all .2s',
            }}
          >
            🏪 สมัครร้านตลาดฝากขายสินค้า — เริ่มฟรี · รายวันแค่ ฿19
          </a>
        </div>
      </section>

      {/* ─── Instant Proof (Black Hole: เห็นค่าก่อนสมัคร) ─── */}
      <InstantPreview onGetStarted={onGetStarted} />

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

      {/* ─── Social Proof (ซื่อสัตย์: track record ที่ปรึกษาจริง ไม่อ้างจำนวนผู้ใช้ AI) ─── */}
      <section style={{ padding: '64px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.cyan5, marginBottom: 14 }}>
          เบื้องหลังระบบ คือทีมที่ปรึกษาตัวจริง
        </p>
        <h3 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, color: C.white, lineHeight: 1.5, maxWidth: 720, margin: '0 auto 14px' }}>
          B. Training Consultant ให้คำปรึกษา&วางระบบธุรกิจไทยมาแล้วกว่า{' '}
          <span style={{ color: C.cyan4 }}>500 ราย</span> ตลอด <span style={{ color: C.cyan4 }}>20+ ปี</span>
        </h3>
        <p style={{ color: C.slate4, fontSize: 15.5, lineHeight: 1.7, maxWidth: 640, margin: '0 auto 32px' }}>
          ประสบการณ์วางระบบ · มาตรฐาน ISO/มอก. · PDPA ของจริง ถูกกลั่นลงในระบบ AI นี้ —
          ไม่ใช่ AI ที่เพิ่งเกิดเมื่อวาน แต่มีองค์ความรู้ 20 ปีอยู่เบื้องหลัง
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 820, margin: '0 auto' }}>
          {TRUST_MARKERS.map(m => (
            <div key={m.text} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 999, border: `1px solid ${C.border2}`, background: C.bg2, color: C.slate4, fontSize: 13.5, fontWeight: 500 }}>
              <span style={{ fontSize: 15 }}>{m.icon}</span> {m.text}
            </div>
          ))}
        </div>
      </section>

      {/* ─── รีวิวจากสมาชิกจริง: แสดงรีวิวที่อนุมัติ (ถ้ามี) + วิดเจ็ตให้ดาว/เขียนรีวิว (แสดงเสมอ) ─── */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.cyan5, marginBottom: 10, textAlign: 'center' }}>
            เสียงจากผู้ใช้จริง
          </p>
          <h3 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, color: C.white, lineHeight: 1.4, textAlign: 'center', margin: '0 auto 8px' }}>
            {testimonials.length > 0 ? 'สมาชิกที่ใช้งานจริงพูดถึงเรา' : 'รีวิวจากสมาชิกที่ใช้งานจริง'}
          </h3>
          {agg.count > 0 ? (
            <p style={{ textAlign: 'center', color: C.slate4, fontSize: 14.5, margin: '0 0 32px' }}>
              <span style={{ color: C.amber4, fontSize: 16 }}>{starString(agg.average)}</span>{' '}
              เฉลี่ย <strong style={{ color: C.white }}>{agg.average}</strong>/5 จากรีวิวจริง {agg.count} รายการ
            </p>
          ) : (
            <p style={{ textAlign: 'center', color: C.slate4, fontSize: 14.5, margin: '0 0 8px', lineHeight: 1.6 }}>
              เราแสดงเฉพาะรีวิวจากสมาชิกที่ล็อกอินใช้งานจริง — ยังไม่มีรีวิวขึ้นตอนนี้ เป็นคนแรกได้เลย 👇
            </p>
          )}
          {testimonials.length > 0 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                {testimonials.map(t => (
                  <figure key={t.id} style={{ margin: 0, padding: 22, borderRadius: 14, border: `1px solid ${C.border}`, background: C.bg2, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <span style={{ color: C.amber4, fontSize: 15, letterSpacing: 1 }}>{starString(t.rating)}</span>
                    <blockquote style={{ margin: 0, color: C.white, fontSize: 15, lineHeight: 1.7, flex: 1 }}>“{t.body}”</blockquote>
                    <figcaption style={{ color: C.slate4, fontSize: 13.5, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                      <strong style={{ color: C.cyan3 }}>{t.authorName || 'สมาชิก'}</strong>
                      {t.companyName && <span> · {t.companyName}</span>}
                      {t.role && <div style={{ color: C.slate5, fontSize: 12.5, marginTop: 2 }}>{t.role}</div>}
                    </figcaption>
                  </figure>
                ))}
              </div>
              <p style={{ textAlign: 'center', color: C.slate5, fontSize: 12.5, margin: '24px 0 0' }}>
                ✅ รีวิวทุกชิ้นมาจากสมาชิกที่ล็อกอินใช้งานจริง และผ่านการตรวจก่อนแสดง
              </p>
            </>
          )}

          {/* วิดเจ็ตให้ดาว 1–5 + เขียนรีวิว (สมาชิกส่งได้เลย · ไม่ล็อกอิน = ชวนเข้าสู่ระบบ) */}
          <LandingReviewWidget onGetStarted={onGetStarted} />
        </div>
      </section>

      {/* ─── Lead capture: ดักคนสนใจที่ยังไม่พร้อมสมัคร (First-party data + PDPA) ─── */}
      <LeadCapture />

      {/* ─── Steps ─── */}
      <section style={{ padding: '64px 24px', backgroundColor: C.bg2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 12, color: C.white }}>
            เริ่มต้น <span style={{ color: C.cyan4 }}>3 ขั้นตอน</span>
          </h2>
          <p style={{ textAlign: 'center', color: C.slate4, fontSize: 15, maxWidth: 560, margin: '0 auto 44px', lineHeight: 1.6 }}>
            ไม่ต้องตั้งค่าซับซ้อน — เริ่มใน 2 นาที ตอบไม่กี่คำถาม แล้วลงลึกทีละขั้นได้เมื่อพร้อม
          </p>
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

      {/* ─── ทำไมต้องเป็นเรา (Differentiation) ─── */}
      <section style={{ padding: '80px 24px', backgroundColor: C.bg2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
            ทำไมต้อง <span style={{ color: C.cyan4 }}>CEO AI Thailand</span> — ไม่ใช่ AI ทั่วไป?
          </h2>
          <p style={{ textAlign: 'center', color: C.slate4, marginBottom: 44, fontSize: 16, maxWidth: 640, margin: '0 auto 44px' }}>
            AI ทั่วไปตอบคำถามได้ แต่ไม่รู้จักธุรกิจไทยและไม่ลงมือทำงานให้ — เราต่างตรงนี้
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {differentiators.map(d => (
              <div key={d.title} style={{ padding: 28, borderRadius: 14, border: `1px solid ${C.border2}`, backgroundColor: C.bg3 }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{d.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 10, color: C.white }}>{d.title}</h3>
                <p style={{ color: C.slate4, fontSize: 14.5, lineHeight: 1.7 }}>{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 2 ชั้น: แอปทำเองได้ (เข้าถึงง่าย) · ที่ปรึกษาลึกส่งต่อ B.Training (คลาย correlational: มืออาชีพ↔ถูก) ─── */}
      <section style={{ padding: '56px 24px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <div style={{ padding: '24px 26px', borderRadius: 16, border: `1px solid ${C.cyan5}`, backgroundColor: C.bg2 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.cyan4, letterSpacing: '0.05em', marginBottom: 8 }}>เริ่มเองในแอป · ฿0–1,490/เดือน</div>
            <p style={{ color: C.slate4, fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>
              ลงมือสร้างธุรกิจเองทั้งหมดในราคาที่ SME ไทยเอื้อมถึง — เริ่มฟรี ไม่ต้องผูกบัตร ทำเป็นขั้น ๆ ด้วยตัวเอง
            </p>
          </div>
          <div style={{ padding: '24px 26px', borderRadius: 16, border: `1px solid ${C.border2}`, backgroundColor: C.bg3 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.amber4, letterSpacing: '0.05em', marginBottom: 8 }}>อยากได้ที่ปรึกษาลงลึก?</div>
            <p style={{ color: C.slate4, fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>
              งานที่ต้องมืออาชีพลงมือ (วางระบบ ISO เชิงลึก · ที่ปรึกษาเฉพาะทาง) ส่งต่อผู้เชี่ยวชาญ B. Training 20+ ปี — แยกจากแอป จ่ายเฉพาะเมื่อต้องการ
            </p>
          </div>
        </div>
      </section>

      {/* ─── ผลลัพธ์ที่คุณจะได้ (Outcomes) ─── */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 44 }}>
            ภายในไม่กี่นาที คุณจะได้ <span style={{ color: C.amber4 }}>ผลลัพธ์จริง</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {outcomes.map(o => (
              <div key={o.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px 20px', borderRadius: 12, border: `1px solid ${C.border}`, backgroundColor: C.bg2 }}>
                <span style={{ fontSize: 26, lineHeight: 1 }}>{o.icon}</span>
                <span style={{ color: C.white, fontSize: 15.5, lineHeight: 1.6 }}>{o.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── เรียนรู้จากเคสธุรกิจจริง (Social proof / content) ─── */}
      <section style={{ padding: '80px 24px', backgroundColor: C.bg2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
            เรียนรู้จาก <span style={{ color: C.cyan4 }}>เคสธุรกิจระดับโลก</span> — แล้วลงมือกับธุรกิจคุณ
          </h2>
          <p style={{ textAlign: 'center', color: C.slate4, marginBottom: 44, fontSize: 16, maxWidth: 640, margin: '0 auto 44px' }}>
            ในระบบมีคลังกรณีศึกษาพร้อมเครื่องมือลงมือจริง (canvas · checklist · สูตร) ให้คุณใช้กับธุรกิจตัวเองได้ทันที
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
            {learnCases.map(c => (
              <div key={c.name} style={{ padding: 22, borderRadius: 12, border: `1px solid ${C.border}`, backgroundColor: C.bg3, textAlign: 'center' }}>
                <div style={{ fontSize: 34, marginBottom: 10 }}>{c.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15.5, color: C.white, marginBottom: 6 }}>{c.name}</div>
                <div style={{ color: C.slate4, fontSize: 13.5, lineHeight: 1.5 }}>{c.lesson}</div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', color: C.slate5, marginTop: 28, fontSize: 13.5 }}>…และอีกหลายเคส พร้อมทักษะ (Skill) ที่นำไปใช้ได้จริงในตลาดของระบบ</p>
        </div>
      </section>

      {/* ─── Trust (ทำไม AI เชื่อถือได้) ─── */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', color: C.cyan4, fontSize: 12.5, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 12 }}>
            ความน่าเชื่อถือของระบบ AI
          </div>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
            AI ที่ <span style={{ color: C.cyan4 }}>ควบคุมได้</span> — ไม่ใช่ AI ที่เดาสุ่ม
          </h2>
          <p style={{ textAlign: 'center', color: C.slate4, fontSize: 16, lineHeight: 1.7, maxWidth: 640, margin: '0 auto 44px' }}>
            6 ชั้นที่ทำให้ AI ของเราช่วย<strong style={{ color: C.white }}>สร้าง &amp; ทำธุรกิจ</strong>ได้อย่างมั่นใจ — สั่งงานได้ ตรวจสอบได้ ไม่เดาสุ่ม
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {TRUST_PILLARS.map(p => (
              <div key={p.title} style={{ padding: 24, borderRadius: 12, border: `1px solid ${C.border}`, backgroundColor: C.bg3 }}>
                <div style={{ fontSize: 30, marginBottom: 12 }}>{p.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.white, marginBottom: 8 }}>{p.title}</div>
                <div style={{ color: C.slate4, fontSize: 14, lineHeight: 1.55 }}>{p.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', color: C.slate5, marginTop: 28, fontSize: 13.5 }}>
            พัฒนาโดย <strong style={{ color: C.slate4 }}>B. Training Consultant</strong> — ผู้เชี่ยวชาญ ISO / PDPA / มอก. 20+ ปี
          </p>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" style={{ padding: '80px 24px', backgroundColor: C.bg2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 12, color: C.white }}>
            แพ็กเกจ <span style={{ color: C.cyan4 }}>สำหรับทุกขนาดธุรกิจ</span>
          </h2>
          <p style={{ textAlign: 'center', color: C.slate4, marginBottom: 48, fontSize: 16 }}>
            ทดลองฟรี 15 วัน — ไม่ต้องผูกบัตรเครดิต
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {plans.map(p => (
              <div key={p.id} style={{
                padding: 32,
                borderRadius: 16,
                border: `2px solid ${p.highlight ? C.cyan5 : C.border}`,
                backgroundColor: p.highlight ? 'rgba(6,182,212,0.06)' : C.bg3,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {p.highlight && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: C.cyan5, color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 100, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    แนะนำ
                  </div>
                )}
                <div style={{ fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 4 }}>{p.name}</div>
                <div style={{ color: C.slate4, fontSize: 13, marginBottom: 20 }}>{p.tagline}</div>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 38, fontWeight: 700, color: p.highlight ? C.cyan4 : C.white }}>{p.price}</span>
                  <span style={{ color: C.slate5, fontSize: 14, marginLeft: 4 }}>{p.period}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flexGrow: 1 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ color: C.slate4, fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: C.cyan4, fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onGetStarted}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    borderRadius: 10,
                    border: p.highlight ? 'none' : `1px solid ${C.border2}`,
                    background: p.highlight ? C.cyan5 : 'transparent',
                    color: p.highlight ? C.white : C.slate4,
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                    transition: 'all .2s',
                  }}
                >
                  {p.cta}
                </button>
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
        <p style={{ color: C.slate4, marginBottom: 40, fontSize: 16 }}>ทดลองฟรี 15 วัน ไม่ต้องใช้บัตรเครดิต</p>
        <button
          onClick={onGetStarted}
          style={{ padding: '16px 48px', borderRadius: 12, border: 'none', background: C.cyan5, color: C.white, fontFamily: 'inherit', fontWeight: 700, fontSize: 18, cursor: 'pointer', boxShadow: '0 0 32px rgba(6,182,212,0.4)' }}
        >
          เริ่มต้นฟรีเลย →
        </button>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, padding: '24px', textAlign: 'center', color: C.slate5, fontSize: 13, lineHeight: 1.9 }}>
        เราให้บริการที่ปรึกษามามากกว่า 20 ปีในประเทศไทย ·
        โทร <a href="tel:08178177773" style={{ color: C.cyan4, textDecoration: 'none', fontWeight: 600 }}>081-7817-7773</a>
        <br />
        <a href="/mit24" style={{ color: C.cyan4, textDecoration: 'none' }}>MIT 24 Steps คืออะไร</a> ·{' '}
        <a href="/faq" style={{ color: C.cyan4, textDecoration: 'none' }}>คำถามที่พบบ่อย</a> ·{' '}
        <a href="/b" style={{ color: C.cyan4, textDecoration: 'none' }}>สารบัญธุรกิจ</a>
        <br />
        © 2026 CEO AI Thailand · ceoaithailand.org · B. Training Consultant Co., Ltd.
        <br />
        <LegalLinks linkStyle={{ color: C.slate5, textDecoration: 'none' }} />
        <div style={{ marginTop: 16 }}><IsmsBadge /></div>
      </footer>
    </div>
  );
}
