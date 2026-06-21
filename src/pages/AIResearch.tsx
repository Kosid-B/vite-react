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
  { key: 'touchpoints' as const, label: 'Touchpoints ที่พบ',     color: '#1a4f8a', jkey: 'touch'  },
  { key: 'pain_points'  as const, label: 'Pain Points จริงๆ',    color: '#c44b2b', jkey: 'pain'   },
  { key: 'opportunities'as const, label: 'โอกาส (Opportunities)', color: '#2d6a4f', jkey: 'opp'    },
  { key: 'behaviors'    as const, label: 'พฤติกรรมลูกค้า',       color: '#1c1814', jkey: 'action' },
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
  const [searchLabel, setSearchLabel] = useState('');
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
    setSearchLabel('');

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
        if (block.type === 'tool_use' && block.name === 'web_search' && block.input?.query) {
          searched.push(block.input.query);
        }
      }

      let parsedInsights: Insights | null = null;
      const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try { parsedInsights = JSON.parse(jsonMatch[1]) as Insights; } catch {}
      }

      const displayText = fullText.replace(/```json[\s\S]*?```/g, '').trim();

      setAnswer(displayText);
      setInsights(parsedInsights);
      setSources(parsedInsights?.sources ?? searched.map(q => `"${q}"`)  );
      setSearchLabel(searched.length ? `ค้นหา: "${t}"` : '');
    } catch (err) {
      clearInterval(ltInterval);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  function addOne(jkey: JKey, item: string, key: string) {
    const stages = data.stages.map((s, i) => {
      if (i !== activeStage) return s;
      return { ...s, [jkey]: [...s[jkey], item] };
    });
    onAddToJourney({ ...data, stages });
    setAdded(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setAdded(prev => ({ ...prev, [key]: false })), 1500);
  }

  function addAll(jkey: JKey, items: string[]) {
    const stages = data.stages.map((s, i) => {
      if (i !== activeStage) return s;
      return { ...s, [jkey]: [...s[jkey], ...items] };
    });
    onAddToJourney({ ...data, stages });
  }

  const hasResults = !loading && (answer || error);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">AI Research</div>
        <div className="page-meta">
          <span className="meta-chip">ค้นหาข้อมูลจริงจาก Google &amp; Social</span>
          <span className="meta-chip" style={{ background: '#fdf3f0', borderColor: '#f5c6bb', color: '#c44b2b' }}>
            ✦ Powered by Claude + Web Search
          </span>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ background: 'var(--white)', border: '1.5px solid var(--sand)', borderRadius: 'var(--r-lg)', padding: '20px 24px', marginBottom: 20, boxShadow: 'var(--shadow)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 12 }}>
          ค้นหาข้อมูลเชิงลึก
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input
            ref={topicRef}
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
            placeholder="เช่น: SME ไทยเลือกที่ปรึกษาอย่างไร, pain point การจ้าง consultant"
            style={{ flex: 1, padding: '11px 14px', border: '1px solid var(--sand)', borderRadius: 'var(--r)', fontSize: 13.5, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--cream)', outline: 'none', minHeight: 44 }}
          />
          <button
            onClick={() => runSearch()}
            disabled={loading}
            style={{ padding: '11px 22px', background: loading ? 'var(--ink3)' : 'var(--ink)', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', minHeight: 44, minWidth: 100, whiteSpace: 'nowrap' }}
          >
            {loading ? 'กำลังค้นหา…' : 'ค้นหา ✦'}
          </button>
        </div>

        <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 8 }}>หัวข้อแนะนำ:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => { setTopic(p); runSearch(p); }}
              style={{ padding: '5px 12px', border: '1px solid var(--sand)', background: 'var(--cream)', borderRadius: 14, fontSize: 12, cursor: 'pointer', color: 'var(--ink2)', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--cream2)', borderTopColor: 'var(--rust)', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 13.5, color: 'var(--ink2)' }}>{loadingText}</div>
          <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 6 }}>Claude กำลังวิเคราะห์ข้อมูลจริงเพื่อ Journey ของคุณ</div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '48px 20px', background: 'var(--white)', border: '1px dashed var(--sand)', borderRadius: 'var(--r-lg)' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>เกิดข้อผิดพลาด</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.7 }}>{error}</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasResults && (
        <div style={{ textAlign: 'center', padding: '48px 20px', background: 'var(--white)', border: '1px dashed var(--sand)', borderRadius: 'var(--r-lg)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>ค้นหาข้อมูล Insight จริง</div>
          <div style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.7 }}>
            AI จะค้นหาจาก Google, Reddit, LinkedIn, Pantip และ Social Media<br />
            แล้วดึง insight มาเติมใน Journey Map ของคุณโดยตรง
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && answer && (
        <div>
          {/* Sources */}
          {sources.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {sources.slice(0, 5).map((s, i) => (
                <span key={i} style={{ padding: '3px 10px', background: 'var(--blue-bg)', color: 'var(--blue)', borderRadius: 12, fontSize: 11, fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          )}

          {/* Answer */}
          <div style={{ background: 'var(--white)', border: '1px solid var(--sand)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--cream2)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>สิ่งที่ AI พบ</span>
              {searchLabel && <span style={{ fontSize: 11, color: 'var(--ink4)' }}>{searchLabel}</span>}
            </div>
            <div style={{ padding: '18px 20px', fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{answer}</div>
          </div>

          {/* Insight cards */}
          {insights && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'var(--ink3)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                Insights ที่ดึงมาได้ — เลือกเพิ่มใน Journey Map
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink4)' }}>คลิก ＋ เพื่อเพิ่มทันที</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {INSIGHT_CATS.map(cat => {
                  const items = insights[cat.key] ?? [];
                  return (
                    <div key={cat.key} style={{ background: 'var(--white)', border: '1px solid var(--sand)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--cream2)', fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' as const, color: cat.color }}>
                        {cat.label}
                      </div>
                      <div style={{ padding: 8 }}>
                        {items.map((item, idx) => {
                          const key = `${cat.key}-${idx}`;
                          const isAdded = added[key];
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', borderRadius: 6 }}>
                              <span style={{ color: 'var(--ink4)', fontSize: 12, flexShrink: 0, marginTop: 2 }}>›</span>
                              <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.5 }}>{item}</span>
                              <button
                                onClick={() => addOne(cat.jkey as JKey, item, key)}
                                style={{
                                  width: 24, height: 24, borderRadius: '50%',
                                  border: `1.5px solid ${isAdded ? '#2d6a4f' : cat.color}`,
                                  background: isAdded ? '#2d6a4f' : 'none',
                                  color: isAdded ? '#fff' : cat.color,
                                  cursor: 'pointer', fontSize: 14, padding: 0, flexShrink: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                                title="เพิ่มใน Journey Map stage ปัจจุบัน"
                              >
                                {isAdded ? '✓' : '＋'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ padding: '8px 14px 10px', borderTop: '1px solid var(--cream2)' }}>
                        <button
                          onClick={() => addAll(cat.jkey as JKey, items)}
                          style={{ width: '100%', padding: 7, background: 'var(--cream)', border: '1px solid var(--sand)', borderRadius: 'var(--r)', fontSize: 11.5, color: 'var(--ink2)', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
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
