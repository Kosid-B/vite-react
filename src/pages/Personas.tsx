import type { AppData, Persona } from '../types';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

const P_SECTIONS: { key: keyof Pick<Persona, 'goal' | 'fear' | 'search' | 'action'>; hd: string; color: string }[] = [
  { key: 'goal',   hd: 'เป้าหมายหลัก',          color: '#2d6a4f' },
  { key: 'fear',   hd: 'ความกังวล',              color: '#c44b2b' },
  { key: 'search', hd: 'ช่องทางค้นหา',           color: '#1a4f8a' },
  { key: 'action', hd: 'พฤติกรรมในกระบวนการ',  color: '#1c1814' },
];

export default function Personas({ data, onUpdate }: Props) {
  function saveField(pi: number, field: keyof Persona, value: string) {
    const personas = data.personas.map((p, i) => i === pi ? { ...p, [field]: value } : p);
    onUpdate({ ...data, personas });
  }

  function saveItem(pi: number, key: keyof Pick<Persona, 'goal' | 'fear' | 'search' | 'action'>, idx: number, value: string) {
    const personas = data.personas.map((p, i) => {
      if (i !== pi) return p;
      const arr = [...p[key]];
      arr[idx] = value;
      return { ...p, [key]: arr };
    });
    onUpdate({ ...data, personas });
  }

  function addItem(pi: number, key: keyof Pick<Persona, 'goal' | 'fear' | 'search' | 'action'>) {
    const personas = data.personas.map((p, i) => i === pi ? { ...p, [key]: [...p[key], 'รายการใหม่'] } : p);
    onUpdate({ ...data, personas });
  }

  function delItem(pi: number, key: keyof Pick<Persona, 'goal' | 'fear' | 'search' | 'action'>, idx: number) {
    const personas = data.personas.map((p, i) => {
      if (i !== pi) return p;
      return { ...p, [key]: p[key].filter((_, j) => j !== idx) };
    });
    onUpdate({ ...data, personas });
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Personas</div>
        <div className="page-meta">
          <span className="meta-chip">3 Stakeholders</span>
          <span className="law-badge" data-tip={"Serial Position Effect: quote อยู่ด้านบน\nสุดของ card เพราะจำได้ดีที่สุด"}>Serial Position</span>
          <span className="law-badge" data-tip={"Miller's Law: แต่ละ section ≤ 4 items\nไม่ล้น working memory ของผู้อ่าน"}>Miller's Law</span>
        </div>
      </div>

      <div className="persona-grid">
        {data.personas.map((p, pi) => (
          <div key={pi} className="p-card">
            <div className="p-card-top">
              <div className="p-av" style={{ background: p.bg, color: p.tc }}>{p.initials}</div>
              <input
                className="p-name-inp"
                defaultValue={p.name}
                key={`name-${pi}`}
                onBlur={e => saveField(pi, 'name', e.target.value)}
                spellCheck={false}
              />
              <input
                className="p-role-inp"
                defaultValue={p.role}
                key={`role-${pi}`}
                onBlur={e => saveField(pi, 'role', e.target.value)}
                spellCheck={false}
              />
            </div>

            <div className="p-quote-wrap">
              <div className="p-quote-mark">"</div>
              <textarea
                className="p-quote-inp"
                rows={3}
                defaultValue={p.quote}
                key={`quote-${pi}`}
                onBlur={e => saveField(pi, 'quote', e.target.value)}
                spellCheck={false}
              />
            </div>

            {P_SECTIONS.map(sec => (
              <div key={sec.key} className="p-section">
                <div className="p-sec-hd" style={{ color: sec.color }}>{sec.hd}</div>
                {p[sec.key].map((item, idx) => (
                  <div key={idx} className="p-item">
                    <span className="p-item-bullet">›</span>
                    <input
                      className="p-item-inp"
                      defaultValue={item}
                      key={`${sec.key}-${pi}-${idx}`}
                      onBlur={e => saveItem(pi, sec.key, idx, e.target.value)}
                      spellCheck={false}
                    />
                    <button className="p-item-del" onClick={() => delItem(pi, sec.key, idx)}>×</button>
                  </div>
                ))}
                <button
                  className="add-row"
                  style={{ fontSize: 11, padding: '3px 4px', marginTop: 2 }}
                  onClick={() => addItem(pi, sec.key)}
                >
                  ＋ เพิ่ม
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
