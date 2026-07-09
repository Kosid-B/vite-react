import { lazy, Suspense, useEffect, useState } from 'react';

const SalesforceTab = lazy(() => import('./AdminTabs/SalesforceTab'));
const SkillMarketTab = lazy(() => import('./AdminTabs/SkillMarketTab'));
const AuctionTab = lazy(() => import('./AdminTabs/AuctionTab'));
const ShopAppsTab = lazy(() => import('./AdminTabs/ShopAppsTab'));
const CXPersonaTab  = lazy(() => import('./AdminTabs/CXPersonaTab'));
const GTMTab        = lazy(() => import('./AdminTabs/GTMTab'));
const SEOTab        = lazy(() => import('./AdminTabs/SEOTab'));
const CaseStudyTab  = lazy(() => import('./AdminTabs/CaseStudyTab'));
import { isSupabaseEnabled } from '../lib/supabase';
import { adminListWorkspaces, wsLoad, wsSave, type AdminWorkspace } from '../lib/workspaces';
import { workspaceOps, opsTotals, opsCsv, opsTsv, fmtBaht, type OpsRow } from '../lib/adminOps';
import { aggregateExperiments, retentionCohorts, expReportCsv, expReportTsv, type ExperimentsAggregate, type RetentionReport } from '../lib/experiments';
import { isAdminEmail, ADMIN_EMAILS, PAYMENT } from '../config';
import { applyRefund } from '../../supabase/functions/_shared/refund.ts';
import type { SubState } from '../../supabase/functions/_shared/subscription.ts';
import { PageHeader, Badge } from '../ds';
import type { AppData, WinStory, WinCategory, FeedbackEntry, FeedbackSource, FeedbackSentiment, FeedbackTheme } from '../types';

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

const FB_SOURCES: { id: FeedbackSource; label: string }[] = [
  { id: 'survey',  label: '📋 Survey'  },
  { id: 'review',  label: '⭐ Review'  },
  { id: 'support', label: '🎫 Support' },
  { id: 'social',  label: '📱 Social'  },
  { id: 'email',   label: '📧 Email'   },
];

type FBAction = 'fix_now' | 'plan' | 'monitor' | 'celebrate';
const FB_ACTION: Record<FBAction, { emoji: string; label: string; cls: string; desc: (name: string, n: number) => string }> = {
  fix_now:   { emoji: '🔥', label: 'Fix Now',   cls: 'fb-act-fix',       desc: (name, n) => `แก้ไข "${name}" โดยด่วน — มี ${n} รายการ feedback เชิงลบ` },
  plan:      { emoji: '📅', label: 'Plan Q3',   cls: 'fb-act-plan',      desc: (name, _) => `วางแผนปรับปรุง "${name}" ใน Quarter ถัดไป` },
  monitor:   { emoji: '👁', label: 'Monitor',   cls: 'fb-act-monitor',   desc: (name, _) => `ติดตาม "${name}" ต่อไป — ยังไม่ถึง threshold เร่งด่วน` },
  celebrate: { emoji: '🎉', label: 'Celebrate', cls: 'fb-act-celebrate', desc: (name, _) => `"${name}" คือจุดแข็ง — นำไปใช้ใน marketing และ testimonials` },
};

const BLANK_FB = {
  date: '',
  source: 'survey' as FeedbackSource,
  sentiment: 'positive' as FeedbackSentiment,
  theme: '',
  content: '',
  rating: '',
};
type FbFormState = typeof BLANK_FB;

interface Props {
  currentUserEmail: string | null;
  data: AppData;
  onUpdate: (data: AppData) => void;
}
type Tab = 'dashboard' | 'finance' | 'workspaces' | 'winstories' | 'casestudies' | 'feedback' | 'pricing' | 'skills' | 'auction' | 'shopapps' | 'salesforce' | 'cxpersona' | 'seo' | 'forecast' | 'proposal' | 'gtm' | 'activate';

export default function Admin({ currentUserEmail, data, onUpdate }: Props) {
  const admin = isAdminEmail(currentUserEmail);
  const [rows, setRows] = useState<AdminWorkspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');

  // สรุปผลการดำเนินงานของ User (โหลด AppData ทุก workspace แล้วรวมตัวเลข)
  const [opsRows, setOpsRows] = useState<OpsRow[]>([]);
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsMsg, setOpsMsg] = useState<string | null>(null);
  const [expAgg, setExpAgg] = useState<ExperimentsAggregate | null>(null);
  const [retention, setRetention] = useState<RetentionReport | null>(null);

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

  // Pricing Strategy state
  const [valTeamSize, setValTeamSize]     = useState(5);
  const [valHourlyRate, setValHourlyRate] = useState(800);
  const [valMonthlyRev, setValMonthlyRev] = useState(500000);
  const [simNewPrice, setSimNewPrice]     = useState(1690);
  const [simRetention, setSimRetention]   = useState(85);

  // Financial Forecasting state
  const [fcastGrowthRate, setFcastGrowthRate] = useState(5);   // % new subs added per month
  const [fcastChurnOverride, setFcastChurnOverride] = useState<number | null>(null);

  // Grant/Loan Proposal state
  const [proposalBank, setProposalBank]         = useState<'sme'|'exim'|'bot'|'kasikorn'>('sme');
  const [proposalLoanAmt, setProposalLoanAmt]   = useState(500000);
  const [proposalLoanTerm, setProposalLoanTerm] = useState(36);
  const [proposalPurpose, setProposalPurpose]   = useState('ขยายระบบ AI Platform และทีมพัฒนา');

  // Feedback Analysis state
  const [fbSrc, setFbSrc]       = useState<FeedbackSource | 'all'>('all');
  const [fbThm, setFbThm]       = useState<string>('all');
  const [fbSnt, setFbSnt]       = useState<FeedbackSentiment | 'all'>('all');
  const [fbAddOpen, setFbAddOpen] = useState(false);
  const [fbNew, setFbNew]       = useState<FbFormState>(
    { ...BLANK_FB, date: new Date().toISOString().slice(0, 10) }
  );

  // Manual Activation state
  const [actWsId, setActWsId] = useState('');
  const [actPlan, setActPlan] = useState<'growth' | 'scale'>('growth');
  const [actAmount, setActAmount] = useState(1490);
  const [actNote, setActNote] = useState('');
  const [actBusy, setActBusy] = useState(false);
  const [actMsg, setActMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleActivate() {
    if (!actWsId) { setActMsg({ ok: false, text: 'กรุณาเลือกเวิร์กสเปซ' }); return; }
    setActBusy(true); setActMsg(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = (await wsLoad(actWsId)) ?? ({} as Record<string, any>);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = (state as any).subscription ?? {};
      const now = new Date().toISOString();
      const invoice = {
        id: 'inv-admin-' + Date.now().toString(36),
        date: now,
        plan: actPlan,
        amount: actAmount,
        status: 'paid',
        note: actNote || 'เปิดใช้งานโดยแอดมิน',
      };
      const newSub = {
        ...sub,
        plan: actPlan,
        status: 'active',
        autoRenew: true,
        currentPeriodEnd: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString(); })(),
        trialEndDate: null,
        invoices: [invoice, ...(sub.invoices ?? [])],
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await wsSave(actWsId, { ...(state as any), subscription: newSub });
      setActMsg({ ok: true, text: `✅ เปิดใช้งานแพ็ก ${actPlan} สำหรับ workspace เรียบร้อยแล้ว` });
    } catch (e: unknown) {
      const err = e as { message?: string };
      setActMsg({ ok: false, text: '❌ เกิดข้อผิดพลาด: ' + (err?.message ?? String(e)) });
    }
    setActBusy(false);
  }

  // Refund (คืนเงิน) state — record-only (ยิง Xendit จริงผ่าน edge function refund-invoice หลัง KYC)
  const [refWsId, setRefWsId] = useState('');
  const [refRef, setRefRef] = useState('');
  const [refAmount, setRefAmount] = useState(0);
  const [refReason, setRefReason] = useState('');
  const [refBusy, setRefBusy] = useState(false);
  const [refMsg, setRefMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleRefund() {
    if (!refWsId || !refRef) { setRefMsg({ ok: false, text: 'กรุณาระบุเวิร์กสเปซ + รหัส invoice' }); return; }
    setRefBusy(true); setRefMsg(null);
    try {
      const state = (await wsLoad(refWsId)) ?? {};
      const { state: next, refunded, fullyRefunded, error } = applyRefund(state as SubState, {
        ref: refRef, amount: refAmount, reason: refReason,
        refundId: 'rf-admin-' + Date.now().toString(36), now: new Date(),
      });
      if (!refunded) {
        throw new Error(
          error === 'invoice_not_found' ? 'ไม่พบ invoice นี้ในเวิร์กสเปซ'
            : error === 'amount_exceeds_refundable' ? 'จำนวนเกินยอดที่คืนได้'
              : 'จำนวนเงินไม่ถูกต้อง');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await wsSave(refWsId, next as any);
      setRefMsg({ ok: true, text: `✅ บันทึกคืนเงิน ฿${refAmount.toLocaleString()} ${fullyRefunded ? '(เต็มจำนวน — เพิกถอนสิทธิ์แล้ว)' : '(บางส่วน)'}` });
    } catch (e: unknown) {
      setRefMsg({ ok: false, text: '❌ ' + ((e as { message?: string })?.message ?? String(e)) });
    }
    setRefBusy(false);
  }

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

  // ---- Feedback helpers ----
  const fb      = data.feedback ?? { period: 'Q2 2026', themes: [], entries: [] };
  const fbT     = fb.themes;
  const fbE     = fb.entries;

  function addFeedback() {
    if (!fbNew.content.trim() || !fbNew.theme) return;
    const entry: FeedbackEntry = {
      id: `fb${Date.now()}`,
      date: fbNew.date || new Date().toISOString().slice(0, 10),
      source: fbNew.source,
      sentiment: fbNew.sentiment,
      theme: fbNew.theme,
      content: fbNew.content,
      ...(fbNew.rating ? { rating: Number(fbNew.rating) } : {}),
    };
    onUpdate({ ...data, feedback: { ...fb, entries: [entry, ...fbE] } });
    setFbAddOpen(false);
    setFbNew({ ...BLANK_FB, date: new Date().toISOString().slice(0, 10) });
  }

  function deleteFb(id: string) {
    if (!confirm('ลบ feedback นี้?')) return;
    onUpdate({ ...data, feedback: { ...fb, entries: fbE.filter(e => e.id !== id) } });
  }

  function updateFbTheme(id: string, key: 'impact' | 'effort', val: number) {
    const v = Math.max(1, Math.min(5, val));
    onUpdate({ ...data, feedback: { ...fb, themes: fbT.map(t => t.id === id ? { ...t, [key]: v } : t) } });
  }

  function fbPriority(t: FeedbackTheme, freq: number): FBAction {
    const te  = fbE.filter(e => e.theme === t.id);
    const tPos = te.filter(e => e.sentiment === 'positive').length;
    const tNeg = te.filter(e => e.sentiment === 'negative').length;
    const tNet = te.length > 0 ? ((tPos - tNeg) / te.length) * 100 : 0;
    const score = t.effort > 0 ? (t.impact * freq) / t.effort : 0;
    if (tNet > 30 && freq >= 3) return 'celebrate';
    if (score >= 7) return 'fix_now';
    if (score >= 4) return 'plan';
    return 'monitor';
  }

  const prioritized = [...fbT]
    .map(t => {
      const freq  = fbE.filter(e => e.theme === t.id).length;
      const score = t.effort > 0 ? (t.impact * freq) / t.effort : 0;
      const action = fbPriority(t, freq);
      return { t, freq, score, action };
    })
    .sort((a, b) => b.score - a.score);

  const fbFiltered = [...fbE]
    .filter(e => fbSrc === 'all' || e.source === fbSrc)
    .filter(e => fbThm === 'all' || e.theme === fbThm)
    .filter(e => fbSnt === 'all' || e.sentiment === fbSnt)
    .sort((a, b) => b.date.localeCompare(a.date));

  const fbPosN = fbE.filter(e => e.sentiment === 'positive').length;
  const fbNeuN = fbE.filter(e => e.sentiment === 'neutral').length;
  const fbNegN = fbE.filter(e => e.sentiment === 'negative').length;
  const fbNet  = fbE.length > 0 ? Math.round(((fbPosN - fbNegN) / fbE.length) * 100) : 0;

  function srcLabel(s: FeedbackSource) { return FB_SOURCES.find(x => x.id === s)?.label ?? s; }
  function sentIcon(s: FeedbackSentiment) { return s === 'positive' ? '😊' : s === 'neutral' ? '😐' : '😞'; }

  useEffect(() => {
    if (!admin || !isSupabaseEnabled) return;
    setLoading(true);
    adminListWorkspaces().then(r => { setRows(r); setLoading(false); });
  }, [admin]);

  // โหลด AppData ของทุก workspace → คำนวณสรุปผลการดำเนินงาน (revenue/tasks/deals/…)
  async function loadOps() {
    if (rows.length === 0) { setOpsMsg('ยังไม่มีเวิร์กสเปซให้สรุป'); return; }
    setOpsLoading(true); setOpsMsg(null);
    try {
      const states = await Promise.all(rows.map(r => wsLoad(r.id).catch(() => null)));
      const out: OpsRow[] = rows.map((r, i) => {
        const d = states[i];
        const ops = d ? workspaceOps(d) : null;
        const base = { name: r.name, owner: r.owner_email, members: Number(r.member_count), created: thaiDate(r.created_at) };
        return ops
          ? { ...ops, ...base }
          : { ...base, plan: 'free', planLabel: '—', subStatus: 'ยังไม่เริ่ม', revenue: 0, expense: 0, net: 0, margin: 0,
              tasksDone: 0, tasksTotal: 0, dealsClosed: 0, dealsValue: 0, agents: 0, running: false, skills: 0,
              cityTier: '-', companyLevel: '-', streak: 0 };
      });
      setOpsRows(out);
      setExpAgg(aggregateExperiments(states.map(s => s?.experiments)));
      setRetention(retentionCohorts(states.map(s => s?.experiments)));
      setOpsMsg(`สรุปแล้ว ${out.length} เวิร์กสเปซ`);
    } catch (e) {
      setOpsMsg('โหลดสรุปไม่สำเร็จ: ' + (e instanceof Error ? e.message : String(e)));
    } finally { setOpsLoading(false); }
  }

  function downloadOpsCsv() {
    const blob = new Blob([opsCsv(opsRows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ceo-ai-ops-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }
  async function copyOpsTsv() {
    try { await navigator.clipboard.writeText(opsTsv(opsRows)); setOpsMsg('📋 คัดลอกแล้ว — วางใน Google Sheets ได้เลย (Ctrl+V)'); }
    catch { setOpsMsg('คัดลอกไม่สำเร็จ — เบราว์เซอร์ไม่อนุญาต clipboard'); }
  }
  function downloadExpCsv() {
    if (!expAgg) return;
    const blob = new Blob([expReportCsv(expAgg)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ceo-ai-abtest-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }
  async function copyExpTsv() {
    if (!expAgg) return;
    try { await navigator.clipboard.writeText(expReportTsv(expAgg)); setOpsMsg('📋 คัดลอกผล A/B แล้ว — วางใน Google Sheets ได้เลย'); }
    catch { setOpsMsg('คัดลอกไม่สำเร็จ — เบราว์เซอร์ไม่อนุญาต clipboard'); }
  }

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

  // ---- Dashboard computations ----
  const mktHealth = (() => {
    const goals = data.marketing?.goals ?? [];
    if (!goals.length) return 0;
    const scores = goals.map(g => {
      const isLower = g.metric.toLowerCase().includes('cac') || g.metric.toLowerCase().includes('cost');
      return isLower
        ? (g.current <= g.target ? 100 : Math.round((g.target / g.current) * 100))
        : Math.min(100, Math.round((g.current / g.target) * 100));
    });
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  })();
  const revHealth    = Math.min(100, Math.max(0, (grossMargin / 25) * 100));
  const custHealth   = Math.min(100, (ltvcacGrowth / 3) * 100);
  const prodHealth   = Math.min(100, Math.max(0, (fbNet + 100) / 2));
  const overallScore = Math.round((revHealth + custHealth + prodHealth + mktHealth) / 4);

  // ---- Pricing Strategy computations ----
  const valTimeSaved   = valTeamSize * 8 * valHourlyRate;          // 8 hrs/person/month
  const valAiCostSaved = 5000;                                     // API + tools cost avoided
  const valRevenueUp   = Math.round(valMonthlyRev * 0.01);         // 1% revenue uplift
  const valRiskReduced = 3000;                                     // risk & compliance
  const totalValue     = valTimeSaved + valAiCostSaved + valRevenueUp + valRiskReduced;
  const recRangeLow    = Math.round(totalValue * 0.10);
  const recRangeHigh   = Math.round(totalValue * 0.20);
  const growthPct      = totalValue > 0 ? (gp.price / totalValue * 100).toFixed(1) : '—';
  const scalePct       = totalValue > 0 ? (sp.price / totalValue * 100).toFixed(1) : '—';

  const simCurrentSubs = totalSubs || 20;
  const simNewSubs     = Math.round(simCurrentSubs * (simRetention / 100));
  const simLostSubs    = simCurrentSubs - simNewSubs;
  const simNewMrr      = simNewSubs * simNewPrice + nScale * sp.price;
  const simOldMrr      = mrr > 0 ? mrr : simCurrentSubs * gp.price;
  const simMrrDelta    = simNewMrr - simOldMrr;
  const simAnnualImp   = simMrrDelta * 12;
  const simBreakEven   = simNewPrice > gp.price && (simNewPrice - gp.price) > 0
    ? Math.ceil((simLostSubs * gp.price) / (simNewPrice - gp.price))
    : 0;

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
        <button className={`pfa-tab${tab === 'dashboard' ? ' active' : ''}`} onClick={() => setTab('dashboard')}>
          📊 Dashboard
        </button>
        <button className={`pfa-tab${tab === 'finance' ? ' active' : ''}`} onClick={() => setTab('finance')}>
          📊 วิเคราะห์การเงิน & ราคา
        </button>
        <button className={`pfa-tab${tab === 'winstories' ? ' active' : ''}`} onClick={() => setTab('winstories')}>
          🏆 Win Stories
        </button>
        <button className={`pfa-tab${tab === 'casestudies' ? ' active' : ''}`} onClick={() => setTab('casestudies')}>
          📚 Case Studies
        </button>
        <button className={`pfa-tab${tab === 'workspaces' ? ' active' : ''}`} onClick={() => setTab('workspaces')}>
          🏢 เวิร์กสเปซ
        </button>
        <button className={`pfa-tab${tab === 'feedback' ? ' active' : ''}`} onClick={() => setTab('feedback')}>
          📝 Feedback Analysis
        </button>
        <button className={`pfa-tab${tab === 'skills' ? ' active' : ''}`} onClick={() => setTab('skills')}>
          🛒 Skill Market
        </button>
        <button className={`pfa-tab${tab === 'auction' ? ' active' : ''}`} onClick={() => setTab('auction')}>
          🔨 ประมูล Skill
        </button>
        <button className={`pfa-tab${tab === 'shopapps' ? ' active' : ''}`} onClick={() => setTab('shopapps')}>
          🏪 ร้านฝากขาย
        </button>
        <button className={`pfa-tab${tab === 'pricing' ? ' active' : ''}`} onClick={() => setTab('pricing')}>
          💸 Pricing Strategy
        </button>
        <button className={`pfa-tab${tab === 'salesforce' ? ' active' : ''}`} onClick={() => setTab('salesforce')}>
          ☁️ Salesforce CRM
        </button>
        <button className={`pfa-tab${tab === 'cxpersona' ? ' active' : ''}`} onClick={() => setTab('cxpersona')}>
          🎯 Customer Persona
        </button>
        <button className={`pfa-tab${tab === 'seo' ? ' active' : ''}`} onClick={() => setTab('seo')}>
          🔍 SEO Strategy
        </button>
        <button className={`pfa-tab${tab === 'forecast' ? ' active' : ''}`} onClick={() => setTab('forecast')}>
          📈 Financial Forecast
        </button>
        <button className={`pfa-tab${tab === 'proposal' ? ' active' : ''}`} onClick={() => setTab('proposal')}>
          📋 Loan Proposal
        </button>
        <button className={`pfa-tab${tab === 'gtm' ? ' active' : ''}`} onClick={() => setTab('gtm')}>
          🎯 GTM Strategy
        </button>
        <button className={`pfa-tab${tab === 'activate' ? ' active' : ''}`} onClick={() => setTab('activate')}>
          💳 เปิดใช้งานสมาชิก
        </button>
      </div>

      {/* ===== DASHBOARD TAB ===== */}
      {tab === 'dashboard' && (
        <div className="adm-dash">

          {/* Overall score banner */}
          <div className={`adm-score-banner ${overallScore >= 75 ? 'green' : overallScore >= 50 ? 'yellow' : 'red'}`}>
            <div className="adm-score-num">{overallScore}</div>
            <div className="adm-score-label">Business Health Score <span>/100</span></div>
            <div className="adm-score-hint">
              {overallScore >= 75 ? '✅ ระบบสุขภาพดี — เร่งเติบโต' : overallScore >= 50 ? '⚠️ มีจุดที่ต้องปรับปรุง' : '🔴 ต้องดำเนินการด่วน'}
            </div>
          </div>

          {/* KPI Grid */}
          <div className="adm-kpi-grid">
            <div className="adm-kpi-card">
              <div className="adm-kpi-label">MRR (เดือนนี้)</div>
              <div className="adm-kpi-val">{baht(mrr)}</div>
              <div className="adm-kpi-sub">ARR · {baht(arr)}</div>
              <div className={`adm-kpi-badge ${grossMargin >= 20 ? 'adm-badge-green' : grossMargin >= 10 ? 'adm-badge-yellow' : 'adm-badge-red'}`}>
                Margin {grossMargin.toFixed(1)}%
              </div>
            </div>
            <div className="adm-kpi-card">
              <div className="adm-kpi-label">Active Subscribers</div>
              <div className="adm-kpi-val">{totalSubs} ราย</div>
              <div className="adm-kpi-sub">Growth {nGrowth} · Scale {nScale}</div>
              <div className={`adm-kpi-badge ${totalSubs >= breakEven ? 'adm-badge-green' : 'adm-badge-yellow'}`}>
                {totalSubs >= breakEven ? '✅ กำไร' : `Break-even: ${breakEven} ราย`}
              </div>
            </div>
            <div className="adm-kpi-card">
              <div className="adm-kpi-label">LTV:CAC (Growth)</div>
              <div className="adm-kpi-val">{ltvcacGrowth.toFixed(1)}x</div>
              <div className="adm-kpi-sub">Payback {paybackGrowth} เดือน · Churn {churnPct}%</div>
              <div className={`adm-kpi-badge ${ltvcacGrowth >= 3 ? 'adm-badge-green' : ltvcacGrowth >= 1.5 ? 'adm-badge-yellow' : 'adm-badge-red'}`}>
                {ltvcacGrowth >= 3 ? '✅ ดี (≥3x)' : ltvcacGrowth >= 1.5 ? '⚠️ ระวัง' : '🔴 ต่ำกว่าเกณฑ์'}
              </div>
            </div>
            <div className="adm-kpi-card">
              <div className="adm-kpi-label">Net Sentiment</div>
              <div className={`adm-kpi-val ${fbNet < 0 ? 'adm-val-red' : ''}`}>{fbNet >= 0 ? '+' : ''}{fbNet}%</div>
              <div className="adm-kpi-sub">{fbE.length} feedback · 😊 {fbPosN} 😞 {fbNegN}</div>
              <div className={`adm-kpi-badge ${fbNet >= 20 ? 'adm-badge-green' : fbNet >= 0 ? 'adm-badge-yellow' : 'adm-badge-red'}`}>
                {fbNet >= 20 ? '😊 ดี' : fbNet >= 0 ? '😐 ปกติ' : '😞 ต้องปรับปรุง'}
              </div>
            </div>
          </div>

          {/* Revenue + Action Items */}
          <div className="adm-dash-2col">

            {/* Revenue Snapshot */}
            <div className="adm-dash-card">
              <div className="adm-dash-card-title">💰 Revenue Snapshot</div>
              <div className="adm-rev-table">
                {[
                  { label: 'MRR',          val: baht(mrr),         ok: mrr > 0 },
                  { label: 'ARR',          val: baht(arr),         ok: arr > 0 },
                  { label: 'Gross Profit', val: baht(grossProfit), ok: grossProfit >= 0 },
                  { label: 'Op Cost/เดือน', val: baht(totalOpCost), ok: true },
                  { label: 'Break-even',   val: `${breakEven} ราย`, ok: totalSubs >= breakEven },
                ].map(r => (
                  <div key={r.label} className="adm-rev-row">
                    <span className="adm-rev-label">{r.label}</span>
                    <b className={r.ok ? '' : 'adm-val-red'}>{r.val}</b>
                  </div>
                ))}
              </div>
              <div className="adm-mix-title">แผน</div>
              {[
                { label: 'Growth', count: nGrowth, max: Math.max(nGrowth, nScale, 1), color: 'var(--accent)' },
                { label: 'Scale',  count: nScale,  max: Math.max(nGrowth, nScale, 1), color: 'var(--green)' },
              ].map(p => (
                <div key={p.label} className="adm-bar-row">
                  <span className="adm-bar-label">{p.label}</span>
                  <div className="adm-bar-bg">
                    <div className="adm-bar-fill" style={{ width: `${(p.count / p.max) * 100}%`, background: p.color }} />
                  </div>
                  <span className="adm-bar-count">{p.count} ราย</span>
                </div>
              ))}
            </div>

            {/* Action Items */}
            <div className="adm-dash-card">
              <div className="adm-dash-card-title">⚡ Action Items (จาก Feedback)</div>
              <div className="adm-action-list">
                {prioritized.filter(p => p.action === 'fix_now').map(({ t, score }) => (
                  <div key={t.id} className="adm-action-item adm-ai-fix">
                    <span className="adm-ai-icon">🔥</span>
                    <div className="adm-ai-body">
                      <div className="adm-ai-name">{t.name}</div>
                      <div className="adm-ai-meta">Fix Now · Score {score.toFixed(1)} · Impact {t.impact}/5</div>
                    </div>
                  </div>
                ))}
                {prioritized.filter(p => p.action === 'plan').map(({ t }) => (
                  <div key={t.id} className="adm-action-item adm-ai-plan">
                    <span className="adm-ai-icon">📅</span>
                    <div className="adm-ai-body">
                      <div className="adm-ai-name">{t.name}</div>
                      <div className="adm-ai-meta">Plan Q3</div>
                    </div>
                  </div>
                ))}
                {prioritized.filter(p => p.action === 'celebrate').map(({ t }) => (
                  <div key={t.id} className="adm-action-item adm-ai-celebrate">
                    <span className="adm-ai-icon">🎉</span>
                    <div className="adm-ai-body">
                      <div className="adm-ai-name">{t.name}</div>
                      <div className="adm-ai-meta">Celebrate — ใช้ใน marketing</div>
                    </div>
                  </div>
                ))}
                {prioritized.filter(p => p.action === 'monitor').map(({ t }) => (
                  <div key={t.id} className="adm-action-item adm-ai-monitor">
                    <span className="adm-ai-icon">👁</span>
                    <div className="adm-ai-body">
                      <div className="adm-ai-name">{t.name}</div>
                      <div className="adm-ai-meta">Monitor</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="adm-mix-title" style={{ marginTop: 16 }}>Feedback Sentiment</div>
              {[
                { label: '😊 Positive', n: fbPosN, total: fbE.length, color: '#22c55e' },
                { label: '😐 Neutral',  n: fbNeuN, total: fbE.length, color: '#f59e0b' },
                { label: '😞 Negative', n: fbNegN, total: fbE.length, color: '#ef4444' },
              ].map(s => (
                <div key={s.label} className="adm-bar-row">
                  <span className="adm-bar-label" style={{ width: 100 }}>{s.label}</span>
                  <div className="adm-bar-bg">
                    <div className="adm-bar-fill" style={{ width: `${s.total > 0 ? (s.n / s.total) * 100 : 0}%`, background: s.color }} />
                  </div>
                  <span className="adm-bar-count">{s.n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Business Health Scores */}
          <div className="adm-dash-card">
            <div className="adm-dash-card-title">🏥 Business Health Breakdown</div>
            <div className="adm-health-grid">
              {[
                { label: 'Revenue Health',     score: revHealth,  hint: `Gross Margin ${grossMargin.toFixed(1)}% / Target 25%` },
                { label: 'Customer Health',    score: custHealth, hint: `LTV:CAC ${ltvcacGrowth.toFixed(1)}x / Target ≥3x` },
                { label: 'Product Sentiment',  score: prodHealth, hint: `Net Sentiment ${fbNet >= 0 ? '+' : ''}${fbNet}%` },
                { label: 'Marketing Goals',    score: mktHealth,  hint: `Goal achievement avg ${mktHealth.toFixed(0)}%` },
              ].map(h => (
                <div key={h.label} className="adm-health-item">
                  <div className="adm-health-label">{h.label}</div>
                  <div className="adm-health-track">
                    <div className="adm-health-fill" style={{
                      width: `${h.score}%`,
                      background: h.score >= 75 ? '#22c55e' : h.score >= 50 ? '#f59e0b' : '#ef4444',
                    }} />
                  </div>
                  <div className="adm-health-right">
                    <span className={`adm-health-pct ${h.score >= 75 ? 'green' : h.score >= 50 ? 'yellow' : 'red'}`}>{h.score.toFixed(0)}%</span>
                    <span className="adm-health-hint">{h.hint}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Win Stories + Marketing Goals */}
          <div className="adm-dash-2col">

            {/* Win Stories */}
            <div className="adm-dash-card">
              <div className="adm-dash-card-title">🏆 Win Stories by Category</div>
              {(['revenue', 'growth', 'efficiency', 'retention', 'transformation'] as const).map(cat => {
                const n = winStories.filter(s => s.category === cat).length;
                return (
                  <div key={cat} className="adm-bar-row">
                    <span className="adm-bar-label">{WIN_CAT_LABEL[cat]}</span>
                    <div className="adm-bar-bg">
                      <div className="adm-bar-fill" style={{ width: `${Math.min(100, n * 25)}%`, background: WIN_CAT_COLOR[cat] }} />
                    </div>
                    <span className="adm-bar-count">{n}</span>
                  </div>
                );
              })}
              <div className="adm-ws-total">{winStories.length} stories รวม · {rows.length} workspaces</div>
            </div>

            {/* Marketing Goals */}
            <div className="adm-dash-card">
              <div className="adm-dash-card-title">🎯 Marketing Goals Progress</div>
              {(data.marketing?.goals ?? []).map(g => {
                const isLower = g.metric.toLowerCase().includes('cac') || g.metric.toLowerCase().includes('cost');
                const pv = isLower
                  ? (g.current <= g.target ? 100 : Math.round((g.target / g.current) * 100))
                  : Math.min(100, Math.round((g.current / g.target) * 100));
                return (
                  <div key={g.id} className="adm-mkt-row">
                    <div className="adm-mkt-label">{g.metric}</div>
                    <div className="adm-bar-bg">
                      <div className="adm-bar-fill" style={{
                        width: `${pv}%`,
                        background: pv >= 80 ? '#22c55e' : pv >= 50 ? '#f59e0b' : '#ef4444',
                      }} />
                    </div>
                    <span className="adm-mkt-pct">{pv}%</span>
                    <span className="adm-mkt-vals">{g.current.toLocaleString()} / {g.target.toLocaleString()} {g.unit}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

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

      {/* ===== FEEDBACK TAB ===== */}
      {tab === 'feedback' && (
        <div className="fb-wrap">

          {/* Summary strip */}
          <div className="fb-summary">
            <div className="fb-summary-period">📅 {fb.period}</div>
            <div className="fb-summary-stats">
              <span className="fb-stat-total">{fbE.length} รายการ</span>
              <span className="fb-stat fb-stat-pos">😊 {fbPosN} <em>({pct(fbPosN, fbE.length)})</em></span>
              <span className="fb-stat fb-stat-neu">😐 {fbNeuN} <em>({pct(fbNeuN, fbE.length)})</em></span>
              <span className="fb-stat fb-stat-neg">😞 {fbNegN} <em>({pct(fbNegN, fbE.length)})</em></span>
              <span className={`fb-net ${fbNet >= 0 ? 'pos' : 'neg'}`}>Net {fbNet >= 0 ? '+' : ''}{fbNet}%</span>
            </div>
          </div>

          {/* Theme Analysis */}
          <div className="fb-section">
            <div className="fb-section-title">Theme Analysis</div>
            <div className="fb-table-wrap">
              <table className="fb-table">
                <thead>
                  <tr>
                    <th>Theme</th>
                    <th>ความถี่</th>
                    <th>%</th>
                    <th>😊</th>
                    <th>😐</th>
                    <th>😞</th>
                    <th>Net</th>
                    <th>Quote ตัวอย่าง</th>
                  </tr>
                </thead>
                <tbody>
                  {fbT.map(t => {
                    const te  = fbE.filter(e => e.theme === t.id);
                    const tp  = te.filter(e => e.sentiment === 'positive').length;
                    const tn  = te.filter(e => e.sentiment === 'neutral').length;
                    const tng = te.filter(e => e.sentiment === 'negative').length;
                    const tnet = te.length > 0 ? Math.round(((tp - tng) / te.length) * 100) : 0;
                    const sample = te.find(e => e.sentiment === 'negative') ?? te.find(e => e.sentiment === 'neutral') ?? te[0];
                    return (
                      <tr key={t.id}>
                        <td><b>{t.name}</b></td>
                        <td className="fb-tc">{te.length}</td>
                        <td className="fb-tc">{pct(te.length, fbE.length)}</td>
                        <td className="fb-tc fb-pos">{tp}</td>
                        <td className="fb-tc fb-neu">{tn}</td>
                        <td className="fb-tc fb-neg">{tng}</td>
                        <td className={`fb-tc ${tnet >= 0 ? 'fb-pos' : 'fb-neg'}`}>{tnet >= 0 ? '+' : ''}{tnet}%</td>
                        <td className="fb-quote-cell">"{sample?.content.slice(0, 65)}{(sample?.content.length ?? 0) > 65 ? '…' : ''}"</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Priority Matrix */}
          <div className="fb-section">
            <div className="fb-section-title">Impact × Effort Priority Matrix <span className="fb-section-sub">คลิก Impact/Effort เพื่อปรับ</span></div>
            <div className="fb-table-wrap">
              <table className="fb-table">
                <thead>
                  <tr>
                    <th>Theme</th>
                    <th>ความถี่</th>
                    <th>Impact (1-5)</th>
                    <th>Effort (1-5)</th>
                    <th>Score</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {prioritized.map(({ t, freq, score, action }) => {
                    const meta = FB_ACTION[action];
                    return (
                      <tr key={t.id}>
                        <td><b>{t.name}</b></td>
                        <td className="fb-tc">{freq}</td>
                        <td className="fb-tc">
                          <input type="number" min={1} max={5} value={t.impact} className="fb-score-inp"
                            onChange={e => updateFbTheme(t.id, 'impact', +e.target.value)} />
                        </td>
                        <td className="fb-tc">
                          <input type="number" min={1} max={5} value={t.effort} className="fb-score-inp"
                            onChange={e => updateFbTheme(t.id, 'effort', +e.target.value)} />
                        </td>
                        <td className="fb-tc"><b>{score.toFixed(1)}</b></td>
                        <td><span className={`fb-act-badge ${meta.cls}`}>{meta.emoji} {meta.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Plan */}
          <div className="fb-section">
            <div className="fb-section-title">Action Plan</div>
            {(['fix_now', 'plan', 'monitor', 'celebrate'] as FBAction[]).map(actKey => {
              const items = prioritized.filter(p => p.action === actKey);
              if (items.length === 0) return null;
              const meta = FB_ACTION[actKey];
              return (
                <div key={actKey} className="fb-action-group">
                  <div className={`fb-action-group-title ${meta.cls}`}>{meta.emoji} {meta.label}</div>
                  <div className="fb-action-cards">
                    {items.map(({ t }) => {
                      const negN = fbE.filter(e => e.theme === t.id && e.sentiment === 'negative').length;
                      return (
                        <div key={t.id} className="fb-action-card">
                          <div className="fb-action-card-name">{t.name}</div>
                          <div className="fb-action-card-desc">{meta.desc(t.name, negN)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feedback Feed */}
          <div className="fb-section">
            <div className="fb-feed-head">
              <div className="fb-section-title" style={{ marginBottom: 0 }}>Feedback Feed</div>
              <div className="fb-feed-filters">
                <select className="fb-filter-sel" value={fbSrc} onChange={e => setFbSrc(e.target.value as FeedbackSource | 'all')}>
                  <option value="all">ทุกแหล่ง</option>
                  {FB_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <select className="fb-filter-sel" value={fbThm} onChange={e => setFbThm(e.target.value)}>
                  <option value="all">ทุก Theme</option>
                  {fbT.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select className="fb-filter-sel" value={fbSnt} onChange={e => setFbSnt(e.target.value as FeedbackSentiment | 'all')}>
                  <option value="all">ทุก Sentiment</option>
                  <option value="positive">😊 Positive</option>
                  <option value="neutral">😐 Neutral</option>
                  <option value="negative">😞 Negative</option>
                </select>
                <button className="fb-add-btn" onClick={() => setFbAddOpen(o => !o)}>+ เพิ่ม Feedback</button>
              </div>
            </div>

            {fbAddOpen && (
              <div className="fb-add-form">
                <div className="fb-add-grid">
                  <div className="fb-add-field">
                    <label>วันที่</label>
                    <input type="date" className="fb-inp" value={fbNew.date}
                      onChange={e => setFbNew(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="fb-add-field">
                    <label>แหล่ง</label>
                    <select className="fb-inp" value={fbNew.source}
                      onChange={e => setFbNew(p => ({ ...p, source: e.target.value as FeedbackSource }))}>
                      {FB_SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="fb-add-field">
                    <label>Theme</label>
                    <select className="fb-inp" value={fbNew.theme}
                      onChange={e => setFbNew(p => ({ ...p, theme: e.target.value }))}>
                      <option value="">-- เลือก Theme --</option>
                      {fbT.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="fb-add-field">
                    <label>Sentiment</label>
                    <select className="fb-inp" value={fbNew.sentiment}
                      onChange={e => setFbNew(p => ({ ...p, sentiment: e.target.value as FeedbackSentiment }))}>
                      <option value="positive">😊 Positive</option>
                      <option value="neutral">😐 Neutral</option>
                      <option value="negative">😞 Negative</option>
                    </select>
                  </div>
                  <div className="fb-add-field">
                    <label>Rating (1-5)</label>
                    <input type="number" min={1} max={5} className="fb-inp" value={fbNew.rating}
                      onChange={e => setFbNew(p => ({ ...p, rating: e.target.value }))}
                      placeholder="ไม่บังคับ" />
                  </div>
                </div>
                <div className="fb-add-field fb-add-full">
                  <label>เนื้อหา Feedback</label>
                  <textarea className="fb-ta" rows={3} value={fbNew.content} placeholder="คัดลอก feedback จากลูกค้า..."
                    onChange={e => setFbNew(p => ({ ...p, content: e.target.value }))} />
                </div>
                <div className="fb-add-footer">
                  <button className="fb-save-btn" onClick={addFeedback}
                    disabled={!fbNew.content.trim() || !fbNew.theme}>บันทึก</button>
                  <button className="fb-cancel-btn" onClick={() => setFbAddOpen(false)}>ยกเลิก</button>
                </div>
              </div>
            )}

            <div className="fb-entries">
              {fbFiltered.length === 0 && <div className="fb-empty">ไม่พบ feedback ที่ตรงกับเงื่อนไข</div>}
              {fbFiltered.map(e => {
                const themeName = fbT.find(t => t.id === e.theme)?.name ?? e.theme;
                return (
                  <div key={e.id} className={`fb-entry fb-entry-${e.sentiment}`}>
                    <div className="fb-entry-meta">
                      <span className="fb-entry-date">{thaiDate(e.date)}</span>
                      <span className={`fb-src-badge fb-src-${e.source}`}>{srcLabel(e.source)}</span>
                      <span className="fb-theme-badge">{themeName}</span>
                      {e.rating && <span className="fb-rating">{'⭐'.repeat(e.rating)}</span>}
                      <span className="fb-sent-icon">{sentIcon(e.sentiment)}</span>
                    </div>
                    <div className="fb-entry-content">{e.content}</div>
                    <button className="fb-entry-del" onClick={() => deleteFb(e.id)} title="ลบ">×</button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ===== PRICING STRATEGY TAB ===== */}
      {tab === 'pricing' && (
        <div className="ps-wrap">

          {/* 1. Value-Based Pricing Calculator */}
          <div className="ps-section">
            <div className="ps-section-title">💎 Value-Based Pricing Calculator</div>
            <div className="ps-hint">กำหนดราคาจากคุณค่าที่ลูกค้าได้รับ ไม่ใช่จากต้นทุนการผลิต</div>
            <div className="ps-val-layout">
              <div className="ps-val-inputs">
                <div className="ps-val-row">
                  <label className="ps-val-label">ขนาดทีมลูกค้า</label>
                  <input type="number" className="ps-val-inp" min={1} max={100} value={valTeamSize}
                    onChange={e => setValTeamSize(Math.max(1, +e.target.value))} />
                  <span className="ps-val-unit">คน</span>
                </div>
                <div className="ps-val-row">
                  <label className="ps-val-label">มูลค่าชั่วโมงทำงาน</label>
                  <input type="number" className="ps-val-inp" min={100} step={100} value={valHourlyRate}
                    onChange={e => setValHourlyRate(Math.max(100, +e.target.value))} />
                  <span className="ps-val-unit">฿/ชั่วโมง</span>
                </div>
                <div className="ps-val-row">
                  <label className="ps-val-label">รายได้เดือนของลูกค้า</label>
                  <input type="number" className="ps-val-inp" min={0} step={50000} value={valMonthlyRev}
                    onChange={e => setValMonthlyRev(Math.max(0, +e.target.value))} />
                  <span className="ps-val-unit">฿</span>
                </div>
              </div>

              <div className="ps-val-table-wrap">
                <table className="ps-val-table">
                  <thead>
                    <tr>
                      <th>มูลค่าที่ลูกค้าได้รับ</th>
                      <th>วิธีคำนวณ</th>
                      <th className="ps-num">฿/เดือน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: '⏱ เวลาที่ประหยัด', formula: `${valTeamSize} คน × 8 ชม. × ฿${valHourlyRate.toLocaleString()}`, val: valTimeSaved },
                      { label: '🤖 ลดต้นทุน AI tools', formula: 'API cost + tools ที่ไม่ต้องซื้อแยก', val: valAiCostSaved },
                      { label: '📈 รายได้ที่เพิ่มขึ้น', formula: '1% ของรายได้เดือน', val: valRevenueUp },
                      { label: '🛡 ลดความเสี่ยง', formula: 'Compliance + error prevention', val: valRiskReduced },
                    ].map(r => (
                      <tr key={r.label}>
                        <td>{r.label}</td>
                        <td className="ps-val-formula">{r.formula}</td>
                        <td className="ps-num ps-val-num">{baht(r.val)}</td>
                      </tr>
                    ))}
                    <tr className="ps-total-row">
                      <td colSpan={2}><b>รวมมูลค่าทั้งหมด / เดือน</b></td>
                      <td className="ps-num"><b>{baht(totalValue)}</b></td>
                    </tr>
                  </tbody>
                </table>
                <div className="ps-val-result">
                  <div className="ps-val-range">
                    <span>ช่วงราคาที่แนะนำ (10–20% ของมูลค่า):</span>
                    <strong>{baht(recRangeLow)} – {baht(recRangeHigh)}</strong>
                  </div>
                  <div className="ps-val-verdict">
                    {[
                      { plan: 'Growth ฿1,490', pct: growthPct, ok: Number(growthPct) <= 15 },
                      { plan: 'Scale ฿5,900',  pct: scalePct,  ok: Number(scalePct)  <= 15 },
                    ].map(v => (
                      <span key={v.plan} className={`ps-verdict-badge ${v.ok ? 'ps-ok' : 'ps-high'}`}>
                        {v.plan} = {v.pct}% {v.ok ? '✅ เหมาะสม' : '⚠️ สูงเกินไป'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Tier Structure & Price Anchoring */}
          <div className="ps-section">
            <div className="ps-section-title">🏗 Tier Structure & Price Anchoring</div>
            <div className="ps-hint">นำเสนอ tier สูงสุดก่อนเพื่อ anchor ราคา — ลูกค้ามักเลือก tier กลาง</div>
            <div className="ps-tier-grid">
              {[
                {
                  name: 'Free Trial',
                  price: 0,
                  annual: null,
                  color: 'var(--ink3)',
                  badge: null,
                  features: ['5 AI agents (ทดสอบ)', '24 Steps Guide', 'Export PDF', 'จำกัด 100 calls/เดือน'],
                  target: 'Prospect & Evaluation',
                },
                {
                  name: 'Growth',
                  price: 1490,
                  annual: 14900,
                  color: 'var(--accent)',
                  badge: '⭐ ยอดนิยม',
                  features: ['AI Company Builder', '1,000 calls/เดือน', 'VRIO + 24 Steps', 'PromptPay Billing', 'Workspace team'],
                  target: 'Thai SME / Solopreneurs',
                },
                {
                  name: 'Scale',
                  price: 5900,
                  annual: 56400,
                  color: 'var(--green)',
                  badge: '🚀 Multi-company',
                  features: ['ทุกอย่างใน Growth', '5,000 calls/เดือน', 'หลายบริษัทในบัญชีเดียว', 'API Access', 'Priority support'],
                  target: 'Holding / Agency / Enterprise',
                },
              ].map(tier => (
                <div key={tier.name} className={`ps-tier-card ${tier.badge ? 'ps-tier-featured' : ''}`}
                  style={{ borderColor: tier.badge ? tier.color : undefined }}>
                  {tier.badge && <div className="ps-tier-badge" style={{ background: tier.color }}>{tier.badge}</div>}
                  <div className="ps-tier-name">{tier.name}</div>
                  <div className="ps-tier-price">
                    {tier.price === 0 ? 'ฟรี' : baht(tier.price)}
                    {tier.price > 0 && <span className="ps-tier-per">/เดือน</span>}
                  </div>
                  {tier.annual && (
                    <div className="ps-tier-annual">
                      หรือ {baht(tier.annual)}/ปี
                      <span className="ps-tier-save"> ประหยัด {Math.round((1 - tier.annual / (tier.price * 12)) * 100)}%</span>
                    </div>
                  )}
                  <ul className="ps-tier-features">
                    {tier.features.map(f => <li key={f}>✓ {f}</li>)}
                  </ul>
                  <div className="ps-tier-target">🎯 {tier.target}</div>
                </div>
              ))}
            </div>
            <div className="ps-anchor-note">
              💡 <b>Anchoring:</b> Scale (฿5,900) ทำให้ Growth (฿1,490) ดูคุ้มค่ามาก — ลูกค้า 80%+ เลือก Growth
              หลังเห็น Scale ก่อน เพิ่ม Annual Plan ลด Churn ได้ ~30%
            </div>
          </div>

          {/* 3. Price Change Simulator */}
          <div className="ps-section">
            <div className="ps-section-title">🔄 Price Change Simulator</div>
            <div className="ps-hint">จำลองผลกระทบก่อนปรับราคา — ดูว่าสูญเสียลูกค้าเท่าไหร่ถึงจะยังได้กำไรมากขึ้น</div>
            <div className="ps-sim-layout">
              <div className="ps-sim-inputs">
                <div className="ps-val-row">
                  <label className="ps-val-label">ราคาใหม่ Growth plan</label>
                  <input type="number" className="ps-val-inp" min={500} step={100} value={simNewPrice}
                    onChange={e => setSimNewPrice(Math.max(500, +e.target.value))} />
                  <span className="ps-val-unit">฿/เดือน</span>
                </div>
                <div className="ps-val-row">
                  <label className="ps-val-label">อัตราลูกค้าที่รักษาไว้ได้</label>
                  <input type="number" className="ps-val-inp" min={0} max={100} step={5} value={simRetention}
                    onChange={e => setSimRetention(Math.min(100, Math.max(0, +e.target.value)))} />
                  <span className="ps-val-unit">%</span>
                </div>
                <div className="ps-sim-baseline">
                  ฐาน: Growth subs ปัจจุบัน {simCurrentSubs} ราย × ฿{gp.price.toLocaleString()} = {baht(simCurrentSubs * gp.price)}/เดือน
                </div>
              </div>

              <div className="ps-sim-result-grid">
                {[
                  { label: 'Growth subs ที่รักษา', val: `${simNewSubs} ราย`, ok: true },
                  { label: 'Growth subs ที่สูญเสีย', val: `${simLostSubs} ราย`, ok: simLostSubs === 0 },
                  { label: 'MRR ใหม่ (ประมาณ)', val: baht(simNewMrr), ok: simMrrDelta >= 0 },
                  { label: 'MRR Delta', val: `${simMrrDelta >= 0 ? '+' : ''}${baht(simMrrDelta)}`, ok: simMrrDelta >= 0 },
                  { label: 'ผลกระทบต่อปี', val: `${simAnnualImp >= 0 ? '+' : ''}${baht(simAnnualImp)}`, ok: simAnnualImp >= 0 },
                  { label: 'Break-even (ลูกค้าสูญเสียได้ไม่เกิน)', val: simBreakEven > 0 ? `${simBreakEven} ราย` : '—', ok: simLostSubs <= simBreakEven || simBreakEven === 0 },
                ].map(r => (
                  <div key={r.label} className="ps-sim-kpi">
                    <div className="ps-sim-kpi-label">{r.label}</div>
                    <div className={`ps-sim-kpi-val ${r.ok ? 'ps-ok-val' : 'ps-bad-val'}`}>{r.val}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className={`ps-sim-verdict ${simMrrDelta >= 0 ? 'ps-sim-ok' : 'ps-sim-warn'}`}>
              {simMrrDelta >= 0
                ? `✅ ที่ retention ${simRetention}% → ราคา ฿${simNewPrice.toLocaleString()} ยังคุ้มค่า — MRR เพิ่มขึ้น ${baht(simMrrDelta)}/เดือน`
                : `⚠️ ที่ retention ${simRetention}% → ราคา ฿${simNewPrice.toLocaleString()} ทำให้ MRR ลดลง ${baht(Math.abs(simMrrDelta))} — ต้องรักษาลูกค้าได้ ${simBreakEven > 0 ? `มากกว่า ${simBreakEven} ราย` : 'มากกว่านี้'}`}
            </div>
          </div>

          {/* 4. A/B Price Testing Plan */}
          <div className="ps-section">
            <div className="ps-section-title">🧪 A/B Price Testing Plan</div>
            <div className="ps-hint">ทดสอบ 2–3 ราคาพร้อมกัน (minimum 100 visitors/variant) ก่อน commit ราคาถาวร</div>
            <table className="ps-ab-table">
              <thead>
                <tr>
                  <th>Variant</th>
                  <th className="ps-num">ราคา Growth</th>
                  <th>สมมติฐาน</th>
                  <th>เป้า Conversion</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { variant: 'A (ต่ำ / Control)', price: 1290, hypothesis: 'Conversion สูงขึ้น +30%, revenue/visitor ต่ำกว่า', target: '≥5%', cls: '' },
                  { variant: 'B (ปัจจุบัน)',      price: 1490, hypothesis: 'Balanced — baseline สำหรับเปรียบเทียบ', target: '≥4%', cls: 'ps-ab-cur' },
                  { variant: 'C (สูง)',            price: 1790, hypothesis: 'Conversion ลด ~20% แต่ revenue/visitor สูงกว่า', target: '≥3%', cls: '' },
                ].map(r => (
                  <tr key={r.variant} className={r.cls}>
                    <td>{r.variant} {r.cls && <span className="pfa-cur-badge">ปัจจุบัน</span>}</td>
                    <td className="ps-num">{baht(r.price)}/เดือน</td>
                    <td className="ps-ab-hypo">{r.hypothesis}</td>
                    <td className="ps-num">{r.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="ps-ab-signals">
              <div className="ps-ab-signal-title">สัญญาณที่ต้องจับตา</div>
              <div className="ps-ab-signal-grid">
                {[
                  { icon: '📉', label: 'Conversion ลด >30%', action: 'ราคาสูงเกินไป → ลดกลับ' },
                  { icon: '📊', label: 'Conversion ไม่เปลี่ยน', action: 'มีพื้นที่ขึ้นราคาอีก' },
                  { icon: '🔄', label: 'Refund rate สูง', action: 'ปัญหา value delivery ไม่ใช่ราคา' },
                  { icon: '✅', label: '20–30% บอกว่าแพงเกิน', action: 'ราคาพอดีแล้ว (ปกติ)' },
                ].map(s => (
                  <div key={s.label} className="ps-ab-signal-item">
                    <span className="ps-ab-signal-icon">{s.icon}</span>
                    <div>
                      <div className="ps-ab-signal-label">{s.label}</div>
                      <div className="ps-ab-signal-action">{s.action}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ===== SKILL MARKETPLACE TAB ===== */}
      {tab === 'skills' && (
        <Suspense fallback={<div className="page-loading" />}>
          <SkillMarketTab />
        </Suspense>
      )}

      {/* ===== SKILL AUCTION TAB ===== */}
      {tab === 'auction' && (
        <Suspense fallback={<div className="page-loading" />}>
          <AuctionTab />
        </Suspense>
      )}

      {/* ===== SHOP APPLICATIONS TAB ===== */}
      {tab === 'shopapps' && (
        <Suspense fallback={<div className="page-loading" />}>
          <ShopAppsTab />
        </Suspense>
      )}

      {/* ===== SALESFORCE CRM TAB ===== */}
      {tab === 'salesforce' && (
        <Suspense fallback={<div className="page-loading" />}>
          <SalesforceTab />
        </Suspense>
      )}

      {/* ===== CUSTOMER PERSONA TAB ===== */}
      {tab === 'cxpersona' && (
        <Suspense fallback={<div className="page-loading" />}>
          <CXPersonaTab data={data} />
        </Suspense>
      )}

      {/* ===== FINANCIAL FORECAST TAB ===== */}
      {tab === 'forecast' && (() => {
        const effectiveChurn = fcastChurnOverride ?? churnPct;
        const baseGrowth     = fcastGrowthRate;

        // 3 scenarios: conservative, base, optimistic
        const SCEN = [
          { key: 'conservative', label: '🛡️ Conservative', factor: 0.5, color: '#94a3b8' },
          { key: 'base',         label: '📊 Base',          factor: 1.0, color: 'var(--accent)' },
          { key: 'optimistic',   label: '🚀 Optimistic',    factor: 2.0, color: 'var(--green)' },
        ] as const;

        function project(growthFactor: number) {
          const g = (baseGrowth * growthFactor) / 100;
          const c = effectiveChurn / 100;
          let cur = mrr || 50000;
          const pts: number[] = [cur];
          for (let i = 1; i < 12; i++) {
            cur = Math.round(cur * (1 + g) * (1 - c) + cur * g);
            pts.push(cur);
          }
          return pts;
        }

        const scenData = SCEN.map(s => ({ ...s, pts: project(s.factor) }));
        const allVals  = scenData.flatMap(s => s.pts);
        const maxVal   = Math.max(...allVals);
        const MONTHS   = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

        // Chart dimensions
        const W = 540, H = 160, PAD = 40;
        const xStep  = (W - PAD) / 11;
        function cx(i: number) { return PAD + i * xStep; }
        function cy(v: number) { return H - PAD - ((v / maxVal) * (H - PAD - 10)); }
        function polyline(pts: number[]) {
          return pts.map((v, i) => `${cx(i)},${cy(v)}`).join(' ');
        }

        // Milestones
        const MILESTONES = [100000, 250000, 500000, 1000000];

        return (
          <div className="fc-wrap">
            <div className="fc-header">
              <div className="fc-header-title">📈 Financial Forecasting — 12 เดือนข้างหน้า</div>
              <div className="fc-header-sub">จำลองการเติบโตจาก MRR ปัจจุบัน ด้วย 3 สถานการณ์</div>
            </div>

            {/* Controls */}
            <div className="fc-controls">
              <div className="fc-control-group">
                <label className="fc-ctrl-label">Growth Rate (สมาชิกใหม่/เดือน %)</label>
                <div className="fc-ctrl-row">
                  <input type="range" min={1} max={30} value={fcastGrowthRate}
                    onChange={e => setFcastGrowthRate(Number(e.target.value))} />
                  <span className="fc-ctrl-val">{fcastGrowthRate}%</span>
                </div>
              </div>
              <div className="fc-control-group">
                <label className="fc-ctrl-label">Churn Rate (%/เดือน)</label>
                <div className="fc-ctrl-row">
                  <input type="range" min={1} max={20}
                    value={fcastChurnOverride ?? churnPct}
                    onChange={e => setFcastChurnOverride(Number(e.target.value))} />
                  <span className="fc-ctrl-val">{fcastChurnOverride ?? churnPct}%</span>
                  {fcastChurnOverride !== null && (
                    <button className="fc-reset-btn" onClick={() => setFcastChurnOverride(null)}>Reset</button>
                  )}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="fc-chart-wrap">
              <svg viewBox={`0 0 ${W} ${H}`} className="fc-chart">
                {/* Milestone lines */}
                {MILESTONES.filter(m => m < maxVal).map(m => (
                  <g key={m}>
                    <line x1={PAD} y1={cy(m)} x2={W} y2={cy(m)} stroke="var(--ink4)" strokeDasharray="4 4" strokeWidth="1" />
                    <text x={PAD - 4} y={cy(m) + 4} textAnchor="end" fontSize="9" fill="var(--ink3)">
                      {m >= 1000000 ? `฿${m/1000000}M` : `฿${m/1000}k`}
                    </text>
                  </g>
                ))}
                {/* Month labels */}
                {MONTHS.map((m, i) => (
                  <text key={m} x={cx(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--ink3)">{m}</text>
                ))}
                {/* Scenario lines */}
                {scenData.map(s => (
                  <g key={s.key}>
                    <polyline points={polyline(s.pts)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" />
                    {s.pts.map((v, i) => (
                      <circle key={i} cx={cx(i)} cy={cy(v)} r="3" fill={s.color} />
                    ))}
                  </g>
                ))}
              </svg>
              <div className="fc-legend">
                {scenData.map(s => (
                  <div key={s.key} className="fc-legend-item">
                    <span className="fc-legend-dot" style={{ background: s.color }} />
                    <span>{s.label}</span>
                    <span className="fc-legend-final">{baht(s.pts[11])}/เดือน</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scenario detail cards */}
            <div className="fc-scen-grid">
              {scenData.map(s => {
                const finalMrr  = s.pts[11];
                const finalArr  = finalMrr * 12;
                const milestone = MILESTONES.find(m => s.pts.findIndex(v => v >= m) >= 0);
                const milMonth  = milestone ? s.pts.findIndex(v => v >= milestone) : -1;
                return (
                  <div key={s.key} className="fc-scen-card" style={{ borderTop: `3px solid ${s.color}` }}>
                    <div className="fc-scen-label" style={{ color: s.color }}>{s.label}</div>
                    <div className="fc-scen-mrr">{baht(finalMrr)}<span>/เดือน</span></div>
                    <div className="fc-scen-arr">ARR {baht(finalArr)}</div>
                    {milestone && milMonth >= 0 && (
                      <div className="fc-scen-milestone">
                        🎯 ถึง {milestone >= 1000000 ? `฿${milestone/1000000}M` : `฿${milestone/1000}k`} ในเดือนที่ {milMonth + 1}
                      </div>
                    )}
                    <div className="fc-scen-growth">
                      Growth: {(((finalMrr / (mrr || 50000)) - 1) * 100).toFixed(0)}% ใน 12 เดือน
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sensitivity: churn impact */}
            <div className="fc-section">
              <div className="fc-section-title">📉 ผลกระทบของ Churn Rate ต่อ ARR (12 เดือน)</div>
              <div className="fc-table-wrap">
                <table className="fc-table">
                  <thead><tr>
                    <th>Churn/เดือน</th>
                    <th>Lifespan</th>
                    <th>ARR Conservative</th>
                    <th>ARR Base</th>
                    <th>ARR Optimistic</th>
                  </tr></thead>
                  <tbody>
                    {[1,2,3,5,7,10].map(c => {
                      const rows2 = SCEN.map(s => {
                        function proj2(f: number) {
                          const g = (baseGrowth * f) / 100; const ch = c / 100;
                          let cur2 = mrr || 50000;
                          for (let i = 0; i < 12; i++) cur2 = Math.round(cur2 * (1 + g) * (1 - ch) + cur2 * g);
                          return cur2;
                        }
                        return proj2(s.factor);
                      });
                      const isCur = c === (fcastChurnOverride ?? churnPct);
                      return (
                        <tr key={c} style={isCur ? { background: 'var(--cream3)', fontWeight: 700 } : {}}>
                          <td>{c}% {isCur ? '← ปัจจุบัน' : ''}</td>
                          <td>{Math.round(1/(c/100))} เดือน</td>
                          {rows2.map((v, i) => <td key={i}>{baht(v * 12)}</td>)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LTV impact */}
            <div className="fc-section">
              <div className="fc-section-title">💡 Insight: ทุก 1% ที่ลด Churn เพิ่ม LTV เท่าไหร่?</div>
              <div className="fc-insights">
                {[
                  { label: 'Growth LTV ที่ Churn 5%', val: baht(clvGrowth), cls: '' },
                  { label: 'Growth LTV ถ้า Churn ลดเป็น 4%', val: baht(Math.round(gpProfit / 0.04)), cls: 'fc-insight-green' },
                  { label: 'เพิ่มขึ้น', val: baht(Math.round(gpProfit / 0.04) - clvGrowth), cls: 'fc-insight-green' },
                  { label: 'Max CAC ที่ยั่งยืน (3:1)', val: baht(maxCacGrowth), cls: '' },
                ].map(ins => (
                  <div key={ins.label} className={`fc-insight-item ${ins.cls}`}>
                    <div className="fc-insight-label">{ins.label}</div>
                    <div className="fc-insight-val">{ins.val}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        );
      })()}

      {/* ===== GRANT/LOAN PROPOSAL TAB ===== */}
      {tab === 'proposal' && (() => {
        const vrio        = data.vrio ?? [];
        const bmc         = data.businessModel?.bmc;
        const aiCo        = data.aiCompany;
        const mktStrategy = data.marketing;
        const vrioStars   = vrio.filter(v => v.v && v.r && v.i && v.o);
        const channels    = (mktStrategy?.channels ?? []).filter(c => c.active);

        const BANK_OPTIONS = [
          { id: 'sme',      name: 'ธนาคาร SME Bank',       rate: 5.5,  maxYrs: 7  },
          { id: 'exim',     name: 'EXIM Bank',              rate: 4.5,  maxYrs: 10 },
          { id: 'kasikorn', name: 'KBank SME',              rate: 6.25, maxYrs: 5  },
          { id: 'bot',      name: 'ออมสิน (SME Loan)',       rate: 4.0,  maxYrs: 7  },
        ] as const;
        const bank = BANK_OPTIONS.find(b => b.id === proposalBank) ?? BANK_OPTIONS[0];
        const monthlyRate  = bank.rate / 100 / 12;
        const monthlyPmt   = proposalLoanAmt > 0 && monthlyRate > 0
          ? Math.round(proposalLoanAmt * monthlyRate / (1 - Math.pow(1 + monthlyRate, -proposalLoanTerm)))
          : 0;
        const totalRepay   = monthlyPmt * proposalLoanTerm;
        const totalInterest = totalRepay - proposalLoanAmt;
        const dscr         = (mrr > 0 && monthlyPmt > 0) ? (mrr / monthlyPmt).toFixed(2) : '—';

        return (
          <div className="prop-wrap">

            {/* Config bar */}
            <div className="prop-config">
              <div className="prop-config-group">
                <label>สถาบันการเงิน</label>
                <select value={proposalBank} onChange={e => setProposalBank(e.target.value as typeof proposalBank)}>
                  {BANK_OPTIONS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="prop-config-group">
                <label>วงเงินกู้ (฿)</label>
                <input type="number" value={proposalLoanAmt} min={100000} step={50000}
                  onChange={e => setProposalLoanAmt(Number(e.target.value))} />
              </div>
              <div className="prop-config-group">
                <label>ระยะเวลา (เดือน)</label>
                <select value={proposalLoanTerm} onChange={e => setProposalLoanTerm(Number(e.target.value))}>
                  {[12,24,36,48,60,84].filter(t => t <= bank.maxYrs * 12).map(t =>
                    <option key={t} value={t}>{t} เดือน ({t/12} ปี)</option>
                  )}
                </select>
              </div>
              <div className="prop-config-group">
                <label>วัตถุประสงค์</label>
                <input type="text" value={proposalPurpose} onChange={e => setProposalPurpose(e.target.value)} />
              </div>
            </div>

            {/* Loan summary */}
            <div className="prop-summary">
              {[
                { label: 'วงเงินกู้',       val: baht(proposalLoanAmt) },
                { label: 'อัตราดอกเบี้ย',  val: `${bank.rate}% ต่อปี` },
                { label: 'งวดชำระ/เดือน',  val: baht(monthlyPmt) },
                { label: 'ดอกเบี้ยรวม',    val: baht(totalInterest) },
                { label: 'รวมทั้งสิ้น',     val: baht(totalRepay) },
                { label: 'DSCR (MRR/งวด)', val: `${dscr}x`, note: Number(dscr) >= 1.5 ? '✅ ผ่านเกณฑ์' : '⚠️ ต่ำ' },
              ].map(s => (
                <div key={s.label} className="prop-sum-item">
                  <div className="prop-sum-label">{s.label}</div>
                  <div className="prop-sum-val">{s.val}</div>
                  {s.note && <div className={`prop-sum-note ${Number(dscr) >= 1.5 ? 'green' : 'warn'}`}>{s.note}</div>}
                </div>
              ))}
            </div>

            {/* ===== Document ===== */}
            <div className="prop-doc">

              {/* Cover */}
              <div className="prop-doc-section prop-cover">
                <div className="prop-cover-logo">🤖</div>
                <div className="prop-cover-name">{aiCo?.name || 'CEO AI Thailand'}</div>
                <div className="prop-cover-title">แผนธุรกิจและคำขอสินเชื่อ</div>
                <div className="prop-cover-bank">{bank.name} | วงเงิน {baht(proposalLoanAmt)}</div>
                <div className="prop-cover-date">วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>

              {/* 1. Executive Summary */}
              <div className="prop-doc-section">
                <div className="prop-section-num">1</div>
                <div className="prop-section-title">บทสรุปผู้บริหาร</div>
                <p className="prop-body">
                  {aiCo?.name || 'CEO AI Thailand'} เป็นแพลตฟอร์ม AI SaaS สำหรับ SME ไทย
                  ให้บริการระบบวางแผนธุรกิจอัตโนมัติด้วย AI ในราคา ฿1,490–฿5,900/เดือน
                  ปัจจุบันมีรายได้ประจำ MRR {baht(mrr || 75000)}/เดือน
                  และมีสมาชิก {totalSubs || 50} ราย
                </p>
                <p className="prop-body">
                  บริษัทขอสินเชื่อจำนวน {baht(proposalLoanAmt)} จาก{bank.name}
                  เพื่อ{proposalPurpose} ระยะเวลา {proposalLoanTerm} เดือน
                  อัตราดอกเบี้ย {bank.rate}% ต่อปี ผ่อนชำระ {baht(monthlyPmt)}/เดือน
                </p>
                <div className="prop-kpi-row">
                  {[
                    { label: 'MRR', val: baht(mrr || 75000) },
                    { label: 'LTV:CAC', val: `${ltvcacGrowth.toFixed(1)}x` },
                    { label: 'Win Stories', val: `${winStories.length} เรื่อง` },
                    { label: 'Gross Margin', val: `${grossMargin.toFixed(1)}%` },
                  ].map(k => (
                    <div key={k.label} className="prop-kpi-item">
                      <div className="prop-kpi-val">{k.val}</div>
                      <div className="prop-kpi-label">{k.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Business Overview */}
              <div className="prop-doc-section">
                <div className="prop-section-num">2</div>
                <div className="prop-section-title">รายละเอียดธุรกิจ</div>
                <div className="prop-field-grid">
                  <div className="prop-field"><span>ประเภทธุรกิจ</span>{aiCo?.industry || 'AI SaaS / Digital Platform'}</div>
                  <div className="prop-field"><span>โมเดลรายได้</span>Subscription (MRR) + API Usage</div>
                  <div className="prop-field"><span>กลุ่มเป้าหมาย</span>SME ไทย พนักงาน 10–200 คน / Consultants</div>
                  <div className="prop-field"><span>Mission</span>{(aiCo?.mission || aiCo?.goal || 'สร้างระบบ AI ที่เข้าใจธุรกิจไทย').slice(0, 100)}</div>
                </div>
                {bmc?.value && bmc.value.length > 0 && (
                  <>
                    <div className="prop-sub-title">คุณค่าที่นำเสนอ (Value Proposition)</div>
                    <ul className="prop-list">{bmc.value.slice(0, 4).map((v, i) => <li key={i}>{v}</li>)}</ul>
                  </>
                )}
              </div>

              {/* 3. Market Analysis */}
              <div className="prop-doc-section">
                <div className="prop-section-num">3</div>
                <div className="prop-section-title">การวิเคราะห์ตลาด</div>
                <div className="prop-field-grid">
                  <div className="prop-field"><span>ตลาดเป้าหมาย (TAM)</span>SME ไทย 3.1 ล้านราย × ฿1,490 = ฿46B/ปี</div>
                  <div className="prop-field"><span>SOM ระยะ 3 ปี</span>฿30M ARR (0.065% market share)</div>
                  <div className="prop-field"><span>CAGR ตลาด AI SaaS (SEA)</span>28.5% ต่อปี (2024–2028)</div>
                  <div className="prop-field"><span>คู่แข่งหลัก</span>Zapier, Monday.com AI, Custom GPT Teams</div>
                </div>
                {channels.length > 0 && (
                  <>
                    <div className="prop-sub-title">ช่องทางการตลาดที่ใช้งานอยู่</div>
                    <table className="prop-table">
                      <thead><tr><th>Channel</th><th>Leads/เดือน</th><th>CPL</th><th>Conv Rate</th></tr></thead>
                      <tbody>
                        {channels.slice(0, 4).map(c => (
                          <tr key={c.id}>
                            <td>{c.name}</td>
                            <td>{c.leadsPerMonth}</td>
                            <td>{baht(c.cpl)}</td>
                            <td>{c.convRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>

              {/* 4. VRIO / Competitive Advantage */}
              <div className="prop-doc-section">
                <div className="prop-section-num">4</div>
                <div className="prop-section-title">ความได้เปรียบในการแข่งขัน (VRIO Analysis)</div>
                <p className="prop-body">
                  บริษัทมีทรัพยากรและความสามารถที่ผ่านเกณฑ์ VRIO ครบทั้ง 4 ข้อ (Valuable, Rare, Inimitable, Organized)
                  จำนวน {vrioStars.length} รายการ ซึ่งสร้าง Sustained Competitive Advantage ในตลาด AI สำหรับ SME ไทย
                </p>
                {vrioStars.length > 0 && (
                  <ul className="prop-list">
                    {vrioStars.slice(0, 4).map(v => <li key={v.id}><b>{v.resource}</b> — {v.note}</li>)}
                  </ul>
                )}
                {winStories.length > 0 && (
                  <>
                    <div className="prop-sub-title">ผลลัพธ์จากลูกค้าจริง (Win Stories)</div>
                    <table className="prop-table">
                      <thead><tr><th>ลูกค้า</th><th>ผลลัพธ์หลัก</th><th>ระยะเวลา</th></tr></thead>
                      <tbody>
                        {winStories.slice(0, 4).map(w => (
                          <tr key={w.id}>
                            <td>{w.customerName}</td>
                            <td>{w.headlineMetric}</td>
                            <td>{w.timeline}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>

              {/* 5. Financial Plan */}
              <div className="prop-doc-section">
                <div className="prop-section-num">5</div>
                <div className="prop-section-title">แผนการเงิน</div>
                <div className="prop-field-grid">
                  <div className="prop-field"><span>MRR ปัจจุบัน</span>{baht(mrr || 75000)}</div>
                  <div className="prop-field"><span>ARR ปัจจุบัน</span>{baht((mrr || 75000) * 12)}</div>
                  <div className="prop-field"><span>Gross Margin</span>{grossMargin.toFixed(1)}%</div>
                  <div className="prop-field"><span>LTV:CAC (Growth)</span>{ltvcacGrowth.toFixed(1)}x</div>
                  <div className="prop-field"><span>Payback Period</span>{paybackGrowth} เดือน</div>
                  <div className="prop-field"><span>ARR คาดการณ์ 12 เดือน</span>{baht(project12MrrBase() * 12)}</div>
                </div>
                <div className="prop-sub-title">แผนการใช้เงินกู้</div>
                <ul className="prop-list">
                  <li>พัฒนาระบบ AI และ Infrastructure 40% — {baht(proposalLoanAmt * 0.40)}</li>
                  <li>Marketing & Customer Acquisition 35% — {baht(proposalLoanAmt * 0.35)}</li>
                  <li>ทีมงาน (Engineering + Sales) 20% — {baht(proposalLoanAmt * 0.20)}</li>
                  <li>สำรองฉุกเฉิน 5% — {baht(proposalLoanAmt * 0.05)}</li>
                </ul>
                <div className="prop-sub-title">ความสามารถในการชำระหนี้</div>
                <div className="prop-field-grid">
                  <div className="prop-field"><span>งวดชำระ/เดือน</span>{baht(monthlyPmt)}</div>
                  <div className="prop-field"><span>DSCR (MRR ÷ งวด)</span>{dscr}x {Number(dscr) >= 1.5 ? '✅' : '⚠️'}</div>
                  <div className="prop-field"><span>งวดชำระ % of MRR</span>{mrr > 0 ? pct(monthlyPmt, mrr) : '—'}</div>
                  <div className="prop-field"><span>Breakeven เพิ่มสมาชิก</span>
                    {Math.ceil(monthlyPmt / (gp.price - gp.cost))} ราย Growth plan
                  </div>
                </div>
              </div>

              {/* 6. Risk */}
              <div className="prop-doc-section">
                <div className="prop-section-num">6</div>
                <div className="prop-section-title">การวิเคราะห์และบริหารความเสี่ยง</div>
                <table className="prop-table">
                  <thead><tr><th>ความเสี่ยง</th><th>ระดับ</th><th>มาตรการรับมือ</th></tr></thead>
                  <tbody>
                    {[
                      { risk: 'Customer Churn สูง', level: '⚠️ กลาง', mitigation: 'Onboarding ที่ดี + Win Story documentation + VRIO competitive moat' },
                      { risk: 'Competition จากต่างชาติ', level: '🟡 ต่ำ-กลาง', mitigation: 'Thai-first positioning + ภาษาไทย + ราคาที่เหมาะกับ SME ไทย' },
                      { risk: 'AI Cost ผันผวน (API)', level: '⚠️ กลาง', mitigation: 'Cost cap per plan + multi-vendor LLM strategy' },
                      { risk: 'Cash Flow ขาด', level: '🟢 ต่ำ', mitigation: `DSCR ${dscr}x — MRR ปัจจุบันรองรับงวดชำระได้` },
                    ].map((r, i) => (
                      <tr key={i}><td>{r.risk}</td><td>{r.level}</td><td>{r.mitigation}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="prop-print-hint">💡 กด Ctrl+P (หรือ ⌘+P) เพื่อพิมพ์เอกสารนี้</div>

          </div>
        );

        function project12MrrBase() {
          const g = fcastGrowthRate / 100; const c = churnPct / 100;
          let cur = mrr || 50000;
          for (let i = 0; i < 12; i++) cur = Math.round(cur * (1 + g) * (1 - c) + cur * g);
          return cur;
        }
      })()}

      {/* ===== GTM STRATEGY TAB ===== */}
      {tab === 'gtm' && (
        <Suspense fallback={<div className="page-loading" />}>
          <GTMTab data={data} onUpdate={onUpdate} />
        </Suspense>
      )}

      {/* ===== SEO STRATEGY TAB ===== */}
      {tab === 'seo' && (
        <Suspense fallback={<div className="page-loading" />}>
          <SEOTab data={data} onUpdate={onUpdate} />
        </Suspense>
      )}

      {/* ===== CASE STUDIES IMPORT TAB ===== */}
      {tab === 'casestudies' && (
        <Suspense fallback={<div className="page-loading" />}>
          <CaseStudyTab data={data} onUpdate={onUpdate} />
        </Suspense>
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

              {/* ===== สรุปผลการดำเนินงานของ User ===== */}
              <div className="ops-panel">
                <div className="ops-hd">
                  <div className="ops-title">📊 สรุปผลการดำเนินงานของ User</div>
                  <div className="ops-actions">
                    <button className="ops-btn" onClick={loadOps} disabled={opsLoading}>
                      {opsLoading ? 'กำลังสรุป…' : '📊 โหลดสรุปผลการดำเนินงาน'}
                    </button>
                    {opsRows.length > 0 && (
                      <>
                        <button className="ops-btn ghost" onClick={downloadOpsCsv}>⬇️ ดาวน์โหลด CSV</button>
                        <button className="ops-btn ghost" onClick={copyOpsTsv}>📋 คัดลอกลง Google Sheets</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="ops-sub">โหลดข้อมูลจริงของทุกเวิร์กสเปซ (รายได้/รายจ่าย/งาน/ดีล/เมือง) แล้ว export เป็น CSV หรือวางลง Google Sheets ได้</div>
                {opsMsg && <div className="ops-msg">{opsMsg}</div>}

                {opsRows.length > 0 && (() => {
                  const t = opsTotals(opsRows);
                  return (
                    <>
                      <div className="ops-kpis">
                        <div className="ops-kpi"><div className="ops-kpi-n">{t.workspaces}</div><div className="ops-kpi-l">เวิร์กสเปซ</div></div>
                        <div className="ops-kpi"><div className="ops-kpi-n">{t.activeCompanies}</div><div className="ops-kpi-l">บริษัทที่ระบบรัน</div></div>
                        <div className="ops-kpi"><div className="ops-kpi-n">{t.paying}</div><div className="ops-kpi-l">แพ็กมีเงิน</div></div>
                        <div className="ops-kpi"><div className="ops-kpi-n">{fmtBaht(t.revenue)}</div><div className="ops-kpi-l">รายได้รวม</div></div>
                        <div className="ops-kpi"><div className="ops-kpi-n">{fmtBaht(t.net)}</div><div className="ops-kpi-l">กำไรสุทธิรวม</div></div>
                        <div className="ops-kpi"><div className="ops-kpi-n">{t.dealsClosed}</div><div className="ops-kpi-l">ดีลปิด</div></div>
                        <div className="ops-kpi"><div className="ops-kpi-n">{t.tasksDone}</div><div className="ops-kpi-l">งานเสร็จ</div></div>
                      </div>
                      <div className="ops-table-wrap">
                        <table className="ops-table">
                          <thead><tr>
                            <th>บริษัท</th><th>เจ้าของ</th><th>แพ็ก</th><th>สถานะ</th>
                            <th>รายได้</th><th>รายจ่าย</th><th>กำไร</th>
                            <th>งานเสร็จ</th><th>ดีลปิด</th><th>มูลค่าดีล</th>
                            <th>เอเจนต์</th><th>เมือง</th><th>ต่อเนื่อง</th>
                          </tr></thead>
                          <tbody>
                            {opsRows.map((r, i) => (
                              <tr key={i}>
                                <td className="ops-name">{r.name}</td>
                                <td className="ops-owner">{r.owner}</td>
                                <td><span className="ops-plan">{r.planLabel}</span></td>
                                <td>{r.subStatus}</td>
                                <td>{fmtBaht(r.revenue)}</td>
                                <td>{fmtBaht(r.expense)}</td>
                                <td className={r.net >= 0 ? 'ops-pos' : 'ops-neg'}>{fmtBaht(r.net)}</td>
                                <td>{r.tasksDone}/{r.tasksTotal}</td>
                                <td>{r.dealsClosed}</td>
                                <td>{fmtBaht(r.dealsValue)}</td>
                                <td>{r.agents}{r.running ? ' 🟢' : ''}</td>
                                <td>{r.cityTier}</td>
                                <td>{r.streak}🔥</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}

                {expAgg && expAgg.optIn > 0 && (
                  <div className="exp-agg">
                    <div className="exp-agg-head">
                      <div className="exp-agg-title">💓 Pulse &amp; A/B — อะไรทำให้ “อยากใช้งานต่อ”</div>
                      <div className="exp-agg-meta">
                        ยินยอมเข้าร่วม {expAgg.optIn}/{expAgg.total} · pulse รวม {expAgg.pulseN} ครั้ง ·
                        ความรู้สึกเฉลี่ยทั้งระบบ <b>{expAgg.pulseN ? expAgg.pulseAvg.toFixed(2) : '—'}</b>/3
                      </div>
                    </div>
                    <div className="ops-actions" style={{ marginTop: 10 }}>
                      <button className="ops-btn ghost" onClick={downloadExpCsv}>⬇️ ดาวน์โหลดผล A/B (CSV)</button>
                      <button className="ops-btn ghost" onClick={copyExpTsv}>📋 คัดลอกผล A/B ลง Google Sheets</button>
                    </div>
                    {expAgg.reports.map(rep => (
                      <div key={rep.experiment} className="exp-report">
                        <div className="exp-q">❓ {rep.question}</div>
                        <div className="exp-variants">
                          {rep.variants.map(v => {
                            const win = rep.winner === v.variant;
                            return (
                              <div key={v.variant} className={`exp-variant${win ? ' exp-win' : ''}`}>
                                <div className="exp-variant-top">
                                  <span className="exp-variant-label">{v.variantLabel}</span>
                                  {win && <span className="exp-win-tag">▲ ชนะ</span>}
                                </div>
                                <div className="exp-variant-head">{v.headline}</div>
                                <div className="exp-metric-row">
                                  <div className="exp-metric">
                                    <div className="exp-metric-n">{v.activationRate}%</div>
                                    <div className="exp-metric-l">อยากทำต่อ ({v.activated}/{v.exposed})</div>
                                  </div>
                                  <div className="exp-metric">
                                    <div className="exp-metric-n">{v.pulseN ? v.pulseAvg.toFixed(2) : '—'}</div>
                                    <div className="exp-metric-l">pulse เฉลี่ย /3 (n={v.pulseN})</div>
                                  </div>
                                </div>
                                <div className="exp-bar" title={`😄 ${v.good} · 🙂 ${v.meh} · 😕 ${v.bad}`}>
                                  {v.pulseN > 0 ? (<>
                                    <span style={{ flex: v.good, background: 'var(--green)' }} />
                                    <span style={{ flex: v.meh, background: 'var(--amber)' }} />
                                    <span style={{ flex: v.bad, background: 'var(--red)' }} />
                                  </>) : <span className="exp-bar-empty">ยังไม่มี pulse</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {!rep.winner && <div className="exp-note">ข้อมูลยังไม่พอชี้ผู้ชนะ — ต้องมีผู้เข้าร่วมมากขึ้นทั้งสองกลุ่ม</div>}
                      </div>
                    ))}
                    <div className="exp-note">วัดจากผู้ที่ยินยอมเท่านั้น · ไม่ระบุตัวตน · เทียบเฉพาะ proxy ของความอยากใช้งานต่อ (activation + ความรู้สึก) แบบซื่อสัตย์</div>
                  </div>
                )}
                {expAgg && expAgg.optIn === 0 && opsRows.length > 0 && (
                  <div className="ops-msg">💓 ยังไม่มีผู้ใช้ยินยอมเข้าร่วม Pulse &amp; A/B — ผลจะแสดงเมื่อมีผู้เปิดใช้</div>
                )}

                {retention && retention.withData > 0 && (
                  <div className="exp-agg">
                    <div className="exp-agg-head">
                      <div className="exp-agg-title">🔁 Retention Cohort รายสัปดาห์ — pulse สูง = กลับมาใช้ต่อจริงไหม?</div>
                      <div className="exp-agg-meta">แบ่งกลุ่มตามความรู้สึกเฉลี่ย · มีข้อมูลพอวัด {retention.withData} คน</div>
                    </div>
                    <div className="ret-insight">💡 {retention.insight}</div>
                    <div className="ops-table-wrap">
                      <table className="ops-table ret-table">
                        <thead><tr>
                          <th>กลุ่ม (sentiment)</th><th>คน</th><th>pulse เฉลี่ย</th>
                          <th>กลับใน 7 วัน</th><th>กลับใน 14 วัน</th><th>สัปดาห์ active เฉลี่ย</th>
                          {Array.from({ length: retention.weeks }, (_, w) => <th key={w}>W{w}</th>)}
                        </tr></thead>
                        <tbody>
                          {retention.cohorts.map(c => (
                            <tr key={c.cohort}>
                              <td className="ops-name">{c.label}</td>
                              <td>{c.users}</td>
                              <td>{c.users ? c.avgPulse.toFixed(2) : '—'}</td>
                              <td className={c.users ? (c.returned7 >= 50 ? 'ops-pos' : 'ops-neg') : ''}>{c.users ? c.returned7 + '%' : '—'}</td>
                              <td>{c.users ? c.returned14 + '%' : '—'}</td>
                              <td>{c.users ? c.avgActiveWeeks.toFixed(1) : '—'}</td>
                              {c.curve.map((v, w) => (
                                <td key={w} className="ret-cell">
                                  {v == null ? <span className="ret-na">–</span> : (
                                    <span className="ret-chip" style={{ background: `color-mix(in srgb, var(--green) ${v}%, transparent)` }}>{v}%</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="exp-note">
                      W0–W{retention.weeks - 1} = % ที่ยัง active ในสัปดาห์ที่ 0..{retention.weeks - 1} นับจากวันแรกที่เข้าร่วม ·
                      “–” = สัปดาห์ยังมาไม่ถึง (ไม่นับเป็น churn) · วัดจากผู้ยินยอมเท่านั้น ไม่ระบุตัวตน
                    </div>
                  </div>
                )}
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

      {/* ===== ACTIVATE TAB ===== */}
      {tab === 'activate' && (
        <div className="adm-activate">
          <div className="adm-act-hd">💳 เปิดใช้งานสมาชิกด้วยตนเอง (Manual Activation)</div>
          <div className="adm-act-desc">
            ใช้เมื่อลูกค้าชำระเงินผ่านโอนธนาคาร / PromptPay และแอดมินยืนยันสลิปแล้ว
            — ระบบจะบันทึกใบแจ้งหนี้ "paid" และเปิดแพ็กให้ทันที
          </div>

          {!isSupabaseEnabled ? (
            <div className="team-notice">ต้องเปิดใช้ Supabase ก่อนจึงจะเปิดใช้งานสมาชิกได้</div>
          ) : (
            <div className="adm-act-form">
              <div className="adm-act-field">
                <label className="adm-act-label">เวิร์กสเปซ (Workspace ID)</label>
                <select
                  className="adm-act-select"
                  value={actWsId}
                  onChange={e => setActWsId(e.target.value)}
                >
                  <option value="">— เลือกเวิร์กสเปซ —</option>
                  {rows.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {r.owner_email}
                    </option>
                  ))}
                </select>
                {rows.length === 0 && (
                  <div className="adm-act-hint">
                    ยังไม่มีข้อมูลเวิร์กสเปซ — ไปที่แท็บ "เวิร์กสเปซ" ก่อนเพื่อโหลดข้อมูล หรือพิมพ์ ID เองด้านล่าง
                  </div>
                )}
                <input
                  className="adm-act-input"
                  placeholder="หรือพิมพ์ Workspace ID โดยตรง (UUID)"
                  value={actWsId}
                  onChange={e => setActWsId(e.target.value)}
                />
              </div>

              <div className="adm-act-field">
                <label className="adm-act-label">แพ็กที่เปิดใช้งาน</label>
                <div className="adm-act-plan-btns">
                  {([
                    { id: 'growth', label: 'Growth — ฿1,490/เดือน', price: 1490 },
                    { id: 'scale',  label: 'Scale — ฿5,900/เดือน',  price: 5900 },
                  ] as const).map(p => (
                    <button
                      key={p.id}
                      className={`adm-act-plan-btn${actPlan === p.id ? ' active' : ''}`}
                      onClick={() => { setActPlan(p.id); setActAmount(p.price); }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="adm-act-field">
                <label className="adm-act-label">ยอดที่รับชำระจริง (บาท)</label>
                <input
                  type="number"
                  className="adm-act-input"
                  value={actAmount}
                  onChange={e => setActAmount(Number(e.target.value))}
                  min={0}
                />
              </div>

              <div className="adm-act-field">
                <label className="adm-act-label">หมายเหตุ (ไม่บังคับ)</label>
                <input
                  className="adm-act-input"
                  placeholder="เช่น โอนเข้า Kbank xxx วันที่ 30/06/2569"
                  value={actNote}
                  onChange={e => setActNote(e.target.value)}
                />
              </div>

              <button
                className="adm-act-submit"
                onClick={handleActivate}
                disabled={actBusy || !actWsId}
              >
                {actBusy ? 'กำลังบันทึก…' : '✅ ยืนยันการชำระและเปิดใช้งาน'}
              </button>

              {actMsg && (
                <div className={`adm-act-msg${actMsg.ok ? ' ok' : ' err'}`}>
                  {actMsg.text}
                </div>
              )}

              <div className="adm-act-warn">
                ⚠️ การดำเนินการนี้จะอัปเดตข้อมูลใน Supabase ทันที
                — ตรวจสอบสลิปจากลูกค้าก่อนกดยืนยันทุกครั้ง
              </div>
            </div>
          )}
        </div>
      )}

      {isSupabaseEnabled && (
        <div className="adm-activate">
          <div className="adm-act-hd">💸 คืนเงิน (Refund)</div>
          <div className="adm-act-desc">
            บันทึกการคืนเงิน invoice ที่จ่ายแล้ว (เต็ม/บางส่วน) — คืนเต็มจำนวนจะเพิกถอนสิทธิ์แพ็กอัตโนมัติ
            {PAYMENT.xenditLive
              ? ' · ระบบเชื่อม Xendit แล้ว — คืนเงินจริงอัตโนมัติผ่าน edge function'
              : ' · ระหว่างรอ Xendit KYC: คืนเงินให้ลูกค้าด้วยตนเอง (โอนกลับ) แล้วบันทึกที่นี่'}
          </div>
          <div className="adm-act-form">
            <div className="adm-act-field">
              <label className="adm-act-label">เวิร์กสเปซ (Workspace ID)</label>
              <input className="adm-act-input" placeholder="workspace uuid" value={refWsId}
                onChange={e => setRefWsId(e.target.value.trim())} />
            </div>
            <div className="adm-act-field">
              <label className="adm-act-label">รหัส invoice (xenditId หรือ invoice id)</label>
              <input className="adm-act-input" placeholder="เช่น xnd_inv_... หรือ inv-..." value={refRef}
                onChange={e => setRefRef(e.target.value.trim())} />
            </div>
            <div className="adm-act-field">
              <label className="adm-act-label">ยอดที่คืน (บาท)</label>
              <input className="adm-act-input" type="number" min={0} value={refAmount}
                onChange={e => setRefAmount(Math.max(0, Number(e.target.value)))} />
            </div>
            <div className="adm-act-field">
              <label className="adm-act-label">เหตุผล (ไม่บังคับ)</label>
              <input className="adm-act-input" placeholder="เช่น ลูกค้าขอยกเลิกภายใน 7 วัน" value={refReason}
                onChange={e => setRefReason(e.target.value)} />
            </div>

            <button className="adm-act-submit" onClick={handleRefund} disabled={refBusy || !refWsId || !refRef || refAmount <= 0}>
              {refBusy ? 'กำลังบันทึก…' : '💸 บันทึกการคืนเงิน'}
            </button>
            {refMsg && <div className={`adm-act-msg${refMsg.ok ? ' ok' : ' err'}`}>{refMsg.text}</div>}
            <div className="adm-act-warn">
              ⚠️ คืนเต็มจำนวน = เพิกถอนสิทธิ์แพ็ก (subscription → canceled) ทันที — ตรวจสอบก่อนยืนยัน
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
