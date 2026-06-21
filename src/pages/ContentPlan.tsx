import { useEffect } from 'react';
import type { AppData } from '../types';
import { autoH } from '../utils';

interface Props {
  data: AppData;
  activeMonth: number;
  onMonthChange: (i: number) => void;
  onUpdate: (data: AppData) => void;
}

export default function ContentPlan({ data, activeMonth, onMonthChange, onUpdate }: Props) {
  const month = data.contentPlan[activeMonth];

  useEffect(() => {
    document.querySelectorAll<HTMLTextAreaElement>('.cp-item-text').forEach(autoH);
  }, [activeMonth]);

  function saveGoal(value: string) {
    const contentPlan = data.contentPlan.map((m, i) => i === activeMonth ? { ...m, goal: value } : m);
    onUpdate({ ...data, contentPlan });
  }
  function saveHd(ci: number, value: string) {
    const contentPlan = data.contentPlan.map((m, i) => {
      if (i !== activeMonth) return m;
      return { ...m, cols: m.cols.map((c, j) => j === ci ? { ...c, hd: value } : c) };
    });
    onUpdate({ ...data, contentPlan });
  }
  function saveItem(ci: number, idx: number, value: string) {
    const contentPlan = data.contentPlan.map((m, i) => {
      if (i !== activeMonth) return m;
      const cols = m.cols.map((c, j) => {
        if (j !== ci) return c;
        const items = [...c.items]; items[idx] = value;
        return { ...c, items };
      });
      return { ...m, cols };
    });
    onUpdate({ ...data, contentPlan });
  }
  function addItem(ci: number) {
    const contentPlan = data.contentPlan.map((m, i) => {
      if (i !== activeMonth) return m;
      return { ...m, cols: m.cols.map((c, j) => j === ci ? { ...c, items: [...c.items, 'รายการใหม่'] } : c) };
    });
    onUpdate({ ...data, contentPlan });
  }
  function delItem(ci: number, idx: number) {
    const contentPlan = data.contentPlan.map((m, i) => {
      if (i !== activeMonth) return m;
      const cols = m.cols.map((c, j) => j === ci ? { ...c, items: c.items.filter((_, k) => k !== idx) } : c);
      return { ...m, cols };
    });
    onUpdate({ ...data, contentPlan });
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Content Plan</div>
        <div className="page-meta">
          <span className="meta-chip">3 เดือนแรก</span>
          <span className="law-badge" data-tip={"Goal-Gradient Effect: แสดง 3 เดือน\nทำให้เห็นว่า 'เกือบถึงแล้ว' → อยากทำต่อ"}>Goal-Gradient</span>
          <span className="law-badge" data-tip={"Miller's Law: 4 คอลัมน์ 4 ประเภทเนื้อหา\nสมองจัดกลุ่มได้ทันที"}>Miller's Law</span>
        </div>
      </div>
      <div className="cp-tabs">
        {data.contentPlan.map((m, i) => (
          <button key={i} className={`cp-tab-btn ${i === activeMonth ? 'active' : ''}`} onClick={() => onMonthChange(i)}>{m.label}</button>
        ))}
      </div>
      <textarea className="cp-goal" rows={2} defaultValue={month.goal} key={`goal-${activeMonth}`} onBlur={e => saveGoal(e.target.value)} spellCheck={false} />
      <div className="cp-grid">
        {month.cols.map((col, ci) => (
          <div key={ci} className="cp-col">
            <div className="cp-col-hd" style={{ color: col.color }}>
              <input defaultValue={col.hd} key={`hd-${activeMonth}-${ci}`} onBlur={e => saveHd(ci, e.target.value)} spellCheck={false} />
            </div>
            <div className="cp-body">
              {col.items.map((item, idx) => (
                <div key={idx} className="cp-item">
                  <span className="cp-item-bullet">›</span>
                  <textarea className="cp-item-text" rows={2} defaultValue={item} key={`item-${activeMonth}-${ci}-${idx}`} onBlur={e => saveItem(ci, idx, e.target.value)} onChange={e => autoH(e.target)} ref={el => { if (el) autoH(el); }} spellCheck={false} />
                  <button className="cp-item-del" onClick={() => delItem(ci, idx)}>×</button>
                </div>
              ))}
              <button className="add-row" style={{ fontSize: 11, padding: '3px 6px', marginTop: 2 }} onClick={() => addItem(ci)}>＋ เพิ่ม</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
