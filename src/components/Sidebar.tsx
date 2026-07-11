import { useEffect, useRef, useState } from 'react';
import type { AppData, PageId } from '../types';
import type { Workspace } from '../lib/workspaces';
import { BRAND, COMPANY, isAdminEmail } from '../config';
import { canAccess, planLabel, PLAN_COLOR, PAGE_MIN_PLAN } from '../lib/access';
import MfaSetup from './MfaSetup';
import IsmsBadge from './IsmsBadge';
import AmbientMusic from './AmbientMusic';

interface Props {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  doneCount: number;
  totalActions: number;
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
  userEmail?: string | null;
  onSignOut?: () => void;
  workspaces?: Workspace[];
  activeWs?: string | null;
  onSwitchWs?: (id: string) => void;
  onCreateWs?: (name: string) => void;
  data?: AppData;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// เครื่องมือ — sub-menu ของ บริษัท AI · เรียงตาม "ลำดับขั้นการพัฒนาธุรกิจ" (ทำ 1 → 11 ตามนี้)
// 4 ระยะ: เข้าใจลูกค้า → ออกแบบธุรกิจ → วางแผนการตลาด → ลงมือ & วัดผล
const TOOL_ITEMS: { id: PageId; label: string; icon: string; desc: string; stage: string }[] = [
  // ระยะ 1 — เข้าใจลูกค้า & ตลาด
  { id: 'personas', label: 'ลูกค้าเป้าหมาย (Personas)', stage: 'เข้าใจลูกค้า & ตลาด', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    desc: 'ขั้น 1 · โปรไฟล์ลูกค้าในอุดมคติ — พฤติกรรม แรงจูงใจ และปัญหา (เริ่มจากรู้ว่าขายใคร)' },
  { id: 'journey', label: 'เส้นทางลูกค้า (Journey)', stage: 'เข้าใจลูกค้า & ตลาด', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    desc: 'ขั้น 2 · แผนที่เส้นทางลูกค้า 8 ขั้น — touchpoints, pain points และโอกาสในแต่ละ stage' },
  // ระยะ 2 — ออกแบบธุรกิจ
  { id: 'bmc', label: 'โมเดลธุรกิจ 24 ขั้น (MIT)', stage: 'ออกแบบธุรกิจ', icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
    desc: 'ขั้น 3 · กรอบสร้างธุรกิจ 24 ขั้นตอนของ MIT — Beachhead Market ถึง MVBP' },
  { id: 'vrio', label: 'จุดแข็งที่ยั่งยืน (VRIO)', stage: 'ออกแบบธุรกิจ', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    desc: 'ขั้น 4 · วิเคราะห์ความได้เปรียบเชิงแข่งขัน — Value, Rarity, Imitability, Organization' },
  // ระยะ 3 — วางแผนการตลาด
  { id: 'marketing', label: 'กลยุทธ์การตลาด', stage: 'วางแผนการตลาด', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
    desc: 'ขั้น 5 · วางแผนช่องทางการตลาด งบประมาณ และ CPL' },
  { id: 'content', label: 'แผนคอนเทนต์ (Content)', stage: 'วางแผนการตลาด', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    desc: 'ขั้น 6 · แผนคอนเทนต์รายเดือนต่อช่องทาง พร้อมหัวข้อและ keyword' },
  { id: 'funnel', label: 'กรวยลูกค้า (Funnel)', stage: 'วางแผนการตลาด', icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z',
    desc: 'ขั้น 7 · วิเคราะห์อัตราแปลงลูกค้าแต่ละขั้น หาจุดที่ lead หลุดมากที่สุด' },
  // ระยะ 4 — ลงมือ & วัดผล
  { id: 'sipoc', label: 'ผังกระบวนการ (SIPOC)', stage: 'ลงมือ & วัดผล', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    desc: 'ขั้น 8 · แผนผังกระบวนการ Supplier → Input → Process → Output → Customer หา Gap และคอขวด' },
  { id: 'actions', label: 'งานสำคัญก่อน (Actions)', stage: 'ลงมือ & วัดผล', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    desc: 'ขั้น 9 · รายการงานสำคัญเรียงตามความเร่งด่วน (P1–P3)' },
  { id: 'roi', label: 'คำนวณคุ้มทุน (ROI)', stage: 'ลงมือ & วัดผล', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    desc: 'ขั้น 10 · คำนวณผลตอบแทนการลงทุน เทียบต้นทุน–รายได้' },
  { id: 'roadmap', label: 'แผนพัฒนาสินค้า (Roadmap)', stage: 'ลงมือ & วัดผล', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
    desc: 'ขั้น 11 · แผนพัฒนาผลิตภัณฑ์รายไตรมาส จัดลำดับฟีเจอร์' },
];
const TOOL_PAGE_IDS = TOOL_ITEMS.map(t => t.id);
// หน้าในกลุ่ม "ธุรกิจ & การขาย" (ยุบได้)
const BIZ_PAGE_IDS: PageId[] = ['market', 'storefront', 'trade', 'team', 'factory', 'analytics'];

export default function Sidebar({ activePage, onNavigate, doneCount, totalActions, isOpen, onClose, onExport, onImportFile, userEmail, onSignOut, workspaces, activeWs, onSwitchWs, onCreateWs, data, collapsed, onToggleCollapse }: Props) {
  const pct = totalActions > 0 ? Math.round((doneCount / totalActions) * 100) : 0;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locked = (page: PageId) => !!(data && PAGE_MIN_PLAN[page] && !canAccess(data, page));
  const [toolsOpen, setToolsOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('ceo_ai_tools_open');
    return saved === null ? false : saved === '1';   // default ยุบไว้ — ค่อยกดเปิดตามลำดับขั้น (ลดความรกตอนเริ่มใช้)
  });
  const toggleTools = () => {
    setToolsOpen(o => {
      localStorage.setItem('ceo_ai_tools_open', o ? '0' : '1');
      return !o;
    });
  };
  // โหมดมือใหม่ — ซ่อนเมนูขั้นสูง (โรงงาน/ISO/RFQ/การค้าระหว่างเมือง/Pulse) ลดของล้นจอ
  // default: เปิดสำหรับผู้ใช้ที่เพิ่งเริ่ม (เปิดหน้าน้อยกว่า 3 หน้า) · แตะสลับได้เสมอ
  const [beginner, setBeginner] = useState<boolean>(() => {
    const saved = localStorage.getItem('ceo_ai_beginner');
    if (saved !== null) return saved === '1';
    return (data?.visitedPages?.length ?? 0) < 3;
  });
  const toggleBeginner = () => setBeginner(b => {
    localStorage.setItem('ceo_ai_beginner', b ? '0' : '1');
    return !b;
  });
  const ADVANCED_PAGES: PageId[] = ['pulse', 'citytrade', 'trade', 'factory', 'iso9001'];
  const hideAdv = (p: PageId) => beginner && ADVANCED_PAGES.includes(p);
  // กลุ่ม "ธุรกิจ & การขาย" — ยุบได้ ลดจำนวนเมนูที่เห็นพร้อมกัน (ลด surface area)
  const [bizOpen, setBizOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('ceo_ai_biz_open');
    return saved === null ? false : saved === '1';
  });
  const toggleBiz = () => setBizOpen(o => {
    localStorage.setItem('ceo_ai_biz_open', o ? '0' : '1');
    return !o;
  });
  // เปิด sub-menu อัตโนมัติเมื่ออยู่ในหน้าเครื่องมือ / หน้าในกลุ่มธุรกิจ
  useEffect(() => {
    if (TOOL_PAGE_IDS.includes(activePage)) setToolsOpen(true);
    if (BIZ_PAGE_IDS.includes(activePage)) setBizOpen(true);
  }, [activePage]);

  return (
    <nav className={`sidebar${isOpen ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-serif">{BRAND.product}</div>
        <div className="brand-sub">{BRAND.tagline}</div>
        <button className="sidebar-close" onClick={onClose} aria-label="ปิดเมนู">×</button>
        {onToggleCollapse && (
          <button className="sidebar-collapse" onClick={onToggleCollapse}
            aria-label={collapsed ? 'ขยายเมนู' : 'ยุบเมนู'} title={collapsed ? 'ขยายเมนู' : 'ยุบเมนู'}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {data && (() => {
          const label = planLabel(data);
          const planColor = PLAN_COLOR[data.subscription.plan];
          return (
            <div
              className="sidebar-plan-badge"
              style={{ background: `${planColor}18`, color: planColor, borderColor: `${planColor}35` }}
              onClick={() => onNavigate('billing')}
            >
              {label}
            </div>
          );
        })()}

        {onSwitchWs && workspaces && workspaces.length > 0 && (
          <div className="ws-switcher">
            <select className="ws-select" value={activeWs ?? ''} onChange={e => onSwitchWs(e.target.value)}>
              {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <button className="ws-new" title="สร้างบริษัท/เวิร์กสเปซใหม่"
              onClick={() => { const n = window.prompt('ชื่อบริษัท/เวิร์กสเปซใหม่'); if (n && onCreateWs) onCreateWs(n); }}>＋</button>
          </div>
        )}
      </div>

      <div className="nav-section">
        <div className="nav-label">✦ เริ่มที่นี่ · องค์กร AI</div>

        <div className="nav-parent">
          <button className={`nav-item ${activePage === 'aicompany' ? 'active' : ''}${data && !(data.visitedPages ?? []).includes('aicompany') ? ' nav-pulse' : ''}`} onClick={() => onNavigate('aicompany')}>
            <span className="nav-ico-wrap">
              <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m6-12h0m6 0h0m-6 4h0m6 0h0m-6 4h0m6 0h0" />
              </svg>
              <span className="nav-ai-live" aria-hidden="true" title="ทีม AI พร้อมทำงาน" />
            </span>
            บริษัท AI
            <span className="nav-dot" />
          </button>
          <button className={`nav-caret${toolsOpen ? ' open' : ''}`} onClick={toggleTools} aria-label={toolsOpen ? 'ซ่อนเครื่องมือ' : 'แสดงเครื่องมือ'}>
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <button className={`nav-item ${activePage === 'boardroom' ? 'active' : ''}`} onClick={() => onNavigate('boardroom')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M3 21h18M4 21V10l8-6 8 6v11M9 21v-6h6v6" />
          </svg>
          ห้องบอร์ด
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'resources' ? 'active' : ''}`} onClick={() => onNavigate('resources')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          ทรัพยากร
          <span className="nav-dot" />
        </button>

        {toolsOpen && (
          <div className="nav-sub">
            <div className="nav-label">เครื่องมือ · ทำตามลำดับ 1 → {TOOL_ITEMS.length}</div>
            {TOOL_ITEMS.map((t, i) => {
              const newStage = i === 0 || TOOL_ITEMS[i - 1].stage !== t.stage;
              return (
                <div key={t.id}>
                  {newStage && <div className="nav-stage">{t.stage}</div>}
                  <button className={`nav-item nav-item-tool ${activePage === t.id ? 'active' : ''}${locked(t.id) ? ' nav-locked' : ''}`}
                    onClick={() => onNavigate(t.id)}>
                    <span className="nav-step">{i + 1}</span>
                    <span className="nav-tool-text">
                      <span className="nav-tool-label">{t.label}</span>
                      <span className="nav-tool-desc">{t.desc}</span>
                    </span>
                    {locked(t.id) ? <span className="nav-lock">🔒</span> : <span className="nav-dot" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* กลุ่ม "ธุรกิจ & การขาย" — ยุบได้ ลดจำนวนเมนูที่เห็นพร้อมกัน */}
        <button className={`nav-item nav-group-toggle${bizOpen ? ' open' : ''}`} onClick={toggleBiz}
          aria-label={bizOpen ? 'ยุบกลุ่มธุรกิจ & การขาย' : 'ขยายกลุ่มธุรกิจ & การขาย'}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          ธุรกิจ &amp; การขาย
          <svg className="nav-group-caret" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2"><path d="M19 9l-7 7-7-7" /></svg>
        </button>
        {bizOpen && (
          <div className="nav-sub">
            <button className={`nav-item ${activePage === 'market' ? 'active' : ''}${locked('market') ? ' nav-locked' : ''}`} onClick={() => onNavigate('market')}>
              <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Marketplace
              {locked('market') ? <span className="nav-lock">🔒</span> : <span className="nav-dot" />}
            </button>

            <button className={`nav-item ${activePage === 'storefront' ? 'active' : ''}`} onClick={() => onNavigate('storefront')}
              title="หน้าร้านสาธารณะของธุรกิจคุณ — ลูกค้าเข้าชมและติดต่อได้โดยไม่ต้องล็อกอิน">
              <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M3 9l1-5h16l1 5M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0M5 9v11a1 1 0 001 1h12a1 1 0 001-1V9M9 21v-6h6v6" />
              </svg>
              หน้าร้านของฉัน
              <span className="nav-dot" />
            </button>

            {!hideAdv('trade') && (
            <button className={`nav-item ${activePage === 'trade' ? 'active' : ''}${locked('trade') ? ' nav-locked' : ''}`} onClick={() => onNavigate('trade')}
              title="ขอใบเสนอราคา (RFQ) จากธุรกิจในระบบ และติดตามออเดอร์ซื้อขาย">
              <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
              </svg>
              ซื้อขาย B2B (RFQ)
              {locked('trade') ? <span className="nav-lock">🔒</span> : <span className="nav-dot" />}
            </button>
            )}

            <button className={`nav-item ${activePage === 'team' ? 'active' : ''}${locked('team') ? ' nav-locked' : ''}`} onClick={() => onNavigate('team')}>
              <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              ทีม / สมาชิก
              {locked('team') ? <span className="nav-lock">🔒</span> : <span className="nav-dot" />}
            </button>

            {!hideAdv('factory') && (
            <button className={`nav-item ${activePage === 'factory' ? 'active' : ''}`} onClick={() => onNavigate('factory')}>
              <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 21V10.5M15 21V10.5M9 7h.01M15 7h.01M5 21V9.5l7-4 7 4V21" />
              </svg>
              โรงงานอัจฉริยะ
              <span className="nav-dot" />
            </button>
            )}

            <button className={`nav-item ${activePage === 'analytics' ? 'active' : ''}${locked('analytics') ? ' nav-locked' : ''}`} onClick={() => onNavigate('analytics')}>
              <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              SaaS Analytics
              {locked('analytics') ? <span className="nav-lock">🔒</span> : <span className="nav-dot" />}
            </button>
          </div>
        )}

        {/* เติบโต & มีส่วนร่วม — เกม/เมือง/ฟีดแบ็ก (ต่อจาก build → sell เป็น grow) */}
        <div className="nav-label">🌱 เติบโต &amp; มีส่วนร่วม</div>

        <button className={`nav-item ${activePage === 'city' ? 'active' : ''}`} onClick={() => onNavigate('city')}
          title="เมืองบริษัทของคุณ — เกมส์ SIM ที่เมืองโตตามความคืบหน้าธุรกิจจริง">
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M19 21V7l-6-4v4L7 3v18M3 21h18M9 9v.01M9 12v.01M9 15v.01M15 12v.01M15 15v.01" />
          </svg>
          🏙️ เมืองบริษัท
          <span className="nav-dot" />
        </button>

        {!hideAdv('pulse') && (
        <button className={`nav-item ${activePage === 'pulse' ? 'active' : ''}`} onClick={() => onNavigate('pulse')}
          title="Pulse & A/B — วัดว่าอะไรทำให้อยากใช้งานต่อ แบบโปร่งใส (ยินยอมก่อน · ปิดได้ทุกเมื่อ · ดูข้อมูลตัวเองได้)">
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M3 12h4l2 5 4-14 2 9h6" />
          </svg>
          💓 Pulse & A/B
          <span className="nav-dot" />
        </button>
        )}

        {!hideAdv('citytrade') && (
        <button className={`nav-item ${activePage === 'citytrade' ? 'active' : ''}`} onClick={() => onNavigate('citytrade')}
          title="การค้าระหว่างเมืองธุรกิจ — CEO+CMO จับคู่ดีลอัตโนมัติ บอร์ดกำกับ">
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M7 8h10M7 8l3-3M7 8l3 3m7 5H7m10 0l-3 3m3-3l-3-3" />
          </svg>
          🤝 การค้าระหว่างเมือง
          <span className="nav-dot" />
        </button>
        )}

        {/* แพ็กเกจ & ชำระเงิน — แสดงเสมอ (สำคัญต่อรายได้ ไม่ซ่อนในกลุ่ม) */}
        <button className={`nav-item ${activePage === 'billing' ? 'active' : ''}`} onClick={() => onNavigate('billing')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          แพ็กเกจ & ชำระเงิน
          <span className="nav-dot" />
        </button>

        {isAdminEmail(userEmail) && (
          <button className={`nav-item ${activePage === 'admin' ? 'active' : ''}${locked('admin') ? ' nav-locked' : ''}`} onClick={() => onNavigate('admin')}>
            <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            ผู้ดูแลระบบ
            {locked('admin') ? <span className="nav-lock">🔒</span> : <span className="nav-dot" />}
          </button>
        )}
      </div>

      {!hideAdv('iso9001') && (
      <div className="nav-section">
        <div className="nav-label">มาตรฐาน ISO</div>
        <button className={`nav-item ${activePage === 'iso9001' ? 'active' : ''}${locked('iso9001') ? ' nav-locked' : ''}`} onClick={() => onNavigate('iso9001')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          ISO 9001:2015 QMS
          {locked('iso9001') ? <span className="nav-lock">🔒</span> : <span className="nav-dot" />}
        </button>
      </div>
      )}

      <div className="nav-section" style={{ marginTop: 4 }}>
        <div className="nav-label">✦ AI Powered</div>
        <button
          className={`nav-item ${activePage === 'aisearch' ? 'active' : ''}${locked('aisearch') ? ' nav-locked' : ''}`}
          onClick={() => onNavigate('aisearch')}
          style={{ color: 'rgba(255,190,170,.9)' }}
        >
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Research
          {locked('aisearch') && <span className="nav-lock">🔒</span>}
        </button>

        <button
          className={`nav-item ${activePage === 'cases' ? 'active' : ''}`}
          onClick={() => onNavigate('cases')}
          style={{ color: 'rgba(255,190,170,.9)' }}
        >
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Case Studies
        </button>
      </div>

      <div className="nav-section">
        <div className="nav-label">ภาพรวม (ดูสรุปเมื่อพร้อม)</div>
        <button className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`} onClick={() => onNavigate('dashboard')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Dashboard
          <span className="nav-dot" />
        </button>
      </div>

      <button className="beginner-toggle" onClick={toggleBeginner}>
        {beginner
          ? '🔰 โหมดมือใหม่ (ซ่อนเมนูขั้นสูง) — แตะเพื่อแสดงครบ'
          : '⚙️ แสดงครบทุกเมนู — แตะเพื่อกลับโหมดมือใหม่'}
      </button>

      <div style={{ padding: '0 12px', marginTop: 8 }}>
        <div className="progress-block">
          <div className="progress-label">PRIORITY ACTIONS</div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-count">
            <b>{doneCount}</b> / {totalActions} เสร็จแล้ว
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="btn-export" onClick={() => window.print()}>
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print PDF
        </button>
        <button className="btn-export" onClick={onExport}>
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export JSON
        </button>
        <button className="btn-export" onClick={() => fileInputRef.current?.click()}>
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) { onImportFile(f); e.target.value = ''; } }}
        />

        <AmbientMusic />

        {onSignOut && (
          <div className="sidebar-account">
            <div className="sidebar-account-email" title={userEmail ?? ''}>{userEmail ?? 'บัญชีของฉัน'}</div>
            <MfaSetup />
            <button className="sidebar-signout" onClick={onSignOut}>ออกจากระบบ</button>
          </div>
        )}

        <div className="sidebar-company">
          <div className="sidebar-company-name">{COMPANY.nameTh}</div>
          <a className="sidebar-company-link" href={COMPANY.website} target="_blank" rel="noreferrer">{COMPANY.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
          <div className="sidebar-company-tel">โทร {COMPANY.tel}</div>
          <IsmsBadge compact />
        </div>
      </div>
    </nav>
  );
}
