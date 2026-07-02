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
