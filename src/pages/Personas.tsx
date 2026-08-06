import { useRef, useState } from 'react';
import type { AppData, Persona, PageId } from '../types';
import EditableList from '../components/EditableList';
import DemoBadge from '../components/DemoBadge';
import { isDemoPersonas } from '../lib/demoData';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { track } from '../lib/analytics';
import {
  THAI_SEGMENTS, B2B_SEGMENTS, personaFromSegment, blankPersona, personaFromResearch,
} from '../lib/personaTemplates';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
  onNavigate?: (page: PageId) => void;
}

type PKey = keyof Pick<Persona, 'pains' | 'gains' | 'goal' | 'fear' | 'search' | 'action'>;
type LKey = PKey | 'firmographics';   // ฟิลด์ที่เป็น list แก้ได้ (รวม B2B firmographics)
const P_SECTIONS: { key: PKey; hd: string; color: string }[] = [
  { key: 'pains',  hd: '😣 Pain Points — ปัญหา/ความเจ็บปวด', color: '#b91c1c' },
  { key: 'gains',  hd: '😍 Gain Points — สิ่งที่อยากได้',      color: '#15803d' },
  { key: 'goal',   hd: 'เป้าหมายหลัก',          color: '#2d6a4f' },
  { key: 'fear',   hd: 'ความกังวล',              color: '#c44b2b' },
  { key: 'search', hd: 'ช่องทางค้นหา',           color: '#1a4f8a' },
  { key: 'action', hd: 'พฤติกรรมในกระบวนการ',  color: '#1c1814' },
];

export default function Personas({ data, onUpdate, onNavigate }: Props) {
  const insight = data.marketInsight;
  const gated = !insight?.savedAt;                       // ยังไม่ยืนยัน research/sizing → ต้องทำก่อน
  // B2B/B2C: ใช้ผลวิจัย (insight.mode) ถ้ามี · ไม่มีก็ยึด audienceType ที่เลือกตอน onboarding (กัน Persona สับสน)
  const isB2b = insight?.mode ? insight.mode === 'b2b' : data.audienceType === 'b2b';
  const segments = isB2b ? B2B_SEGMENTS : THAI_SEGMENTS;
  // สรุปผล research/sizing → prefill ให้ AI อัตโนมัติ (ข้อ 2: ไม่ต้องวาง text เอง)
  const researchPrefill = insight ? [
    insight.industry ? `อุตสาหกรรม: ${insight.industry}` : '',
    insight.segments?.length ? `กลุ่มเป้าหมาย: ${insight.segments.join(', ')}` : '',
    insight.som ? `ขนาดตลาดที่คว้าได้ (SOM): ฿${insight.som.toLocaleString()}/ปี` : '',
    insight.oppLabel ? `โอกาสตลาด: ${insight.oppLabel}` : '',
    insight.mode === 'b2b' ? 'ตลาดแบบ B2B (ขายให้องค์กร — มีคณะตัดสินใจหลายบทบาท)' : 'ตลาดแบบ B2C (ผู้บริโภค)',
  ].filter(Boolean).join('\n') : '';
  const [bypass, setBypass] = useState(false);           // ผู้ใช้เลือก "ข้ามชั่วคราว"
  const [showNew, setShowNew] = useState(false);
  const [segId, setSegId] = useState(() => segments[0].id);
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const aiRef = useRef<HTMLTextAreaElement>(null);

  function append(p: Persona) {
    onUpdate({ ...data, personas: [...data.personas, p] });
  }
  function addPersona() {
    append(blankPersona(data.personas.length));
  }
  function addFromSegment(id: string) {
    const seg = segments.find((s) => s.id === id);
    if (!seg) return;
    append(personaFromSegment(seg, data.personas.length));
    track('persona_added', { source: 'segment', segment: seg.id });
    setMsg(`✅ เพิ่ม Persona "${seg.segment}" (จาก Market Research) — แก้เพิ่มได้ในการ์ด`);
    setShowNew(false);
  }
  // B2B: เพิ่มครบทั้งคณะตัดสินใจ (buying committee) ในคลิกเดียว
  function addAllCommittee() {
    const start = data.personas.length;
    const add = B2B_SEGMENTS.map((s, i) => personaFromSegment(s, start + i));
    onUpdate({ ...data, personas: [...data.personas, ...add] });
    track('persona_added', { source: 'b2b_committee' });
    setMsg('✅ เพิ่มครบทั้งคณะตัดสินใจ B2B (ผู้ตัดสินใจ/ผู้คุมงบ/ผู้ใช้งาน) — แก้ให้ตรงลูกค้าจริงได้');
    setShowNew(false);
  }
  // Hybrid: ฐานจาก segment (gains/search จาก research) + AI สกัด pains/quote จากข้อความวิจัย
  async function addFromResearch() {
    const seg = segments.find((s) => s.id === segId) ?? segments[0];
    const base = personaFromSegment(seg, data.personas.length);
    if (!isSupabaseEnabled || !supabase) {
      append(base);
      setMsg('✅ เพิ่มจาก segment แล้ว (โหมด Local ไม่มี AI — ปรับ pains/quote เองได้)');
      setShowNew(false);
      return;
    }
    if (!aiText.trim() && !researchPrefill) {
      setMsg('⚠️ วางข้อความ Market Research ในช่องด้านบนก่อน หรือกด "+ ใช้ template segment นี้เลย"');
      aiRef.current?.focus();
      aiRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setAiBusy(true);
    try {
      const b2b = isB2b;
      const { data: res, error } = await supabase.functions.invoke('ai-assist', {
        body: {
          page: 'personas', pageLabel: 'Persona',
          instruction: b2b
            ? `จากข้อมูล Market Research (ตลาด B2B) สร้างโปรไฟล์ผู้มีส่วนตัดสินใจซื้อในองค์กรสำหรับบทบาท "${seg.role}" (${seg.committeeRole ?? ''}) — ` +
              'summary = quote 1 ประโยคที่คนบทบาทนี้พูดในที่ประชุมจัดซื้อ (สะท้อน business pain/ความเสี่ยง/แรงกดดันที่เขากลัว), ' +
              'suggestions = Pain Points เชิงธุรกิจ 3-5 ข้อ (เจาะ ROI · ความเสี่ยง · การอนุมัติงบ · ผลกระทบต่อทีม)'
            : 'จากข้อมูล Market Research ต่อไปนี้ สร้างโปรไฟล์ลูกค้า (persona) — ' +
              'summary = quote 1 ประโยคที่ลูกค้ากลุ่มนี้น่าจะพูด (สะท้อนความเจ็บปวดจริง), ' +
              'suggestions = Pain Points 3-5 ข้อ (สั้น กระชับ เจาะจง)',
          context: [researchPrefill, aiText.trim()].filter(Boolean).join('\n\n'),
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

  function saveItem(pi: number, key: LKey, idx: number, value: string) {
    const personas = data.personas.map((p, i) => {
      if (i !== pi) return p;
      const arr = [...(p[key] ?? [])];
      arr[idx] = value;
      return { ...p, [key]: arr };
    });
    onUpdate({ ...data, personas });
  }

  function addItem(pi: number, key: LKey) {
    const personas = data.personas.map((p, i) => i === pi ? { ...p, [key]: [...(p[key] ?? []), 'รายการใหม่'] } : p);
    onUpdate({ ...data, personas });
  }

  function delItem(pi: number, key: LKey, idx: number) {
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
        </div>
      </div>

      {isDemoPersonas(data) && <DemoBadge hint="แก้ชื่อ/ปัญหา/เป้าหมายให้ตรงลูกค้าจริงของคุณ" />}

      {/* Gate: research → sizing → personas — ต้องยืนยันผลวิจัยตลาดก่อนสร้าง persona */}
      {gated && !bypass ? (
        <div className="pl-gate">
          <div className="pl-gate-ico">🔬</div>
          <div className="pl-gate-title">ทำ Market Research + ประเมินขนาดตลาดก่อน</div>
          <div className="pl-gate-body">
            Persona ที่ดีเกิดจาก<b>งานวิจัย ไม่ใช่การเดา</b> — ให้ CMO วิจัยตลาด + ประเมิน TAM/SAM/SOM
            แล้วกด <b>“ยืนยันผล”</b> ในหน้ากลยุทธ์การตลาด จากนั้นระบบจะพา segment และเลือกโหมด
            <b> B2B / B2C</b> มาสร้าง persona ให้แม่นขึ้น
          </div>
          <div className="pl-gate-actions">
            <button className="pl-gate-cta" onClick={() => { track('persona_gate_nav', {}); onNavigate?.('marketing'); }}>
              → ไปทำ Market Research + Sizing
            </button>
            <button className="pl-gate-skip" onClick={() => { track('persona_gate_skip', {}); setBypass(true); }}>
              ข้ามชั่วคราว (สร้างเองก่อน)
            </button>
          </div>
        </div>
      ) : (
      <div className="persona-launcher">
        {insight?.savedAt && (
          <div className="pl-insight">
            ✅ อ้างอิงผลวิจัย · โหมด <b>{insight.mode.toUpperCase()}</b>
            {insight.som ? ` · SOM ≈ ฿${insight.som.toLocaleString()}/ปี` : ''}
            {insight.oppLabel ? ` · โอกาส: ${insight.oppLabel}` : ''}
          </div>
        )}
        <div className="pl-row">
          <button className="pl-cta" onClick={() => setShowNew((v) => !v)}>
            {showNew ? '× ปิด' : '✨ สร้าง Persona จาก Market Research'}
          </button>
          {isB2b && (
            <button className="pl-cta pl-cta-alt" onClick={addAllCommittee}>
              👥 เพิ่มครบทั้งคณะตัดสินใจ B2B
            </button>
          )}
          <span className="pl-hint">แนะนำ: อย่าเดา — เริ่มจาก segment จริง แล้วให้ AI เติมจากงานวิจัย (ช่องทางค้นหา → SEO/Ads)</span>
        </div>
        {msg && <div className="pl-msg">{msg}</div>}
        {showNew && (
          <div className="pl-panel">
            <div className="pl-seg-hd">1) เลือกกลุ่มเป้าหมาย {isB2b ? '(คณะตัดสินใจ B2B)' : '(จาก Market Research)'}</div>
            <div className="pl-segs">
              {segments.map((s) => (
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
            <div className="pl-seg-hd">2) (ทางเลือก) เพิ่มบทสัมภาษณ์/ผลสำรวจให้ AI เติม pains + quote จริง
              {researchPrefill && <em> — ผลวิจัยตลาดที่ยืนยันไว้ถูกแนบให้ AI อัตโนมัติแล้ว</em>}
              {!isSupabaseEnabled && <em> — โหมด Local: จะใช้ template segment แทน</em>}
            </div>
            <textarea
              ref={aiRef}
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
            {/* feedback ซ้ำตรงปุ่ม — บนมือถือ ข้อความบนสุดอยู่นอกจอ กดแล้วเลยดูเหมือนไม่มีอะไรเกิด */}
            {msg && <div className="pl-msg pl-msg-inline">{msg}</div>}
          </div>
        )}
      </div>
      )}

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

            {/* B2B: บทบาทในคณะตัดสินใจ + firmographics (แสดงเมื่อ persona เป็นแบบ B2B) */}
            {p.committeeRole && (
              <input
                className="p-committee"
                defaultValue={p.committeeRole}
                key={`committee-${pi}`}
                onBlur={e => saveField(pi, 'committeeRole', e.target.value)}
                spellCheck={false}
                title="บทบาทในการตัดสินใจซื้อ (B2B)"
              />
            )}
            {p.firmographics && (
              <div className="p-section">
                <div className="p-sec-hd" style={{ color: '#1a4f8a' }}>🏢 Firmographics (ข้อมูลองค์กร)</div>
                <EditableList
                  items={p.firmographics ?? []}
                  itemKey={`firmographics-${pi}`}
                  onSave={(idx, val) => saveItem(pi, 'firmographics', idx, val)}
                  onAdd={() => addItem(pi, 'firmographics')}
                  onDelete={idx => delItem(pi, 'firmographics', idx)}
                  multiline={false}
                  bordered
                  addLabel="＋ เพิ่ม"
                  addStyle={{ fontSize: 11, padding: '3px 4px', marginTop: 2 }}
                />
              </div>
            )}

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
