import { useEffect, useRef } from 'react';
import type { AppData, Stage, FunnelStage, ROIStageCost } from '../types';
import { autoH } from '../utils';
import EditableList from '../components/EditableList';

interface Props {
  data: AppData;
  activeStage: number;
  onStageChange: (i: number) => void;
  onUpdate: (data: AppData) => void;
}

const SECTIONS = [
  { key: 'touch' as const, title: 'Inbound Touchpoints', color: '#1a4f8a' },
  { key: 'action' as const, title: 'สิ่งที่ลูกค้าทำ', color: '#1c1814' },
  { key: 'pain' as const, title: 'Pain Points', color: '#c44b2b' },
  { key: 'opp' as const, title: 'โอกาส (Opportunities)', color: '#2d6a4f' },
];

const LAWS = [
  { name: "Fitts's Law", desc: 'Target ใหญ่ → คลิกเร็วกว่า', example: "Stage chips มี min 36px height\nและ padding넉넉 → คลิกง่าย" },
  { name: "Hick's Law", desc: 'ตัวเลือกน้อย → ตัดสินใจเร็ว', example: "8 stages แต่แสดงทีละ 1\nลด cognitive load ลงมาก" },
  { name: 'Von Restorff', desc: 'สิ่งที่ต่างออกไป → จำได้มากกว่า', example: 'Active chip มีสีดำ contrast สูง\nแยกจาก chip อื่นอย่างชัดเจน' },
  { name: 'Common Region', desc: 'Frame เดียวกัน → เกี่ยวข้องกัน', example: 'Touchpoints / Actions / Pain / Opp\nแต่ละกลุ่มอยู่ใน card ของตัวเอง' },
  { name: "Miller's Law", desc: 'จำได้ดีสุด 7±2 chunks', example: 'แต่ละ stage ≤ 4 รายการต่อกลุ่ม\nไม่เกิน 7 เพื่อไม่ล้น working memory' },
  { name: 'Doherty Threshold', desc: 'Feedback <400ms → ไม่รอ', example: 'บันทึกอัตโนมัติทันทีหลังแก้ไข\nไม่ต้องรอ → ลด friction' },
  { name: "Jakob's Law", desc: 'Pattern คุ้นเคย → ใช้งานง่าย', example: 'Sidebar nav ใช้รูปแบบที่คุ้นเคย\nไม่ต้องเรียนรู้ใหม่' },
  { name: 'Aesthetic-Usability', desc: 'สวย → รู้สึกใช้ง่ายกว่า', example: 'Design สะอาด อ่านง่าย →\nผู้ใช้รู้สึกว่าใช้งานง่ายขึ้นด้วย' },
];

export default function JourneyMap({ data, activeStage, onStageChange, onUpdate }: Props) {
  const emotionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (emotionRef.current) autoH(emotionRef.current);
  }, [activeStage]);

  const stage = data.stages[activeStage];

  function saveEmotion(value: string) {
    const next = { ...data, stages: data.stages.map((s, i) => i === activeStage ? { ...s, emotion: value } : s) };
    onUpdate(next);
  }

  function saveItem(key: typeof SECTIONS[number]['key'], idx: number, value: string) {
    const next = {
      ...data,
      stages: data.stages.map((s, i) => {
        if (i !== activeStage) return s;
        const arr = [...s[key]];
        arr[idx] = value;
        return { ...s, [key]: arr };
      }),
    };
    onUpdate(next);
  }

  function addItem(key: typeof SECTIONS[number]['key']) {
    const next = {
      ...data,
      stages: data.stages.map((s, i) => {
        if (i !== activeStage) return s;
        return { ...s, [key]: [...s[key], 'รายการใหม่'] };
      }),
    };
    onUpdate(next);
  }

  function addStage() {
    const id = `s${Date.now()}`;
    const newStage: Stage = {
      id, label: `Stage ${data.stages.length + 1}`,
      title: `ขั้นตอนที่ ${data.stages.length + 1}`,
      emotion: '', touch: [], action: [], pain: [], opp: [],
    };
    onUpdate({
      ...data,
      stages: [...data.stages, newStage],
      funnel: [...data.funnel, { stageId: id, leads: 0, note: '' } as FunnelStage],
      roi: { ...data.roi, stageCosts: [...data.roi.stageCosts, { stageId: id, hours: 0 } as ROIStageCost] },
    });
    onStageChange(data.stages.length);
  }

  function delActiveStage() {
    if (data.stages.length <= 1) return;
    const stageId = stage.id;
    onUpdate({
      ...data,
      stages: data.stages.filter((_, i) => i !== activeStage),
      funnel: data.funnel.filter(f => f.stageId !== stageId),
      roi: { ...data.roi, stageCosts: data.roi.stageCosts.filter(sc => sc.stageId !== stageId) },
    });
    onStageChange(Math.max(0, activeStage - 1));
  }

  function delItem(key: typeof SECTIONS[number]['key'], idx: number) {
    const next = {
      ...data,
      stages: data.stages.map((s, i) => {
        if (i !== activeStage) return s;
        const arr = s[key].filter((_, j) => j !== idx);
        return { ...s, [key]: arr };
      }),
    };
    onUpdate(next);
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Customer Journey Map</div>
        <div className="page-meta">
          <span className="meta-chip">Strategy Consulting</span>
          <span className="meta-chip">SME · ทีม 10–100 คน</span>
          <span className="meta-chip">Inbound</span>
          <span className="law-badge" data-tip={"Hick's Law: ยิ่งมีตัวเลือกน้อย\nตัดสินใจได้เร็วขึ้น — stage strip\nแสดงทีละ 1 stage เสมอ"}>Hick's Law</span>
          <span className="law-badge" data-tip={"Von Restorff Effect: stage ที่ active\nโดดเด่นจาก chip อื่นด้วยสี contrast สูง"}>Von Restorff</span>
          <span className="law-badge" data-tip={"Law of Proximity: ข้อมูลที่เกี่ยวข้องกัน\nอยู่ใน quadrant เดียวกัน"}>Proximity</span>
        </div>
      </div>

      {/* Laws Legend */}
      <div className="laws-legend">
        <div className="laws-legend-title">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Laws of UX ที่ใช้ในหน้านี้ — hover เพื่อดูตัวอย่าง
        </div>
        <div className="laws-grid">
          {LAWS.map(law => (
            <div key={law.name} className="law-pill" data-example={law.example}>
              <div className="law-pill-name">{law.name}</div>
              <div className="law-pill-desc">{law.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage strip */}
      <div className="stage-strip">
        {data.stages.map((s, i) => (
          <button key={s.id} className={`stage-chip ${i === activeStage ? 'active' : ''}`} onClick={() => onStageChange(i)}>
            <span className="stage-num">{i + 1}</span>
            {s.label}
          </button>
        ))}
        <button className="stage-add" onClick={addStage} title="เพิ่ม Stage">＋</button>
      </div>

      {/* Emotion row */}
      <div className="emotion-row">
        <div className="emotion-stage-hd">
          <div className="emotion-stage-title">{stage.title}</div>
          {data.stages.length > 1 && (
            <button className="stage-del-btn" onClick={delActiveStage} title="ลบ Stage นี้">×</button>
          )}
        </div>
        <div className="emotion-divider" />
        <div className="emotion-content">
          <div className="emotion-lbl">ความรู้สึกลูกค้า</div>
          <textarea
            ref={emotionRef}
            className="emotion-text"
            rows={1}
            defaultValue={stage.emotion}
            key={`emotion-${activeStage}`}
            onBlur={e => saveEmotion(e.target.value)}
            onChange={e => autoH(e.target)}
            spellCheck={false}
          />
        </div>
      </div>

      {/* 2×2 quadrant grid */}
      <div className="journey-grid">
        {SECTIONS.map(sec => (
          <div key={sec.key} className="jq">
            <div className="jq-head">
              <span className="jq-title" style={{ color: sec.color }}>{sec.title}</span>
            </div>
            <div className="jq-body">
              <EditableList
                items={stage[sec.key]}
                itemKey={`${sec.key}-${activeStage}`}
                onSave={(idx, val) => saveItem(sec.key, idx, val)}
                onAdd={() => addItem(sec.key)}
                onDelete={idx => delItem(sec.key, idx)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
