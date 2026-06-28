import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppData, PageId } from '../types';

interface CmdKProps {
  activePage: PageId;
  onNavigate: (p: PageId) => void;
  data: AppData;
}

interface CmdItem {
  id: string;
  icon: string;
  label: string;
  desc: string;
  group: string;
  tag?: string;
  action: () => void;
}

const PAGE_ITEMS: { page: PageId; icon: string; label: string; desc: string }[] = [
  { page: 'dashboard',  icon: '🏠', label: 'Dashboard',           desc: 'ภาพรวมธุรกิจ' },
  { page: 'journey',    icon: '🗺️',  label: 'Journey Map',         desc: 'เส้นทางลูกค้า' },
  { page: 'personas',   icon: '👤', label: 'Personas',             desc: 'ตัวละครลูกค้า' },
  { page: 'content',    icon: '📅', label: 'Content Plan',         desc: 'แผนเนื้อหา' },
  { page: 'actions',    icon: '✅', label: 'Priority Actions',     desc: 'งานสำคัญ' },
  { page: 'aisearch',   icon: '🔍', label: 'AI Research',          desc: 'วิจัย AI' },
  { page: 'funnel',     icon: '📊', label: 'Conversion Funnel',    desc: 'ช่องทางการแปลง' },
  { page: 'roi',        icon: '💰', label: 'ROI Calculator',       desc: 'คำนวณ ROI' },
  { page: 'bmc',        icon: '🗂️',  label: 'Business Model',      desc: 'Business Model Canvas' },
  { page: 'aicompany',  icon: '🤖', label: 'AI Company',           desc: 'บริษัท AI อัตโนมัติ' },
  { page: 'billing',    icon: '💳', label: 'Billing',              desc: 'การชำระเงิน' },
  { page: 'vrio',       icon: '🏆', label: 'VRIO Analysis',        desc: 'วิเคราะห์ความได้เปรียบ' },
  { page: 'market',     icon: '🤝', label: 'Marketplace',          desc: 'จับคู่คู่ค้า' },
  { page: 'roadmap',    icon: '🛣️',  label: 'Roadmap',             desc: 'แผนพัฒนาผลิตภัณฑ์' },
  { page: 'marketing',  icon: '📣', label: 'Marketing',            desc: 'กลยุทธ์การตลาด' },
  { page: 'team',       icon: '👥', label: 'Team',                 desc: 'จัดการทีม' },
  { page: 'admin',      icon: '⚙️',  label: 'Admin',               desc: 'จัดการระบบ' },
];

export default function CmdK({ onNavigate, data }: CmdKProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => { setOpen(false); setQuery(''); setSelected(0); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const buildItems = useCallback((): CmdItem[] => {
    const q = query.toLowerCase();
    const items: CmdItem[] = [];

    // Navigation pages
    for (const p of PAGE_ITEMS) {
      if (!q || p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.page.includes(q)) {
        items.push({
          id: `nav-${p.page}`,
          icon: p.icon,
          label: p.label,
          desc: p.desc,
          group: 'หน้า',
          tag: 'navigate',
          action: () => { onNavigate(p.page); close(); },
        });
      }
    }

    // Win stories
    for (const w of data.winStories) {
      if (!q || w.customerName.toLowerCase().includes(q) || w.headlineMetric.toLowerCase().includes(q) || w.category.includes(q)) {
        items.push({
          id: `win-${w.id}`,
          icon: '🏅',
          label: w.customerName,
          desc: w.headlineMetric,
          group: 'Win Stories',
          tag: w.category,
          action: () => { onNavigate('admin'); close(); },
        });
      }
    }

    // Personas
    for (const p of data.personas) {
      if (!q || p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)) {
        items.push({
          id: `persona-${p.name}`,
          icon: '👤',
          label: p.name,
          desc: p.role,
          group: 'Personas',
          tag: 'persona',
          action: () => { onNavigate('personas'); close(); },
        });
      }
    }

    // Roadmap items
    for (const r of data.roadmap) {
      if (!q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)) {
        items.push({
          id: `roadmap-${r.id}`,
          icon: '🛣️',
          label: r.title,
          desc: `${r.quarter} ${r.year} · ${r.status}`,
          group: 'Roadmap',
          tag: r.priority,
          action: () => { onNavigate('roadmap'); close(); },
        });
      }
    }

    // Actions
    for (const a of data.actions) {
      if (!q || a.title.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)) {
        items.push({
          id: `action-${a.title}`,
          icon: a.done ? '✅' : '⭕',
          label: a.title,
          desc: a.desc.slice(0, 60) + (a.desc.length > 60 ? '…' : ''),
          group: 'Actions',
          tag: a.done ? 'done' : 'pending',
          action: () => { onNavigate('actions'); close(); },
        });
      }
    }

    return items.slice(0, 40);
  }, [query, data, onNavigate, close]);

  const items = buildItems();

  const groups = Array.from(new Set(items.map(i => i.group)));

  useEffect(() => { setSelected(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, items.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && items[selected]) { items[selected].action(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, selected]);

  if (!open) return null;

  let globalIdx = 0;

  return (
    <>
      <div className="cmdk-overlay" onClick={close} />
      <div className="cmdk-modal" role="dialog" aria-modal>
        <div className="cmdk-input-row">
          <span className="cmdk-search-icon">⌕</span>
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="ค้นหาหน้า, ลูกค้า, งาน, แผน…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className="cmdk-esc" onClick={close}>esc</span>
        </div>

        <div className="cmdk-results">
          {items.length === 0 && <div className="cmdk-empty">ไม่พบผลลัพธ์ลองใช้คำค้นอื่น</div>}
          {groups.map(group => {
            const groupItems = items.filter(i => i.group === group);
            return (
              <div key={group}>
                <div className="cmdk-group-title">{group}</div>
                {groupItems.map(item => {
                  const idx = globalIdx++;
                  return (
                    <div
                      key={item.id}
                      className={`cmdk-item${idx === selected ? ' selected' : ''}`}
                      onClick={item.action}
                      onMouseEnter={() => setSelected(idx)}
                    >
                      <div className="cmdk-item-icon">{item.icon}</div>
                      <div className="cmdk-item-text">
                        <div className="cmdk-item-label">{item.label}</div>
                        {item.desc && <div className="cmdk-item-desc">{item.desc}</div>}
                      </div>
                      {item.tag && <span className="cmdk-item-tag">{item.tag}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="cmdk-footer">
          <span className="cmdk-footer-hint"><span className="cmdk-kbd">↑↓</span> เลื่อน</span>
          <span className="cmdk-footer-hint"><span className="cmdk-kbd">↵</span> เปิด</span>
          <span className="cmdk-footer-hint"><span className="cmdk-kbd">⌘K</span> ปิด</span>
        </div>
      </div>
    </>
  );
}
