import { useEffect, useState } from 'react';
import { isSupabaseEnabled } from '../lib/supabase';
import { adminListWorkspaces, type AdminWorkspace } from '../lib/workspaces';
import { isAdminEmail, ADMIN_EMAILS } from '../config';
import { PageHeader, Badge } from '../ds';

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

interface Props { currentUserEmail: string | null; }
type Tab = 'finance' | 'workspaces';

export default function Admin({ currentUserEmail }: Props) {
  const admin = isAdminEmail(currentUserEmail);
  const [rows, setRows] = useState<AdminWorkspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('finance');

  // Simulator state
  const [nGrowth, setNGrowth] = useState(15);
  const [nScale, setNScale]   = useState(4);
  const [overhead, setOverhead] = useState(8000);

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
  // weighted margin per sub for break-even
  const wMarginPerSub = totalSubs > 0
    ? ((nGrowth * (gp.price - gp.cost)) + (nScale * (sp.price - sp.cost))) / totalSubs
    : (gp.price - gp.cost);
  const breakEven = overhead > 0 && wMarginPerSub > 0 ? Math.ceil(overhead / wMarginPerSub) : 0;

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
                <div className="pfa-kpi"><div className="pfa-kpi-lbl">MRR</div><div className="pfa-kpi-val">{baht(mrr)}</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-lbl">ARR (คาดการณ์)</div><div className="pfa-kpi-val">{baht(arr)}</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-lbl">กำไรขั้นต้น/เดือน</div><div className={`pfa-kpi-val${grossProfit < 0 ? ' pfa-neg' : ''}`}>{baht(grossProfit)}</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-lbl">Gross Margin</div><div className={`pfa-kpi-val${grossMargin < 15 ? ' pfa-neg' : grossMargin > 25 ? ' pfa-green' : ''}`}>{grossMargin.toFixed(1)}%</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-lbl">Subscribers รวม</div><div className="pfa-kpi-val">{totalSubs} ราย</div></div>
                <div className="pfa-kpi"><div className="pfa-kpi-lbl">Break-even (Overhead)</div><div className="pfa-kpi-val">{breakEven > 0 ? `${breakEven} ราย` : '—'}</div></div>
              </div>
            </div>

            {/* MRR mix bar */}
            {mrr > 0 && (
              <div className="pfa-mix-wrap">
                <div className="pfa-mix-label">MRR Mix: Growth {baht(mrrG)} | Scale {baht(mrrS)}</div>
                <div className="pfa-mix-track">
                  <div className="pfa-mix-growth" style={{ width: pct(mrrG, mrr) }} title={`Growth ${pct(mrrG, mrr)}`} />
                  <div className="pfa-mix-scale" style={{ width: pct(mrrS, mrr) }} title={`Scale ${pct(mrrS, mrr)}`} />
                </div>
                <div className="pfa-mix-legend">
                  <span><i className="pfa-dot growth" />Growth {pct(mrrG, mrr)}</span>
                  <span><i className="pfa-dot scale" />Scale {pct(mrrS, mrr)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Margin per Plan */}
          <div className="pfa-section">
            <div className="pfa-section-title">กำไรต่อแพ็ก (Margin by Plan)</div>
            <div className="pfa-margin-grid">
              {PLAN_LIST.map(plan => {
                const profit = plan.price - plan.cost;
                const marginPct = (profit / plan.price) * 100;
                const subsForOverhead = overhead > 0 && profit > 0 ? Math.ceil(overhead / profit) : 0;
                return (
                  <div key={plan.id} className="pfa-margin-card">
                    <div className="pfa-margin-name">แพ็ก {plan.name}</div>
                    <div className="pfa-margin-row"><span>ราคาขาย (รวม VAT)</span><b className="pfa-val-hi">{baht(plan.price)}/เดือน</b></div>
                    <div className="pfa-margin-row"><span>ต้นทุน/subscriber</span><span>{baht(plan.cost)}</span></div>
                    <div className="pfa-margin-row"><span>กำไรขั้นต้น/subscriber</span><b className="pfa-val-green">{baht(profit)}</b></div>
                    <div className="pfa-margin-row"><span>AI calls</span><span>{plan.apiCalls.toLocaleString()} ครั้ง/เดือน</span></div>
                    <div className="pfa-margin-bar-wrap">
                      <div className="pfa-margin-track">
                        <div className="pfa-margin-fill" style={{ width: `${marginPct * 3}%` }} />
                      </div>
                      <span className="pfa-margin-pct-lbl">Margin {marginPct.toFixed(1)}%</span>
                    </div>
                    {subsForOverhead > 0 && (
                      <div className="pfa-margin-note">
                        ต้องการ {subsForOverhead} ราย เพื่อคุ้มทุน overhead {baht(overhead)}/เดือน
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Competitive Benchmark */}
          <div className="pfa-section">
            <div className="pfa-section-title">เปรียบเทียบคู่แข่ง — SME Tool Stack ฿/เดือน (ทีม 3 คน)</div>
            <div className="pfa-comp-note">
              CEO AI Thailand Growth (฿1,490 flat) อยู่ระดับ mid-market และเป็นเพียงเครื่องมือเดียวที่
              ออกแบบมาสำหรับ SME ไทยโดยเฉพาะ (PromptPay · VAT · LINE · ภาษาไทย · AI Company builder)
            </div>
            <div className="pfa-comp-table">
              <div className="pfa-comp-head">
                <div>เครื่องมือ</div>
                <div className="pfa-comp-price-col">ราคา/เดือน</div>
                <div className="pfa-comp-model-col">Model</div>
                <div className="pfa-comp-focus-col">จุดเน้น</div>
                <div>ตำแหน่ง</div>
              </div>
              {COMPETITORS.map((c, i) => (
                <div key={i} className={`pfa-comp-row${c.local ? ' pfa-local-row' : ''}`}>
                  <div className="pfa-comp-name">
                    {c.name}
                    {c.local && <span className="pfa-local-badge">เรา</span>}
                  </div>
                  <div className="pfa-comp-price-col"><b>{baht(c.priceTHB)}</b></div>
                  <div className="pfa-comp-model-col pfa-dim">{c.model}</div>
                  <div className="pfa-comp-focus-col pfa-dim">{c.focus}</div>
                  <div>
                    <span className={`pfa-pos pfa-pos-${c.position}`}>
                      {c.position === 'budget' ? 'Budget' : c.position === 'mid' ? 'Mid-market' : 'Premium'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Price Sensitivity — Growth */}
          <div className="pfa-section">
            <div className="pfa-section-title">ความไวต่อราคา — Growth Plan (What-If Analysis)</div>
            <div className="pfa-sens-table">
              <div className="pfa-sens-head">
                <div>ราคา Growth</div>
                <div>กำไร/ราย</div>
                <div>Margin %</div>
                <div>Subs สู่ ฿100k MRR</div>
                <div>คะแนน</div>
              </div>
              {SENSITIVITY.map(sc => (
                <div key={sc.price} className={`pfa-sens-row${sc.isCurrent ? ' pfa-current' : ''}`}>
                  <div className="pfa-sens-price">
                    {baht(sc.price)}
                    {sc.isCurrent && <span className="pfa-curr-badge">ปัจจุบัน</span>}
                  </div>
                  <div className={sc.profit < 0 ? 'pfa-neg' : ''}>{baht(sc.profit)}</div>
                  <div className={sc.marginPct < 15 ? 'pfa-neg' : sc.marginPct > 25 ? 'pfa-green' : ''}>
                    {sc.marginPct.toFixed(1)}%
                  </div>
                  <div>{sc.subsFor100k} ราย</div>
                  <div className="pfa-sens-verdict">
                    {sc.profit < 0 ? '🔴 ขาดทุน' :
                     sc.marginPct < 15 ? '🟡 Margin ต่ำ' :
                     sc.isCurrent ? '🟢 สมดุล' :
                     sc.price < 1490 ? '🔵 Volume play' : '💛 Premium tier'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Recommendations */}
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
