import { useState } from 'react';
import type { AppData } from '../types';
import { VERDICT_META, type Verdict } from '../lib/marketValidation';

/* ===== 🧪 Market Validation (CMO) — พิสูจน์ไอเดียก่อนลงทุนสร้าง (GO/PIVOT/KILL) ===== */

export default function MarketValidation({ data, onRun, running, supabaseEnabled }: {
  data: AppData;
  onRun?: (idea: string) => void;
  running?: boolean;
  supabaseEnabled?: boolean;
}) {
  const [idea, setIdea] = useState(data.cmoValidation?.idea ?? '');
  const v = data.cmoValidation;
  const meta = v?.verdict ? VERDICT_META[v.verdict as Exclude<Verdict, ''>] : null;

  return (
    <section className="ai-panel mval" style={{ marginTop: 16 }}>
      <div className="ai-panel-hd">🧪 Market Validation (CMO) — พิสูจน์ไอเดียก่อนลงทุนสร้าง</div>
      <div className="mval-sub">
        ก่อนทุ่มสร้าง — ให้ CMO วิเคราะห์ JTBD · VRIO · TAM/SAM/SOM · Willingness-to-Pay · MVP
        แล้วสรุป <b>GO / PIVOT / KILL</b> (เสริมกับแผง 🧪 พิสูจน์ไอเดียบนหน้าร้านที่วัด demand จริง)
      </div>

      <textarea
        className="mval-input"
        placeholder="พิมพ์ไอเดียสินค้า/บริการ/โมดูลที่อยากพิสูจน์ เช่น 'คอร์สสอนแม่ค้าออนไลน์ใช้ AI ตอบแชท'"
        value={idea}
        onChange={e => setIdea(e.target.value)}
        rows={2}
      />

      <div className="mval-actions">
        {supabaseEnabled && onRun ? (
          <button className="mval-btn" onClick={() => onRun(idea.trim())} disabled={running || !idea.trim()}>
            {running ? 'CMO กำลังพิสูจน์ไอเดีย…' : '🧪 ให้ CMO พิสูจน์ไอเดีย'}
          </button>
        ) : <span className="mval-empty">เปิด Supabase เพื่อให้ CMO agent พิสูจน์ไอเดีย (ใช้ web search)</span>}
      </div>

      {v?.report && (
        <>
          {meta && (
            <div className="mval-verdict" style={{ borderColor: meta.color, background: `${meta.color}18` }}>
              <span className="mval-verdict-badge" style={{ color: meta.color }}>{meta.icon} {meta.label}</span>
              <span className="mval-verdict-hint">{meta.hint}</span>
            </div>
          )}
          <div className="mval-meta">ไอเดีย: “{v.idea}” · อัปเดต {v.updatedAt}{v.webUsed ? ' · 🌐 ข้อมูลตลาดจริง' : ''}</div>
          <pre className="cs-report">{v.report}</pre>
        </>
      )}
    </section>
  );
}
