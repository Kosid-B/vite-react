import { useState } from 'react';

/** คู่มือในแอปแบบพับเก็บได้ — เปิดครั้งแรกอัตโนมัติ แล้วจำสถานะที่ผู้ใช้เลือก (localStorage)
 *  ใช้อธิบายวิธีใช้ฟีเจอร์หน้านั้นๆ (เช่น ตลาด B2B, เปิดหน้าร้าน) โดยไม่รบกวน */

export interface HelpGroup { heading: string; steps: string[] }

interface Props {
  id: string;                // คีย์จำสถานะ (unique ต่อหน้า)
  title: string;
  groups: HelpGroup[];
  note?: string;             // บรรทัดเน้นท้ายกล่อง (เช่น กติกา/เคล็ดลับ)
}

export default function HelpBox({ id, title, groups, note }: Props) {
  const key = `ceo_help_${id}`;
  // ค่าเริ่มต้น: เปิด (unless ผู้ใช้เคยพับ)
  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(key) !== 'closed'; } catch { return true; }
  });

  function toggle() {
    setOpen(prev => {
      const next = !prev;
      try { localStorage.setItem(key, next ? 'open' : 'closed'); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <div className={`help-box${open ? ' open' : ''}`}>
      <button className="help-head" onClick={toggle} aria-expanded={open}>
        <span className="help-title">❓ {title}</span>
        <span className="help-caret">{open ? 'ซ่อน ▲' : 'ดูวิธีใช้ ▼'}</span>
      </button>
      {open && (
        <div className="help-body">
          {groups.map((g, i) => (
            <div key={i} className="help-group">
              <div className="help-group-hd">{g.heading}</div>
              <ol className="help-steps">
                {g.steps.map((s, j) => <li key={j}>{s}</li>)}
              </ol>
            </div>
          ))}
          {note && <div className="help-note">{note}</div>}
        </div>
      )}
    </div>
  );
}
