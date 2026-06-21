import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppData, PageId } from './types';
import { DEFAULT_DATA } from './data';
import Sidebar from './components/Sidebar';
import JourneyMap from './pages/JourneyMap';
import Personas from './pages/Personas';
import ContentPlan from './pages/ContentPlan';
import PriorityActions from './pages/PriorityActions';
import AIResearch from './pages/AIResearch';
import ConversionFunnel from './pages/ConversionFunnel';

const STORAGE_KEY = 'cjux2';

function loadData(): AppData {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s) as AppData;
      if (!parsed.funnel) parsed.funnel = DEFAULT_DATA.funnel;
      return parsed;
    }
  } catch {}
  return JSON.parse(JSON.stringify(DEFAULT_DATA)) as AppData;
}

export default function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [activePage, setActivePage] = useState<PageId>('journey');
  const [activeStage, setActiveStage] = useState(0);
  const [activeMonth, setActiveMonth] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
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

  const doneCount = data.actions.filter(a => a.done).length;

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        doneCount={doneCount}
        totalActions={data.actions.length}
      />

      <main className="main">
        {activePage === 'journey' && (
          <JourneyMap
            data={data}
            activeStage={activeStage}
            onStageChange={setActiveStage}
            onUpdate={updateData}
          />
        )}
        {activePage === 'personas' && (
          <Personas data={data} onUpdate={updateData} />
        )}
        {activePage === 'content' && (
          <ContentPlan
            data={data}
            activeMonth={activeMonth}
            onMonthChange={setActiveMonth}
            onUpdate={updateData}
          />
        )}
        {activePage === 'actions' && (
          <PriorityActions data={data} onUpdate={updateData} />
        )}
        {activePage === 'aisearch' && (
          <AIResearch
            data={data}
            activeStage={activeStage}
            onAddToJourney={updateData}
          />
        )}
        {activePage === 'funnel' && (
          <ConversionFunnel data={data} onUpdate={updateData} />
        )}
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
