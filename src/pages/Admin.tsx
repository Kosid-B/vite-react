import { useEffect, useState } from 'react';
import { isSupabaseEnabled } from '../lib/supabase';
import { adminListWorkspaces, type AdminWorkspace } from '../lib/workspaces';
import { isAdminEmail, ADMIN_EMAILS } from '../config';
import { PageHeader, Badge } from '../ds';
import type { AppData, WinStory, WinCategory } from '../types';

function thaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}
function baht(n: number): string {
  return '฿' + Math.round(n).toLocaleString('th-TH');
}
function pct(n: number, d: number): string {
  return d === 0 ? '—' : (n / d * 100).toFixed(1) + '%';
}

// ---- Pricing & Cost Reference (mirrors Billing.tsx) ----
const PLAN_LIST = [
  { id: 'growth', name: 'Growth', price: 1490, cost: 1190, apiCalls: 1000 },
  { id: 'scale',  name: 'Scale',  price: 5900, cost: 4650, apiCalls: 5000 },
];

interface Competitor {
  name: string; priceTHB: number; model: string;
  focus: string; position: 'budget' | 'mid' | 'premium'; local: boolean;
}
const COMPETITORS: Competitor[] = [
  { name: 'Make (Core)',        priceTHB:  576, model: '฿576/เดือน',       focus: 'Automation workflows (no-code)',  position: 'budget',  local: false },
  { name: 'Zapier (Teams)',     priceTHB: 1764, model: '฿1,764/เดือน',     focus: 'Automation integrations',        position: 'mid',     local: false },
  { name: 'Monday.com AI',     priceTHB: 1296, model: '฿432/user × 3',    focus: 'Project management + AI',        position: 'mid',     local: false },
  { name: 'Notion AI (Teams)', priceTHB: 1728, model: '฿576/user × 3',    focus: 'Knowledge base + AI writing',    position: 'mid',     local: false },
  { name: 'Custom GPT Teams',  priceTHB: 2700, model: '฿900/user × 3',    focus: 'AI assistant (OpenAI)',          position: 'premium', local: false },
  { name: 'CEO AI Thailand',   priceTHB: 1490, model: '฿1,490/เดือน flat', focus: 'AI Company builder (Thai SME)', position: 'mid',     local: true  },
];

// Price sensitivity for Growth plan
const GROWTH_COST = 1190;
const SENSITIVITY = [999, 1290, 1490, 1790, 1990].map(p => ({
  price: p,
  profit: p - GROWTH_COST,
  marginPct: ((p - GROWTH_COST) / p) * 100,
  subsFor100k: Math.ceil(100000 / p),
  isCurrent: p === 1490,
}));

const RECS = [
  { icon: '✅', title: 'ราคา Growth ฿1,490 อยู่ในจุดหวาน', body: 'Mid-market positioning — ต่ำกว่า Notion AI Teams (฿1,728) และ Custom GPT Teams (฿2,700) แต่สูงกว่า Make (฿576) ที่ไม่มี AI Agent ฝังอยู่ Margin 20.1% ยั่งยืนในระยะเติบโต' },
  { icon: '📅', title: 'เพิ่ม Annual Plan ลด Churn', body: 'Growth Annual ฿14,900/ปี (= ฿1,242/เดือน, ส่วนลด 17%) และ Scale Annual ฿56,400/ปี — เพิ่ม cash flow ล่วงหน้าและลด monthly churn ได้ ~30%' },
  { icon: '➕', title: 'Top-up AI calls Add-on', body: 'Growth plan เพิ่ม Top-up ฿590 ต่อ 500 calls เพิ่มเติม (Margin ~37%) — usage-based revenue ที่ไม่บังคับ upgrade สร้าง NRR สูงขึ้นโดยอัตโนมัติ' },
  { icon: '💰', title: 'Scale ยังราคาต่ำเกินไป', body: 'ลูกค้า Scale (multi-company + 5,000 calls + API) มีมูลค่าสูงมาก Enterprise alternatives เริ่มที่ $200+/month ปรับ Scale เป็น ฿6,500-7,500 พร้อมเพิ่ม SLA 99.9% + dedicated support' },
  { icon: '⚠️', title: 'Van Westendorp Warning Zones', body: 'ราคาใต้ ฿800: ลูกค้า SME ตั้งคำถามเรื่องคุณภาพ / สูงกว่า ฿3,000 สำหรับ Growth: เจอ resistance ในตลาดไทย / จุดหวานที่ได้รับการทดสอบ: ฿1,290–฿1,790' },
];

// ---- Win Story ----
const WIN_CAT_LABEL: Record<WinCategory, string> = {
  revenue: '💰 Revenue',
  retention: '🔁 Retention',
  growth: '📈 Growth',
  transformation: '🔄 Transformation',
  efficiency: '⚡ Efficiency',
};
const WIN_CAT_COLOR: Record<WinCategory, string> = {
  revenue: 'var(--green)',
  retention: 'var(--accent)',
  growth: '#7c6aff',
  transformation: '#f59e0b',
  efficiency: '#06b6d4',
};

const BLANK_STORY: Omit<WinStory, 'id'> = {
  date: new Date().toISOString().slice(0, 10),
  customerName: '',
  category: 'efficiency',
  headlineMetric: '',
  situation: '',
  challenge: '',
  actions: ['', '', ''],
  turningPoint: '',
  metrics: [{ label: '', before: '', after: '', change: '' }],
  timeline: '',
  quote: '',
  lessons: ['', ''],
  whyItMatters: '',
  documentedBy: 'Admin',
};

interface Props {
  currentUserEmail: string | null;
  data: AppData;
  onUpdate: (data: AppData) => void;
}
type Tab = 'finance' | 'workspaces' | 'winstories';

export default function Admin({ currentUserEmail, data, onUpdate }: Props) {
  const admin = isAdminEmail(currentUserEmail);
  const [rows, setRows] = useState<AdminWorkspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('finance');

  // Simulator state
  const [nGrowth, setNGrowth] = useState(15);
  const [nScale, setNScale]   = useState(4);
  const [overhead, setOverhead] = useState(8000);

  // CLV state
  const [churnPct, setChurnPct]   = useState(5);
  const [cacGrowth, setCacGrowth] = useState(2000);
  const [cacScale, setCacScale]   = useState(8000);

  // Win Story state
  const [wsFilter, setWsFilter] = useState<WinCategory | 'all'>('all');
  const [wsView, setWsView]     = useState<WinStory | null>(null);
  const [wsEdit, setWsEdit]     = useState<(Partial<WinStory> & { id?: string }) | null>(null);

  const winStories = data.winStories ?? [];

  function saveStory(story: Omit<WinStory, 'id'> & { id?: string }) {
    const list = [...winStories];
    if (story.id) {
      const idx = list.findIndex(s => s.id === story.id);
      if (idx >= 0) list[idx] = story as WinStory;
    } else {
      list.unshift({ ...story, id: `ws${Date.now()}` } as WinStory);
    }
    onUpdate({ ...data, winStories: list });
    setWsEdit(null);
  }

  function deleteStory(id: string) {
    if (!confirm('ลบ Win Story นี้?')) return;
    onUpdate({ ...data, winStories: winStories.filter(s => s.id !== id) });
    if (wsView?.id === id) setWsView(null);
  }

  useEffect(() => {
    if (!admin || !isSupabaseEnabled) return;
    setLoading(true);
    adminListWorkspaces().then(r => { setRows(r); setLoading(false); });
  }, [admin]);

  if (!admin) {
    return (
      <div>
        <div className="page-header"><div className="page-title">ผู้ดูแลระบบ</div></div>
        <div className="admin-deny">
          🔒 หน้านี้สำหรับผู้ดูแลระบบเท่านั้น<br/>
          บัญชีที่เป็นแอดมิน: <b>{ADMIN_EMAILS.join(', ')}</b><br/>
          {currentUserEmail ? <>คุณกำลังใช้ <b>{currentUserEmail}</b></> : 'กรุณาเข้าสู่ระบบ'}
        </div>
      </div>
    );
  }

  // ---- Finance computations ----
  const gp = PLAN_LIST[0], sp = PLAN_LIST[1];
  const mrrG = nGrowth * gp.price;
  const mrrS = nScale * sp.price;
  const mrr = mrrG + mrrS;
  const arr = mrr * 12;
  const apiCostG = nGrowth * gp.cost;
  const apiCostS = nScale * sp.cost;
  const totalOpCost = apiCostG + apiCostS + overhead;
  const grossProfit = mrr - totalOpCost;
  const grossMargin = mrr > 0 ? (grossProfit / mrr) * 100 : 0;
  const totalSubs = nGrowth + nScale;
  const wMarginPerSub = totalSubs > 0
    ? ((nGrowth * (gp.price - gp.cost)) + (nScale * (sp.price - sp.cost))) / totalSubs
    : (gp.price - gp.cost);
  const breakEven = overhead > 0 && wMarginPerSub > 0 ? Math.ceil(overhead / wMarginPerSub) : 0;

  // ---- CLV computations ----
  const monthlyChurn = churnPct / 100;
  const lifespanMonths = monthlyChurn > 0 ? Math.round(1 / monthlyChurn) : 0;
  const gpProfit = gp.price - gp.cost;
  const spProfit = sp.price - sp.cost;
  const clvGrowth = monthlyChurn > 0 ? Math.round(gpProfit / monthlyChurn) : 0;
  const clvScale  = monthlyChurn > 0 ? Math.round(spProfit / monthlyChurn) : 0;
  const ltvcacGrowth = cacGrowth > 0 ? clvGrowth / cacGrowth : 0;
  const ltvcacScale  = cacScale  > 0 ? clvScale  / cacScale  : 0;
  const paybackGrowth = gpProfit > 0 ? Math.ceil(cacGrowth / gpProfit) : 0;
  const paybackScale  = spProfit > 0 ? Math.ceil(cacScale  / spProfit) : 0;
  const maxCacGrowth = Math.round(clvGrowth / 3);
  const maxCacScale  = Math.round(clvScale  / 3);
  const CHURN_SCENARIOS = [1, 2, 3, 5, 7, 10].map(c => ({
    c,
    lifespan: Math.round(1 / (c / 100)),
    clvG: Math.round(gpProfit / (c / 100)),
    clvS: Math.round(spProfit / (c / 100)),
    isCurrent: c === churnPct,
  }));

  const totalMembers = rows.reduce((s, r) => s + Number(r.member_count), 0);

  return (
    <div>
      <PageHeader
        title="ผู้ดูแลระบบ"
        meta={<>
          <Badge tone="green">แอดมิน · {currentUserEmail}</Badge>
          {isSupabaseEnabled && <Badge tone="neutral">{rows.length} เวิร์กสเปซ</Badge>}
          {isSupabaseEnabled && <Badge tone="neutral">{totalMembers} สมาชิกรวม</Badge>}
        </>}
      />

      {/* Tab bar */}
      <div className="pfa-tabs">
        <button className={`pfa-tab${tab === 'finance' ? ' active' : ''}`} onClick={() => setTab('finance')}>
          📊 วิเคราะห์การเงิน & ราคา
        </button>
        <button className={`pfa-tab${tab === 'winstories' ? ' active' : ''}`} onClick={() => setTab('winstories')}>
          🏆 Win Stories
        </button>
        <button className={`pfa-tab${tab === 'workspaces' ? ' active' : ''}`} onClick={() => setTab('workspaces')}>
          🏢 เวิร์กสเปซ
        </button>
      </div>

      {/* ===== FINANCE TAB ===== */}
      {tab === 'finance' && (
        <div className="pfa-wrap">

          {/* 1. Revenue Simulator */}
          <div className="pfa-section">
            <div className="pfa-section-title">จำลองรายได้ (Revenue Simulator)</div>
            <div className="pfa-sim-layout">
              <div className="pfa-sim-inputs">
                <div className="pfa-sim-row">
                  <label className="pfa-sim-label">Growth subscribers</label>
                  <input type="number" className="pfa-sim-inp" min={0} max={999} value={nGrowth}
                    onChange={e => setNGrowth(Math.max(0, +e.target.value))} />
                  <span className="pfa-sim-unit">ราย × ฿1,490/เดือน</span>
                </div>
                <div className="pfa-sim-row">
                  <label className="pfa-sim-label">Scale subscribers</label>
                  <input type="number" className="pfa-sim-inp" min={0} max={999} value={nScale}
                    onChange={e => setNScale(Math.max(0, +e.target.value))} />
                  <span className="pfa-sim-unit">ราย × ฿5,900/เดือน</span>
                </div>
                <div className="pfa-sim-row">
                  <label className="pfa-sim-label">Fixed overhead/เดือน</label>
                  <input type="number" className="pfa-sim-inp" min={0} step={1000} value={overhead}
                    onChange={e => setOverhead(Math.max(0, +e.target.value))} />
                  <span className="pfa-sim-unit">บาท (เงินเดือน, office, etc.)</span>
                </div>
              </div>
              <div className="pfa-kpi-grid">
                <div className="pfa-kpi"><div className="pfa-kpi-label">MRR</div><div className="pfa-kpi-val">{baht(mrr)}</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-label">ARR</div><div className="pfa-kpi-val">{baht(arr)}</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-label">กำไรขั้นต้น</div><div className="pfa-kpi-val" style={{ color: grossProfit >= 0 ? 'var(--green)' : '#ef4444' }}>{baht(grossProfit)}</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-label">Gross Margin</div><div className="pfa-kpi-val">{grossMargin.toFixed(1)}%</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-label">ต้นทุนรวม/เดือน</div><div className="pfa-kpi-val">{baht(totalOpCost)}</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-label">Break-even (subs)</div><div className="pfa-kpi-val">{breakEven} ราย</div></div>
              </div>
            </div>

            {/* MRR Mix Bar */}
            <div className="pfa-mix-wrap">
              <div className="pfa-mix-label">สัดส่วน MRR: Growth vs Scale</div>
              <div className="pfa-mix-bar">
                {mrr > 0 && <div className="pfa-mix-g" style={{ width: `${(mrrG / mrr) * 100}%` }} />}
                {mrr > 0 && <div className="pfa-mix-s" style={{ width: `${(mrrS / mrr) * 100}%` }} />}
              </div>
              <div className="pfa-mix-legend">
                <span><span className="pfa-dot-g" /> Growth {baht(mrrG)} ({pct(mrrG, mrr)})</span>
                <span><span className="pfa-dot-s" /> Scale {baht(mrrS)} ({pct(mrrS, mrr)})</span>
              </div>
            </div>
          </div>

          {/* 2. Margin by Plan */}
          <div className="pfa-section">
            <div className="pfa-section-title">Margin ต่อ Plan</div>
            <div className="pfa-margin-grid">
              {PLAN_LIST.map(p => {
                const m = ((p.price - p.cost) / p.price) * 100;
                return (
                  <div key={p.id} className="pfa-margin-card">
                    <div className="pfa-margin-name">{p.name}</div>
                    <div className="pfa-margin-row"><span>ราคา</span><b>{baht(p.price)}/เดือน</b></div>
                    <div className="pfa-margin-row"><span>ต้นทุน</span><b>{baht(p.cost)}</b></div>
                    <div className="pfa-margin-row"><span>กำไร/ราย</span><b style={{ color: 'var(--green)' }}>{baht(p.price - p.cost)}</b></div>
                    <div className="pfa-margin-bar-bg">
                      <div className="pfa-margin-bar-fill" style={{ width: `${m}%` }} />
                    </div>
                    <div className="pfa-margin-pct">{m.toFixed(1)}% Margin</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Competitive Benchmark */}
          <div className="pfa-section">
            <div className="pfa-section-title">เปรียบเทียบกับคู่แข่ง (Competitive Benchmark)</div>
            <table className="pfa-comp-table">
              <thead>
                <tr>
                  <th>ผลิตภัณฑ์</th>
                  <th className="pfa-num">ราคา/เดือน</th>
                  <th>โมเดล</th>
                  <th>จุดเน้น</th>
                  <th>Position</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c, i) => (
                  <tr key={i} className={c.local ? 'pfa-comp-us' : ''}>
                    <td>{c.name}{c.local && <span className="pfa-us-badge">เรา</span>}</td>
                    <td className="pfa-num">{baht(c.priceTHB)}</td>
                    <td>{c.model}</td>
                    <td className="pfa-comp-focus">{c.focus}</td>
                    <td><span className={`pfa-pos-badge pfa-pos-${c.position}`}>{c.position}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4. Price Sensitivity */}
          <div className="pfa-section">
            <div className="pfa-section-title">Price Sensitivity What-If — Growth Plan</div>
            <table className="pfa-sens-table">
              <thead>
                <tr>
                  <th>ราคา/เดือน</th>
                  <th className="pfa-num">กำไร/ราย</th>
                  <th className="pfa-num">Margin %</th>
                  <th className="pfa-num">subs ต้องการถึง ฿100K MRR</th>
                </tr>
              </thead>
              <tbody>
                {SENSITIVITY.map(s => (
                  <tr key={s.price} className={s.isCurrent ? 'pfa-sens-cur' : ''}>
                    <td>{baht(s.price)}/เดือน {s.isCurrent && <span className="pfa-cur-badge">ปัจจุบัน</span>}</td>
                    <td className="pfa-num">{baht(s.profit)}</td>
                    <td className="pfa-num">{s.marginPct.toFixed(1)}%</td>
                    <td className="pfa-num">{s.subsFor100k} ราย</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. CLV Analysis */}
          <div className="pfa-section">
            <div className="pfa-section-title">Customer Lifetime Value (CLV) Analysis</div>
            <div className="pfa-sim-layout">
              <div className="pfa-sim-inputs">
                <div className="pfa-sim-row">
                  <label className="pfa-sim-label">Monthly Churn Rate</label>
                  <input type="number" className="pfa-sim-inp" min={0.1} max={50} step={0.5} value={churnPct}
                    onChange={e => setChurnPct(Math.max(0.1, +e.target.value))} />
                  <span className="pfa-sim-unit">% ต่อเดือน → อายุ {lifespanMonths} เดือน</span>
                </div>
                <div className="pfa-sim-row">
                  <label className="pfa-sim-label">CAC Growth plan</label>
                  <input type="number" className="pfa-sim-inp" min={0} step={100} value={cacGrowth}
                    onChange={e => setCacGrowth(Math.max(0, +e.target.value))} />
                  <span className="pfa-sim-unit">บาท ต้นทุนหาลูกค้า 1 ราย</span>
                </div>
                <div className="pfa-sim-row">
                  <label className="pfa-sim-label">CAC Scale plan</label>
                  <input type="number" className="pfa-sim-inp" min={0} step={100} value={cacScale}
                    onChange={e => setCacScale(Math.max(0, +e.target.value))} />
                  <span className="pfa-sim-unit">บาท ต้นทุนหาลูกค้า 1 ราย</span>
                </div>
              </div>

              <div className="clv-plan-grid">
                {[
                  { plan: 'Growth', clv: clvGrowth, cac: cacGrowth, ratio: ltvcacGrowth, payback: paybackGrowth, maxCac: maxCacGrowth },
                  { plan: 'Scale',  clv: clvScale,  cac: cacScale,  ratio: ltvcacScale,  payback: paybackScale,  maxCac: maxCacScale },
                ].map(p => {
                  const zone = p.ratio >= 3 ? 'ok' : p.ratio >= 1 ? 'warn' : 'bad';
                  const needlePct = Math.min(95, (p.ratio / 6) * 100);
                  return (
                    <div key={p.plan} className="clv-card">
                      <div className="clv-plan-name">{p.plan}</div>
                      <div className="clv-row"><span>CLV</span><b>{baht(p.clv)}</b></div>
                      <div className="clv-row"><span>CAC</span><b>{baht(p.cac)}</b></div>
                      <div className="clv-row"><span>LTV:CAC</span><b>{p.ratio.toFixed(2)}x</b></div>
                      <div className="clv-gauge-wrap">
                        <div className="clv-gauge-bar">
                          <div className="clv-gauge-danger" />
                          <div className="clv-gauge-warn" />
                          <div className="clv-gauge-ok" />
                          <div className="clv-gauge-needle" style={{ left: `${needlePct}%` }} />
                        </div>
                        <div className={`clv-gauge-label clv-gauge-${zone}`}>
                          {zone === 'ok' ? '✅ ดีมาก (≥3x)' : zone === 'warn' ? '⚠️ ระวัง (1–3x)' : '🔴 อันตราย (<1x)'}
                        </div>
                      </div>
                      <div className="clv-row"><span>Payback</span><b>{p.payback} เดือน</b></div>
                      <div className="clv-row"><span>Max CAC (3:1)</span><b style={{ color: 'var(--accent)' }}>{baht(p.maxCac)}</b></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Churn Sensitivity */}
            <div className="clv-sens-title" style={{ marginTop: 16 }}>Churn Sensitivity — ผลกระทบต่อ CLV</div>
            <table className="pfa-sens-table">
              <thead>
                <tr>
                  <th>Churn/เดือน</th>
                  <th className="pfa-num">อายุลูกค้า</th>
                  <th className="pfa-num">CLV Growth</th>
                  <th className="pfa-num">CLV Scale</th>
                </tr>
              </thead>
              <tbody>
                {CHURN_SCENARIOS.map(s => (
                  <tr key={s.c} className={s.isCurrent ? 'pfa-sens-cur' : ''}>
                    <td>{s.c}% {s.isCurrent && <span className="pfa-cur-badge">ปัจจุบัน</span>}</td>
                    <td className="pfa-num">{s.lifespan} เดือน</td>
                    <td className="pfa-num">{baht(s.clvG)}</td>
                    <td className="pfa-num">{baht(s.clvS)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="clv-insight">
              💡 <b>Key Insight:</b> ลด Churn จาก 5% → 3% เพิ่ม CLV Growth จาก{' '}
              {baht(Math.round(gpProfit / 0.05))} → {baht(Math.round(gpProfit / 0.03))}{' '}
              (+{Math.round(((gpProfit / 0.03 - gpProfit / 0.05) / (gpProfit / 0.05)) * 100)}%) —
              Churn คือ lever ที่มีผลต่อ CLV มากที่สุดใน SaaS subscription model
            </div>
          </div>

          {/* 6. Recommendations */}
          <div className="pfa-section">
            <div className="pfa-section-title">คำแนะนำเชิงกลยุทธ์ด้านราคา</div>
            <div className="pfa-recs">
              {RECS.map((r, i) => (
                <div key={i} className="pfa-rec">
                  <div className="pfa-rec-icon">{r.icon}</div>
                  <div>
                    <div className="pfa-rec-title">{r.title}</div>
                    <div className="pfa-rec-body">{r.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== WIN STORIES TAB ===== */}
      {tab === 'winstories' && (
        <div className="ws-wrap">
          {/* Header */}
          <div className="ws-header">
            <div className="ws-filter-bar">
              {(['all', 'revenue', 'retention', 'growth', 'transformation', 'efficiency'] as const).map(cat => (
                <button key={cat} className={`ws-filter-btn${wsFilter === cat ? ' active' : ''}`}
                  onClick={() => setWsFilter(cat)}>
                  {cat === 'all' ? '🗂 ทั้งหมด' : WIN_CAT_LABEL[cat]}
                </button>
              ))}
            </div>
            <button className="ws-add-btn" onClick={() => { setWsView(null); setWsEdit({ ...BLANK_STORY }); }}>
              + เพิ่ม Win Story
            </button>
          </div>

          {/* Story cards */}
          {!wsEdit && !wsView && (
            <div className="ws-cards">
              {winStories.filter(s => wsFilter === 'all' || s.category === wsFilter).length === 0 && (
                <div className="ws-empty">ยังไม่มี Win Story ในหมวดนี้</div>
              )}
              {winStories.filter(s => wsFilter === 'all' || s.category === wsFilter).map(story => (
                <div key={story.id} className="ws-card">
                  <div className="ws-card-top">
                    <span className="ws-cat-badge" style={{ background: WIN_CAT_COLOR[story.category] }}>
                      {WIN_CAT_LABEL[story.category]}
                    </span>
                    <span className="ws-card-date">{story.date}</span>
                  </div>
                  <div className="ws-card-name">{story.customerName}</div>
                  <div className="ws-card-metric">{story.headlineMetric}</div>
                  <div className="ws-card-quote">"{story.quote.slice(0, 100)}{story.quote.length > 100 ? '…' : ''}"</div>
                  <div className="ws-card-actions">
                    <button className="ws-btn-view" onClick={() => { setWsEdit(null); setWsView(story); }}>ดูรายละเอียด</button>
                    <button className="ws-btn-edit" onClick={() => { setWsView(null); setWsEdit({ ...story }); }}>แก้ไข</button>
                    <button className="ws-btn-del" onClick={() => deleteStory(story.id)}>ลบ</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Story detail view */}
          {wsView && !wsEdit && (
            <div className="ws-detail">
              <div className="ws-detail-header">
                <div>
                  <span className="ws-cat-badge" style={{ background: WIN_CAT_COLOR[wsView.category] }}>{WIN_CAT_LABEL[wsView.category]}</span>
                  <span className="ws-detail-date">{wsView.date} · บันทึกโดย {wsView.documentedBy}</span>
                </div>
                <div className="ws-detail-btns">
                  <button className="ws-btn-edit" onClick={() => setWsEdit({ ...wsView })}>แก้ไข</button>
                  <button className="ws-btn-del" onClick={() => deleteStory(wsView.id)}>ลบ</button>
                  <button className="ws-btn-view" onClick={() => setWsView(null)}>← กลับ</button>
                </div>
              </div>

              <h2 className="ws-detail-name">🏆 {wsView.customerName}</h2>
              <div className="ws-detail-headline">{wsView.headlineMetric}</div>

              <div className="ws-story-grid">
                <div className="ws-story-section"><div className="ws-story-label">สถานการณ์</div><p>{wsView.situation}</p></div>
                <div className="ws-story-section"><div className="ws-story-label">ความท้าทาย</div><p>{wsView.challenge}</p></div>
                <div className="ws-story-section">
                  <div className="ws-story-label">สิ่งที่เราทำ</div>
                  <ul>{wsView.actions.filter(Boolean).map((a, i) => <li key={i}>{a}</li>)}</ul>
                </div>
                <div className="ws-story-section"><div className="ws-story-label">จุดเปลี่ยน</div><p>{wsView.turningPoint}</p></div>
              </div>

              <div className="ws-story-label" style={{ marginTop: 16 }}>ผลลัพธ์</div>
              <table className="ws-metrics-table">
                <thead><tr><th>ตัวชี้วัด</th><th>ก่อน</th><th>หลัง</th><th>เปลี่ยนแปลง</th></tr></thead>
                <tbody>
                  {wsView.metrics.filter(m => m.label).map((m, i) => (
                    <tr key={i}><td>{m.label}</td><td>{m.before}</td><td>{m.after}</td><td className="ws-change">{m.change}</td></tr>
                  ))}
                </tbody>
              </table>

              <div className="ws-story-section" style={{ marginTop: 16 }}>
                <div className="ws-story-label">Timeline</div>
                <p>{wsView.timeline}</p>
              </div>

              <div className="ws-quote-block">"{wsView.quote}"</div>

              <div className="ws-story-section">
                <div className="ws-story-label">บทเรียน</div>
                <ul>{wsView.lessons.filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>
              </div>
              <div className="ws-story-section">
                <div className="ws-story-label">ทำไมถึงสำคัญ</div>
                <p>{wsView.whyItMatters}</p>
              </div>
            </div>
          )}

          {/* Add/Edit form */}
          {wsEdit && (
            <div className="ws-form">
              <div className="ws-form-title">{wsEdit.id ? 'แก้ไข Win Story' : 'เพิ่ม Win Story ใหม่'}</div>
              <div className="ws-form-grid">
                <div className="ws-form-row">
                  <label>ชื่อลูกค้า</label>
                  <input className="ws-inp" value={wsEdit.customerName ?? ''} onChange={e => setWsEdit(p => ({ ...p!, customerName: e.target.value }))} />
                </div>
                <div className="ws-form-row">
                  <label>วันที่</label>
                  <input type="date" className="ws-inp" value={wsEdit.date ?? ''} onChange={e => setWsEdit(p => ({ ...p!, date: e.target.value }))} />
                </div>
                <div className="ws-form-row">
                  <label>หมวดหมู่</label>
                  <select className="ws-inp" value={wsEdit.category ?? 'efficiency'} onChange={e => setWsEdit(p => ({ ...p!, category: e.target.value as WinCategory }))}>
                    {(Object.keys(WIN_CAT_LABEL) as WinCategory[]).map(cat => (
                      <option key={cat} value={cat}>{WIN_CAT_LABEL[cat]}</option>
                    ))}
                  </select>
                </div>
                <div className="ws-form-row">
                  <label>Headline Metric</label>
                  <input className="ws-inp" placeholder="เช่น ประหยัดเวลา 28 ชม./สัปดาห์" value={wsEdit.headlineMetric ?? ''} onChange={e => setWsEdit(p => ({ ...p!, headlineMetric: e.target.value }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>สถานการณ์ก่อน</label>
                  <textarea className="ws-ta" rows={2} value={wsEdit.situation ?? ''} onChange={e => setWsEdit(p => ({ ...p!, situation: e.target.value }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>ความท้าทาย</label>
                  <textarea className="ws-ta" rows={2} value={wsEdit.challenge ?? ''} onChange={e => setWsEdit(p => ({ ...p!, challenge: e.target.value }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>สิ่งที่เราทำ (แต่ละบรรทัดคือ 1 bullet)</label>
                  <textarea className="ws-ta" rows={3} value={(wsEdit.actions ?? []).join('\n')} onChange={e => setWsEdit(p => ({ ...p!, actions: e.target.value.split('\n') }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>จุดเปลี่ยน</label>
                  <textarea className="ws-ta" rows={2} value={wsEdit.turningPoint ?? ''} onChange={e => setWsEdit(p => ({ ...p!, turningPoint: e.target.value }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>Timeline</label>
                  <input className="ws-inp" placeholder="เช่น ม.ค. 2025 → ทดลอง → ก.พ. ผลลัพธ์" value={wsEdit.timeline ?? ''} onChange={e => setWsEdit(p => ({ ...p!, timeline: e.target.value }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>คำพูดลูกค้า (Quote)</label>
                  <textarea className="ws-ta" rows={2} value={wsEdit.quote ?? ''} onChange={e => setWsEdit(p => ({ ...p!, quote: e.target.value }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>บทเรียน (แต่ละบรรทัดคือ 1 bullet)</label>
                  <textarea className="ws-ta" rows={3} value={(wsEdit.lessons ?? []).join('\n')} onChange={e => setWsEdit(p => ({ ...p!, lessons: e.target.value.split('\n') }))} />
                </div>
                <div className="ws-form-row ws-form-full">
                  <label>ทำไมถึงสำคัญ (internal note)</label>
                  <textarea className="ws-ta" rows={2} value={wsEdit.whyItMatters ?? ''} onChange={e => setWsEdit(p => ({ ...p!, whyItMatters: e.target.value }))} />
                </div>
                <div className="ws-form-row">
                  <label>บันทึกโดย</label>
                  <input className="ws-inp" value={wsEdit.documentedBy ?? ''} onChange={e => setWsEdit(p => ({ ...p!, documentedBy: e.target.value }))} />
                </div>
              </div>

              <div className="ws-form-metrics-title">ผลลัพธ์ก่อน/หลัง</div>
              {(wsEdit.metrics ?? []).map((m, i) => (
                <div key={i} className="ws-metric-row">
                  <input className="ws-inp ws-inp-sm" placeholder="ตัวชี้วัด" value={m.label} onChange={e => { const ms = [...(wsEdit.metrics ?? [])]; ms[i] = { ...ms[i], label: e.target.value }; setWsEdit(p => ({ ...p!, metrics: ms })); }} />
                  <input className="ws-inp ws-inp-sm" placeholder="ก่อน" value={m.before} onChange={e => { const ms = [...(wsEdit.metrics ?? [])]; ms[i] = { ...ms[i], before: e.target.value }; setWsEdit(p => ({ ...p!, metrics: ms })); }} />
                  <input className="ws-inp ws-inp-sm" placeholder="หลัง" value={m.after} onChange={e => { const ms = [...(wsEdit.metrics ?? [])]; ms[i] = { ...ms[i], after: e.target.value }; setWsEdit(p => ({ ...p!, metrics: ms })); }} />
                  <input className="ws-inp ws-inp-sm" placeholder="เปลี่ยน" value={m.change} onChange={e => { const ms = [...(wsEdit.metrics ?? [])]; ms[i] = { ...ms[i], change: e.target.value }; setWsEdit(p => ({ ...p!, metrics: ms })); }} />
                  <button className="ws-btn-del" onClick={() => setWsEdit(p => ({ ...p!, metrics: (p!.metrics ?? []).filter((_, j) => j !== i) }))}>×</button>
                </div>
              ))}
              <button className="ws-btn-add-row" onClick={() => setWsEdit(p => ({ ...p!, metrics: [...(p!.metrics ?? []), { label: '', before: '', after: '', change: '' }] }))}>+ เพิ่มตัวชี้วัด</button>

              <div className="ws-form-footer">
                <button className="ws-btn-save" onClick={() => saveStory(wsEdit as Omit<WinStory, 'id'> & { id?: string })}>บันทึก</button>
                <button className="ws-btn-cancel" onClick={() => setWsEdit(null)}>ยกเลิก</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== WORKSPACES TAB ===== */}
      {tab === 'workspaces' && (
        <div>
          {!isSupabaseEnabled ? (
            <div className="team-notice">
              ต้องเปิดใช้ Supabase ก่อน (ตั้งค่า env + รัน migration <code>0005_admin.sql</code>)
            </div>
          ) : (
            <>
              <div className="admin-note">
                ในฐานะผู้ดูแลระบบ คุณเห็นทุกเวิร์กสเปซในระบบ (ผ่าน Row Level Security ที่ให้สิทธิ์แอดมิน) —
                ใช้ดูภาพรวมลูกค้าทั้งหมดของ CEO AI Thailand
              </div>
              <div className="team-list">
                <div className="admin-row admin-head">
                  <div>บริษัท / เวิร์กสเปซ</div>
                  <div>เจ้าของ</div>
                  <div className="admin-c-num">สมาชิก</div>
                  <div className="admin-c-date">สร้างเมื่อ</div>
                </div>
                {loading && <div className="team-empty">กำลังโหลด…</div>}
                {!loading && rows.length === 0 && <div className="team-empty">ยังไม่มีเวิร์กสเปซในระบบ</div>}
                {rows.map(r => (
                  <div key={r.id} className="admin-row">
                    <div className="admin-ws-name">{r.name}</div>
                    <div className="admin-ws-owner">{r.owner_email}</div>
                    <div className="admin-c-num">{Number(r.member_count)}</div>
                    <div className="admin-c-date">{thaiDate(r.created_at)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
