import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AppData, PageId } from './types';
import { DEFAULT_DATA } from './data';
import { defaultExperiments, recordActiveDay } from './lib/experiments';
import { isSupabaseEnabled, supabase } from './lib/supabase';
import { ensureDefaultWorkspace, listWorkspaces, createWorkspace, wsLoad, wsSave, type Workspace } from './lib/workspaces';
import { setAgentWorkspace } from './lib/agentClient';
import { bumpStreak } from './lib/streak';
import { track } from './lib/analytics';
import { detectEmotionalMoment, type EmotionalMoment } from './lib/emotionalTriggers';
import Auth from './components/Auth';
import LandingPage from './pages/LandingPage';
import Sidebar from './components/Sidebar';
// perf: lazy-load เฉพาะตอนต้องใช้ (ไม่อยู่ใน critical path ของ first paint)
const AiAssist = lazy(() => import('./components/AiAssist'));
const JourneyGuide = lazy(() => import('./components/JourneyGuide'));
const Celebrate = lazy(() => import('./components/Celebrate'));
const BadgeGenerator = lazy(() => import('./components/BadgeGenerator'));
const CmdK = lazy(() => import('./components/CmdK'));
const OnboardingTour = lazy(() => import('./components/OnboardingTour'));
import UpgradeWall from './components/UpgradeWall';
import { canAccess, setAdminFullAccess } from './lib/access';
import { isSheetsCallback, handleSheetsCallback } from './lib/sheets';
import { isAdminEmail } from './config';
import LegalLinks from './components/LegalLinks';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const JourneyMap = lazy(() => import('./pages/JourneyMap'));
const Personas = lazy(() => import('./pages/Personas'));
const ContentPlan = lazy(() => import('./pages/ContentPlan'));
const PriorityActions = lazy(() => import('./pages/PriorityActions'));
const AIResearch = lazy(() => import('./pages/AIResearch'));
const ConversionFunnel = lazy(() => import('./pages/ConversionFunnel'));
const ROICalculator = lazy(() => import('./pages/ROICalculator'));
const BusinessModel = lazy(() => import('./pages/BusinessModel'));
const AICompany = lazy(() => import('./pages/AICompany'));
const Billing = lazy(() => import('./pages/Billing'));
const VRIO = lazy(() => import('./pages/VRIO'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const Team = lazy(() => import('./pages/Team'));
const Admin = lazy(() => import('./pages/Admin'));
const Marketing = lazy(() => import('./pages/Marketing'));
const ISO9001 = lazy(() => import('./pages/ISO9001'));
const CaseStudies = lazy(() => import('./pages/CaseStudies'));
const Factory = lazy(() => import('./pages/Factory'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Sipoc = lazy(() => import('./pages/Sipoc'));
const MyStorefront = lazy(() => import('./pages/MyStorefront'));
const Trade = lazy(() => import('./pages/Trade'));
const CompanyCity = lazy(() => import('./pages/CompanyCity'));
const Pulse = lazy(() => import('./pages/Pulse'));
const InterCityTrade = lazy(() => import('./pages/InterCityTrade'));

const STORAGE_KEY = 'cjux2';

// ลำดับหน้า (ตาม sidebar) สำหรับปุ่ม ย้อนกลับ / หน้าถัดไป ท้ายทุกหน้า
const PAGE_FLOW: { id: PageId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'city', label: 'เมืองบริษัท' },
  { id: 'citylevelup', label: 'เมือง · Level Up' },
  { id: 'pulse', label: 'Pulse & A/B' },
  { id: 'citytrade', label: 'การค้าระหว่างเมือง' },
  { id: 'aicompany', label: 'บริษัท AI' },
  { id: 'journey', label: 'Journey Map' },
  { id: 'funnel', label: 'Conversion Funnel' },
  { id: 'roi', label: 'ROI Calculator' },
  { id: 'personas', label: 'Personas' },
  { id: 'content', label: 'Content Plan' },
  { id: 'actions', label: 'Priority Actions' },
  { id: 'bmc', label: 'Business Model · MIT24' },
  { id: 'roadmap', label: 'Product Roadmap' },
  { id: 'marketing', label: 'กลยุทธ์การตลาด' },
  { id: 'vrio', label: 'VRIO Analysis' },
  { id: 'sipoc', label: 'SIPOC Process' },
  { id: 'market', label: 'Marketplace' },
  { id: 'storefront', label: 'หน้าร้านของฉัน' },
  { id: 'trade', label: 'ซื้อขาย B2B (RFQ)' },
  { id: 'team', label: 'ทีม / สมาชิก' },
  { id: 'factory', label: 'โรงงานอัจฉริยะ' },
  { id: 'billing', label: 'แพ็กเกจ & ชำระเงิน' },
  { id: 'analytics', label: 'SaaS Analytics' },
  { id: 'admin', label: 'ผู้ดูแลระบบ' },
  { id: 'iso9001', label: 'ISO 9001:2015 QMS' },
  { id: 'aisearch', label: 'AI Research' },
  { id: 'cases', label: 'Case Studies' },
];

/** เติม field ที่ขาดให้ครบตาม schema ปัจจุบัน (รองรับข้อมูลเก่า/จากคลาวด์) */
function migrate(parsed: AppData): AppData {
  if (!parsed.funnel) parsed.funnel = DEFAULT_DATA.funnel;
  if (!parsed.roi) parsed.roi = DEFAULT_DATA.roi;
  if (!parsed.businessModel) {
    parsed.businessModel = DEFAULT_DATA.businessModel;
  } else {
    if (!parsed.businessModel.bmc) parsed.businessModel.bmc = DEFAULT_DATA.businessModel.bmc;
    if (!parsed.businessModel.de24 || parsed.businessModel.de24.length < 24) {
      parsed.businessModel.de24 = DEFAULT_DATA.businessModel.de24;
    }
  }
  if (!parsed.aiCompany) parsed.aiCompany = DEFAULT_DATA.aiCompany;
  // ความปลอดภัย: ลบ API key ที่เคยถูกเก็บใน AppData (ย้ายไปเก็บ per-workspace แบบ RLS แล้ว)
  if (parsed.aiCompany?.integrations) {
    parsed.aiCompany.integrations = parsed.aiCompany.integrations.map(i => ({ ...i, apiKey: '' }));
  }
  if (!parsed.subscription) {
    parsed.subscription = DEFAULT_DATA.subscription;
  } else {
    const s = parsed.subscription;
    if (s.autoRenew === undefined) s.autoRenew = true;
    if (s.currentPeriodEnd === undefined) s.currentPeriodEnd = null;
    if (!s.invoices) s.invoices = [];
  }
  if (!parsed.vrio) parsed.vrio = DEFAULT_DATA.vrio;
  if (!parsed.marketplace) parsed.marketplace = DEFAULT_DATA.marketplace;
  if (!parsed.roadmap) parsed.roadmap = DEFAULT_DATA.roadmap;
  if (!parsed.winStories) parsed.winStories = DEFAULT_DATA.winStories;
  if (!parsed.marketing) parsed.marketing = DEFAULT_DATA.marketing;
  if (!parsed.feedback) parsed.feedback = DEFAULT_DATA.feedback;
  if (!parsed.gtmAuditChecks) parsed.gtmAuditChecks = DEFAULT_DATA.gtmAuditChecks;
  if (!parsed.iso9001) parsed.iso9001 = DEFAULT_DATA.iso9001;
  if (!parsed.sipoc) parsed.sipoc = DEFAULT_DATA.sipoc;
  if (!parsed.factory) {
    parsed.factory = DEFAULT_DATA.factory!;
  } else {
    if (!parsed.factory.tpm) parsed.factory.tpm = DEFAULT_DATA.factory!.tpm;
    if (!parsed.factory.inventory) {
      parsed.factory.inventory = DEFAULT_DATA.factory!.inventory;
    } else {
      // Migrate old InventoryItem (qty: number) → new format (lots: InventoryLot[])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsed.factory.inventory = (parsed.factory.inventory as any[]).map((item: any) => {
        if (!item.lots) {
          return {
            id: item.id, name: item.name, sku: item.sku ?? '',
            category: item.category, unit: item.unit,
            minQty: item.minQty, maxQty: item.maxQty ?? item.minQty * 3,
            location: item.location ?? '', supplier: item.supplier ?? '', costPerUnit: item.costPerUnit ?? 0,
            lots: [{ id: 'lot-init-' + item.id, lotNo: 'LOT-001', receivedDate: new Date().toISOString().slice(0, 10), mfgDate: '', expDate: null, qty: item.qty ?? 0 }],
          };
        }
        return { sku: '', maxQty: item.minQty * 3, supplier: '', costPerUnit: 0, ...item };
      });
    }
  }
  if (!parsed.experiments) parsed.experiments = defaultExperiments();
  return parsed;
}

function loadData(): AppData {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return migrate(JSON.parse(s) as AppData);
  } catch { /* empty */ }
  return JSON.parse(JSON.stringify(DEFAULT_DATA)) as AppData;
}

export default function App() {
  const [data, setData] = useState<AppData>(loadData);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  const [celebration, setCelebration] = useState<EmotionalMoment | null>(null);
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [activeStage, setActiveStage] = useState(0);
  const [activeMonth, setActiveMonth] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(() => localStorage.getItem('ceo_ai_nav_collapsed') === '1');
  const [showBadge, setShowBadge] = useState(false);
  const toggleNavCollapse = () => setNavCollapsed(v => {
    const next = !v;
    try { localStorage.setItem('ceo_ai_nav_collapsed', next ? '1' : '0'); } catch { /* noop */ }
    return next;
  });
  const [showAuth, setShowAuth] = useState(false);
  const [seenLanding, setSeenLanding] = useState(() => !!localStorage.getItem('ceo_ai_seen'));
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  // ===== Supabase session + workspaces =====
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseEnabled);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWs, setActiveWs] = useState<string | null>(null);

  // R8 — Durable Object ของ AI agent แยกต่อ workspace
  useEffect(() => { setAgentWorkspace(activeWs); }, [activeWs]);
  const cloudTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // แอดมินระบบ (support@b-tctraining.com) = ใช้แพ็กสูงสุด (Scale) ฟรี ไม่ต้องจ่าย
  useEffect(() => {
    setAdminFullAccess(isAdminEmail(session?.user.email ?? null));
  }, [session?.user.email]);

  // เมื่อล็อกอิน: หาเวิร์กสเปซเริ่มต้น + โหลดรายชื่อเวิร์กสเปซทั้งหมด
  useEffect(() => {
    if (!isSupabaseEnabled || !session) { setWorkspaces([]); setActiveWs(null); return; }
    let cancelled = false;
    (async () => {
      const def = await ensureDefaultWorkspace();
      const list = await listWorkspaces();
      if (cancelled) return;
      setWorkspaces(list);
      setActiveWs(prev => prev ?? def ?? list[0]?.id ?? null);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  // โหลดข้อมูลของเวิร์กสเปซที่เลือก — ถ้าคลาวด์ว่าง ให้ดันข้อมูลปัจจุบันขึ้นไป
  useEffect(() => {
    if (!isSupabaseEnabled || !activeWs) return;
    let cancelled = false;
    (async () => {
      const cloud = await wsLoad(activeWs);
      if (cancelled) return;
      if (cloud) {
        const merged = migrate(cloud);
        setData(merged);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* empty */ }
      } else {
        wsSave(activeWs, data);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWs]);

  // Auto-start 15-day trial for new users (Supabase mode, status=none)
  useEffect(() => {
    if (!isSupabaseEnabled || !session || data.subscription.status !== 'none') return;
    const trialEnd = new Date(Date.now() + 15 * 86400000).toISOString();
    const next = { ...data, subscription: { ...data.subscription, plan: 'free' as const, status: 'trial' as const, trialEndDate: trialEnd } };
    setData(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* empty */ }
    if (activeWs) wsSave(activeWs, next);
    showToast('ยินดีต้อนรับ! เริ่มทดลองใช้ฟรี 15 วันแล้ว 🎉');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, data.subscription.status, activeWs]);

  const showToast = useCallback((msg?: string) => {
    if (msg) setToastMsg(msg);
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => { setToastVisible(false); setToastMsg(''); }, msg ? 3000 : 1600);
  }, []);

  // กลับจากหน้ายินยอม Google (Sheets OAuth) — แลก token ฝั่ง server แล้วล้าง URL
  useEffect(() => {
    if (!isSheetsCallback()) return;
    if (isSupabaseEnabled && !session) return; // รอ session พร้อมก่อน
    handleSheetsCallback().then(r => {
      window.history.replaceState({}, '', '/');
      showToast(r.msg);
    });
  }, [session, showToast]);

  const updateData = useCallback((incoming: AppData) => {
    // ต่อ streak รายวันเมื่อทำงานจริง (แก้ข้อมูลครั้งแรกของวัน)
    let next = bumpStreak(incoming);
    if (next.streak && next.streak.count !== incoming.streak?.count) {
      track('streak_extended', { count: next.streak.count });
    }
    // บันทึกวัน active สำหรับ retention cohort (เฉพาะผู้ยินยอม Pulse — recordActiveDay guard เอง)
    if (next.experiments?.enabled) {
      const exp = recordActiveDay(next.experiments);
      if (exp !== next.experiments) next = { ...next, experiments: exp };
    }
    // Emotional trigger: ยิงการฉลอง/ให้กำลังใจทันทีเมื่อ 'เพิ่งข้าม' หมุดสำคัญ
    const moment = detectEmotionalMoment(dataRef.current, next);
    if (moment) { setCelebration(moment); track('emotional_trigger', { id: moment.id, tone: moment.tone }); }
    setData(next);
    try {
      const serial = JSON.stringify(next);
      requestAnimationFrame(() => {
        try { localStorage.setItem(STORAGE_KEY, serial); } catch { /* empty */ }
      });
    } catch { /* empty */ }
    // sync ขึ้นคลาวด์แบบ debounce เมื่อล็อกอิน + เลือกเวิร์กสเปซแล้ว
    if (isSupabaseEnabled && activeWs) {
      clearTimeout(cloudTimer.current);
      const ws = activeWs;
      cloudTimer.current = setTimeout(() => wsSave(ws, next), 800);
    }
    showToast();
  }, [showToast, activeWs]);

  async function handleCreateWorkspace(name: string) {
    const id = await createWorkspace(name);
    if (id) { setWorkspaces(await listWorkspaces()); setActiveWs(id); }
  }

  useEffect(() => () => { clearTimeout(toastTimer.current); clearTimeout(cloudTimer.current); }, []);

  // ติ๊ก Quest "เข้าตลาดธุรกิจ" + บันทึกหน้าที่เคยเปิด (ใช้ใน Journey Guide) เมื่อ navigate
  useEffect(() => {
    const vp = data.visitedPages ?? [];
    const onMarket = activePage === 'market' || activePage === 'storefront';
    const needMarket = onMarket && !data.visitedMarket;
    const needPage = !vp.includes(activePage);
    if (needMarket || needPage) {
      updateData({
        ...data,
        visitedMarket: data.visitedMarket || onMarket,
        visitedPages: needPage ? [...vp, activePage] : vp,
      });
    }
  }, [activePage, data, updateData]);

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cjplanner-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as AppData;
        if (!parsed.stages || !parsed.personas) throw new Error('invalid');
        updateData(migrate(parsed));
      } catch {
        alert('ไฟล์ไม่ถูกต้อง — กรุณาเลือกไฟล์ .json ที่ export จาก CJ Planner');
      }
    };
    reader.readAsText(file);
  }

  // Marketplace M2: ลิงก์ 'ขอใบเสนอราคา' จากหน้าร้านสาธารณะ → เปิดหน้า trade หลัง login
  const rfqParam = new URLSearchParams(window.location.search).get('rfq');
  if (rfqParam) {
    sessionStorage.setItem('rfq_seller', rfqParam);
    window.history.replaceState({}, '', '/');
    if (activePage !== 'trade') setActivePage('trade');
  }

  // หมายเหตุ: เส้นทางสาธารณะ (/b, /start, /shop, /legal…) ย้ายไปจัดการที่ Root.tsx แล้ว
  // (โหลดเฉพาะหน้านั้นโดยไม่ดึง supabase เข้ามาใน first paint)

  // Loading Supabase session
  if (isSupabaseEnabled && !authReady) {
    return <div className="auth-wrap"><div className="auth-loading">กำลังโหลด…</div></div>;
  }

  // โหมด Supabase (production): ยังไม่ล็อกอิน → หน้า Landing สาธารณะเป็น "ด่านแรก" เสมอ
  // ไม่บังคับ login ทันที — กดปุ่ม "เริ่ม/เข้าระบบ" ค่อยไปหน้า Auth (login เป็นด่านที่สอง)
  if (isSupabaseEnabled && !session) {
    if (showAuth) return <Auth onBack={() => setShowAuth(false)} />;
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  // โหมด local (ไม่มี backend): โชว์ landing ครั้งแรกครั้งเดียว แล้วเข้าแอปเลย
  if (!isSupabaseEnabled && !seenLanding) {
    return (
      <LandingPage
        onGetStarted={() => { localStorage.setItem('ceo_ai_seen', '1'); setSeenLanding(true); }}
      />
    );
  }

  const doneCount = data.actions.filter(a => a.done).length;

  return (
    <div className="app">
      <Suspense fallback={null}><Celebrate moment={celebration} onDone={() => setCelebration(null)} /></Suspense>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="เปิดเมนู">
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <Sidebar
        activePage={activePage}
        onNavigate={(p) => { setActivePage(p); setSidebarOpen(false); }}
        doneCount={doneCount}
        totalActions={data.actions.length}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onExport={exportData}
        onImportFile={importData}
        userEmail={session?.user.email ?? null}
        onSignOut={isSupabaseEnabled ? signOut : undefined}
        workspaces={workspaces}
        activeWs={activeWs}
        onSwitchWs={setActiveWs}
        onCreateWs={handleCreateWorkspace}
        data={data}
        collapsed={navCollapsed}
        onToggleCollapse={toggleNavCollapse}
      />

      <main className={`main${navCollapsed ? ' nav-collapsed' : ''}`}>
        <Suspense fallback={<div className="page-loading" />}>
        {activePage === 'dashboard' && <Dashboard data={data} onNavigate={setActivePage} onUpdate={updateData} wsId={activeWs} />}
        {activePage === 'journey' && (
          <JourneyMap data={data} activeStage={activeStage} onStageChange={setActiveStage} onUpdate={updateData} />
        )}
        {activePage === 'personas' && <Personas data={data} onUpdate={updateData} />}
        {activePage === 'content' && (
          <ContentPlan data={data} activeMonth={activeMonth} onMonthChange={setActiveMonth} onUpdate={updateData} />
        )}
        {activePage === 'actions' && <PriorityActions data={data} onUpdate={updateData} />}
        {activePage === 'aisearch' && (
          canAccess(data, 'aisearch')
            ? <AIResearch data={data} activeStage={activeStage} onAddToJourney={updateData} onNavigate={setActivePage} />
            : <UpgradeWall page="aisearch" data={data} onNavigate={setActivePage} />
        )}
        {activePage === 'funnel' && <ConversionFunnel data={data} onUpdate={updateData} />}
        {activePage === 'roi' && <ROICalculator data={data} onUpdate={updateData} />}
        {activePage === 'bmc' && <BusinessModel data={data} onUpdate={updateData} />}
        {activePage === 'aicompany' && <AICompany data={data} onUpdate={updateData} wsId={activeWs} />}
        {(activePage === 'city' || activePage === 'citylevelup') && <CompanyCity data={data} onNavigate={setActivePage} onUpdate={updateData} />}
        {activePage === 'pulse' && <Pulse data={data} onNavigate={setActivePage} onUpdate={updateData} />}
        {activePage === 'citytrade' && <InterCityTrade data={data} onUpdate={updateData} onNavigate={setActivePage} />}
        {activePage === 'billing' && <Billing data={data} onUpdate={updateData} wsId={activeWs} />}
        {activePage === 'vrio' && <VRIO data={data} onUpdate={updateData} />}
        {activePage === 'market' && (
          canAccess(data, 'market')
            ? <Marketplace data={data} onUpdate={updateData} />
            : <UpgradeWall page="market" data={data} onNavigate={setActivePage} />
        )}
        {activePage === 'roadmap' && <Roadmap data={data} onUpdate={updateData} />}
        {activePage === 'marketing' && <Marketing data={data} onUpdate={updateData} />}
        {activePage === 'team' && (
          canAccess(data, 'team')
            ? <Team activeWs={activeWs} workspaces={workspaces} currentUserId={session?.user.id ?? null} data={data}
                onDeleted={() => { window.location.href = '/'; }} />
            : <UpgradeWall page="team" data={data} onNavigate={setActivePage} />
        )}
        {activePage === 'admin' && (
          canAccess(data, 'admin')
            ? <Admin currentUserEmail={session?.user.email ?? null} data={data} onUpdate={updateData} />
            : <UpgradeWall page="admin" data={data} onNavigate={setActivePage} />
        )}
        {activePage === 'iso9001' && (
          canAccess(data, 'iso9001')
            ? <ISO9001 data={data} onUpdate={updateData} />
            : <UpgradeWall page="iso9001" data={data} onNavigate={setActivePage} />
        )}
        {activePage === 'cases' && <CaseStudies data={data} />}
        {activePage === 'analytics' && (
          canAccess(data, 'analytics')
            ? <Analytics data={data} />
            : <UpgradeWall page="analytics" data={data} onNavigate={setActivePage} />
        )}
        {activePage === 'factory' && <Factory data={data} onUpdate={updateData} />}
        {activePage === 'sipoc' && (
          canAccess(data, 'sipoc')
            ? <Sipoc data={data} onUpdate={updateData} />
            : <UpgradeWall page="sipoc" data={data} onNavigate={setActivePage} />
        )}
        {activePage === 'storefront' && <MyStorefront data={data} wsId={activeWs} onUpdate={updateData} onNavigate={setActivePage} />}
        {activePage === 'trade' && (
          canAccess(data, 'trade')
            ? <Trade data={data} wsId={activeWs} />
            : <UpgradeWall page="trade" data={data} onNavigate={setActivePage} />
        )}
        </Suspense>

        {/* ปุ่ม ย้อนกลับ / หน้าถัดไป — ลำดับตาม sidebar */}
        {(() => {
          const flow = PAGE_FLOW.filter(p => p.id !== 'admin' || isAdminEmail(session?.user.email ?? null));
          const idx = flow.findIndex(p => p.id === activePage);
          if (idx === -1) return null;
          const prev = flow[idx - 1];
          const next = flow[idx + 1];
          const go = (id: PageId) => { setActivePage(id); window.scrollTo({ top: 0 }); };
          return (
            <nav className="page-nav">
              {prev ? (
                <button className="page-nav-btn" onClick={() => go(prev.id)}>
                  <span className="page-nav-dir">← ย้อนกลับ</span>
                  <span className="page-nav-label">{prev.label}</span>
                </button>
              ) : <span className="page-nav-spacer" />}
              <span className="page-nav-pos">{idx + 1} / {flow.length}</span>
              {next ? (
                <button className="page-nav-btn next" onClick={() => go(next.id)}>
                  <span className="page-nav-dir">หน้าถัดไป →</span>
                  <span className="page-nav-label">{next.label}</span>
                </button>
              ) : <span className="page-nav-spacer" />}
            </nav>
          );
        })()}

        <footer className="app-footer">
          <span className="app-footer__name">B. Training Consultant (M.E.A) Co., Ltd.</span>
          <span className="app-footer__sep">·</span>
          <span>72/76 หมู่ที่ 1 ตำบลเนินพระ อำเภอเมืองระยอง จังหวัดระยอง 21000</span>
          <span className="app-footer__sep">·</span>
          <span>Tel. <a href="tel:0817817773" className="app-footer__link">0817817773</a></span>
          <span className="app-footer__sep">·</span>
          <a href="https://www.b-tctraining.com/" target="_blank" rel="noopener noreferrer" className="app-footer__link">
            www.b-tctraining.com
          </a>
          <span className="app-footer__sep">·</span>
          <LegalLinks linkClassName="app-footer__link" sep=" · " />
        </footer>
      </main>

      <div className={`toast ${toastVisible ? 'show' : ''}`}>
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7" />
        </svg>
        {toastMsg || (isSupabaseEnabled && session ? 'ซิงก์ขึ้นคลาวด์แล้ว' : 'บันทึกอัตโนมัติแล้ว')}
      </div>

      <button
        className="badge-fab"
        onClick={() => setShowBadge(true)}
        title="สร้าง Badge of Excellence"
      >
        🏆
      </button>

      {showBadge && (
        <Suspense fallback={null}>
          <BadgeGenerator
            defaultName={data.personas[0]?.name ?? ''}
            onClose={() => setShowBadge(false)}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <CmdK activePage={activePage} onNavigate={setActivePage} data={data} />
        <OnboardingTour onNavigate={setActivePage} />
        <AiAssist activePage={activePage} data={data} />
        <JourneyGuide data={data} onNavigate={setActivePage} onUpdate={updateData} />
      </Suspense>
    </div>
  );
}
