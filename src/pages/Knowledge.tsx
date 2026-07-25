import { useState } from 'react';
import { track } from '../lib/analytics';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import {
  retrieve, buildContext, ragInstruction,
  type KBChunk, type KBTopic,
} from '../lib/knowledgeBase';

const TOPICS: { id: KBTopic | 'all'; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'iso9001', label: 'ISO 9001' },
  { id: 'pdpa', label: 'PDPA' },
  { id: 'tis', label: 'มอก.' },
];

const SUGGESTED = [
  'ต้องทำ internal audit ตอนไหน และบ่อยแค่ไหน',
  'ลูกค้าขอลบข้อมูลส่วนบุคคล ต้องทำยังไงตาม PDPA',
  'ปฏิบัติการแก้ไข (corrective action) ที่ดีต้องมีอะไร',
  'ขอ มอก. ต้องเตรียมอะไรบ้าง',
];

export default function Knowledge() {
  const [topic, setTopic] = useState<KBTopic | 'all'>('all');
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<KBChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [asked, setAsked] = useState(false);

  async function ask(question: string) {
    const query = question.trim();
    if (!query) { setMsg('พิมพ์คำถามก่อนครับ'); return; }
    setMsg(''); setAsked(true); setAnswer('');

    const chunks = retrieve(query, 4, topic === 'all' ? undefined : topic);
    setSources(chunks);

    if (!chunks.length) {
      setAnswer('ไม่พบข้อมูลที่เกี่ยวข้องในฐานความรู้ (ISO 9001 / PDPA / มอก.) — ลองถามใหม่ด้วยคำที่ตรงกับหัวข้อมาตรฐาน');
      track('kb_query', { topic, hit: 0 });
      return;
    }

    // ตอบด้วย AI แบบ grounded (reuse ai-assist: context=chunks, instruction=RAG) · ไม่มี AI = โชว์แหล่งตรง
    if (!isSupabaseEnabled || !supabase) {
      setAnswer('(โหมดออฟไลน์ — แสดงข้อกำหนดที่เกี่ยวข้องด้านล่าง · เปิด AI เพื่อสรุปตอบเป็นคำพูด)');
      track('kb_query', { topic, hit: 1, mode: 'offline' });
      return;
    }

    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('ai-assist', {
        body: {
          page: 'knowledge', pageLabel: 'คลังความรู้ ISO/PDPA',
          instruction: ragInstruction(query),
          context: buildContext(chunks),
        },
      });
      if (error) throw new Error(error.message || 'ai_error');
      const a = res?.summary || (res?.suggestions?.length ? res.suggestions.join('\n• ') : '');
      setAnswer(a || 'AI ไม่ได้ส่งคำตอบกลับมา — ดูข้อกำหนดที่เกี่ยวข้องด้านล่าง');
      track('kb_query', { topic, hit: 1, mode: 'ai' });
    } catch {
      setAnswer('(AI ไม่พร้อม — แสดงข้อกำหนดที่เกี่ยวข้องด้านล่างแทน)');
      setMsg('AI ไม่พร้อม (ตรวจว่า deploy ai-assist + ตั้ง ANTHROPIC_API_KEY)');
      track('kb_query', { topic, hit: 1, mode: 'fallback' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📚 คลังความรู้ ISO / PDPA (ถาม-ตอบ)</h1>
        <p className="page-meta">
          ถามข้อสงสัยเรื่องข้อกำหนด ISO 9001 · PDPA · มอก. → AI ตอบโดย<b>อ้างอิงจากฐานความรู้จริง</b> (ไม่มั่ว) พร้อมแหล่งอ้างอิง
          {!isSupabaseEnabled && ' · โหมดออฟไลน์: แสดงข้อกำหนดที่เกี่ยวข้อง'}
        </p>
      </div>

      <div className="kb-wrap">
        <div className="kb-ask">
          <div className="pn-seg" style={{ marginBottom: 10 }}>
            {TOPICS.map(t => (
              <button key={t.id} className={`pn-chip ${topic === t.id ? 'on' : ''}`} onClick={() => setTopic(t.id)}>{t.label}</button>
            ))}
          </div>
          <div className="kb-inputrow">
            <input className="pn-input" value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') ask(q); }}
              placeholder="เช่น ต้องทำ internal audit ตอนไหน…" />
            <button className="pn-btn pn-btn-primary" onClick={() => ask(q)} disabled={loading}>
              {loading ? 'กำลังค้น…' : 'ถาม'}
            </button>
          </div>
          {!asked && (
            <div className="kb-suggest">
              {SUGGESTED.map(s => (
                <button key={s} className="kb-sugg" onClick={() => { setQ(s); ask(s); }}>💡 {s}</button>
              ))}
            </div>
          )}
          {msg && <div className="pn-warn" style={{ marginTop: 10 }}>{msg}</div>}
        </div>

        {asked && (
          <div className="kb-result">
            <div className="pn-card">
              <div className="pn-lbl">คำตอบ</div>
              <div className="kb-answer">{answer || (loading ? '…' : '')}</div>
            </div>

            {sources.length > 0 && (
              <div className="pn-card" style={{ marginTop: 14 }}>
                <div className="pn-lbl">แหล่งอ้างอิง ({sources.length})</div>
                <div className="cc-list">
                  {sources.map((c, i) => (
                    <div key={c.id} className="cc-item">
                      <span className="cc-badge cc-ok">[{i + 1}]</span>
                      <div className="cc-item-body">
                        <div className="cc-item-title">{c.source} — {c.title}</div>
                        <div className="cc-item-note">{c.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="pn-disclaimer">⚠️ อ้างอิงจากฐานความรู้สรุป — ควรตรวจกับมาตรฐานฉบับจริง/ที่ปรึกษาก่อนนำไปใช้ตัดสินใจ</div>
          </div>
        )}
      </div>
    </div>
  );
}
