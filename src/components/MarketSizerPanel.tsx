import { useEffect, useMemo, useRef, useState } from 'react';
import { plainSizing, bahtPlain, type SizerScope } from '../lib/marketSizerPlain';
import { rememberBizHint } from '../lib/bizHint';
import { track } from '../lib/analytics';
import { useLandingTheme } from '../lib/landingTheme';
import { useCountUp, prefersReducedMotion } from '../lib/useCountUp';

/* MarketSizerPanel — "เครื่องมือประเมินขนาดตลาดฟรี" บน Landing (lead magnet)
 * dopamine: โชว์ตัวอย่างทันที → ตัวเลขโอกาส "นับขึ้น ~3 วิ" + กราฟแท่งเคลื่อนไหว → แอนิเมชันจบ = ทริกเกอร์ให้สมัคร
 * ทำงานฝั่ง browser (ไม่ต้อง login) · ภาษาบ้าน ๆ ไม่มีศัพท์ TAM/SAM/SOM · ตัวเลขเป็นประเมิน (ไม่ปั้น) */

const DARK_C = { border: '#1e293b', panel: 'rgba(15,23,42,0.6)', card: 'rgba(2,6,23,0.5)', track: '#0b1220', white: '#fff', slate: '#94a3b8', cyan: '#22d3ee', green: '#4ade80', amber: '#f59e0b', dark: '#020617', heroBg: 'rgba(74,222,128,0.10)' };
const LIGHT_C: typeof DARK_C = { border: '#e2e8f0', panel: '#ffffff', card: '#f1f5f9', track: '#e2e8f0', white: '#0f172a', slate: '#475569', cyan: '#0891b2', green: '#16a34a', amber: '#f59e0b', dark: '#020617', heroBg: 'rgba(22,163,74,0.08)' };

const EXAMPLE = { business: 'ร้านกาแฟ', arpuPerYear: 3000, scope: 'national' as SizerScope };
const COUNT_MS = 2800; // นับขึ้นถึงตัวเลขคาดการณ์ ~3 วินาที

export default function MarketSizerPanel({ onGetStarted, onEngage }: { onGetStarted: () => void; onEngage?: () => void }) {
  const C = useLandingTheme() === 'minimal' ? LIGHT_C : DARK_C;
  const [business, setBusiness] = useState('');
  const [arpu, setArpu] = useState('');
  const [scope, setScope] = useState<SizerScope>('national');
  const [grow, setGrow] = useState(false); // จุดสตาร์ทให้กราฟโต 0→เต็ม (หลัง mount)
  const engaged = useRef(false);
  const engage = () => { if (!engaged.current) { engaged.current = true; onEngage?.(); } };

  const real = useMemo(() => plainSizing({ business, arpuPerYear: Number(arpu), scope }), [business, arpu, scope]);
  const isExample = !real.ok;
  const view = real.ok ? real : plainSizing(EXAMPLE);

  const animatedSom = useCountUp(view.somValue, COUNT_MS);
  const revealed = animatedSom === view.somValue && view.somValue > 0; // แอนิเมชันจบ → ทริกเกอร์สมัคร

  useEffect(() => { const id = requestAnimationFrame(() => setGrow(true)); return () => cancelAnimationFrame(id); }, []);

  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.white, fontFamily: 'inherit', fontSize: 15 };
  const label: React.CSSProperties = { fontSize: 12.5, color: C.slate, marginBottom: 5, display: 'block' };

  // กราฟแท่ง: สัดส่วนเทียบตลาดรวม (floor 6% ให้แท่งเล็กยังเห็น) · โตด้วย CSS transition ~3 วิ
  const bars = [
    { label: '🌏 ตลาดรวม', val: view.tamValue, color: C.cyan },
    { label: '🎯 เข้าถึงได้จริง', val: view.samValue, color: C.cyan },
    { label: '🏆 คว้าได้ปีแรก', val: view.somValue, color: C.green },
  ];
  const pct = (v: number) => (view.tamValue > 0 ? Math.max(6, Math.round((v / view.tamValue) * 100)) : 0);
  const barMs = prefersReducedMotion() ? 0 : COUNT_MS;

  return (
    <section style={{ padding: '20px 24px' }}>
      <style>{`@keyframes sizerPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 rgba(245,158,11,0)}50%{transform:scale(1.02);box-shadow:0 0 22px rgba(245,158,11,.5)}}`}</style>
      <div style={{ maxWidth: 920, margin: '0 auto', borderRadius: 16, border: `1px solid ${C.border}`, background: C.panel, padding: '22px 24px' }}>
        <div style={{ textAlign: 'center', fontSize: 'clamp(17px, 2.4vw, 22px)', fontWeight: 800, color: C.white }}>
          📊 ประเมินขนาดตลาดธุรกิจคุณ — <span style={{ color: C.cyan }}>ฟรี ใน 30 วินาที</span>
        </div>
        <div style={{ textAlign: 'center', color: C.slate, fontSize: 13, margin: '4px 0 16px' }}>
          กรอก 2 ช่อง → เห็นเลยว่าคุณคว้าตลาดได้เท่าไหร่ (ภาษาบ้าน ๆ ไม่ต้องเป็นนักการตลาด)
        </div>

        {/* ── HERO: ตัวเลขโอกาส นับขึ้น ~3 วิ ── */}
        <div style={{ borderRadius: 14, border: `1px solid ${C.green}`, background: C.heroBg, padding: '16px 18px', textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 2 }}>
            {isExample ? '✨ ตัวอย่าง — โอกาสที่คุณคว้าได้ปีแรก' : '🎯 โอกาสของคุณ — คว้าได้ปีแรก'}
          </div>
          <div style={{ fontSize: 'clamp(30px, 7vw, 46px)', fontWeight: 900, color: C.green, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
            {bahtPlain(animatedSom)}
          </div>
          <div style={{ fontSize: 12.5, color: C.slate, marginTop: 3 }}>≈ {view.somCustomers.toLocaleString('th-TH')} ราย — เป้าหมายที่จับต้องได้ก่อน</div>
        </div>

        {/* ── กราฟแท่งเคลื่อนไหว (แปลงตัวเลขเป็นภาพ) ── */}
        <div style={{ display: 'grid', gap: 9, marginBottom: 14 }}>
          {bars.map(b => (
            <div key={b.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.slate, marginBottom: 3 }}>
                <span>{b.label}</span><span style={{ color: C.white, fontWeight: 700 }}>{bahtPlain(b.val)}</span>
              </div>
              <div style={{ height: 12, borderRadius: 999, background: C.track, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 999, background: b.color, width: (grow ? pct(b.val) : 0) + '%', transition: `width ${barMs}ms cubic-bezier(0.22,1,0.36,1)` }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div>
            <label style={label}>ธุรกิจของคุณคืออะไร?</label>
            <input value={business} onChange={e => setBusiness(e.target.value)}
              onBlur={() => { if (business.trim()) { rememberBizHint(business); engage(); } }}
              placeholder="เช่น ร้านกาแฟ, รับทำบัญชี" style={input} />
          </div>
          <div>
            <label style={label}>ลูกค้า 1 คน จ่ายให้คุณ ~เท่าไหร่/ปี (บาท)</label>
            <input value={arpu} onChange={e => { setArpu(e.target.value); engage(); }} inputMode="numeric"
              placeholder="เช่น 3000" style={input} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '12px 0 14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: C.slate }}>ขายที่ไหน:</span>
          {([['national', 'ทั้งประเทศ'], ['local', 'เฉพาะจังหวัด/ท้องถิ่น']] as [SizerScope, string][]).map(([s, lbl]) => (
            <button key={s} onClick={() => setScope(s)} style={{ fontSize: 12.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${scope === s ? C.cyan : C.border}`, background: scope === s ? 'rgba(6,182,212,0.14)' : 'transparent', color: scope === s ? C.cyan : C.slate }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* ── ทริกเกอร์สมัคร: โผล่/เต้นเมื่อแอนิเมชันตัวเลขจบ ── */}
        {revealed && (
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.green, textAlign: 'center', marginBottom: 8 }}>
            🔥 โอกาสนี้คว้าได้จริง — ให้ AI วางแผนหาลูกค้าให้เลย
          </div>
        )}
        <button onClick={() => { track('sizer_cta_click', { scope, example: isExample ? 1 : 0 }); onGetStarted(); }}
          style={{ width: '100%', background: C.amber, color: C.dark, border: 0, borderRadius: 12, padding: '13px 22px', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', animation: revealed && !prefersReducedMotion() ? 'sizerPulse 1.6s ease-in-out 2' : undefined }}>
          ให้ AI วิจัยตลาดจริง (จาก Google) + วางแผนหาลูกค้า — เริ่มฟรี
        </button>
        <div style={{ fontSize: 11, color: C.slate, marginTop: 8, textAlign: 'center', lineHeight: 1.6 }}>{view.disclaimer}</div>
      </div>
    </section>
  );
}
