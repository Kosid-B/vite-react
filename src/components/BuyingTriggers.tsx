import type { AppData } from '../types';
import {
  TRIGGERS, getTriggers, triggersSummary, SCORE_LABEL, type TriggerKey,
} from '../lib/buyingTriggers';
import { track } from '../lib/analytics';

/**
 * 3 แรงขับที่ทำให้ลูกค้ายอมจ่าย — เครื่องมือประเมินคุณค่าเชิงลึก
 * ผู้ประกอบการให้คะแนน + บันทึกว่าธุรกิจตอบโจทย์แต่ละด้านอย่างไร → ระบบชี้จุดที่ต้องเสริม
 */
export default function BuyingTriggers({ data, onUpdate }: { data: AppData; onUpdate: (d: AppData) => void }) {
  const state = getTriggers(data.buyingTriggers);
  const summary = triggersSummary(state);

  function patch(key: TriggerKey, part: Partial<{ note: string; score: number }>) {
    const next = { ...state, [key]: { ...state[key], ...part } };
    onUpdate({ ...data, buyingTriggers: next });
  }

  return (
    <div className="bt-wrap">
      <div className="bt-head">
        <h3>💡 3 แรงขับที่ทำให้ลูกค้ายอมจ่าย</h3>
        <p>หัวใจธุรกิจไม่ใช่แค่คุณภาพสินค้า แต่คือการตอบโจทย์เชิงลึก — ประเมินว่าธุรกิจคุณส่งมอบครบไหม</p>
      </div>

      <div className="bt-score">
        <div className="bt-score-ring" style={{ background: `conic-gradient(#f59e0b ${summary.pct * 3.6}deg, #1e293b 0deg)` }}>
          <span>{summary.pct}%</span>
        </div>
        <div className="bt-score-txt">
          <div className="bt-score-lbl">คะแนนแรงดึงดูดใจลูกค้า</div>
          <div className="bt-diagnosis">{summary.diagnosis}</div>
        </div>
      </div>

      <div className="bt-cards">
        {TRIGGERS.map(t => {
          const entry = state[t.key];
          const isWeak = summary.weakest === t.key && summary.pct > 0 && entry.score <= 1;
          return (
            <div key={t.key} className={`bt-card${isWeak ? ' bt-card-weak' : ''}`}>
              <div className="bt-card-hd">
                <span className="bt-icon">{t.icon}</span>
                <div>
                  <div className="bt-title">{t.title}{isWeak && <span className="bt-flag"> · ควรเสริม</span>}</div>
                  <div className="bt-sub">{t.sub}</div>
                </div>
              </div>
              <label className="bt-prompt">{t.prompt}</label>
              <textarea
                value={entry.note}
                onChange={e => patch(t.key, { note: e.target.value })}
                placeholder="เขียนว่าธุรกิจคุณตอบโจทย์ด้านนี้อย่างไร…"
                rows={2}
              />
              <div className="bt-scoring">
                <span className="bt-scoring-lbl">ความแข็งแรง:</span>
                {[0, 1, 2, 3].map(n => (
                  <button
                    key={n}
                    className={`bt-dot${entry.score === n ? ' active' : ''}`}
                    onClick={() => { patch(t.key, { score: n }); track('buying_trigger_scored', { key: t.key, score: n }); }}
                    title={SCORE_LABEL[n]}
                  >{n}</button>
                ))}
                <span className="bt-scoring-val">{SCORE_LABEL[entry.score] ?? ''}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
