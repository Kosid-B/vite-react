import { useState } from 'react';
import type { AppData } from '../types';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { track } from '../lib/analytics';
import { trackAiCall } from '../lib/usage';
import {
  TRUST_STEPS, trustBriefReady, trustLocalScaffold, buildTrustPrompt, type TrustBrief,
} from '../lib/trustContent';
import AiDisclaimer from '../components/AiDisclaimer';

/* ✍️ สร้างคอนเทนต์สายเชื่อใจ (T.R.U.S.T. Framework) — ฝังในแอป
 * ยุค AI content ล้น → ความเชื่อใจคือของหายากที่ขายได้ · การตลาดอย่างมีจริยธรรม
 * ออนไลน์: ai-assist ร่าง 5 ขั้นให้ · ออฟไลน์: scaffold rule-based (คำถามชี้ทาง) */

const CHANNELS = ['Facebook', 'LINE', 'LinkedIn', 'Instagram', 'TikTok', 'เว็บ/บล็อก'];

export default function TrustContent({ data }: { data: AppData }) {
  const c = data.aiCompany;
  const seg = data.businessModel?.bmc?.segments?.[0] ?? '';
  const [brief, setBrief] = useState<TrustBrief>({
    topic: c?.name ?? '', audience: seg, goal: 'เก็บรายชื่อ/สร้างความสนใจ', channel: 'Facebook',
  });
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const scaffold = trustLocalScaffold(brief);
  const ready = trustBriefReady(brief);
  const set = (k: keyof TrustBrief, v: string) => setBrief(b => ({ ...b, [k]: v }));

  async function draftWithAi() {
    if (!ready) { setMsg('ใส่หัวข้อ/สินค้าก่อน แล้วให้ AI ช่วยร่าง'); return; }
    if (!isSupabaseEnabled || !supabase) {
      setMsg('โหมด Local (ไม่มี AI) — ใช้ “คำถามชี้ทาง” ด้านล่างเขียนเองทีละขั้นได้เลย เมื่อเข้าสู่ระบบ AI จะช่วยร่างให้');
      track('trust_content_draft', { mode: 'local' });
      return;
    }
    setBusy(true); setMsg(''); setDraft(null); setSummary(null);
    try {
      trackAiCall();
      const { data: res, error } = await supabase.functions.invoke('ai-assist', {
        body: {
          page: 'trust', pageLabel: 'สร้างคอนเทนต์ T.R.U.S.T.',
          instruction: buildTrustPrompt(brief),
        },
      });
      if (error) throw error;
      const items = (res?.suggestions ?? []).map((s: string) => String(s));
      setSummary(res?.summary ? String(res.summary) : null);
      setDraft(items.length ? items : null);
      if (!items.length) setMsg('AI ไม่ได้ส่งร่างกลับมา — ใช้คำถามชี้ทางด้านล่างเขียนเองได้');
      track('trust_content_draft', { mode: 'ai' });
    } catch (e) {
      setMsg('AI ไม่ตอบตอนนี้ — ใช้คำถามชี้ทางด้านล่างเขียนเองได้ (' + ((e as Error).message || 'error') + ')');
      track('trust_content_draft', { mode: 'fallback' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tc">
      <div className="tc-hd">
        <div>
          <h2 className="tc-title">✍️ สร้างคอนเทนต์สายเชื่อใจ · T.R.U.S.T.</h2>
          <p className="tc-sub">ยุค AI content ล้นตลาด — คอนเทนต์ที่คน “เชื่อ” คือคอนเทนต์ที่ขายได้ · 5 ขั้นอย่างมีจริยธรรม</p>
        </div>
        <a className="tc-learn" href="/trust" target="_blank" rel="noopener">T.R.U.S.T. คืออะไร ↗</a>
      </div>

      <div className="tc-brief">
        <label>หัวข้อ / สินค้า-บริการ
          <input value={brief.topic} onChange={e => set('topic', e.target.value)} placeholder="เช่น คอร์สทำขนมออนไลน์" />
        </label>
        <label>กลุ่มเป้าหมาย
          <input value={brief.audience} onChange={e => set('audience', e.target.value)} placeholder="เช่น แม่บ้านวัย 30-45" />
        </label>
        <label>เป้าหมายคอนเทนต์
          <input value={brief.goal} onChange={e => set('goal', e.target.value)} placeholder="เช่น เก็บรายชื่อ / ปิดการขาย" />
        </label>
        <label>ช่องทาง
          <select value={brief.channel} onChange={e => set('channel', e.target.value)}>
            {CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
          </select>
        </label>
      </div>

      <button className="tc-run" onClick={draftWithAi} disabled={busy || !ready}>
        {busy ? '⏳ AI กำลังร่าง…' : '🤖 ให้ AI ช่วยร่างคอนเทนต์ (T.R.U.S.T.)'}
      </button>
      {msg && <div className="tc-msg">{msg}</div>}

      {(summary || draft) && (
        <div className="tc-out">
          {summary && <p className="tc-out-sum">{summary}</p>}
          {draft && (
            <ol className="tc-draft">
              {draft.map((d, i) => <li key={i}>{d}</li>)}
            </ol>
          )}
          <AiDisclaimer note="ร่างจาก AI เพื่อเป็นจุดเริ่ม — ตรวจ/แก้ให้ตรงแบรนด์ก่อนโพสต์ · ตัวเลข/รีวิวต้องเป็นของจริง ไม่ปั้น" />
        </div>
      )}

      <div className="tc-steps">
        <div className="tc-steps-hd">คำถามชี้ทาง — เขียนเองทีละขั้น (ใช้ได้แม้ไม่มี AI)</div>
        {scaffold.map((s, i) => (
          <div className="tc-step" key={i}>
            <span className="tc-letter">{s.letter}</span>
            <div>
              <div className="tc-step-name">{s.name} <span className="tc-guide">· {TRUST_STEPS[i].guide}</span></div>
              <div className="tc-step-prompt">{s.prompt}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
