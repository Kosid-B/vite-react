import type { AppData, Persona } from '../types';
import EditableList from '../components/EditableList';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

type PKey = keyof Pick<Persona, 'pains' | 'gains' | 'goal' | 'fear' | 'search' | 'action'>;
const P_SECTIONS: { key: PKey; hd: string; color: string }[] = [
  { key: 'pains',  hd: '😣 Pain Points — ปัญหา/ความเจ็บปวด', color: '#b91c1c' },
  { key: 'gains',  hd: '😍 Gain Points — สิ่งที่อยากได้',      color: '#15803d' },
  { key: 'goal',   hd: 'เป้าหมายหลัก',          color: '#2d6a4f' },
  { key: 'fear',   hd: 'ความกังวล',              color: '#c44b2b' },
  { key: 'search', hd: 'ช่องทางค้นหา',           color: '#1a4f8a' },
  { key: 'action', hd: 'พฤติกรรมในกระบวนการ',  color: '#1c1814' },
];

export default function Personas({ data, onUpdate }: Props) {
  function addPersona() {
    const palettes = [
      { bg: '#eff4fb', tc: '#1a4f8a' }, { bg: '#fdf3f0', tc: '#c44b2b' },
      { bg: '#edf7f2', tc: '#2d6a4f' }, { bg: '#fdf6ec', tc: '#a05c1a' },
    ];
    const pal = palettes[data.personas.length % palettes.length];
    const newP: Persona = {
      name: 'Persona ใหม่', role: 'ตำแหน่ง / บทบาท', initials: 'NW',
      bg: pal.bg, tc: pal.tc, quote: 'เพิ่ม quote ของ persona นี้',
      pains: ['ปัญหาที่ลูกค้าเจอ'], gains: ['ผลลัพธ์ที่ลูกค้าอยากได้'],
      goal: ['เป้าหมาย'], fear: ['ความกังวล'], search: ['ช่องทาง'], action: ['พฤติกรรม'],
    };
    onUpdate({ ...data, personas: [...data.personas, newP] });
  }

  function delPersona(pi: number) {
    if (data.personas.length <= 1) return;
    onUpdate({ ...data, personas: data.personas.filter((_, i) => i !== pi) });
  }

  function saveField(pi: number, field: keyof Persona, value: string) {
    const personas = data.personas.map((p, i) => i === pi ? { ...p, [field]: value } : p);
    onUpdate({ ...data, personas });
  }

  function saveItem(pi: number, key: PKey, idx: number, value: string) {
    const personas = data.personas.map((p, i) => {
      if (i !== pi) return p;
      const arr = [...(p[key] ?? [])];
      arr[idx] = value;
      return { ...p, [key]: arr };
    });
    onUpdate({ ...data, personas });
  }

  function addItem(pi: number, key: PKey) {
    const personas = data.personas.map((p, i) => i === pi ? { ...p, [key]: [...(p[key] ?? []), 'รายการใหม่'] } : p);
    onUpdate({ ...data, personas });
  }

  function delItem(pi: number, key: PKey, idx: number) {
    const personas = data.personas.map((p, i) => {
      if (i !== pi) return p;
      return { ...p, [key]: (p[key] ?? []).filter((_, j) => j !== idx) };
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
            {data.personas.length > 1 && (
              <button className="p-card-del" onClick={() => delPersona(pi)} title="ลบ Persona">×</button>
            )}
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
                <EditableList
                  items={p[sec.key] ?? []}
                  itemKey={`${sec.key}-${pi}`}
                  onSave={(idx, val) => saveItem(pi, sec.key, idx, val)}
                  onAdd={() => addItem(pi, sec.key)}
                  onDelete={idx => delItem(pi, sec.key, idx)}
                  multiline={false}
                  bordered
                  addLabel="＋ เพิ่ม"
                  addStyle={{ fontSize: 11, padding: '3px 4px', marginTop: 2 }}
                />
              </div>
            ))}
          </div>
        ))}
        <button className="p-add-card" onClick={addPersona}>
          <div className="p-add-icon">＋</div>
          <div className="p-add-label">เพิ่ม Persona</div>
        </button>
      </div>
    </div>
  );
}
