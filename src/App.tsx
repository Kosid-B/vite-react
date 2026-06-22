import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppData, PageId } from './types';
import { DEFAULT_DATA } from './data';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import JourneyMap from './pages/JourneyMap';
import Personas from './pages/Personas';
import ContentPlan from './pages/ContentPlan';
import PriorityActions from './pages/PriorityActions';
import AIResearch from './pages/AIResearch';
import ConversionFunnel from './pages/ConversionFunnel';
import ROICalculator from './pages/ROICalculator';

const STORAGE_KEY = 'cjux2';

function loadData(): AppData {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s) as AppData;
      if (!parsed.funnel) parsed.funnel = DEFAULT_DATA.funnel;
      if (!parsed.roi) parsed.roi = DEFAULT_DATA.roi;
      return parsed;
    }
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

  const showToast = useCallback(() => {
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 1600);
  }, []);

  const updateData = useCallback((next: AppData) => {
    setData(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    showToast();
  }, [showToast]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

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
        if (!parsed.funnel) parsed.funnel = DEFAULT_DATA.funnel;
        if (!parsed.roi) parsed.roi = DEFAULT_DATA.roi;
        updateData(parsed);
      } catch {
        alert('ไฟล์ไม่ถูกต้อง — กรุณาเลือกไฟล์ .json ที่ export จาก CJ Planner');
      }
    };
    reader.readAsText(file);
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
      </main>

      <div className={`toast ${toastVisible ? 'show' : ''}`}>
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path d="M5 13l4 4L19 7" />
        </svg>
        บันทึกอัตโนมัติแล้ว
      </div>
    </div>
  );
}
