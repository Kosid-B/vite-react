import { useMemo, useState } from 'react';
import type { AppData } from '../types';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { withSkillDirectives } from '../lib/skillDirectives';
import { trackAiCall } from '../lib/usage';
import { estimateSizing, opportunityScore, cmoResearchPrompt, type OppFactors } from '../lib/marketSizing';
import { competitorArchetypes, findGap, competitorPrompt, tierLabel } from '../lib/competitorAnalysis';

/* 📣 วิจัยตลาด + ประเมินขนาดตลาด (TAM/SAM/SOM) — CMO (มณี) รับผิดชอบนำเสนอ
 * ออนไลน์: CMO วิจัยด้วย agent-run + Google Search (Serper) · ออฟไลน์: ประมาณจากสมมติฐาน (แก้ได้) */
const baht = (n: number) => n >= 1_000_000 ? `฿${(n / 1_000_000).toFixed(1)}M` : `฿${n.toLocaleString()}`;

const FACTOR_LABELS: { key: keyof OppFactors; label: string; invert?: boolean }[] = [
  { key: 'size', label: 'ขนาดตลาด' },
  { key: 'growth', label: 'การเติบโต' },
  { key: 'competition', label: 'ความรุนแรงคู่แข่ง', invert: true },
  { key: 'barrier', label: 'อุปสรรคเข้าตลาด', invert: true },
  { key: 'differentiation', label: 'จุดต่างของเรา' },
];

export default function MarketSizingPanel({ data }: { data: AppData; onUpdate?: (d: AppData) => void }) {
  const c = data.aiCompany;
  const cmo = c?.agents.find(a => /cmo|market|ตลาด/i.test(a.role)) ?? c?.agents[0];
  const bmc = data.businessModel?.bmc;

  const [arpu, setArpu] = useState(12000);
  const [base, setBase] = useState(0); // 0 = ใช้ default SME ไทย
  const [svPct, setSvPct] = useState(3);
  const [capPct, setCapPct] = useState(0.5);
  const [factors, setFactors] = useState<OppFactors>({ size: 3, growth: 3, competition: 3, barrier: 3, differentiation: 3 });
  const [aiOut, setAiOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [compOut, setCompOut] = useState<string | null>(null);
  const [compBusy, setCompBusy] = useState(false);

  const archetypes = useMemo(() => competitorArchetypes(c?.industry), [c?.industry]);
  const gap = useMemo(() => findGap({ differentiator: (bmc?.value ?? [])[0] }), [bmc?.value]);

  const sizing = useMemo(() => estimateSizing({
    annualRevenuePerCustomer: arpu, businessBase: base || undefined, serviceablePct: svPct, capturePctYr1: capPct,
  }), [arpu, base, svPct, capPct]);
  const opp = useMemo(() => opportunityScore(factors), [factors]);

  async function runResearch() {
    if (!isSupabaseEnabled || !supabase) {
      setMsg('โหมด local: ตัวเลขขนาดตลาดด้านล่างประมาณจากสมมติฐาน — CMO วิจัยข้อมูลจริงเมื่อเชื่อม Supabase/เข้าสู่ระบบ');
      return;
    }
    setBusy(true); setAiOut(null); setMsg('');
    try {
      trackAiCall();
      const { data: res, error } = await supabase.functions.invoke('agent-run', {
        body: {
          role: cmo?.role ?? 'CMO',
          name: cmo?.name,
          mandate: withSkillDirectives(cmo?.mandate ?? 'วิจัยตลาดและวางกลยุทธ์การตลาด', c?.purchasedSkills),
          model: cmo?.model ?? 'claude-sonnet-4-6',
          title: 'วิจัยตลาด + ประเมินขนาดตลาด (TAM/SAM/SOM)',
          detail: `หมวด: ${c?.industry ?? '-'} · คุณค่า: ${(bmc?.value ?? []).join(', ') || '-'} · ลูกค้า: ${(bmc?.segments ?? []).join(', ') || '-'}`,
          goal: cmoResearchPrompt({ industry: c?.industry, goal: c?.goal, value: (bmc?.value ?? [])[0], arpu }),
          industry: c?.industry ?? '',
          companyName: c?.name ?? '',
          useWebSearch: true,
          searchQuery: `ขนาดตลาด ${c?.industry ?? ''} ไทย คู่แข่ง แนวโน้ม 2569`,
        },
      });
      if (error) throw error;
      setAiOut(res?.output ?? '(ไม่มีผลลัพธ์)');
    } catch (e) {
      setMsg('✕ CMO วิจัยไม่สำเร็จ: ' + (e as Error).message + ' — ใช้ตัวเลขประมาณด้านล่างได้');
    } finally {
      setBusy(false);
    }
  }

  async function runCompetitor() {
    if (!isSupabaseEnabled || !supabase) { setMsg('โหมด local: ดูอาร์เชไทป์คู่แข่ง + ช่องว่างด้านล่าง — CMO วิเคราะห์คู่แข่งจริงเมื่อออนไลน์'); return; }
    setCompBusy(true); setCompOut(null); setMsg('');
    try {
      trackAiCall();
      const { data: res, error } = await supabase.functions.invoke('agent-run', {
        body: {
          role: cmo?.role ?? 'CMO', name: cmo?.name,
          mandate: withSkillDirectives(cmo?.mandate ?? 'วิเคราะห์คู่แข่ง', c?.purchasedSkills),
          model: cmo?.model ?? 'claude-sonnet-4-6',
          title: 'วิเคราะห์คู่แข่ง + หาช่องว่างตลาด',
          detail: `หมวด: ${c?.industry ?? '-'} · คุณค่า: ${(bmc?.value ?? []).join(', ') || '-'}`,
          goal: competitorPrompt({ industry: c?.industry, value: (bmc?.value ?? [])[0], goal: c?.goal }),
          industry: c?.industry ?? '', companyName: c?.name ?? '',
          useWebSearch: true, searchQuery: `คู่แข่ง ${c?.industry ?? ''} ไทย เจ้าตลาด ราคา`,
        },
      });
      if (error) throw error;
      setCompOut(res?.output ?? '(ไม่มีผลลัพธ์)');
    } catch (e) {
      setMsg('✕ วิเคราะห์คู่แข่งไม่สำเร็จ: ' + (e as Error).message);
    } finally { setCompBusy(false); }
  }

  return (
    <div className="ms-card">
      <div className="ms-head">
        <span className="ms-avatar">{cmo?.avatar ?? '📣'}</span>
        <div>
          <div className="ms-title">วิจัยตลาด + ประเมินขนาดตลาด</div>
          <div className="ms-sub">รับผิดชอบโดย {cmo?.name ? `${cmo.name} · ` : ''}{cmo?.role ?? 'CMO'} — นำเสนอ TAM/SAM/SOM + โอกาสตลาด</div>
        </div>
        <button className="ms-run" onClick={runResearch} disabled={busy}>
          {busy ? '⏳ CMO กำลังวิจัย…' : '🔎 ให้ CMO วิจัยตลาด'}
        </button>
      </div>
      {msg && <div className="ms-msg">{msg}</div>}

      {/* input สมมติฐาน */}
      <div className="ms-inputs">
        <label>รายได้/ลูกค้า/ปี (฿)<input type="number" value={arpu} min={0} onChange={e => setArpu(Number(e.target.value) || 0)} /></label>
        <label>ฐานลูกค้าเป้าหมาย<input type="number" value={base} min={0} placeholder="ว่าง = SME ไทย 3.2M" onChange={e => setBase(Number(e.target.value) || 0)} /></label>
        <label>เข้าถึงได้ SAM (%)<input type="number" value={svPct} min={0} max={100} step={0.5} onChange={e => setSvPct(Number(e.target.value) || 0)} /></label>
        <label>คว้าได้ปี1-2 SOM (%)<input type="number" value={capPct} min={0} max={100} step={0.1} onChange={e => setCapPct(Number(e.target.value) || 0)} /></label>
      </div>

      {/* TAM / SAM / SOM */}
      <div className="ms-tam">
        {([['TAM', 'ตลาดทั้งหมด', sizing.tam, sizing.tamRange], ['SAM', 'เข้าถึงได้', sizing.sam, sizing.samRange], ['SOM', 'คว้าได้ปี1-2', sizing.som, sizing.somRange]] as const).map(([k, label, val, range]) => (
          <div key={k} className={`ms-tam-card ${k.toLowerCase()}`}>
            <div className="ms-tam-k">{k}</div>
            <div className="ms-tam-v">{baht(val)}</div>
            <div className="ms-tam-label">{label}</div>
            <div className="ms-tam-range">ช่วง {baht(range[0])}–{baht(range[1])}</div>
          </div>
        ))}
      </div>
      <div className="ms-som-note">≈ {sizing.customersSom.toLocaleString()} ลูกค้าใน SOM · {baht(sizing.som)}/ปี</div>
      <ul className="ms-assump">{sizing.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>

      {/* คะแนนโอกาส 5 ปัจจัย */}
      <div className="ms-opp">
        <div className="ms-opp-hd">คะแนนโอกาสตลาด <span className="ms-opp-score">{opp.score}/5 · {opp.label}</span></div>
        <div className="ms-opp-grid">
          {FACTOR_LABELS.map(f => (
            <label key={f.key} className="ms-opp-f">
              <span>{f.label}{f.invert ? ' (มาก=แย่)' : ''}</span>
              <select value={factors[f.key]} onChange={e => setFactors(p => ({ ...p, [f.key]: Number(e.target.value) }))}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          ))}
        </div>
        <div className="ms-opp-verdict">💡 {opp.verdict}</div>
      </div>

      {aiOut && (
        <div className="ms-ai">
          <div className="ms-ai-hd">{cmo?.avatar ?? '📣'} {cmo?.name ?? 'CMO'} นำเสนอผลวิจัยตลาด</div>
          <div className="ms-ai-body">{aiOut}</div>
        </div>
      )}

      {/* คู่แข่ง + ช่องว่าง */}
      <div className="ms-comp">
        <div className="ms-comp-hd">
          🥊 คู่แข่ง + ช่องว่างตลาด
          <button className="ms-comp-run" onClick={runCompetitor} disabled={compBusy}>
            {compBusy ? '⏳ วิเคราะห์…' : 'ให้ CMO วิเคราะห์คู่แข่งจริง'}
          </button>
        </div>
        <div className="ms-comp-table">
          {archetypes.map((a, i) => (
            <div key={i} className={`ms-comp-row ${a.tier}`}>
              <span className="ms-comp-tier">{tierLabel(a.tier)}</span>
              <div className="ms-comp-cell">
                <div className="ms-comp-name">{a.name}</div>
                <div className="ms-comp-sw">✅ {a.strengths}</div>
                <div className="ms-comp-sw weak">⚠️ {a.weaknesses}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="ms-gap">
          <div className="ms-gap-hd">🎯 ช่องว่างที่เปิดอยู่</div>
          <div className="ms-gap-body"><b>{gap.gap}</b><br />{gap.why}<br /><span className="ms-gap-move">→ {gap.moveHint}</span></div>
        </div>
        {compOut && (
          <div className="ms-ai">
            <div className="ms-ai-hd">{cmo?.avatar ?? '📣'} {cmo?.name ?? 'CMO'} วิเคราะห์คู่แข่ง</div>
            <div className="ms-ai-body">{compOut}</div>
          </div>
        )}
      </div>
    </div>
  );
}
