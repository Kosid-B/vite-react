import { useMemo, useRef, useState } from 'react';
import { suggestPrice } from '../lib/pricingCalc';
import { track } from '../lib/analytics';
import { useLandingTheme } from '../lib/landingTheme';
import { useCountUp, prefersReducedMotion } from '../lib/useCountUp';

/* PricingCalcPanel — "ตั้งราคาขายเท่าไหร่ดี?" (lead magnet บน Landing)
 * ต้นทุน + กำไรที่อยากได้ → ราคาที่ควรตั้ง (นับขึ้น) + กำไร/ชิ้น + กำไร/เดือน · ทริกเกอร์สมัคร
 * pure calc ฝั่ง browser (ไม่ต้อง login) · จริยธรรม: เตือนเทียบราคาตลาด/ค่าใช้จ่ายแฝง */

const DARK_C = { border: '#1e293b', panel: 'rgba(15,23,42,0.6)', card: 'rgba(2,6,23,0.5)', white: '#fff', slate: '#94a3b8', cyan: '#22d3ee', green: '#4ade80', amber: '#f59e0b', dark: '#020617', heroBg: 'rgba(34,211,238,0.10)' };
const LIGHT_C: typeof DARK_C = { border: '#e2e8f0', panel: '#ffffff', card: '#f1f5f9', white: '#0f172a', slate: '#475569', cyan: '#0891b2', green: '#16a34a', amber: '#f59e0b', dark: '#020617', heroBg: 'rgba(8,145,178,0.08)' };

const EXAMPLE = { cost: 50, marginPct: 40 };
const baht = (n: number) => '฿' + Math.max(0, Math.round(n)).toLocaleString('th-TH');

export default function PricingCalcPanel({ onGetStarted, onEngage }: { onGetStarted: () => void; onEngage?: () => void }) {
  const C = useLandingTheme() === 'minimal' ? LIGHT_C : DARK_C;
  const [cost, setCost] = useState('');
  const [margin, setMargin] = useState(40);
  const [units, setUnits] = useState('');
  const engaged = useRef(false);
  const engage = () => { if (!engaged.current) { engaged.current = true; onEngage?.(); } };

  const real = useMemo(() => suggestPrice({ cost: Number(cost), marginPct: margin, unitsPerMonth: Number(units) }), [cost, margin, units]);
  const isExample = !real.ok;
  const view = real.ok ? real : suggestPrice(EXAMPLE);
  const animatedPrice = useCountUp(view.price, 2200);
  const revealed = animatedPrice === view.price && view.price > 0;

  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.white, fontFamily: 'inherit', fontSize: 15 };
  const label: React.CSSProperties = { fontSize: 12.5, color: C.slate, marginBottom: 5, display: 'block' };

  return (
    <section style={{ padding: '20px 24px' }}>
      <style>{`@keyframes pricePulse{0%,100%{transform:scale(1);box-shadow:0 0 0 rgba(245,158,11,0)}50%{transform:scale(1.02);box-shadow:0 0 22px rgba(245,158,11,.5)}}`}</style>
      <div style={{ maxWidth: 920, margin: '0 auto', borderRadius: 16, border: `1px solid ${C.border}`, background: C.panel, padding: '22px 24px' }}>
        <div style={{ textAlign: 'center', fontSize: 'clamp(17px, 2.4vw, 22px)', fontWeight: 800, color: C.white }}>
          🏷️ ตั้งราคาขายเท่าไหร่ดี? — <span style={{ color: C.cyan }}>คำนวณฟรี</span>
        </div>
        <div style={{ textAlign: 'center', color: C.slate, fontSize: 13, margin: '4px 0 16px' }}>
          ใส่ต้นทุน + กำไรที่อยากได้ → รู้ราคาที่ควรตั้ง + กำไรทันที (ไม่ต้องเดา)
        </div>

        {/* HERO: ราคาที่ควรตั้ง (นับขึ้น) */}
        <div style={{ borderRadius: 14, border: `1px solid ${C.cyan}`, background: C.heroBg, padding: '16px 18px', textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, color: C.slate, marginBottom: 2 }}>{isExample ? '✨ ตัวอย่าง — ราคาที่ควรตั้ง' : '🏷️ ราคาที่คุณควรตั้ง'}</div>
          <div style={{ fontSize: 'clamp(30px, 7vw, 46px)', fontWeight: 900, color: C.cyan, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>{baht(animatedPrice)}</div>
          <div style={{ fontSize: 12.5, color: C.slate, marginTop: 3 }}>กำไร <b style={{ color: C.green }}>{baht(view.profitPerUnit)}</b>/ชิ้น · บวกจากทุน {view.markupPct}%</div>
        </div>

        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <div>
            <label style={label}>ต้นทุนต่อชิ้น/งาน (บาท)</label>
            <input value={cost} onChange={e => { setCost(e.target.value); engage(); }} onBlur={engage} inputMode="numeric" placeholder="เช่น 50" style={input} />
          </div>
          <div>
            <label style={label}>ขายกี่ชิ้น/เดือน (ไม่บังคับ)</label>
            <input value={units} onChange={e => { setUnits(e.target.value); engage(); }} inputMode="numeric" placeholder="เช่น 100" style={input} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '12px 0 14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: C.slate }}>อยากได้กำไร:</span>
          {[20, 30, 40, 50, 60].map(m => (
            <button key={m} onClick={() => { setMargin(m); engage(); }} style={{ fontSize: 12.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${margin === m ? C.cyan : C.border}`, background: margin === m ? 'rgba(6,182,212,0.14)' : 'transparent', color: margin === m ? C.cyan : C.slate }}>
              {m}%
            </button>
          ))}
        </div>

        {Number(units) > 0 && (
          <div style={{ border: `1px solid ${C.green}`, borderRadius: 10, padding: '12px 14px', background: C.card, marginBottom: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 12.5, color: C.slate }}>ถ้าขายได้ {Math.floor(Number(units)).toLocaleString('th-TH')} ชิ้น/เดือน</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.green }}>กำไร ~{baht(view.monthlyProfit)}/เดือน</div>
          </div>
        )}

        {revealed && (
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.cyan, textAlign: 'center', marginBottom: 8 }}>
            🔥 อยากตั้งราคาให้ขายดี + กำไรงาม? ให้ AI ช่วยวางกลยุทธ์ราคาให้
          </div>
        )}
        <button onClick={() => { track('pricing_cta_click', { margin, example: isExample ? 1 : 0 }); onGetStarted(); }}
          style={{ width: '100%', background: C.amber, color: C.dark, border: 0, borderRadius: 12, padding: '13px 22px', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', animation: revealed && !prefersReducedMotion() ? 'pricePulse 1.6s ease-in-out 2' : undefined }}>
          ให้ AI ช่วยตั้งราคา + วางกลยุทธ์ทั้งร้าน — เริ่มฟรี
        </button>
        <div style={{ fontSize: 11, color: C.slate, marginTop: 8, textAlign: 'center', lineHeight: 1.6 }}>{view.note}</div>
      </div>
    </section>
  );
}
