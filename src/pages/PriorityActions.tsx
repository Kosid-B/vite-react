import { useEffect } from 'react';
import type { AppData } from '../types';
import { autoH } from '../utils';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

export default function PriorityActions({ data, onUpdate }: Props) {
  const done = data.actions.filter(a => a.done).length;
  const total = data.actions.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = done === total;

  useEffect(() => {
    document.querySelectorAll<HTMLTextAreaElement>('.a-desc').forEach(autoH);
  });

  function toggle(ai: number) {
    const actions = data.actions.map((a, i) => i === ai ? { ...a, done: !a.done } : a);
    onUpdate({ ...data, actions });
  }

  function saveField(ai: number, field: 'title' | 'desc', value: string) {
    const actions = data.actions.map((a, i) => i === ai ? { ...a, [field]: value } : a);
    onUpdate({ ...data, actions });
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Priority Actions</div>
        <div className="page-meta">
          <span className="meta-chip">เรียงจาก Impact สูงสุด</span>
          <span className="law-badge" data-tip={"Zeigarnik Effect: งานที่ยังไม่เสร็จ\nดึงความสนใจมากกว่างานที่เสร็จแล้ว"}>Zeigarnik Effect</span>
          <span className="law-badge" data-tip={"Goal-Gradient Effect: Progress bar\nทำให้อยากทำให้เสร็จเร็วขึ้น"}>Goal-Gradient</span>
          <span className="law-badge" data-tip={"Peak-End Rule: เมื่อทำครบ 6 ข้อ\nจะมี celebration moment ที่น่าจดจำ"}>Peak-End Rule</span>
          <span className="law-badge" data-tip={"Fitts's Law: checkbox 32px\nคลิกได้ง่าย ไม่พลาด"}>Fitts's Law</span>
        </div>
      </div>

      <div className="progress-header">
        <div className="progress-text"><b>{done}</b> / {total} เสร็จแล้ว</div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className={`celebration ${allDone ? 'show' : ''}`}>
        <div className="celebration-emoji">🎉</div>
        <div className="celebration-title">ทำครบทุก Action แล้ว!</div>
        <div className="celebration-sub">
          ทีมของคุณพร้อมแล้วสำหรับขั้นตอนถัดไป<br />
          ลองเพิ่ม action ใหม่หรือ reset เพื่อเริ่มรอบถัดไป
        </div>
      </div>

      <div className="action-list">
        {data.actions.map((a, ai) => (
          <div key={ai} className={`a-item priority-${a.priority} ${a.done ? 'done' : ''}`}>
            <div className={`a-check ${a.done ? 'checked' : ''}`} onClick={() => toggle(ai)} title="ติ๊กเมื่อทำเสร็จ">
              {a.done && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div className="a-num" style={{ background: a.nb, color: a.nt }}>{ai + 1}</div>
            <div className="a-body">
              <input
                className="a-title"
                defaultValue={a.title}
                key={`title-${ai}`}
                onBlur={e => saveField(ai, 'title', e.target.value)}
                spellCheck={false}
              />
              <textarea
                className="a-desc"
                rows={2}
                defaultValue={a.desc}
                key={`desc-${ai}`}
                onBlur={e => saveField(ai, 'desc', e.target.value)}
                onChange={e => autoH(e.target)}
                ref={el => { if (el) autoH(el); }}
                spellCheck={false}
              />
              <div className="a-tags">
                {a.tags.map((t, ti) => (
                  <span key={ti} className={`tag ${t.className}`}>{t.label}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
