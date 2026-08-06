import { useMemo, useState } from 'react';
import { roiCompare } from '../lib/roiCompare';
import { termLabel } from '../lib/terms';
import { PLAN_PRICE_NUM } from '../lib/access';
import { track } from '../lib/analytics';
import type { PlanId } from '../types';

/* RoiCalculatorPanel — ROI อย่างง่ายบน Landing: กรอกตัวเลขร้าน → เห็นผลตอบแทน + เทียบค่าสมัครแพ็กเรา
 * ตอบ "จ่ายค่าระบบแล้วคุ้มไหม" · คำไทยคู่ EN (ความคุ้มค่า/ROI) · บทวิเคราะห์ rule-based (ซื่อสัตย์) + CTA ให้ AI ลึกในระบบ */

const C = { border: '#1e293b', panel: 'rgba(15,23,42,0.6)', card: 'rgba(2,6,23,0.5)', white: '#fff', slate: '#94a3b8', cyan: '#22d3ee', green: '#4ade80', red: '#fca5a5', amber: '#f59e0b', dark: '#020617' };
const baht = (n: number) => '฿' + Math.round(n).toLocaleString('th-TH');
const PLANS: { id: PlanId; label: string }[] = [{ id: 'starter', label: 'Starter' }, { id: 'growth', label: 'Growth' }];

export default function RoiCalculatorPanel({ onGetStarted }: { onGetStarted: () => void }) {
  const [walkin, setWalkin] = useState('20');
  const [ticket, setTicket] = useState('60');
  const [extra, setExtra] = useState('60');
  const [plan, setPlan] = useState<PlanId>('growth');

  const r = useMemo(
    () => roiCompare({ walkinPerDay: Number(walkin), avgTicket: Number(ticket), extraOrdersPerMonth: Number(extra), plan }),
    [walkin, ticket, extra, plan],
  );

  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10, border: '1px solid #334155', background: 'rgba(2,6,23,0.5)', color: C.white, fontFamily: 'inherit', fontSize: 15 };
  const label: React.CSSProperties = { fontSize: 12.5, color: C.slate, marginBottom: 5, display: 'block' };
  const stat = (t: string, v: string, color: string) => (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', background: C.card, flex: '1 1 130px' }}>
      <div style={{ fontSize: 12, color: C.slate }}>{t}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{v}</div>
    </div>
  );

  return (
    <section style={{ padding: '20px 24px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', borderRadius: 16, border: `1px solid ${C.border}`, background: C.panel, padding: '22px 24px' }}>
        <div style={{ textAlign: 'center', fontSize: 'clamp(17px, 2.4vw, 22px)', fontWeight: 800, color: C.white }}>
          🧮 {termLabel('roi')} — <span style={{ color: C.cyan }}>สมัครแล้วคุ้มไหม?</span>
        </div>
        <div style={{ textAlign: 'center', color: C.slate, fontSize: 13, margin: '4px 0 18px' }}>
          กรอกตัวเลขร้านคุณ 3 ช่อง → ระบบคำนวณผลตอบแทน แล้วเทียบกับค่าสมัครแพ็กให้เลย
        </div>

        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <div><label style={label}>ลูกค้าเดินเข้า/วัน</label><input value={walkin} onChange={e => setWalkin(e.target.value)} inputMode="numeric" style={input} /></div>
          <div><label style={label}>ยอดเฉลี่ย/บิล (บาท)</label><input value={ticket} onChange={e => setTicket(e.target.value)} inputMode="numeric" style={input} /></div>
          <div><label style={label}>ออร์เดอร์เพิ่ม/เดือน (คาด)</label><input value={extra} onChange={e => setExtra(e.target.value)} inputMode="numeric" style={input} /></div>
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '12px 0', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: C.slate }}>เทียบกับแพ็ก:</span>
          {PLANS.map(p => (
            <button key={p.id} onClick={() => setPlan(p.id)} style={{ fontSize: 12.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${plan === p.id ? C.cyan : C.border}`, background: plan === p.id ? 'rgba(6,182,212,0.14)' : 'transparent', color: plan === p.id ? C.cyan : C.slate }}>
              {p.label} {baht(PLAN_PRICE_NUM[p.id])}/เดือน
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {stat('ยอดตอนนี้/เดือน', baht(r.currentMonthly), C.white)}
          {stat('ยอดเพิ่ม (คาด)/เดือน', '+' + baht(r.extraMonthly), C.green)}
          {stat('ค่าระบบ/เดือน', baht(r.planCost), C.slate)}
          {stat(r.worth ? 'คุ้มกี่เท่าของค่าระบบ' : 'ยังไม่คุ้ม', r.worth ? `${r.timesOverCost}×` : `ขาด ${baht(Math.abs(r.netGain))}`, r.worth ? C.green : C.red)}
        </div>

        <div style={{ border: `1px solid ${r.worth ? C.green : C.amber}`, borderRadius: 10, padding: '12px 14px', background: C.card }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: r.worth ? C.green : C.amber, marginBottom: 4 }}>🤖 บทวิเคราะห์</div>
          <div style={{ fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.6 }}>{r.verdict}</div>
        </div>

        <button onClick={() => { track('roi_cta_click', { worth: r.worth ? 1 : 0, plan }); onGetStarted(); }}
                style={{ width: '100%', marginTop: 14, background: C.amber, color: C.dark, border: 0, borderRadius: 12, padding: '13px 22px', fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
          ให้ทีม AI วิเคราะห์ลึก + วางแผนหาลูกค้าจริง — เริ่มฟรี
        </button>
        <div style={{ fontSize: 11, color: C.slate, marginTop: 8, textAlign: 'center' }}>
          เป็นการประเมินจากตัวเลขที่คุณกรอก เพื่อการตัดสินใจ — ไม่ใช่การรับประกันรายได้ · ในระบบมีทีม AI ช่วยวิเคราะห์เจาะลึกกว่านี้
        </div>
      </div>
    </section>
  );
}
