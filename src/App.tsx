import { useState, useEffect, useRef, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AppData, PageId } from './types';
import { DEFAULT_DATA } from './data';
import { isSupabaseEnabled, supabase } from './lib/supabase';
import { ensureDefaultWorkspace, listWorkspaces, createWorkspace, wsLoad, wsSave, type Workspace } from './lib/workspaces';
import Auth from './components/Auth';
import LandingPage from './pages/LandingPage';
import Sidebar from './components/Sidebar';
import AiAssist from './components/AiAssist';
import Dashboard from './pages/Dashboard';
import JourneyMap from './pages/JourneyMap';
import Personas from './pages/Personas';
import ContentPlan from './pages/ContentPlan';
import PriorityActions from './pages/PriorityActions';
import AIResearch from './pages/AIResearch';
import ConversionFunnel from './pages/ConversionFunnel';
import ROICalculator from './pages/ROICalculator';
import BusinessModel from './pages/BusinessModel';
import AICompany from './pages/AICompany';
import Billing from './pages/Billing';
import VRIO from './pages/VRIO';
import Marketplace from './pages/Marketplace';
import Roadmap from './pages/Roadmap';
import Team from './pages/Team';
import Admin from './pages/Admin';
import Marketing from './pages/Marketing';
import ISO9001 from './pages/ISO9001';
import CaseStudies from './pages/CaseStudies';
import BadgeGenerator from './components/BadgeGenerator';
import CmdK from './components/CmdK';

const STORAGE_KEY = 'cjux2';

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
  return parsed;
}

function loadData(): AppData {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return migrate(JSON.parse(s) as AppData);
  } catch {}
  return JSON.parse(JSON.stringify(DEFAULT_DATA)) as AppData;
}

export default function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [activeStage, setActiveStage] = useState(0);
  const [activeMonth, setActiveMonth] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  // ===== Supabase session + workspaces =====
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseEnabled);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWs, setActiveWs] = useState<string | null>(null);
  const cloudTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

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
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
      } else {
        wsSave(activeWs, data);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWs]);

  const showToast = useCallback(() => {
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 1600);
  }, []);

  const updateData = useCallback((next: AppData) => {
    setData(next);
    try {
      const serial = JSON.stringify(next);
      requestAnimationFrame(() => {
        try { localStorage.setItem(STORAGE_KEY, serial); } catch {}
      });
    } catch {}
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

  // หน้า Auth: เปิดใช้ Supabase แต่ยังไม่ได้ล็อกอิน
  if (isSupabaseEnabled && authReady && !session) {
    if (showAuth) return <Auth />;
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }
  if (isSupabaseEnabled && !authReady) {
    return <div className="auth-wrap"><div className="auth-loading">กำลังโหลด…</div></div>;
  }

  const doneCount = data.actions.filter(a => a.done).length;

  return (
    <div className="app">
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
      />

      <main className="main">
        {activePage === 'dashboard' && <Dashboard data={data} onNavigate={setActivePage} />}
        {activePage === 'journey' && (
          <JourneyMap data={data} activeStage={activeStage} onStageChange={setActiveStage} onUpdate={updateData} />
        )}
        {activePage === 'personas' && <Personas data={data} onUpdate={updateData} />}
        {activePage === 'content' && (
          <ContentPlan data={data} activeMonth={activeMonth} onMonthChange={setActiveMonth} onUpdate={updateData} />
        )}
        {activePage === 'actions' && <PriorityActions data={data} onUpdate={updateData} />}
        {activePage === 'aisearch' && (
          <AIResearch data={data} activeStage={activeStage} onAddToJourney={updateData} onNavigate={setActivePage} />
        )}
        {activePage === 'funnel' && <ConversionFunnel data={data} onUpdate={updateData} />}
        {activePage === 'roi' && <ROICalculator data={data} onUpdate={updateData} />}
        {activePage === 'bmc' && <BusinessModel data={data} onUpdate={updateData} />}
        {activePage === 'aicompany' && <AICompany data={data} onUpdate={updateData} />}
        {activePage === 'billing' && <Billing data={data} onUpdate={updateData} />}
        {activePage === 'vrio' && <VRIO data={data} onUpdate={updateData} />}
        {activePage === 'market' && <Marketplace data={data} onUpdate={updateData} />}
        {activePage === 'roadmap' && <Roadmap data={data} onUpdate={updateData} />}
        {activePage === 'marketing' && <Marketing data={data} onUpdate={updateData} />}
        {activePage === 'team' && <Team activeWs={activeWs} workspaces={workspaces} currentUserId={session?.user.id ?? null} data={data} />}
        {activePage === 'admin' && <Admin currentUserEmail={session?.user.email ?? null} data={data} onUpdate={updateData} />}
        {activePage === 'iso9001' && <ISO9001 data={data} onUpdate={updateData} />}
        {activePage === 'cases' && <CaseStudies />}

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
        </footer>
      </main>

      <div className={`toast ${toastVisible ? 'show' : ''}`}>
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7" />
        </svg>
        {isSupabaseEnabled && session ? 'ซิงก์ขึ้นคลาวด์แล้ว' : 'บันทึกอัตโนมัติแล้ว'}
      </div>

      <button
        className="badge-fab"
        onClick={() => setShowBadge(true)}
        title="สร้าง Badge of Excellence"
      >
        🏆
      </button>

      {showBadge && (
        <BadgeGenerator
          defaultName={data.personas[0]?.name ?? ''}
          onClose={() => setShowBadge(false)}
        />
      )}

      <CmdK activePage={activePage} onNavigate={setActivePage} data={data} />
      <AiAssist activePage={activePage} data={data} />
    </div>
  );
}
