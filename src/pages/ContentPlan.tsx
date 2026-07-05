import type { AppData } from '../types';
import EditableList from '../components/EditableList';

interface Props {
  data: AppData;
  activeMonth: number;
  onMonthChange: (i: number) => void;
  onUpdate: (data: AppData) => void;
}

export default function ContentPlan({ data, activeMonth, onMonthChange, onUpdate }: Props) {
  const month = data.contentPlan[activeMonth];

  function saveGoal(value: string) {
    const contentPlan = data.contentPlan.map((m, i) => i === activeMonth ? { ...m, goal: value } : m);
    onUpdate({ ...data, contentPlan });
  }

  function saveHd(ci: number, value: string) {
    const contentPlan = data.contentPlan.map((m, i) => {
      if (i !== activeMonth) return m;
      const cols = m.cols.map((c, j) => j === ci ? { ...c, hd: value } : c);
      return { ...m, cols };
    });
    onUpdate({ ...data, contentPlan });
  }

  function saveItem(ci: number, idx: number, value: string) {
    const contentPlan = data.contentPlan.map((m, i) => {
      if (i !== activeMonth) return m;
      const cols = m.cols.map((c, j) => {
        if (j !== ci) return c;
        const items = [...c.items];
        items[idx] = value;
        return { ...c, items };
      });
      return { ...m, cols };
    });
    onUpdate({ ...data, contentPlan });
  }

  function addItem(ci: number) {
    const contentPlan = data.contentPlan.map((m, i) => {
      if (i !== activeMonth) return m;
      const cols = m.cols.map((c, j) => j === ci ? { ...c, items: [...c.items, 'รายการใหม่'] } : c);
      return { ...m, cols };
    });
    onUpdate({ ...data, contentPlan });
  }

  function delItem(ci: number, idx: number) {
    const contentPlan = data.contentPlan.map((m, i) => {
      if (i !== activeMonth) return m;
      const cols = m.cols.map((c, j) => {
        if (j !== ci) return c;
        return { ...c, items: c.items.filter((_, k) => k !== idx) };
      });
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
          <button key={i} className={`cp-tab-btn ${i === activeMonth ? 'active' : ''}`} onClick={() => onMonthChange(i)}>
            {m.label}
          </button>
        ))}
      </div>

      <textarea
        className="cp-goal"
        rows={2}
        defaultValue={month.goal}
        key={`goal-${activeMonth}`}
        onBlur={e => saveGoal(e.target.value)}
        spellCheck={false}
      />

      <div className="cp-grid">
        {month.cols.map((col, ci) => (
          <div key={ci} className="cp-col">
            <div className="cp-col-hd" style={{ borderLeftColor: col.color }}>
              <span className="cp-col-dot" style={{ background: col.color }} />
              <input
                defaultValue={col.hd}
                key={`hd-${activeMonth}-${ci}`}
                onBlur={e => saveHd(ci, e.target.value)}
                spellCheck={false}
              />
            </div>
            <div className="cp-body">
              <EditableList
                items={col.items}
                itemKey={`item-${activeMonth}-${ci}`}
                onSave={(idx, val) => saveItem(ci, idx, val)}
                onAdd={() => addItem(ci)}
                onDelete={idx => delItem(ci, idx)}
                addLabel="＋ เพิ่ม"
                addStyle={{ fontSize: 11, padding: '3px 6px', marginTop: 2 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
