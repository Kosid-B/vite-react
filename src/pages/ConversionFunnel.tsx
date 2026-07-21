import { useRef, useState } from 'react';
import type { AppData } from '../types';
import { parseFunnelNumbers, applyFunnelNumbers, isSeedFunnel } from '../lib/funnelSync';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

const STAGE_COLORS = [
  { bar: '#1a4f8a', light: '#eff4fb' },
  { bar: '#2d6a4f', light: '#edf7f2' },
  { bar: '#a05c1a', light: '#fdf6ec' },
  { bar: '#c44b2b', light: '#fdf3f0' },
  { bar: '#1a4f8a', light: '#eff4fb' },
  { bar: '#2d6a4f', light: '#edf7f2' },
  { bar: '#6b4f8a', light: '#f5f0fb' },
  { bar: '#8a4f1a', light: '#fdf6ec' },
];

export default function ConversionFunnel({ data, onUpdate }: Props) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteMsg, setPasteMsg] = useState<string | null>(null);

  const stages = data.stages;
  const funnel = data.funnel;
  const isSeed = isSeedFunnel(data.funnelSource);
  const today = new Date().toISOString().slice(0, 10);

  function saveLeads(i: number, val: string) {
    const n = Math.max(0, parseInt(val.replace(/,/g, ''), 10) || 0);
    const next = funnel.map((f, j) => j === i ? { ...f, leads: n } : f);
    onUpdate({ ...data, funnel: next, funnelSource: 'real', funnelSyncedAt: today });
  }

  // วางตัวเลขจาก GA4 Funnel Exploration ทีเดียวทั้งหมด
  function applyPaste() {
    const nums = parseFunnelNumbers(pasteText);
    if (!nums.length) { setPasteMsg('ไม่พบตัวเลขในข้อความที่วาง — ก็อปคอลัมน์ "ผู้ใช้ทั้งหมด" จาก GA4 มาวาง'); return; }
    onUpdate({ ...data, funnel: applyFunnelNumbers(funnel, nums), funnelSource: 'real', funnelSyncedAt: today });
    setPasteText('');
    setPasteMsg(`✓ อัปเดต ${Math.min(nums.length, funnel.length)} step จากข้อมูลจริงแล้ว`);
  }

  function saveNote(i: number, val: string) {
    const next = funnel.map((f, j) => j === i ? { ...f, note: val } : f);
    onUpdate({ ...data, funnel: next });
  }

  const maxLeads = Math.max(...funnel.map(f => f.leads), 1);
  const totalIn = funnel[0]?.leads ?? 0;
  const totalOut = funnel[funnel.length - 1]?.leads ?? 0;
  const overallRate = totalIn > 0 ? (totalOut / totalIn * 100) : 0;

  // Conversion rates between stages
  const rates = funnel.map((f, i) => {
    if (i === 0) return 100;
    const prev = funnel[i - 1].leads;
    return prev > 0 ? (f.leads / prev * 100) : 0;
  });

  // Best & worst drop-off stages (index 1+)
  let worstIdx = 1;
  let bestIdx = 1;
  for (let i = 2; i < funnel.length; i++) {
    if (rates[i] < rates[worstIdx]) worstIdx = i;
    if (rates[i] > rates[bestIdx]) bestIdx = i;
  }

  const dropOffs = funnel.map((f, i) => {
    if (i === funnel.length - 1) return 0;
    return f.leads - funnel[i + 1].leads;
  });

  // Top 3 biggest drop-off stages
  const top3Drop = [...dropOffs.map((d, i) => ({ d, i }))]
    .filter(x => x.i < funnel.length - 1)
    .sort((a, b) => b.d - a.d)
    .slice(0, 3);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Conversion Funnel</div>
        <div className="page-meta">
          <span className="meta-chip">{stages.length} Stages · Inbound B2B</span>
          <span className="law-badge" data-tip={"Goal-Gradient: เห็น funnel ทั้งหมด\nทำให้รู้ว่าต้องปรับ stage ไหน\nเพื่อถึงเป้าได้เร็วขึ้น"}>Goal-Gradient</span>
          <span className="law-badge" data-tip={"Von Restorff: stage ที่ conversion\nต่ำที่สุดจะถูก highlight โดดเด่น\nเพื่อดึงความสนใจให้แก้ก่อน"}>Von Restorff</span>
        </div>
      </div>

      {/* แหล่งข้อมูล — seed vs จริง + นำทางเชื่อม GA4 */}
      <div className={`fn-src ${isSeed ? 'seed' : 'real'}`}>
        <div className="fn-src-row">
          <span className="fn-src-badge">{isSeed ? '🟡 ข้อมูลตัวอย่าง (seed)' : '🟢 ข้อมูลจริง'}</span>
          <span className="fn-src-text">
            {isSeed
              ? 'ตัวเลข drop-off ยังเป็นตัวอย่าง ไม่ใช่ของธุรกิจคุณ — เชื่อมข้อมูลจริงจาก GA4 เพื่อให้ insight แม่นยำ'
              : `อัปเดตล่าสุด ${data.funnelSyncedAt ?? today} · ตัวเลขมาจากคุณ/GA4`}
          </span>
          <button className="fn-src-btn" onClick={() => setShowGuide(v => !v)}>
            {showGuide ? 'ปิด' : '🔗 เชื่อม GA4 / กรอกข้อมูลจริง'}
          </button>
        </div>

        {showGuide && (
          <div className="fn-guide">
            <div className="fn-guide-hd">ดึง drop-off จริงจาก GA4 — 4 ขั้น</div>
            <ol className="fn-guide-steps">
              <li>เปิด <b>Google Analytics</b> (property <code>G-CHJ99RY1Q1</code>) → เมนู <b>Explore</b> → <b>Funnel exploration</b></li>
              <li>ตั้ง Steps ให้ตรง 8 stage ของเรา (เช่น page_view → click → view_services → contact_form → discovery_call → proposal → signed → retained)</li>
              <li>ก็อปคอลัมน์ <b>"ผู้ใช้ทั้งหมด" (Total users)</b> ของแต่ละ step</li>
              <li>วางในช่องด้านล่าง → กด <b>ใช้ข้อมูลนี้</b> (หรือแก้เลขในแต่ละ step ด้านล่างทีละช่อง)</li>
            </ol>
            <textarea
              className="fn-guide-paste"
              placeholder={"วางตัวเลขต่อ step (บรรทัดละตัว หรือคั่นด้วย , )\nเช่น\n10000\n2500\n750\n225 ..."}
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setPasteMsg(null); }}
              rows={4}
              spellCheck={false}
            />
            <div className="fn-guide-actions">
              <button className="fn-guide-apply" onClick={applyPaste}>✓ ใช้ข้อมูลนี้ ({parseFunnelNumbers(pasteText).length} ตัวเลข)</button>
              <a className="fn-guide-link" href="https://analytics.google.com/analytics/web/" target="_blank" rel="noopener noreferrer">เปิด GA4 ↗</a>
            </div>
            {pasteMsg && <div className="fn-guide-msg">{pasteMsg}</div>}
            <div className="fn-guide-note">
              💡 auto-sync อัตโนมัติจาก GA4 (ไม่ต้องก็อปเอง) = Phase 2 — ต้องตั้ง Google service account + GA4 Data API (เสนอบอร์ดเหมือน Google Sheets)
            </div>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="fn-summary">
        <div className="fn-card">
          <div className="fn-card-label">Leads เข้า (Stage 1)</div>
          <div className="fn-card-value">{totalIn.toLocaleString()}</div>
          <div className="fn-card-sub">ผู้ที่รับรู้บริษัทเรา</div>
        </div>
        <div className="fn-card">
          <div className="fn-card-label">ลูกค้าสุดท้าย (Stage 8)</div>
          <div className="fn-card-value">{totalOut.toLocaleString()}</div>
          <div className="fn-card-sub">ที่อยู่ในขั้น Retention</div>
        </div>
        <div className="fn-card">
          <div className="fn-card-label">Overall Conversion</div>
          <div className="fn-card-value" style={{ color: overallRate < 1 ? 'var(--rust)' : overallRate < 3 ? 'var(--amber)' : 'var(--green)' }}>
            {overallRate.toFixed(2)}%
          </div>
          <div className="fn-card-sub">จาก Stage 1 ถึง Stage 8</div>
        </div>
        <div className="fn-card">
          <div className="fn-card-label">Bottleneck หลัก</div>
          <div className="fn-card-value" style={{ fontSize: 16, color: 'var(--rust)' }}>{stages[worstIdx]?.label ?? '-'}</div>
          <div className="fn-card-sub">Conversion ต่ำสุด {rates[worstIdx]?.toFixed(1)}%</div>
        </div>
        <div className="fn-card">
          <div className="fn-card-label">Stage แข็งแกร่ง</div>
          <div className="fn-card-value" style={{ fontSize: 16, color: 'var(--green)' }}>{stages[bestIdx]?.label ?? '-'}</div>
          <div className="fn-card-sub">Conversion สูงสุด {rates[bestIdx]?.toFixed(1)}%</div>
        </div>
      </div>

      {/* Funnel chart */}
      <div className="fn-section-title">Funnel Visualization — แก้ไขตัวเลขได้ตรง</div>
      <div className="fn-chart">
        {funnel.map((f, i) => {
          const barPct = maxLeads > 0 ? (f.leads / maxLeads * 100) : 0;
          const rate = rates[i];
          const drop = dropOffs[i];
          const isWorst = i === worstIdx && i > 0;
          const col = STAGE_COLORS[i % STAGE_COLORS.length];

          return (
            <div key={i}>
              <div className={`fn-row ${isWorst ? 'fn-row-worst' : ''}`}>
                {/* Stage label */}
                <div className="fn-row-label">
                  <span className="fn-stage-num">{i + 1}</span>
                  <span className="fn-stage-name">{stages[i]?.label ?? `Stage ${i + 1}`}</span>
                </div>

                {/* Bar */}
                <div className="fn-bar-wrap">
                  <div
                    className="fn-bar"
                    style={{ width: `${barPct}%`, background: isWorst ? 'var(--rust)' : col.bar }}
                  />
                </div>

                {/* Leads input */}
                <div className="fn-leads-wrap">
                  <input
                    ref={el => { inputRefs.current[i] = el; }}
                    className="fn-leads-inp"
                    defaultValue={f.leads.toLocaleString()}
                    key={`leads-${i}-${f.leads}`}
                    onBlur={e => saveLeads(i, e.target.value)}
                    onFocus={e => { e.target.value = String(f.leads); }}
                    spellCheck={false}
                  />
                  <span className="fn-leads-unit">leads</span>
                </div>

                {/* Rate badge */}
                <div
                  className="fn-rate"
                  style={{
                    background: i === 0 ? 'var(--cream2)' : isWorst ? 'var(--rust-bg)' : rate >= 50 ? 'var(--green-bg)' : rate >= 30 ? 'var(--amber-bg)' : 'var(--rust-bg)',
                    color: i === 0 ? 'var(--ink3)' : isWorst ? 'var(--rust)' : rate >= 50 ? 'var(--green)' : rate >= 30 ? 'var(--amber)' : 'var(--rust)',
                  }}
                >
                  {i === 0 ? '—' : `${rate.toFixed(1)}%`}
                </div>

                {/* Note */}
                <input
                  className="fn-note-inp"
                  defaultValue={f.note}
                  key={`note-${i}`}
                  onBlur={e => saveNote(i, e.target.value)}
                  placeholder="หมายเหตุ…"
                  spellCheck={false}
                />
              </div>

              {/* Drop-off connector */}
              {i < funnel.length - 1 && (
                <div className="fn-drop">
                  <div className="fn-drop-line" />
                  <div
                    className="fn-drop-label"
                    style={{ color: isWorst ? 'var(--rust)' : 'var(--ink4)' }}
                  >
                    {drop > 0 ? `▼ ${drop.toLocaleString()} ออก (${(100 - rates[i + 1]).toFixed(1)}% drop-off)` : '▼ ไม่มี drop-off'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Opportunity analysis */}
      <div className="fn-section-title" style={{ marginTop: 28 }}>Top 3 โอกาสปรับปรุง — Drop-off สูงสุด</div>
      <div className="fn-opp-grid">
        {top3Drop.map(({ d, i }, rank) => {
          const stageFrom = stages[i];
          const stageTo = stages[i + 1];
          const dropRate = funnel[i].leads > 0 ? (d / funnel[i].leads * 100) : 0;
          return (
            <div key={i} className="fn-opp-card">
              <div className="fn-opp-rank" style={{ background: rank === 0 ? 'var(--rust)' : rank === 1 ? 'var(--amber)' : 'var(--ink3)' }}>
                #{rank + 1}
              </div>
              <div className="fn-opp-stages">
                <span className="fn-opp-from">{stageFrom?.label}</span>
                <span className="fn-opp-arrow">→</span>
                <span className="fn-opp-to">{stageTo?.label}</span>
              </div>
              <div className="fn-opp-metric">
                <span className="fn-opp-drop">{d.toLocaleString()} leads ออก</span>
                <span className="fn-opp-droprate" style={{ color: 'var(--rust)' }}>{dropRate.toFixed(1)}% drop-off</span>
              </div>
              <div className="fn-opp-hint">
                {stageFrom?.opp?.[0] ? `💡 ${stageFrom.opp[0]}` : 'ดู Pain Points และ Opportunities ใน Journey Map'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue impact estimate */}
      <div className="fn-section-title" style={{ marginTop: 28 }}>ผลลัพธ์ถ้าปรับ Bottleneck +10%</div>
      <div className="fn-impact">
        {(() => {
          const worstLeads = funnel[worstIdx]?.leads ?? 0;
          const improved = Math.round(worstLeads * 1.1);
          const diff = improved - worstLeads;
          const finalImproved = totalIn > 0 && funnel[worstIdx]?.leads > 0
            ? Math.round(totalOut * (improved / worstLeads))
            : totalOut;
          const finalDiff = finalImproved - totalOut;
          return (
            <>
              <div className="fn-impact-row">
                <div className="fn-impact-label">Stage "{stages[worstIdx]?.label}" (Bottleneck)</div>
                <div className="fn-impact-val">
                  <span style={{ color: 'var(--ink3)' }}>{worstLeads.toLocaleString()}</span>
                  <span className="fn-impact-arrow">→</span>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>{improved.toLocaleString()}</span>
                  <span className="fn-impact-diff">+{diff.toLocaleString()} leads</span>
                </div>
              </div>
              <div className="fn-impact-row">
                <div className="fn-impact-label">Retention (Stage สุดท้าย)</div>
                <div className="fn-impact-val">
                  <span style={{ color: 'var(--ink3)' }}>{totalOut.toLocaleString()}</span>
                  <span className="fn-impact-arrow">→</span>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>{finalImproved.toLocaleString()}</span>
                  <span className="fn-impact-diff">+{finalDiff.toLocaleString()} ลูกค้า</span>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
