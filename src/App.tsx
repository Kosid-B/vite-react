import { useState, useEffect, useRef, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AppData, PageId } from './types';
import { DEFAULT_DATA } from './data';
import { isSupabaseEnabled, supabase, cloudLoad, cloudSave } from './lib/supabase';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
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
  if (!parsed.subscription) parsed.subscription = DEFAULT_DATA.subscription;
  if (!parsed.vrio) parsed.vrio = DEFAULT_DATA.vrio;
  if (!parsed.marketplace) parsed.marketplace = DEFAULT_DATA.marketplace;
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
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  // ===== Supabase session =====
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseEnabled);
  const cloudTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // โหลดข้อมูลจากคลาวด์เมื่อล็อกอิน — ถ้าคลาวด์ว่าง ให้ดันข้อมูลปัจจุบันขึ้นไป
  useEffect(() => {
    if (!isSupabaseEnabled || !session) return;
    let cancelled = false;
    (async () => {
      const cloud = await cloudLoad();
      if (cancelled) return;
      if (cloud) {
        const merged = migrate(cloud);
        setData(merged);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
      } else {
        cloudSave(session.user.id, data);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

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
    // sync ขึ้นคลาวด์แบบ debounce เมื่อล็อกอินอยู่
    if (isSupabaseEnabled && session) {
      clearTimeout(cloudTimer.current);
      const uid = session.user.id;
      cloudTimer.current = setTimeout(() => cloudSave(uid, next), 800);
    }
    showToast();
  }, [showToast, session]);

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
  if (isSupabaseEnabled && authReady && !session) return <Auth />;
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
          <AIResearch data={data} activeStage={activeStage} onAddToJourney={updateData} />
        )}
        {activePage === 'funnel' && <ConversionFunnel data={data} onUpdate={updateData} />}
        {activePage === 'roi' && <ROICalculator data={data} onUpdate={updateData} />}
        {activePage === 'bmc' && <BusinessModel data={data} onUpdate={updateData} />}
        {activePage === 'aicompany' && <AICompany data={data} onUpdate={updateData} />}
        {activePage === 'billing' && <Billing data={data} onUpdate={updateData} />}
        {activePage === 'vrio' && <VRIO data={data} onUpdate={updateData} />}
        {activePage === 'market' && <Marketplace data={data} onUpdate={updateData} />}
      </main>

      <div className={`toast ${toastVisible ? 'show' : ''}`}>
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7" />
        </svg>
        {isSupabaseEnabled && session ? 'ซิงก์ขึ้นคลาวด์แล้ว' : 'บันทึกอัตโนมัติแล้ว'}
      </div>
    </div>
  );
}
