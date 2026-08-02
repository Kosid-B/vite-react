import { useState } from 'react';
import type { AppData } from '../types';
import { resiliencePlan, resilienceBaseFromData, RESILIENCE_PRESETS, RUNWAY_SAFE_MONTHS, type ResilienceSeverity } from '../lib/resiliencePlan';
import { fmtBaht } from '../lib/finance';
import { track } from '../lib/analytics';

/* ResiliencePlanner — Scenario/Resilience planner (Superorganism เสา 1)
 * จำลองวิกฤต (รายได้ตก/ต้นทุนพุ่ง) กับการเงินจริง → runway + ช่องว่างที่ต้องอุด + แผนรับมือ
 * "ธุรกิจต้องอยู่รอดทุกวิกฤต" — เครื่องมือพรีเมียมต่อยอด CFO/finance */

const SEV: Record<ResilienceSeverity, { label: string; color: string; ico: string }> = {
  resilient: { label: 'ทนวิกฤตได้', color: '#16a34a', ico: '🛡️' },
  safe: { label: 'พอไหว', color: '#06b6d4', ico: '🙂' },
  watch: { label: 'ต้องระวัง', color: '#f59e0b', ico: '⚠️' },
  critical: { label: 'วิกฤต', color: '#ef4444', ico: '🚨' },
};

export default function ResiliencePlanner({ data }: { data: AppData }) {
  const base = resilienceBaseFromData(data);
  const [revDrop, setRevDrop] = useState(30);
  const [expSpike, setExpSpike] = useState(0);
  const [cash, setCash] = useState<string>(String(base.cashReserve));

  const cashNum = Math.max(0, parseFloat(cash) || 0);
  const plan = resiliencePlan({
    recurringRevenue: base.recurringRevenue,
    recurringExpense: base.recurringExpense,
    cashReserve: cashNum,
    scenario: { revenueDropPct: revDrop, expenseSpikePct: expSpike },
  });
  const sev = SEV[plan.severity];
  const hasBase = base.recurringRevenue > 0 || base.recurringExpense > 0;

  function preset(id: string, s: { revenueDropPct: number; expenseSpikePct: number }) {
    setRevDrop(s.revenueDropPct); setExpSpike(s.expenseSpikePct);
    track('resilience_preset', { id });
  }

  const slider = (label: string, val: number, set: (n: number) => void, color: string) => (
    <div style={{ flex: '1 1 200px' }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)', display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span><span style={{ color, fontWeight: 800 }}>{val}%</span>
      </label>
      <input type="range" min={0} max={100} value={val} onChange={e => set(+e.target.value)}
        onMouseUp={() => track('resilience_run', { severity: plan.severity })}
        style={{ width: '100%', accentColor: color }} />
    </div>
  );

  return (
    <div style={{ background: 'var(--cream2)', border: '1px solid var(--sand)', borderRadius: 'var(--r)', padding: '18px 20px', marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 18 }}>🛡️</span>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Resilience Planner — จำลองวิกฤต ธุรกิจอยู่รอดไหม?</h3>
        <span style={{ fontSize: 10.5, fontWeight: 700, background: 'var(--cream3)', color: 'var(--ink4)', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '.05em' }}>Premium</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink3)', margin: '0 0 14px', lineHeight: 1.6 }}>
        Stress test การเงินจริงของคุณ — ถ้ารายได้ตก/ต้นทุนพุ่ง จะเหลือ <strong style={{ color: 'var(--ink)' }}>runway</strong> กี่เดือน และต้องอุดช่องว่างเท่าไรถึงรอด
      </p>

      {!hasBase && (
        <div style={{ fontSize: 12.5, color: 'var(--ink4)', background: 'var(--cream)', border: '1px dashed var(--sand)', borderRadius: 'var(--r)', padding: '10px 12px', marginBottom: 12 }}>
          💡 ยังไม่มีรายรับ/รายจ่าย “ประจำ” — กรอกการเงินในคลังเมืองก่อน แล้วผลจะอิงตัวเลขจริงของคุณ
        </div>
      )}

      {/* presets */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {RESILIENCE_PRESETS.map(p => (
          <button key={p.id} onClick={() => preset(p.id, p.scenario)}
            style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999, border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--ink)', cursor: 'pointer', fontFamily: 'inherit' }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* controls */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        {slider('รายได้ลดลง', revDrop, setRevDrop, '#ef4444')}
        {slider('ต้นทุนเพิ่มขึ้น', expSpike, setExpSpike, '#f59e0b')}
        <div style={{ flex: '1 1 160px' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)', display: 'block', marginBottom: 4 }}>เงินสำรอง (บาท)</label>
          <input type="number" min={0} value={cash} onChange={e => setCash(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--r)', border: '1px solid var(--sand)', background: 'var(--cream)', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 14, fontVariantNumeric: 'tabular-nums' }} />
        </div>
      </div>

      {/* verdict */}
      <div style={{ padding: '14px 16px', borderRadius: 'var(--r)', background: 'var(--cream)', border: '1px solid var(--sand)', borderLeft: `4px solid ${sev.color}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: sev.color }}>{sev.ico} {sev.label}</span>
          <span style={{ fontSize: 13, color: 'var(--ink3)' }}>{plan.headline}</span>
          <span style={{ marginLeft: 'auto', fontSize: 20, fontWeight: 800, color: sev.color, fontVariantNumeric: 'tabular-nums' }}>
            {plan.runwayMonths === Infinity ? '∞' : plan.runwayMonths.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 600 }}>เดือน</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, fontSize: 12.5, color: 'var(--ink3)', fontVariantNumeric: 'tabular-nums' }}>
          <span>รายได้: <b>{fmtBaht(plan.stressedRevenue)}</b></span>
          <span>ต้นทุน: <b>{fmtBaht(plan.stressedExpense)}</b></span>
          <span>สุทธิ/เดือน: <b style={{ color: plan.stressedNet >= 0 ? '#16a34a' : '#ef4444' }}>{fmtBaht(plan.stressedNet)}</b></span>
          {plan.breakEvenGap > 0 && <span>ช่องว่างต้องอุด: <b style={{ color: '#f59e0b' }}>{fmtBaht(plan.breakEvenGap)}/เดือน</b></span>}
        </div>
        <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.6 }}>
          {plan.mitigations.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
        <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 8 }}>เกณฑ์: เงินสำรองควรยืนได้ ≥ {RUNWAY_SAFE_MONTHS} เดือน · ตัวเลขฐานมาจากรายรับ/จ่าย “ประจำ” จริงของคุณ</div>
      </div>
    </div>
  );
}
