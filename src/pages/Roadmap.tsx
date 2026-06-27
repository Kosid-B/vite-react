import { useState } from 'react';
import type { AppData, RoadmapItem, RoadmapQuarter, RoadmapStatus, RoadmapPriority } from '../types';
import { isSupabaseEnabled, supabase } from '../lib/supabase';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

const QUARTERS: RoadmapQuarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
const YEAR = 2025;

const STATUS_META: Record<RoadmapStatus, { label: string; color: string }> = {
  planned:     { label: 'วางแผน',    color: '#8a8278' },
  in_progress: { label: 'กำลังทำ',   color: '#1a4f8a' },
  done:        { label: 'เสร็จแล้ว', color: '#2d6a4f' },
  cancelled:   { label: 'ยกเลิก',    color: '#b0a99f' },
};

const PRIORITY_META: Record<RoadmapPriority, { label: string; color: string }> = {
  must:   { label: 'Must Have',  color: '#c44b2b' },
  should: { label: 'Should',     color: '#a05c1a' },
  nice:   { label: 'Nice to Have', color: '#6b3fa0' },
};

export default function Roadmap({ data, onUpdate }: Props) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const items = data.roadmap ?? [];

  function patch(next: RoadmapItem[]) {
    onUpdate({ ...data, roadmap: next });
  }

  function addItem(q: RoadmapQuarter) {
    const newItem: RoadmapItem = {
      id: 'rm-' + Date.now().toString(36),
      title: 'Feature ใหม่',
      description: 'คำอธิบาย feature นี้',
      quarter: q,
      year: YEAR,
      status: 'planned',
      priority: 'should',
      owner: data.aiCompany?.agents[0]?.role ?? 'CEO',
    };
    patch([...items, newItem]);
    setEditingId(newItem.id);
  }

  function updateItem(id: string, field: keyof RoadmapItem, value: string) {
    patch(items.map(it => it.id === id ? { ...it, [field]: value } : it));
  }

  function deleteItem(id: string) {
    patch(items.filter(it => it.id !== id));
  }

  async function generateAiDetail(item: RoadmapItem) {
    if (!isSupabaseEnabled || !supabase) return;
    setGeneratingId(item.id);
    try {
      const agent = data.aiCompany?.agents.find(a => a.role === item.owner) ?? data.aiCompany?.agents[0];
      const { data: res, error } = await supabase.functions.invoke('agent-run', {
        body: {
          role: agent?.role ?? 'Product Manager',
          mandate: agent?.mandate ?? 'วางแผนผลิตภัณฑ์',
          model: agent?.model ?? 'claude-sonnet-4-6',
          title: `วิเคราะห์ Roadmap Feature: ${item.title}`,
          detail: item.description,
          goal: `วิเคราะห์ความเป็นไปได้ ความซับซ้อน และ KPI สำหรับ feature "${item.title}" ใน ${item.quarter}/${item.year}`,
          industry: data.aiCompany?.industry ?? '',
          companyName: data.aiCompany?.name ?? '',
          orgContext: data.aiCompany?.agents.map(a => ({ role: a.role, mandate: a.mandate })) ?? [],
        },
      });
      if (error) throw error;
      patch(items.map(it => it.id === item.id ? { ...it, aiOutput: res?.output ?? '' } : it));
    } catch (e) {
      patch(items.map(it => it.id === item.id
        ? { ...it, aiOutput: '✕ ' + (e as Error).message }
        : it
      ));
    } finally {
      setGeneratingId(null);
    }
  }

  const doneCount = items.filter(i => i.status === 'done').length;
  const totalPct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Product Roadmap</div>
        <div className="page-meta">
          <span className="meta-chip">{items.length} features</span>
          <span className="meta-chip">{doneCount} เสร็จแล้ว ({totalPct}%)</span>
          <span className="meta-chip">{items.filter(i => i.status === 'in_progress').length} กำลังทำ</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: 'var(--cream2)', borderRadius: 6, height: 6, margin: '0 0 20px', overflow: 'hidden' }}>
        <div style={{ width: `${totalPct}%`, height: '100%', background: 'var(--green)', borderRadius: 6, transition: 'width .4s' }} />
      </div>

      {/* Quarter columns */}
      <div className="roadmap-grid">
        {QUARTERS.map(q => {
          const qItems = items.filter(it => it.quarter === q && it.year === YEAR);
          return (
            <div key={q} className="roadmap-col">
              <div className="roadmap-col-hd">
                <span className="roadmap-q-label">{q} {YEAR}</span>
                <span className="roadmap-q-count">{qItems.length} items</span>
              </div>

              {qItems.map(item => {
                const sm = STATUS_META[item.status];
                const pm = PRIORITY_META[item.priority];
                const isEditing = editingId === item.id;
                const isGenerating = generatingId === item.id;
                return (
                  <div key={item.id} className="roadmap-card" style={{ borderLeftColor: pm.color }}>
                    <div className="roadmap-card-hd">
                      {isEditing ? (
                        <input
                          className="roadmap-title-inp"
                          defaultValue={item.title}
                          onBlur={e => updateItem(item.id, 'title', e.target.value)}
                          autoFocus
                          spellCheck={false}
                        />
                      ) : (
                        <div className="roadmap-title" onClick={() => setEditingId(item.id)}>{item.title}</div>
                      )}
                      <button className="roadmap-del" onClick={() => deleteItem(item.id)} title="ลบ">×</button>
                    </div>

                    <div className="roadmap-badges">
                      <select
                        className="roadmap-badge-sel"
                        style={{ color: sm.color, borderColor: sm.color + '44' }}
                        value={item.status}
                        onChange={e => updateItem(item.id, 'status', e.target.value)}
                      >
                        {Object.entries(STATUS_META).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                      <select
                        className="roadmap-badge-sel"
                        style={{ color: pm.color, borderColor: pm.color + '44' }}
                        value={item.priority}
                        onChange={e => updateItem(item.id, 'priority', e.target.value)}
                      >
                        {Object.entries(PRIORITY_META).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                      <input
                        className="roadmap-owner-inp"
                        defaultValue={item.owner}
                        placeholder="เจ้าของ"
                        key={'own-' + item.id}
                        onBlur={e => updateItem(item.id, 'owner', e.target.value)}
                        title="เจ้าของ / แผนก"
                      />
                    </div>

                    {isEditing ? (
                      <textarea
                        className="roadmap-desc-inp"
                        defaultValue={item.description}
                        onBlur={e => { updateItem(item.id, 'description', e.target.value); setEditingId(null); }}
                        rows={3}
                        spellCheck={false}
                        placeholder="คำอธิบาย feature..."
                      />
                    ) : (
                      <div className="roadmap-desc" onClick={() => setEditingId(item.id)}>{item.description}</div>
                    )}

                    {isSupabaseEnabled && (
                      <button
                        className="roadmap-ai-btn"
                        onClick={() => generateAiDetail(item)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? '⏳ กำลังวิเคราะห์…' : '🤖 AI วิเคราะห์'}
                      </button>
                    )}

                    {item.aiOutput && (
                      <div className="roadmap-ai-out">
                        <div className="roadmap-ai-out-hd">AI Insight</div>
                        <div className="roadmap-ai-out-body">{item.aiOutput}</div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button className="roadmap-add-btn" onClick={() => addItem(q)}>＋ เพิ่ม Feature</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
