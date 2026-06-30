import { useRef } from 'react';
import type { PageId } from '../types';
import type { Workspace } from '../lib/workspaces';
import { BRAND, COMPANY, isAdminEmail } from '../config';

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
}

export default function Sidebar({ activePage, onNavigate, doneCount, totalActions, isOpen, onClose, onExport, onImportFile, userEmail, onSignOut, workspaces, activeWs, onSwitchWs, onCreateWs }: Props) {
  const pct = totalActions > 0 ? Math.round((doneCount / totalActions) * 100) : 0;
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <nav className={`sidebar${isOpen ? ' open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-serif">{BRAND.product}</div>
        <div className="brand-sub">{BRAND.tagline}</div>
        <button className="sidebar-close" onClick={onClose} aria-label="ปิดเมนู">×</button>

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
        <div className="nav-label">ภาพรวม</div>
        <button className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`} onClick={() => onNavigate('dashboard')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Dashboard
          <span className="nav-dot" />
        </button>
      </div>

      <div className="nav-section">
        <div className="nav-label">เครื่องมือ</div>

        <button className={`nav-item ${activePage === 'journey' ? 'active' : ''}`} onClick={() => onNavigate('journey')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Journey Map
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'funnel' ? 'active' : ''}`} onClick={() => onNavigate('funnel')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Conversion Funnel
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'roi' ? 'active' : ''}`} onClick={() => onNavigate('roi')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          ROI Calculator
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'personas' ? 'active' : ''}`} onClick={() => onNavigate('personas')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Personas
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'content' ? 'active' : ''}`} onClick={() => onNavigate('content')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Content Plan
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'actions' ? 'active' : ''}`} onClick={() => onNavigate('actions')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Priority Actions
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'bmc' ? 'active' : ''}`} onClick={() => onNavigate('bmc')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          Business Model · MIT24
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'roadmap' ? 'active' : ''}`} onClick={() => onNavigate('roadmap')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Product Roadmap
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'marketing' ? 'active' : ''}`} onClick={() => onNavigate('marketing')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          กลยุทธ์การตลาด
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'vrio' ? 'active' : ''}`} onClick={() => onNavigate('vrio')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          VRIO Analysis
          <span className="nav-dot" />
        </button>
      </div>

      <div className="nav-section">
        <div className="nav-label">✦ องค์กร AI</div>

        <button className={`nav-item ${activePage === 'aicompany' ? 'active' : ''}`} onClick={() => onNavigate('aicompany')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m6-12h0m6 0h0m-6 4h0m6 0h0m-6 4h0m6 0h0" />
          </svg>
          บริษัท AI
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'market' ? 'active' : ''}`} onClick={() => onNavigate('market')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Marketplace
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'team' ? 'active' : ''}`} onClick={() => onNavigate('team')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          ทีม / สมาชิก
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'factory' ? 'active' : ''}`} onClick={() => onNavigate('factory')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 21V10.5M15 21V10.5M9 7h.01M15 7h.01M5 21V9.5l7-4 7 4V21" />
          </svg>
          โรงงานอัจฉริยะ
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'billing' ? 'active' : ''}`} onClick={() => onNavigate('billing')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          แพ็กเกจ & ชำระเงิน
          <span className="nav-dot" />
        </button>

        <button className={`nav-item ${activePage === 'analytics' ? 'active' : ''}`} onClick={() => onNavigate('analytics')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          SaaS Analytics
          <span className="nav-dot" />
        </button>

        {isAdminEmail(userEmail) && (
          <button className={`nav-item ${activePage === 'admin' ? 'active' : ''}`} onClick={() => onNavigate('admin')}>
            <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            ผู้ดูแลระบบ
            <span className="nav-dot" />
          </button>
        )}
      </div>

      <div className="nav-section">
        <div className="nav-label">มาตรฐาน ISO</div>
        <button className={`nav-item ${activePage === 'iso9001' ? 'active' : ''}`} onClick={() => onNavigate('iso9001')}>
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          ISO 9001:2015 QMS
          <span className="nav-dot" />
        </button>
      </div>

      <div className="nav-section" style={{ marginTop: 4 }}>
        <div className="nav-label">✦ AI Powered</div>
        <button
          className={`nav-item ${activePage === 'aisearch' ? 'active' : ''}`}
          onClick={() => onNavigate('aisearch')}
          style={{ color: 'rgba(255,190,170,.9)' }}
        >
          <svg className="nav-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Research
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

        {onSignOut && (
          <div className="sidebar-account">
            <div className="sidebar-account-email" title={userEmail ?? ''}>{userEmail ?? 'บัญชีของฉัน'}</div>
            <button className="sidebar-signout" onClick={onSignOut}>ออกจากระบบ</button>
          </div>
        )}

        <div className="sidebar-company">
          <div className="sidebar-company-name">{COMPANY.nameTh}</div>
          <a className="sidebar-company-link" href={COMPANY.website} target="_blank" rel="noreferrer">{COMPANY.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
          <div className="sidebar-company-tel">โทร {COMPANY.tel}</div>
        </div>
      </div>
    </nav>
  );
}
