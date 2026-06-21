import { useState, useRef } from 'react';
import type { AppData } from '../types';

interface Props {
  activeStage: number;
  onAddToJourney: (data: AppData) => void;
  data: AppData;
}

interface Insights {
  touchpoints: string[];
  pain_points: string[];
  opportunities: string[];
  behaviors: string[];
  sources: string[];
}

const QUICK_PROMPTS = [
  'SME ไทยมี pain point อะไรในการจ้างที่ปรึกษา',
  'วิธีที่ SME ไทยค้นหา strategy consultant ออนไลน์',
  'เหตุผลที่ลูกค้า SME ไม่กล้าตัดสินใจจ้าง consultant',
  'Touchpoint ที่สำคัญในการขาย B2B consulting ไทย',
  'LinkedIn content ที่ได้รับ engagement จาก MD / CEO ไทย',
  'ราคา strategy consulting SME ไทย และ ROI ที่คาดหวัง',
  'Reddit / Pantip: ความคิดเห็นเกี่ยวกับการจ้างที่ปรึกษาธุรกิจ',
  'Content marketing ที่ได้ผลสำหรับ B2B consulting ไทย',
];

const INSIGHT_CATS = [
  { key: 'touchpoints'   as const, label: 'Touchpoints ที่พบ',      color: '#1a4f8a', jkey: 'touch'  },
  { key: 'pain_points'   as const, label: 'Pain Points จริงๆ',      color: '#c44b2b', jkey: 'pain'   },
  { key: 'opportunities' as const, label: 'โอกาส (Opportunities)',   color: '#2d6a4f', jkey: 'opp'    },
  { key: 'behaviors'     as const, label: 'พฤติกรรมลูกค้า',         color: '#1c1814', jkey: 'action' },
] as const;

type JKey = 'touch' | 'pain' | 'opp' | 'action';

const LOADING_TEXTS = [
  'กำลังค้นหาข้อมูลจาก Google & Social Media…',
  'วิเคราะห์ความคิดเห็นจาก Reddit, Pantip, LinkedIn…',
  'ดึง insight ที่เกี่ยวข้องกับ Journey Map ของคุณ…',
  'เกือบเสร็จแล้ว — กำลังจัดเรียง insight…',
];

export default function AIResearch({ activeStage, onAddToJourney, data }: Props) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(LOADING_TEXTS[0]);
  const [answer, setAnswer] = useState('');
  const [insights, setInsights] = useState<Insights | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const topicRef = useRef<HTMLInputElement>(null);

  async function runSearch(q?: string) {
    const t = (q ?? topic).trim();
    if (!t) { topicRef.current?.focus(); return; }

    setLoading(true);
    setAnswer('');
    setInsights(null);
    setSources([]);
    setError('');

    let ltIdx = 0;
    const ltInterval = setInterval(() => {
      ltIdx = (ltIdx + 1) % LOADING_TEXTS.length;
      setLoadingText(LOADING_TEXTS[ltIdx]);
    }, 2000);

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } : {}),
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 2000,
          system: `คุณเป็น Customer Journey Research Analyst ที่เชี่ยวชาญตลาด B2B Consulting ในประเทศไทย\nโดยเฉพาะกลุ่ม SME (ทีม 10-100 คน) ที่หา Strategy Consultant ผ่าน Inbound channels\n\nสรุปสิ่งที่พบก่อน แล้วตามด้วย JSON block นี้เสมอ:\n\n\`\`\`json\n{\n  "touchpoints": ["touchpoint 1", "touchpoint 2", "touchpoint 3"],\n  "pain_points": ["pain 1", "pain 2", "pain 3"],\n  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],\n  "behaviors": ["behavior 1", "behavior 2", "behavior 3"],\n  "sources": ["แหล่งข้อมูล 1", "แหล่งข้อมูล 2"]\n}\n\`\`\``,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{
            role: 'user',
            content: `ค้นหาข้อมูลจริงเกี่ยวกับ: "${t}"\n\nค้นหาจาก: Google Thailand, Reddit, Pantip, LinkedIn Thailand, Facebook Business Groups\nเน้น: ประสบการณ์จริงของ SME ไทย, ความคิดเห็น, pain point, พฤติกรรมการค้นหาและตัดสินใจ\n\nสรุปสิ่งที่พบก่อน แล้วตามด้วย JSON ตามรูปแบบที่กำหนด`,
          }],
        }),
      });

      clearInterval(ltInterval);

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? `HTTP ${res.status}`);
      }

      const responseData = await res.json() as { content: Array<{ type: string; text?: string; name?: string; input?: { query?: string } }> };

      let fullText = '';
      const searched: string[] = [];
      for (const block of responseData.content ?? []) {
        if (block.type === 'text' && block.text) fullText += block.text;
        if (block.type === 'tool_use' && block.name === 'web_search' && block.input?.query) searched.push(block.input.query);
      }

      let parsedInsights: Insights | null = null;
      const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try { parsedInsights = JSON.parse(jsonMatch[1]) as Insights; } catch {}
      }

      setAnswer(fullText.replace(/```json[\s\S]*?```/g, '').trim());
      setInsights(parsedInsights);
      setSources(parsedInsights?.sources ?? searched.map(q => `"${q}"`));
    } catch (err) {
      clearInterval(ltInterval);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  function addOne(jkey: JKey, item: string, key: string) {
    const stages = data.stages.map((s, i) => i !== activeStage ? s : { ...s, [jkey]: [...s[jkey], item] });
    onAddToJourney({ ...data, stages });
    setAdded(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setAdded(prev => ({ ...prev, [key]: false })), 1500);
  }

  function addAll(jkey: JKey, items: string[]) {
    const stages = data.stages.map((s, i) => i !== activeStage ? s : { ...s, [jkey]: [...s[jkey], ...items] });
    onAddToJourney({ ...data, stages });
  }

  const hasResults = !loading && (answer || error);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">AI Research</div>
        <div className="page-meta">
          <span className="meta-chip">ค้นหาข้อมูลจริงจาก Google &amp; Social</span>
          <span className="meta-chip ai-powered-chip">✦ Powered by Claude + Web Search</span>
        </div>
      </div>

      <div className="ai-search-box">
        <div className="ai-search-label">ค้นหาข้อมูลเชิงลึก</div>
        <div className="ai-search-row">
          <input
            ref={topicRef}
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
            placeholder="เช่น: SME ไทยเลือกที่ปรึกษาอย่างไร, pain point การจ้าง consultant"
            className="ai-search-inp"
          />
          <button onClick={() => runSearch()} disabled={loading} className={`ai-search-btn${loading ? ' loading' : ''}`}>
            {loading ? 'กำลังค้นหา…' : 'ค้นหา ✦'}
          </button>
        </div>
        <div className="ai-ql-label">หัวข้อแนะนำ:</div>
        <div className="ai-ql-row">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => { setTopic(p); runSearch(p); }} className="ai-qp-btn">{p}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="ai-loading">
          <div className="ai-spinner" />
          <div className="ai-loading-text">{loadingText}</div>
          <div className="ai-loading-sub">Claude กำลังวิเคราะห์ข้อมูลจริงเพื่อ Journey ของคุณ</div>
        </div>
      )}

      {!loading && error && (
        <div className="ai-state">
          <div className="ai-state-icon">⚠️</div>
          <div className="ai-state-title">เกิดข้อผิดพลาด</div>
          <div className="ai-state-text">{error}</div>
        </div>
      )}

      {!loading && !hasResults && (
        <div className="ai-state">
          <div className="ai-state-icon">🔍</div>
          <div className="ai-state-title ai-state-title-lg">ค้นหาข้อมูล Insight จริง</div>
          <div className="ai-state-text">
            AI จะค้นหาจาก Google, Reddit, LinkedIn, Pantip และ Social Media<br />
            แล้วดึง insight มาเติมใน Journey Map ของคุณโดยตรง
          </div>
        </div>
      )}

      {!loading && answer && (
        <div>
          {sources.length > 0 && (
            <div className="ai-sources">
              {sources.slice(0, 5).map((s, i) => <span key={i} className="ai-source-chip">{s}</span>)}
            </div>
          )}

          <div className="ai-answer-card">
            <div className="ai-answer-hd">สิ่งที่ AI พบ</div>
            <div className="ai-answer-body">{answer}</div>
          </div>

          {insights && (
            <div>
              <div className="ai-insights-hd">
                Insights ที่ดึงมาได้ — เลือกเพิ่มใน Journey Map
                <span className="ai-insights-hint">คลิก ＋ เพื่อเพิ่มทันที</span>
              </div>
              <div className="ai-insights-grid">
                {INSIGHT_CATS.map(cat => {
                  const items = insights[cat.key] ?? [];
                  return (
                    <div key={cat.key} className="ai-insight-card">
                      <div className="ai-insight-card-hd" style={{ color: cat.color }}>{cat.label}</div>
                      <div className="ai-insight-card-body">
                        {items.map((item, idx) => {
                          const key = `${cat.key}-${idx}`;
                          const isAdded = added[key];
                          return (
                            <div key={idx} className="ai-item">
                              <span className="ai-item-bullet">›</span>
                              <span className="ai-item-text">{item}</span>
                              <button
                                onClick={() => addOne(cat.jkey as JKey, item, key)}
                                className={`ai-add-btn${isAdded ? ' added' : ''}`}
                                style={{ borderColor: isAdded ? undefined : cat.color, color: isAdded ? undefined : cat.color }}
                                title="เพิ่มใน Journey Map stage ปัจจุบัน"
                              >
                                {isAdded ? '✓' : '＋'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="ai-card-foot">
                        <button onClick={() => addAll(cat.jkey as JKey, items)} className="ai-add-all-btn">
                          เพิ่มทั้งหมดใน Stage ปัจจุบัน →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
