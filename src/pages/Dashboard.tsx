import type { AppData, PageId } from '../types';

interface Props {
  data: AppData;
  onNavigate: (page: PageId) => void;
}

export default function Dashboard({ data, onNavigate }: Props) {
  const { stages, actions, funnel, contentPlan } = data;

  const doneActions = actions.filter(a => a.done).length;
  const actionPct = actions.length > 0 ? Math.round((doneActions / actions.length) * 100) : 0;
  const pendingP1 = actions.filter(a => !a.done && a.priority === 1).length;

  const totalPain = stages.reduce((s, st) => s + st.pain.length, 0);
  const totalOpp = stages.reduce((s, st) => s + st.opp.length, 0);

  const firstLeads = funnel[0]?.leads ?? 1;
  const lastLeads = funnel[funnel.length - 1]?.leads ?? 0;
  const overallConv = ((lastLeads / Math.max(firstLeads, 1)) * 100).toFixed(2);

  let worstDrop = 0, worstIdx = 0;
  funnel.forEach((f, i) => {
    if (i >= funnel.length - 1) return;
    const d = 1 - ((funnel[i + 1]?.leads ?? 0) / Math.max(f.leads, 1));
    if (d > worstDrop) { worstDrop = d; worstIdx = i; }
  });

  const byPriority = [1, 2, 3].map(p => {
    const list = actions.filter(a => a.priority === p);
    return { p, total: list.length, done: list.filter(a => a.done).length };
  });
  const pColors = ['#c44b2b', '#a05c1a', '#4a453e'];
  const pBgs = ['#fdf3f0', '#fdf6ec', '#f5f0e8'];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-meta">
          <span className="meta-chip">ภาพรวมทั้งหมด</span>
          <span className="meta-chip">{stages.length} Stages</span>
          <span className="meta-chip">{data.personas.length} Personas</span>
          <span className="meta-chip">{contentPlan.length} เดือน Content</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="db-cards">
        <div className="db-card">
          <div className="db-card-label">Overall Conversion</div>
          <div className="db-card-value">{overallConv}%</div>
          <div className="db-card-sub">{firstLeads.toLocaleString()} → {lastLeads} leads/เดือน</div>
        </div>
        <div className="db-card">
          <div className="db-card-label">Actions Completed</div>
          <div className="db-card-value">{actionPct}%</div>
          <div className="db-card-sub">{doneActions} / {actions.length} รายการ</div>
        </div>
        <div className="db-card">
          <div className="db-card-label">Pain Points ทั้งหมด</div>
          <div className="db-card-value" style={{ color: '#c44b2b' }}>{totalPain}</div>
          <div className="db-card-sub">ใน {stages.length} stages</div>
        </div>
        <div className="db-card">
          <div className="db-card-label">Opportunities</div>
          <div className="db-card-value" style={{ color: '#2d6a4f' }}>{totalOpp}</div>
          <div className="db-card-sub">รอดำเนินการ</div>
        </div>
        <div className="db-card db-card-warn">
          <div className="db-card-label">Bottleneck Stage</div>
          <div className="db-card-value db-card-sm">{stages[worstIdx]?.label}</div>
          <div className="db-card-sub">Drop {Math.round(worstDrop * 100)}% ที่ขั้นนี้</div>
        </div>
        <div className="db-card">
          <div className="db-card-label">P1 Actions Pending</div>
          <div className="db-card-value" style={{ color: pendingP1 > 0 ? '#c44b2b' : '#2d6a4f' }}>{pendingP1}</div>
          <div className="db-card-sub">สำคัญที่สุด — ยังไม่เสร็จ</div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="db-row2">
        <div className="db-panel">
          <div className="db-panel-hd">Conversion Funnel — ภาพรวม</div>
          <div className="db-funnel">
            {funnel.map((f, i) => {
              const pct = (f.leads / Math.max(firstLeads, 1)) * 100;
              const isWorst = i === worstIdx;
              return (
                <div key={f.stageId} className={`db-f-row${isWorst ? ' db-f-worst' : ''}`}>
                  <div className="db-f-name">{stages[i]?.label ?? `S${i + 1}`}</div>
                  <div className="db-f-bar-wrap">
                    <div className="db-f-bar" style={{ width: `${pct}%`, background: isWorst ? '#c44b2b' : '#1a4f8a' }} />
                  </div>
                  <div className="db-f-val">{f.leads.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
          <button className="db-link" onClick={() => onNavigate('funnel')}>ดู Funnel Analysis →</button>
        </div>

        <div className="db-panel">
          <div className="db-panel-hd">Priority Actions — สถานะ</div>
          <div className="db-action-list">
            {byPriority.map(row => {
              const pct = row.total > 0 ? (row.done / row.total) * 100 : 0;
              const c = pColors[row.p - 1];
              const bg = pBgs[row.p - 1];
              return (
                <div key={row.p} className="db-a-row" style={{ borderLeft: `3px solid ${c}`, background: bg }}>
                  <div className="db-a-label" style={{ color: c }}>Priority {row.p}</div>
                  <div className="db-a-bar-wrap">
                    <div className="db-a-bar" style={{ width: `${pct}%`, background: c }} />
                  </div>
                  <div className="db-a-count">{row.done}<span>/{row.total}</span></div>
                </div>
              );
            })}
            <div style={{ marginTop: 14 }}>
              <div className="db-a-pending-title">Priority 1 ที่ยังค้าง</div>
              {actions.filter(a => !a.done && a.priority === 1).slice(0, 3).map((a, i) => (
                <div key={i} className="db-a-pending-item">
                  <span className="db-a-pending-dot" />{a.title}
                </div>
              ))}
            </div>
          </div>
          <button className="db-link" onClick={() => onNavigate('actions')}>ดู Priority Actions →</button>
        </div>
      </div>

      {/* Journey Health Matrix */}
      <div className="db-panel" style={{ marginTop: 14 }}>
        <div className="db-panel-hd">Journey Health Matrix — จำนวนรายการต่อ Stage</div>
        <div className="db-matrix">
          <div className="db-mx-head">
            <div className="db-mx-stage-col">Stage</div>
            {['Touchpoints', 'Actions', 'Pain Points', 'Opportunities'].map(h => (
              <div key={h} className="db-mx-col-h">{h}</div>
            ))}
          </div>
          {stages.map((s, i) => {
            const counts = [s.touch.length, s.action.length, s.pain.length, s.opp.length];
            const cols = ['#1a4f8a', '#1c1814', '#c44b2b', '#2d6a4f'];
            return (
              <div key={s.id} className="db-mx-row">
                <div className="db-mx-stage"><span className="db-mx-num">{i + 1}</span>{s.label}</div>
                {counts.map((count, ci) => (
                  <div key={ci} className={`db-mx-cell${ci === 2 && count >= 3 ? ' db-mx-warn' : ''}${count === 0 ? ' db-mx-empty' : ''}`}>
                    {count > 0
                      ? <span className="db-mx-count" style={{ color: cols[ci] }}>{count}</span>
                      : <span className="db-mx-dash">—</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 4 */}
      <div className="db-row2" style={{ marginTop: 14 }}>
        <div className="db-panel db-panel-cta">
          <div className="db-panel-hd">ROI / Impact Calculator</div>
          <div className="db-cta-desc">คำนวณว่าการแก้ปัญหา Stage ไหนให้ ROI สูงสุด — เชื่อมกับ Conversion Funnel อัตโนมัติ</div>
          <div className="db-cta-stats">
            <div className="db-cta-stat">
              <div className="db-cta-stat-val">{Math.round(worstDrop * 100)}%</div>
              <div className="db-cta-stat-lbl">Drop-off ที่ Bottleneck</div>
            </div>
            <div className="db-cta-stat">
              <div className="db-cta-stat-val">{lastLeads}</div>
              <div className="db-cta-stat-lbl">Closed leads/เดือน</div>
            </div>
            <div className="db-cta-stat">
              <div className="db-cta-stat-val">{totalOpp}</div>
              <div className="db-cta-stat-lbl">โอกาสรอดำเนินการ</div>
            </div>
          </div>
          <button className="db-cta-btn" onClick={() => onNavigate('roi')}>คำนวณ ROI →</button>
        </div>

        <div className="db-panel">
          <div className="db-panel-hd">Content Plan — สรุป</div>
          {contentPlan.map((month, mi) => (
            <div key={mi} className="db-cp-month">
              <div className="db-cp-label">{month.label}</div>
              <div className="db-cp-goal">{month.goal.slice(0, 90)}{month.goal.length > 90 ? '…' : ''}</div>
              <div className="db-cp-cols">
                {month.cols.map((col, ci) => (
                  <div key={ci} className="db-cp-chip" style={{ borderColor: col.color, color: col.color }}>
                    {col.items.length} รายการ
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button className="db-link" onClick={() => onNavigate('content')}>ดู Content Plan →</button>
        </div>
      </div>
    </div>
  );
}
