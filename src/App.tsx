import './index.css';   // สไตล์ทั้งแอป — ย้ายมาจาก main.tsx เพื่อไม่ให้ marketing landing (`/`) โหลด index.css (~67KB)
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AppData, PageId } from './types';
import { DEFAULT_DATA } from './data';
import { defaultExperiments, recordActiveDay } from './lib/experiments';
import { isSupabaseEnabled, supabase } from './lib/supabase';
import { ensureDefaultWorkspace, listWorkspaces, createWorkspace, wsLoad, wsSave, type Workspace } from './lib/workspaces';
import { resolveWsLoad } from './lib/wsSync';
import { setAgentWorkspace } from './lib/agentClient';
import { bumpStreak } from './lib/streak';
import { rememberSourceOnce, readRememberedSource } from './lib/attribution';
import { readBizHint } from './lib/bizHint';
import { isRealActivation } from './lib/setupWizard';
import { track } from './lib/analytics';
import { detectEmotionalMoment, type EmotionalMoment } from './lib/emotionalTriggers';
import Auth from './components/Auth';
import LandingPage from './pages/LandingPage';
import SaveWorkPrompt from './components/SaveWorkPrompt';
import GoalChooser from './components/GoalChooser';
import AudienceChooser from './components/AudienceChooser';
import Sidebar from './components/Sidebar';
import ConversionNudge from './components/ConversionNudge';
import ShareMilestone from './components/ShareMilestone';
import WelcomeBackCard from './components/WelcomeBackCard';
// perf: lazy-load เฉพาะตอนต้องใช้ (ไม่อยู่ใน critical path ของ first paint)
const AiAssist = lazy(() => import('./components/AiAssist'));
const JourneyGuide = lazy(() => import('./components/JourneyGuide'));
const Celebrate = lazy(() => import('./components/Celebrate'));
const BadgeGenerator = lazy(() => import('./components/BadgeGenerator'));
const CmdK = lazy(() => import('./components/CmdK'));
const OnboardingTour = lazy(() => import('./components/OnboardingTour'));
import UpgradeWall from './components/UpgradeWall';
import { canAccess, setAdminFullAccess, setGuestFullAccess } from './lib/access';
import { isSheetsCallback, handleSheetsCallback } from './lib/sheets';
import { isLineCallback, handleLineCallback } from './lib/lineLogin';
import { isAdminEmail, INTEGRATIONS } from './config';
import { readPendingHandoff, applyPendingHandoff } from './lib/handoffClient';
import LegalLinks from './components/LegalLinks';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const JourneyMap = lazy(() => import('./pages/JourneyMap'));
const Personas = lazy(() => import('./pages/Personas'));
const ContentPlan = lazy(() => import('./pages/ContentPlan'));
const TrustContent = lazy(() => import('./pages/TrustContent'));
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
const BoardRoom = lazy(() => import('./pages/BoardRoom'));
const Resources = lazy(() => import('./pages/Resources'));
const PrivacyNotice = lazy(() => import('./pages/PrivacyNotice'));
const ComplianceCheck = lazy(() => import('./pages/ComplianceCheck'));
const Knowledge = lazy(() => import('./pages/Knowledge'));

const STORAGE_KEY = 'cjux2';

// ลำดับหน้า (ตาม sidebar) สำหรับปุ่ม ย้อนกลับ / หน้าถัดไป ท้ายทุกหน้า
const PAGE_FLOW: { id: PageId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'boardroom', label: 'ห้องบอร์ด' },
  { id: 'resources', label: 'ทรัพยากร' },
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
  { id: 'privacy', label: 'ตัวช่วย PDPA' },
  { id: 'compliance', label: 'AI ตรวจเอกสาร ISO/มอก.' },
  { id: 'knowledge', label: 'คลังความรู้ ISO/PDPA' },
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
  // ล้าง demo feedback ชุดเดิม (fb1–fb26) ที่เคย seed แล้ว save ค้างในข้อมูลผู้ใช้ — auto ครั้งเดียวตอนโหลด
  // ปลอดภัย: feedback จริงใช้ id = `fb${Date.now()}` (ตัวเลข 13 หลัก) จึงไม่ match fb1–fb26
  if (parsed.feedback?.entries?.length) {
    const isDemoFb = (id: string) => /^fb([1-9]|1[0-9]|2[0-6])$/.test(id);
    if (parsed.feedback.entries.some((e) => isDemoFb(e.id))) {
      parsed.feedback.entries = parsed.feedback.entries.filter((e) => !isDemoFb(e.id));
    }
  }
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
  if (!parsed.boardRoom) parsed.boardRoom = { decisions: [] };
  if (!parsed.resources) parsed.resources = { items: [], requests: [] };
  // Attribution: stamp วันสมัคร + ช่องทางที่มา (first-touch) ครั้งเดียวเมื่อยังไม่มี
  if (!parsed.signupAt) {
    parsed.signupAt = new Date().toISOString().slice(0, 10);
    const src = readRememberedSource();
    if (src) parsed.signupSource = src;
  }
  // ต่อเนื่อง Landing→แอป: prefill ชื่อบริษัทจากธุรกิจที่พิมพ์บน Landing (ครั้งเดียว, เฉพาะยังเป็นชื่อ seed)
  try {
    if (!localStorage.getItem('ceo_ai_biz_named') && parsed.aiCompany.name === DEFAULT_DATA.aiCompany.name) {
      const hint = readBizHint();
      if (hint) {
        parsed.aiCompany = { ...parsed.aiCompany, name: hint };
        localStorage.setItem('ceo_ai_biz_named', '1');
      }
    }
  } catch { /* noop */ }
  return parsed;
}

function loadData(): AppData {
  // จำช่องทางที่มา (utm/referrer) ก่อน migrate จะ stamp — first-touch
  try { rememberSourceOnce(window.location.search, document.referrer); } catch { /* empty */ }
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return migrate(JSON.parse(s) as AppData);
  } catch { /* empty */ }
  return migrate(JSON.parse(JSON.stringify(DEFAULT_DATA)) as AppData);
}

export default function App() {
  const [data, setData] = useState<AppData>(loadData);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  // ข้อมูลใน dataRef เป็นของ workspace ไหน (null = ยังไม่ผูก ws เช่นงาน guest) — กัน race สลับ ws เขียนข้ามกัน
  const dataWsRef = useRef<string | null>(null);
  const [celebration, setCelebration] = useState<EmotionalMoment | null>(null);
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [activeStage, setActiveStage] = useState(0);
  const [activeMonth, setActiveMonth] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [landingPreview, setLandingPreview] = useState(false);  // สมาชิกเปิดดูหน้าแนะนำ (เพื่อแชร์/แนะนำต่อ)
  const [navCollapsed, setNavCollapsed] = useState(() => localStorage.getItem('ceo_ai_nav_collapsed') === '1');
  const [showBadge, setShowBadge] = useState(false);
  const toggleNavCollapse = () => setNavCollapsed(v => {
    const next = !v;
    try { localStorage.setItem('ceo_ai_nav_collapsed', next ? '1' : '0'); } catch { /* noop */ }
    return next;
  });
  // เข้ามาจาก marketing landing (`/?enter=auth|guest`) — init สถานะจาก query ตั้งแต่แรก (กันกระพริบ LandingPage)
  const entryParam = (() => { try { return new URLSearchParams(window.location.search).get('enter'); } catch { return null; } })();
  const [showAuth, setShowAuth] = useState(entryParam === 'auth');
  const [seenLanding, setSeenLanding] = useState(() => !!localStorage.getItem('ceo_ai_seen'));
  // Guest mode (ลองก่อนสมัคร) — เข้าแอปด้วย localStorage โดยไม่ต้อง login (ลด friction #1)
  const [guestMode, setGuestMode] = useState(() => localStorage.getItem('ceo_ai_guest') === '1' || entryParam === 'guest');
  const startGuest = () => { try { localStorage.setItem('ceo_ai_guest', '1'); } catch { /* noop */ } track('guest_start', { via: 'button' }); setGuestMode(true); };
  // เข้ามาแบบ guest จาก landing → persist + ล้าง query ให้ URL สะอาด · วัด funnel: visitor → เริ่ม guest
  useEffect(() => {
    if (entryParam === 'guest') { try { localStorage.setItem('ceo_ai_guest', '1'); } catch { /* noop */ } track('guest_start', { via: 'link' }); }
    if (entryParam) { try { window.history.replaceState({}, '', window.location.pathname); } catch { /* noop */ } }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ออกจากโหมดทดลอง → ล้าง flag แล้วกลับไปหน้า Landing (กันคนติดอยู่ในโหมด guest ถาวร)
  const exitGuest = () => { try { localStorage.removeItem('ceo_ai_guest'); } catch { /* noop */ } track('guest_exit', {}); setShowAuth(false); setGuestMode(false); };
  // Aha-moment email capture (soft signup) — เก็บ lead ตอน guest เจอโมเมนต์ดีๆ
  const [leadCaptured, setLeadCaptured] = useState(() => localStorage.getItem('ceo_ai_lead') === '1');
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  // ===== Supabase session + workspaces =====
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseEnabled);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWs, setActiveWs] = useState<string | null>(null);

  // R8 — Durable Object ของ AI agent แยกต่อ workspace
  useEffect(() => { setAgentWorkspace(activeWs); }, [activeWs]);
  const cloudTimer = useRef<ReturnType<typeof setTimeout>>();
  // workspace ที่มีข้อมูลรอเซฟขึ้นคลาวด์ (ยังไม่ยืนยันสำเร็จ) — ใช้ flush ตอนปิดแท็บ + retry
  const pendingWsRef = useRef<string | null>(null);

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

  // ผู้ทดลอง (guest, ยังไม่ล็อกอิน) = ปลดล็อกฟีเจอร์เต็มให้สัมผัสคุณค่าก่อนสมัคร
  useEffect(() => {
    setGuestFullAccess(isSupabaseEnabled && !session && guestMode);
  }, [session, guestMode]);

  // Aha moment: guest เจอโมเมนต์ดีๆ (celebration) → เด้งขออีเมลบันทึกงาน (soft signup ครั้งเดียว)
  useEffect(() => {
    if (celebration && isSupabaseEnabled && !session && guestMode && !leadCaptured) {
      setShowSavePrompt(true);
    }
  }, [celebration, session, guestMode, leadCaptured]);

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

  // โหลดข้อมูลของเวิร์กสเปซที่เลือก — จัดการ race สลับ ws ไม่ให้ข้อมูลข้ามกัน
  useEffect(() => {
    if (!isSupabaseEnabled || !activeWs) return;
    const ws = activeWs;
    // 1) flush ข้อมูลค้างของ ws ก่อนหน้าให้เสร็จก่อนโหลด ws ใหม่ (กัน debounce timer เก่ายิงข้อมูล ws ใหม่ทับ ws เก่า)
    if (cloudTimer.current) { clearTimeout(cloudTimer.current); cloudTimer.current = undefined; }
    const pendingPrev = pendingWsRef.current;
    if (pendingPrev && pendingPrev !== ws) {
      void wsSave(pendingPrev, dataRef.current).then(ok => { if (ok && pendingWsRef.current === pendingPrev) pendingWsRef.current = null; });
    }
    let cancelled = false;
    (async () => {
      const cloud = await wsLoad(ws);
      if (cancelled) return;
      const local = dataRef.current;
      const merged = cloud ? migrate(cloud) : null;
      // แยก "ผูก ws นี้ตรง ๆ" (dataWs===ws) จาก "งาน guest ที่ยังไม่ผูก" (dataWs===null) —
      // เพื่อไม่ให้งาน guest ทับบัญชีจริงของผู้ใช้ที่กลับมาล็อกอิน แต่ยัง migrate ขึ้น ws ใหม่ที่คลาวด์ว่างได้
      const action = resolveWsLoad({
        hasCloud: !!cloud,
        cloudRev: merged?.rev ?? 0,
        localRev: local.rev ?? 0,
        localBelongsToThisWs: dataWsRef.current === ws,
        localIsUnbound: dataWsRef.current === null,
      });
      if (action === 'use-cloud' && merged) {
        setData(merged);
        dataRef.current = merged;
        dataWsRef.current = ws;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* empty */ }
      } else if (action === 'init-fresh-push') {
        // สลับมา ws ใหม่ที่คลาวด์ว่าง — เริ่มด้วยข้อมูลเริ่มต้น (ห้ามเอาข้อมูล ws เดิมมาปน)
        const fresh = migrate(JSON.parse(JSON.stringify(DEFAULT_DATA)) as AppData);
        setData(fresh);
        dataRef.current = fresh;
        dataWsRef.current = ws;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch { /* empty */ }
        pendingWsRef.current = ws;
        void wsSave(ws, fresh).then(ok => { if (ok && pendingWsRef.current === ws) pendingWsRef.current = null; });
      } else {
        // keep-local-push: local เป็นของ ws นี้ + ใหม่กว่า/คลาวด์ว่าง → เก็บ local แล้วดันขึ้น
        dataWsRef.current = ws;
        pendingWsRef.current = ws;
        void wsSave(ws, local).then(ok => { if (ok && pendingWsRef.current === ws) pendingWsRef.current = null; });
      }
    })();
    return () => { cancelled = true; };
  }, [activeWs]);

  // Auto-start 15-day trial for new users (Supabase mode, status=none)
  useEffect(() => {
    if (!isSupabaseEnabled || !session || data.subscription.status !== 'none') return;
    const trialEnd = new Date(Date.now() + 15 * 86400000).toISOString();
    const next = { ...data, rev: (data.rev ?? 0) + 1, subscription: { ...data.subscription, plan: 'free' as const, status: 'trial' as const, trialEndDate: trialEnd } };
    setData(next);
    dataRef.current = next;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* empty */ }
    if (activeWs) { pendingWsRef.current = activeWs; void wsSave(activeWs, next).then(ok => { if (ok) pendingWsRef.current = null; }); }
    showToast('ยินดีต้อนรับ! เริ่มทดลองใช้ฟรี 15 วันแล้ว 🎉');
    track('trial_started', { plan: 'free' }); // funnel: เริ่มทดลอง (ยิงครั้งเดียว — effect guard ด้วย status transition)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, data.subscription.status, activeWs]);

  // funnel: activation = ผู้ใช้ "ปรับบริษัทให้ต่างจาก demo seed" ครั้งแรก (ชื่อ/ประเภท/เป้าหมาย/ทีม) —
  // ยิงครั้งเดียว/เบราว์เซอร์ (localStorage guard). ⚠️ ห้ามยิงแค่ agents≥1 — seed มี 3 เอเจนต์ให้แล้ว = จะ activate 100% ทันที (วัดผิด)
  useEffect(() => {
    if (!isRealActivation(data)) return;
    try {
      if (localStorage.getItem('ceo_ai_activation_sent')) return;
      localStorage.setItem('ceo_ai_activation_sent', '1');
      track('activation', { agents: data.aiCompany.agents.length });
    } catch { /* noop */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.aiCompany?.name, data.aiCompany?.industry, data.aiCompany?.goal, data.aiCompany?.agents?.length]);

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

  // กลับจากหน้ายินยอม LINE Login — แลก code → เปิด session (ยังไม่ล็อกอิน จึงไม่รอ session)
  useEffect(() => {
    if (!isLineCallback()) return;
    handleLineCallback().then(r => { showToast(r.msg); });
  }, [showToast]);

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
    // rev เพิ่มขึ้นทุกครั้งที่แก้ (นับจากค่า local ปัจจุบัน) — ใช้กัน cloud เก่าทับ local ใหม่ตอน load
    next = { ...next, rev: (dataRef.current.rev ?? 0) + 1 };
    setData(next);
    dataRef.current = next;   // อัปเดตทันที ให้ flush/debounce ที่ยิงทีหลังได้ข้อมูลล่าสุดเสมอ
    try {
      const serial = JSON.stringify(next);
      requestAnimationFrame(() => {
        try { localStorage.setItem(STORAGE_KEY, serial); } catch { /* empty */ }
      });
    } catch { /* empty */ }
    // sync ขึ้นคลาวด์แบบ debounce เมื่อล็อกอิน + เลือกเวิร์กสเปซแล้ว
    if (isSupabaseEnabled && activeWs) {
      pendingWsRef.current = activeWs;   // มีข้อมูลรอเซฟ (เผื่อ flush ตอนปิดแท็บ)
      clearTimeout(cloudTimer.current);
      cloudTimer.current = setTimeout(() => {
        const ws = pendingWsRef.current;
        if (!ws) return;
        // ใช้ dataRef.current (ล่าสุดเสมอ) ไม่ใช่ closure เก่า
        wsSave(ws, dataRef.current).then(ok => {
          if (ok) { pendingWsRef.current = null; }
          else {
            // เซฟล้ม — คงสถานะ "รอเซฟ" ไว้ + เตือนจริง (เลิกหลอกว่าเซฟแล้ว) แล้ว retry อัตโนมัติ
            showToast('⚠️ ยังบันทึกขึ้นคลาวด์ไม่สำเร็จ — กำลังลองใหม่');
            clearTimeout(cloudTimer.current);
            cloudTimer.current = setTimeout(() => {
              const ws2 = pendingWsRef.current;
              if (ws2) wsSave(ws2, dataRef.current).then(ok2 => { if (ok2) pendingWsRef.current = null; });
            }, 4000);
          }
        });
      }, 800);
    }
    showToast();
  }, [showToast, activeWs]);

  // Dynamic landing → พาไปหน้าที่เลือกไว้ (ข้าม GoalChooser) เมื่อ hero ระบุเป้าหมายมา (เปิดร้าน/ทำธุรกิจ)
  // อ่าน hint จาก localStorage ที่ LandingPage เขียนตอนกดปุ่ม · ทำครั้งเดียว (ล้าง hint หลังใช้)
  useEffect(() => {
    if (!seenLanding && !guestMode) return;         // ยังไม่เข้าแอป
    if (dataRef.current.onboardGoal != null) return; // เลือกเป้าหมายไปแล้ว — ไม่ทับ
    let goal: string | null = null, page: string | null = null;
    try { goal = localStorage.getItem('ceo_ai_goal'); page = localStorage.getItem('ceo_ai_goal_page'); } catch { /* noop */ }
    if (!goal) return;
    try { localStorage.removeItem('ceo_ai_goal'); localStorage.removeItem('ceo_ai_goal_page'); } catch { /* noop */ }
    updateData({ ...dataRef.current, onboardGoal: goal as AppData['onboardGoal'] });
    if (page) setActivePage(page as PageId);
    track('landing_goal_routed', { goal, page: page ?? '' });
  }, [seenLanding, guestMode, updateData]);

  // Flush ข้อมูลที่ค้างขึ้นคลาวด์ทันที (ไม่รอ debounce) — เรียกตอนปิด/สลับแท็บ กันข้อมูลรอบสุดท้ายหลุด
  const flushCloud = useCallback(() => {
    if (cloudTimer.current) { clearTimeout(cloudTimer.current); cloudTimer.current = undefined; }
    const ws = pendingWsRef.current;
    if (!ws || !isSupabaseEnabled) return;
    void wsSave(ws, dataRef.current).then(ok => { if (ok) pendingWsRef.current = null; });
  }, []);

  // ปิดแท็บ / สลับไปแอปอื่น (มือถือ) → flush ทันที (บั๊กเดิม: debounce ถูกยกเลิกตอน unmount → ข้อมูลหาย)
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'hidden') flushCloud(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flushCloud);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flushCloud);
    };
  }, [flushCloud]);

  async function handleCreateWorkspace(name: string) {
    const id = await createWorkspace(name);
    if (id) { setWorkspaces(await listWorkspaces()); setActiveWs(id); }
  }

  useEffect(() => () => { clearTimeout(toastTimer.current); flushCloud(); }, [flushCloud]);

  // Context Handoff (theossphere): pre-fill แผน 24 ขั้นครั้งแรกหลังผู้ใช้พร้อม
  // gate ด้วย theossphereLive (=false → dead code) · one-shot · หน่วงให้ workspace โหลดเสร็จก่อน
  const handoffAppliedRef = useRef(false);
  useEffect(() => {
    if (!INTEGRATIONS.theossphereLive || handoffAppliedRef.current) return;
    if (isSupabaseEnabled && !session) return;          // รอ login ก่อน (supabase mode)
    if (!readPendingHandoff()) return;                  // ไม่มีแผนค้าง
    handoffAppliedRef.current = true;
    const t = setTimeout(() => {
      const next = applyPendingHandoff(dataRef.current); // อ่าน stash → planToAppData → ล้าง stash
      if (next) { updateData(next); showToast('นำแผนจาก theossphere มาเริ่มให้ทีม AI แล้ว 🎯'); }
    }, isSupabaseEnabled ? 1200 : 0);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, activeWs, session?.user.id, updateData]);

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
    // ยังไม่กด "ลองก่อน" → หน้า Landing (มีปุ่มสมัคร + ปุ่มลองใช้เลยไม่ต้องสมัคร)
    if (!guestMode) return <LandingPage onGetStarted={() => setShowAuth(true)} onTryGuest={startGuest} />;
    // guest → ตกลงไปเรนเดอร์แอปด้านล่าง (ทดลองใช้ด้วย localStorage) พร้อมแบนเนอร์ชวนสมัคร
  }

  // โหมด local (ไม่มี backend): โชว์ landing ครั้งแรกครั้งเดียว แล้วเข้าแอปเลย
  if (!isSupabaseEnabled && !seenLanding) {
    // local ไม่มี auth → guest กับ signup เข้าแอปเหมือนกัน · ส่ง onTryGuest ด้วยเพื่อให้
    // ปุ่ม "เริ่มใช้ฟรีทันที — ไม่ต้องสมัคร" โชว์บน preview/local เหมือน production (ไม่ env-gate)
    const enterApp = () => { localStorage.setItem('ceo_ai_seen', '1'); setSeenLanding(true); };
    return (
      <LandingPage
        onGetStarted={enterApp}
        onTryGuest={enterApp}
      />
    );
  }

  // สมาชิกเปิด "ดูหน้าแนะนำ" (แชร์/แนะนำต่อ) → โชว์ Landing พร้อมปุ่มกลับเข้าแอป
  if (landingPreview) {
    return (
      <LandingPage
        onGetStarted={() => setLandingPreview(false)}
        onTryGuest={() => setLandingPreview(false)}
        onExitPreview={() => setLandingPreview(false)}
      />
    );
  }

  const doneCount = data.actions.filter(a => a.done).length;

  // First-run ขั้นแรกสุด: "ขายให้ใคร?" (B2B/B2C) ก่อน — กัน Persona สับสน
  const firstRun = (data.visitedPages?.length ?? 0) <= 1;
  const showAudienceChooser = data.audienceType == null && firstRun;
  // ถัดมา: ผู้ใช้ใหม่ (เลือก audience แล้ว ยังไม่เลือกเป้าหมาย) → ถาม "วันนี้อยากทำอะไร?"
  const showGoalChooser = data.audienceType != null && data.onboardGoal == null && firstRun;
  // OnboardingTour: ไม่โชว์ให้คน "ดูภาพรวมก่อน" (explore) — กันเจอ modal ซ้อน (GoalChooser → Tour) ที่ทำให้คนหลุด
  // เหลือทัวร์เฉพาะผู้ใช้เดิมที่ยังไม่เคยเลือกเป้าหมาย (มาก่อนมี GoalChooser · ทัวร์ self-gate ของมันเองอยู่แล้ว)
  const showTour = data.onboardGoal == null && !showGoalChooser;

  return (
    <div className="app">
      {showAudienceChooser && (
        <AudienceChooser onPick={(t) => updateData({ ...data, audienceType: t })} />
      )}
      {showGoalChooser && (
        <GoalChooser
          onPick={(goal, page) => { updateData({ ...data, onboardGoal: goal }); setActivePage(page); }}
          onSkip={() => updateData({ ...data, onboardGoal: 'explore' })}
        />
      )}
      <Suspense fallback={null}><Celebrate moment={celebration} onDone={() => setCelebration(null)} /></Suspense>
      {showSavePrompt && (
        <SaveWorkPrompt onClose={() => setShowSavePrompt(false)} onCaptured={() => setLeadCaptured(true)} />
      )}
      {isSupabaseEnabled && !session && guestMode && (
        <div className="guest-bar">
          <button className="guest-back" onClick={exitGuest} aria-label="กลับหน้าแรก">← หน้าแรก</button>
          <span>🧪 กำลังทดลองใช้ · ข้อมูลเก็บในเครื่องนี้ชั่วคราว</span>
          <button onClick={() => { track('guest_signup_click', {}); setShowAuth(true); }}>
            สมัครฟรีเพื่อบันทึกงาน →
          </button>
        </div>
      )}
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
        onExitFocus={() => updateData({ ...data, focusDismissed: true })}
        onViewLanding={() => setLandingPreview(true)}
      />

      <main className={`main${navCollapsed ? ' nav-collapsed' : ''}`}>
        {!showAudienceChooser && !showGoalChooser && (
          <WelcomeBackCard data={data} onUpdate={updateData} onNavigate={setActivePage} />
        )}
        <ConversionNudge data={data} activePage={activePage} onNavigate={setActivePage} />
        <ShareMilestone data={data} wsId={activeWs} />
        <Suspense fallback={<div className="page-loading" />}>
        {activePage === 'dashboard' && <Dashboard data={data} onNavigate={setActivePage} onUpdate={updateData} wsId={activeWs} />}
        {activePage === 'journey' && (
          <JourneyMap data={data} activeStage={activeStage} onStageChange={setActiveStage} onUpdate={updateData} />
        )}
        {activePage === 'personas' && <Personas data={data} onUpdate={updateData} onNavigate={setActivePage} />}
        {activePage === 'content' && (
          <ContentPlan data={data} activeMonth={activeMonth} onMonthChange={setActiveMonth} onUpdate={updateData} />
        )}
        {activePage === 'trustcontent' && <TrustContent data={data} />}
        {activePage === 'actions' && <PriorityActions data={data} onUpdate={updateData} />}
        {activePage === 'aisearch' && (
          canAccess(data, 'aisearch')
            ? <AIResearch data={data} activeStage={activeStage} onAddToJourney={updateData} onNavigate={setActivePage} />
            : <UpgradeWall page="aisearch" data={data} onNavigate={setActivePage} />
        )}
        {activePage === 'funnel' && <ConversionFunnel data={data} onUpdate={updateData} />}
        {activePage === 'roi' && <ROICalculator data={data} onUpdate={updateData} />}
        {activePage === 'bmc' && <BusinessModel data={data} onUpdate={updateData} onNavigate={setActivePage} />}
        {activePage === 'aicompany' && <AICompany data={data} onUpdate={updateData} wsId={activeWs} />}
        {(activePage === 'city' || activePage === 'citylevelup') && <CompanyCity data={data} onNavigate={setActivePage} onUpdate={updateData} wsId={activeWs} />}
        {activePage === 'pulse' && <Pulse data={data} onNavigate={setActivePage} onUpdate={updateData} />}
        {activePage === 'boardroom' && <BoardRoom data={data} onNavigate={setActivePage} onUpdate={updateData} />}
        {activePage === 'resources' && <Resources data={data} onUpdate={updateData} onNavigate={setActivePage} />}
        {activePage === 'citytrade' && <InterCityTrade data={data} onUpdate={updateData} onNavigate={setActivePage} />}
        {activePage === 'billing' && <Billing data={data} onUpdate={updateData} wsId={activeWs} />}
        {activePage === 'vrio' && <VRIO data={data} onUpdate={updateData} />}
        {activePage === 'market' && (
          canAccess(data, 'market')
            ? <Marketplace data={data} onUpdate={updateData} />
            : <UpgradeWall page="market" data={data} onNavigate={setActivePage} />
        )}
        {activePage === 'roadmap' && <Roadmap data={data} onUpdate={updateData} onNavigate={setActivePage} />}
        {activePage === 'marketing' && <Marketing data={data} onUpdate={updateData} onNavigate={setActivePage} />}
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
            ? <ISO9001 data={data} onUpdate={updateData} onNavigate={setActivePage} />
            : <UpgradeWall page="iso9001" data={data} onNavigate={setActivePage} />
        )}
        {activePage === 'privacy' && (
          canAccess(data, 'privacy')
            ? <PrivacyNotice />
            : <UpgradeWall page="privacy" data={data} onNavigate={setActivePage} />
        )}
        {activePage === 'compliance' && (
          canAccess(data, 'compliance')
            ? <ComplianceCheck />
            : <UpgradeWall page="compliance" data={data} onNavigate={setActivePage} />
        )}
        {activePage === 'knowledge' && (
          canAccess(data, 'knowledge')
            ? <Knowledge />
            : <UpgradeWall page="knowledge" data={data} onNavigate={setActivePage} />
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
          <span>Email <a href="mailto:support@b-tctraining.com" className="app-footer__link">support@b-tctraining.com</a></span>
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
        {showTour && <OnboardingTour data={data} onNavigate={setActivePage} onUpdate={updateData} />}
        <AiAssist activePage={activePage} data={data} />
        <JourneyGuide data={data} onNavigate={setActivePage} onUpdate={updateData} />
      </Suspense>
    </div>
  );
}
