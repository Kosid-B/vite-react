import { useState } from 'react';
import { track } from '../lib/analytics';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import {
  heuristicCheck, readinessScore, gaps, compliancePrompt, complianceSystemPrompt,
  parseComplianceJson, STANDARD_LABEL,
  type StandardId, type ClauseResult,
} from '../lib/complianceCheck';
import ConsultHandoff from '../components/ConsultHandoff';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  covered: { label: 'ครบ', cls: 'cc-ok' },
  partial: { label: 'บางส่วน', cls: 'cc-warn' },
  missing: { label: 'ขาด', cls: 'cc-miss' },
};

/** เอกสารตัวอย่าง (คู่มือคุณภาพย่อ) — คลิกเดียวเห็น Readiness Score ทันที (self-serve aha) */
const SAMPLE_DOC = `คู่มือคุณภาพ บริษัท ตัวอย่างการผลิต จำกัด

1. บริบทองค์กร: บริษัทผลิตชิ้นส่วนพลาสติกส่งโรงงานยานยนต์ กำหนดผู้มีส่วนได้ส่วนเสีย ได้แก่ ลูกค้า ซัพพลายเออร์ พนักงาน หน่วยงานราชการ
2. ขอบเขตระบบบริหารคุณภาพ: ครอบคลุมการรับคำสั่งซื้อ การผลิต การตรวจสอบ และการส่งมอบ
3. ภาวะผู้นำ: ผู้บริหารสูงสุดกำหนดนโยบายคุณภาพ "มุ่งมั่นผลิตสินค้าตรงตามข้อกำหนดลูกค้าและปรับปรุงต่อเนื่อง" และสื่อสารให้พนักงานทราบ
4. การวางแผน: มีการชี้บ่งความเสี่ยงและโอกาสในกระบวนการผลิต กำหนดวัตถุประสงค์คุณภาพรายแผนก
5. การสนับสนุน: จัดอบรมพนักงานใหม่ บันทึกประวัติการฝึกอบรม ควบคุมเอกสารด้วยระบบเลขที่เอกสาร
6. การปฏิบัติงาน: มีขั้นตอนการผลิต ใบตรวจสอบคุณภาพ (QC) ก่อนส่งมอบ
7. การประเมินสมรรถนะ: (ยังไม่ได้ระบุวิธีวัดความพึงพอใจลูกค้าอย่างชัดเจน)
8. การปรับปรุง: มีการบันทึกข้อร้องเรียนลูกค้า แต่ยังไม่มีขั้นตอนแก้ไข/ป้องกัน (CAPA) เป็นลายลักษณ์อักษร`;

export default function ComplianceCheck() {
  const [standard, setStandard] = useState<StandardId>('iso9001');
  const [doc, setDoc] = useState('');
  const [results, setResults] = useState<ClauseResult[]>([]);
  const [summary, setSummary] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [modelUsed, setModelUsed] = useState('');

  function applyResults(rs: ClauseResult[], sum: string, model: string) {
    setResults(rs); setSummary(sum); setScore(readinessScore(rs)); setModelUsed(model);
  }

  /** วางเอกสารตัวอย่าง + ตรวจทันที — เส้นทางสั้นสุดสู่ aha (ไม่ต้องหาเอกสารมาวาง) */
  function trySample() {
    setStandard('iso9001');
    setDoc(SAMPLE_DOC);
    track('compliance_sample_tried', {});
    check(isSupabaseEnabled, SAMPLE_DOC); // override กันปัญหา setState async
  }

  async function check(useAi: boolean, overrideDoc?: string) {
    const text = overrideDoc ?? doc;
    if (!text.trim()) { setMsg('กรุณาวางเนื้อหาเอกสารก่อน'); return; }
    setMsg('');

    // ออฟไลน์ / ไม่ใช้ AI → heuristic keyword ทันที
    if (!useAi || !isSupabaseEnabled || !supabase) {
      const rs = heuristicCheck(text, standard);
      applyResults(rs, 'ประเมินเบื้องต้นจากคำสำคัญ (ออฟไลน์) — ใช้ AI เพื่อวิเคราะห์ลึกขึ้น', 'heuristic (ออฟไลน์)');
      track('compliance_checked', { standard, mode: 'heuristic' });
      return;
    }

    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('compliance-check', {
        body: { system: complianceSystemPrompt(), prompt: compliancePrompt(text, standard) },
      });
      if (error || !res?.result) throw new Error(error?.message || 'no_result');
      const parsed = parseComplianceJson(res.result, standard);
      if (!parsed || !parsed.results.length) throw new Error('parse_failed');
      applyResults(parsed.results, parsed.summary, `AI: ${res.model ?? '-'}`);
      track('compliance_checked', { standard, mode: 'ai' });
    } catch {
      const rs = heuristicCheck(text, standard); // fallback ไม่ให้มือเปล่า
      applyResults(rs, 'AI ไม่พร้อม — แสดงผลประเมินเบื้องต้นจากคำสำคัญแทน', 'heuristic (AI ไม่พร้อม)');
      setMsg('AI ไม่พร้อม (ตรวจว่า deploy compliance-check + ตั้ง ANTHROPIC_API_KEY) — ใช้ heuristic แทน');
      track('compliance_checked', { standard, mode: 'heuristic_fallback' });
    } finally {
      setLoading(false);
    }
  }

  const gapList = gaps(results);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🔍 AI ตรวจเอกสาร ISO / มอก.</h1>
        <p className="page-meta">
          วางเนื้อหาคู่มือคุณภาพ/นโยบาย/ขั้นตอน → AI ประเมินว่าแต่ละข้อกำหนด <b>ครบ / บางส่วน / ขาด</b> เตรียมพร้อมก่อน auditor มา
          {isSupabaseEnabled ? ' · วิเคราะห์ด้วย AI ภาษาไทย' : ' · โหมดออฟไลน์: ประเมินจากคำสำคัญ'}
        </p>
      </div>

      <div className="pn-grid">
        {/* ── อินพุต ── */}
        <div className="pn-card pn-form">
          <div>
            <div className="pn-lbl">มาตรฐานที่ตรวจ</div>
            <select className="pn-input" value={standard} onChange={e => setStandard(e.target.value as StandardId)}>
              {(Object.keys(STANDARD_LABEL) as StandardId[]).map(s => (
                <option key={s} value={s}>{STANDARD_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="pn-lbl">เนื้อหาเอกสาร (วางข้อความ)</div>
            <textarea className="pn-input" value={doc} onChange={e => setDoc(e.target.value)}
              placeholder="วางเนื้อหาคู่มือคุณภาพ / นโยบาย / ขั้นตอนการทำงาน ที่นี่…"
              style={{ minHeight: 260, resize: 'vertical', fontSize: 13, lineHeight: 1.6 }} />
          </div>
          <div className="pn-row">
            <button className="pn-btn pn-btn-primary" onClick={() => check(true)} disabled={loading} style={{ flex: 1 }}>
              {loading ? 'กำลังตรวจ…' : (isSupabaseEnabled ? '✨ ตรวจด้วย AI' : '🔍 ตรวจ')}
            </button>
            {isSupabaseEnabled && (
              <button className="pn-btn" onClick={() => check(false)} disabled={loading} title="ประเมินเบื้องต้นจากคำสำคัญ">🔍 เบื้องต้น</button>
            )}
          </div>
          <button className="pn-try-sample" onClick={trySample} disabled={loading}>🎯 ยังไม่มีเอกสาร? ลองตัวอย่าง ISO 9001 — เห็นคะแนนใน 10 วินาที</button>
          {msg && <div className="pn-warn">{msg}</div>}
        </div>

        {/* ── ผลลัพธ์ ── */}
        <div className="pn-card">
          {score === null
            ? <div className="pn-empty">
                <div style={{ marginBottom: 12 }}>วางเอกสารด้านซ้าย แล้วกด “ตรวจ” — หรือดูตัวอย่างก่อน</div>
                <button className="pn-btn pn-btn-primary" onClick={trySample} disabled={loading}>🎯 ลองตัวอย่าง ISO 9001</button>
                <div style={{ marginTop: 10, fontSize: 12, opacity: .75 }}>เห็น Readiness Score + ข้อที่ยังขาด ทันที</div>
              </div>
            : (
              <>
                <div className="cc-scorebar">
                  <div className="cc-score">{score}%</div>
                  <div className="cc-score-meta">
                    <div className="pn-lbl" style={{ margin: 0 }}>ความพร้อมโดยประมาณ {modelUsed && <span className="pn-model">· {modelUsed}</span>}</div>
                    <div className="cc-track"><div className="cc-fill" style={{ width: `${score}%` }} /></div>
                  </div>
                </div>

                {summary && <div className="cc-summary">{summary}</div>}

                <div className="cc-list">
                  {results.map(r => {
                    const m = STATUS_META[r.status];
                    return (
                      <div key={r.id} className="cc-item">
                        <span className={`cc-badge ${m.cls}`}>{m.label}</span>
                        <div className="cc-item-body">
                          <div className="cc-item-title">ข้อ {r.id} · {r.title}</div>
                          {r.note && <div className="cc-item-note">{r.note}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {gapList.length > 0 && (
                  <div className="cc-gaps">
                    <b>ต้องทำต่อ ({gapList.length} ข้อ):</b> {gapList.map(g => `ข้อ ${g.id}`).join(', ')}
                  </div>
                )}
                <div className="pn-disclaimer">⚠️ เป็นการช่วยเตรียมความพร้อม ไม่ใช่การตรวจรับรอง — ควรให้ที่ปรึกษา/ผู้ตรวจจริงยืนยัน</div>
              </>
            )}
        </div>
      </div>

      <ConsultHandoff topic="มอก. / ISO 9001" from="compliance" />
    </div>
  );
}
