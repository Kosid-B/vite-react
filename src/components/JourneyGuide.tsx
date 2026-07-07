import { useState } from 'react';
import type { AppData, PageId } from '../types';
import { JOURNEY, journeyProgress, nextStep } from '../lib/journey';
import { companyXP, getCompanyLevel } from '../lib/gamification';

interface Props {
  data: AppData;
  onNavigate: (page: PageId) => void;
  onUpdate: (d: AppData) => void;
}

/* ตัวนำทาง gamification — ลอยมุมขวาล่าง เห็นได้ทุกหน้า
 * ปิด/ยุบได้ · ชี้ step ถัดไป · กดแล้วพาไปหน้าที่ต้องทำ */
export default function JourneyGuide({ data, onNavigate, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const prog = journeyProgress(data);
  const next = nextStep(data);
  const xp = companyXP(data);
  const level = getCompanyLevel(xp);
  const complete = prog.done >= prog.total;

  // โหมดโปร (ซ่อนเกม) หรือผู้ใช้ปิด Guide → ปุ่มเล็ก ๆ ให้เรียกกลับ
  if (data.proMode) return null;
  if (data.journeyHidden) {
    return (
      <button className="jg-fab" title="เปิดตัวนำทาง Journey" onClick={() => onUpdate({ ...data, journeyHidden: false })}>
        🧭
      </button>
    );
  }

  const go = (page: PageId) => { onNavigate(page); window.scrollTo({ top: 0 }); setOpen(false); };

  // ยุบ (pill) — แสดง step ถัดไป + ความคืบหน้า
  if (!open) {
    return (
      <button className="jg-pill" onClick={() => setOpen(true)}
        title="ตัวนำทางการพัฒนาธุรกิจ — กดเพื่อดูขั้นตอนทั้งหมด">
        <span className="jg-pill-ring" style={{ background: `conic-gradient(${level.color} ${prog.pct}%, rgba(255,255,255,.14) 0)` }}>
          <span className="jg-pill-ring-in">{complete ? '✓' : prog.done + 1}</span>
        </span>
        <span className="jg-pill-body">
          <span className="jg-pill-top">🧭 {complete ? 'จบทุกขั้นแล้ว!' : 'ทำต่อ'}</span>
          <span className="jg-pill-label">{complete ? `${level.badge} ${level.rank}` : next?.label}</span>
        </span>
        <span className="jg-pill-go">{complete ? '' : '→'}</span>
      </button>
    );
  }

  // เปิดเต็ม (panel) — stepper ทุกระยะ
  return (
    <div className="jg-panel">
      <div className="jg-hd">
        <div className="jg-hd-title">
          <span className="jg-hd-badge" style={{ background: level.color }}>{level.badge} {level.rank}</span>
          <span className="jg-hd-name">เส้นทางพัฒนาธุรกิจ</span>
        </div>
        <button className="jg-hd-close" onClick={() => setOpen(false)} aria-label="ยุบ">–</button>
      </div>

      <div className="jg-prog">
        <div className="jg-prog-track"><div className="jg-prog-fill" style={{ width: prog.pct + '%', background: level.color }} /></div>
        <div className="jg-prog-text"><b>{prog.done}</b>/{prog.total} ขั้น · {xp.toLocaleString()} XP</div>
      </div>

      <div className="jg-edu">
        💡 <b>ต่างจากที่อื่น:</b> เราสร้างธุรกิจตามหลัก <b>MIT 24 Steps</b> — เริ่มจาก
        <b> "รู้จักลูกค้าก่อน"</b> แล้วค่อยออกแบบสินค้า (ไม่ใช่ทำสินค้าก่อนแล้วหาลูกค้าไม่เจอ)
      </div>

      {next && (
        <button className="jg-next" onClick={() => go(next.page)}>
          <span className="jg-next-lbl">👉 ทำต่อ: {next.label}</span>
          <span className="jg-next-hint">{next.hint}</span>
          <span className="jg-next-go">ไปทำเลย →</span>
        </button>
      )}

      <div className="jg-phases">
        {JOURNEY.map(phase => {
          const pDone = phase.steps.filter(s => s.done(data)).length;
          return (
            <div key={phase.key} className="jg-phase">
              <div className="jg-phase-hd">
                <span>{phase.icon} {phase.title}</span>
                <span className="jg-phase-count">{pDone}/{phase.steps.length}</span>
              </div>
              {phase.steps.map(s => {
                const done = s.done(data);
                const isNext = next?.id === s.id;
                return (
                  <button key={s.id} className={`jg-step${done ? ' done' : ''}${isNext ? ' next' : ''}`}
                    onClick={() => go(s.page)} title={s.hint}>
                    <span className="jg-step-check">{done ? '✅' : isNext ? '▶️' : '⬜'}</span>
                    <span className="jg-step-lbl">{s.label}</span>
                    {!done && <span className="jg-step-go">→</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <button className="jg-hide" onClick={() => { setOpen(false); onUpdate({ ...data, journeyHidden: true }); }}>
        ซ่อนตัวนำทาง (เปิดใหม่ได้จากปุ่ม 🧭)
      </button>
    </div>
  );
}
