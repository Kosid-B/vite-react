import { useState } from 'react';
import type { AppData, Persona } from '../types';
import EditableList from '../components/EditableList';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { track } from '../lib/analytics';
import {
  THAI_SEGMENTS, personaFromSegment, blankPersona, personaFromResearch,
} from '../lib/personaTemplates';

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
  const [showNew, setShowNew] = useState(false);
  const [segId, setSegId] = useState(THAI_SEGMENTS[0].id);
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function append(p: Persona) {
    onUpdate({ ...data, personas: [...data.personas, p] });
  }
  function addPersona() {
    append(blankPersona(data.personas.length));
  }
  function addFromSegment(id: string) {
    const seg = THAI_SEGMENTS.find((s) => s.id === id);
    if (!seg) return;
    append(personaFromSegment(seg, data.personas.length));
    track('persona_added', { source: 'segment', segment: seg.id });
    setMsg(`✅ เพิ่ม Persona "${seg.segment}" (จาก Market Research) — แก้เพิ่มได้ในการ์ด`);
    setShowNew(false);
  }
  // Hybrid: ฐานจาก segment (gains/search จาก research) + AI สกัด pains/quote จากข้อความวิจัย
  async function addFromResearch() {
    const seg = THAI_SEGMENTS.find((s) => s.id === segId) ?? THAI_SEGMENTS[0];
    const base = personaFromSegment(seg, data.personas.length);
    if (!isSupabaseEnabled || !supabase) {
      append(base);
      setMsg('✅ เพิ่มจาก segment แล้ว (โหมด Local ไม่มี AI — ปรับ pains/quote เองได้)');
      setShowNew(false);
      return;
    }
    if (!aiText.trim()) { setMsg('วางข้อความ Market Research ก่อน หรือกด "ใช้ template segment"'); return; }
    setAiBusy(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('ai-assist', {
        body: {
          page: 'personas', pageLabel: 'Persona',
          instruction:
            'จากข้อมูล Market Research ต่อไปนี้ สร้างโปรไฟล์ลูกค้า (persona) — ' +
            'summary = quote 1 ประโยคที่ลูกค้ากลุ่มนี้น่าจะพูด (สะท้อนความเจ็บปวดจริง), ' +
            'suggestions = Pain Points 3-5 ข้อ (สั้น กระชับ เจาะจง)',
          context: aiText.trim(),
        },
      });
      if (error) throw error;
      const merged = personaFromResearch(base, {
        quote: res?.summary ? String(res.summary) : undefined,
        pains: (res?.suggestions ?? []).map((s: string) => String(s)),
      });
      append(merged);
      track('persona_added', { source: 'research_ai', segment: seg.id });
      setAiText('');
      setMsg('✅ AI สร้าง Persona จาก Market Research แล้ว (pains/quote จากข้อความจริง · ช่องทางค้นหาจาก segment)');
      setShowNew(false);
    } catch (err) {
      setMsg('AI สร้างไม่สำเร็จ: ' + ((err as Error).message || 'error') + ' — ลองใหม่ หรือใช้ template segment');
    } finally {
      setAiBusy(false);
    }
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

      <div className="persona-launcher">
        <div className="pl-row">
          <button className="pl-cta" onClick={() => setShowNew((v) => !v)}>
            {showNew ? '× ปิด' : '✨ สร้าง Persona จาก Market Research'}
          </button>
          <span className="pl-hint">แนะนำ: อย่าเดา — เริ่มจาก segment จริง แล้วให้ AI เติมจากงานวิจัย (ช่องทางค้นหา → SEO/Ads)</span>
        </div>
        {msg && <div className="pl-msg">{msg}</div>}
        {showNew && (
          <div className="pl-panel">
            <div className="pl-seg-hd">1) เลือกกลุ่มเป้าหมาย (จาก Market Research)</div>
            <div className="pl-segs">
              {THAI_SEGMENTS.map((s) => (
                <button
                  key={s.id}
                  className={`pl-seg${segId === s.id ? ' active' : ''}`}
                  onClick={() => setSegId(s.id)}
                  title={s.role}
                >{s.segment}</button>
              ))}
            </div>
            <div className="pl-actions">
              <button className="pl-add-seg" onClick={() => addFromSegment(segId)}>
                + ใช้ template segment นี้เลย
              </button>
            </div>
            <div className="pl-seg-hd">2) (ทางเลือก) วางข้อความ Market Research ให้ AI เติม pains + quote จริง
              {!isSupabaseEnabled && <em> — โหมด Local: จะใช้ template segment แทน</em>}
            </div>
            <textarea
              className="pl-ai-text"
              rows={5}
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="วางผลสำรวจ/บทสัมภาษณ์/ข้อมูลกลุ่มเป้าหมาย… (AI จะสกัดเป็น Pain Points + quote)"
              spellCheck={false}
            />
            <button className="pl-add-ai" onClick={addFromResearch} disabled={aiBusy}>
              {aiBusy ? '⏳ AI กำลังสร้าง…' : '✨ สร้าง Persona (segment + AI จากงานวิจัย)'}
            </button>
          </div>
        )}
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
