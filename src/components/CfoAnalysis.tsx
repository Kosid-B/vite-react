import { useState } from 'react';
import type { AppData } from '../types';
import { cfoMetrics, cfoFlags, cfoLocalAdvice, cfoPrompt } from '../lib/cfoAnalysis';
import { opsFinanceBridge } from '../lib/opsMetrics';
import { fmtBaht } from '../lib/finance';
import { isSupabaseEnabled, supabase } from '../lib/supabase';
import { track } from '../lib/analytics';

/* ===== CFO AI — วิเคราะห์การเงิน "ธุรกิจตัวเอง" ของ SME จากข้อมูลจริง (d.finance) =====
 * ต่อยอด CityTreasury: อ่านตัวเลขที่ผู้ใช้กรอกเอง → ธงสุขภาพ + คำแนะนำ (rule-based เสมอ)
 * + ปุ่มให้ CFO AI (ai-assist) วิเคราะห์เชิงลึก · ถ้าไม่มี AI ใช้ cfoLocalAdvice เป็น fallback
 * ⚠️ ตัวเลขทุกตัวมาจากข้อมูลจริง — prompt กำชับ "ห้ามแต่งตัวเลขเพิ่ม" */

const FLAG_ICON = { good: '✅', warn: '⚠️', risk: '🚨' } as const;

export default function CfoAnalysis({ data }: { data: AppData }) {
  const m = cfoMetrics(data);
  const flags = cfoFlags(m);
  const localAdvice = cfoLocalAdvice(m);
  const bridge = opsFinanceBridge(data.opsData?.entries ?? []); // ผลดำเนินงานจริง → ให้ CFO ใช้
  const hasAny = m.hasData || bridge.days > 0;
  const [busy, setBusy] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string[] | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function askCfo() {
    if (!isSupabaseEnabled || !supabase) {
      // โหมด Local — ไม่มี AI ใช้คำแนะนำ rule-based
      setAiAdvice(localAdvice);
      setAiSummary('โหมด Local (ไม่มี AI) — นี่คือคำแนะนำจากกฎการเงินพื้นฐานจากตัวเลขจริงของคุณ');
      track('cfo_analyze', { mode: 'local', hasData: m.hasData ? 1 : 0 });
      return;
    }
    setBusy(true); setErr(null);
    try {
      const { data: res, error } = await supabase.functions.invoke('ai-assist', {
        body: {
          page: 'cfo', pageLabel: 'CFO วิเคราะห์การเงิน',
          instruction: cfoPrompt(data),
          context: bridge.days > 0 ? `ผลการดำเนินงานจริงจากหน้าโรงงาน: ${bridge.note}` : '',
        },
      });
      if (error) throw error;
      const suggestions = (res?.suggestions ?? []).map((s: string) => String(s));
      setAiSummary(res?.summary ? String(res.summary) : null);
      setAiAdvice(suggestions.length ? suggestions : localAdvice);
      track('cfo_analyze', { mode: 'ai', hasData: m.hasData ? 1 : 0 });
    } catch (e) {
      // AI ล้ม → ยังมีคำแนะนำ rule-based ให้ผู้ใช้เสมอ (ไม่ปล่อยจอเปล่า)
      setAiAdvice(localAdvice);
      setAiSummary(null);
      setErr('CFO AI ไม่ตอบตอนนี้ — แสดงคำแนะนำจากกฎการเงินพื้นฐานแทน (' + ((e as Error).message || 'error') + ')');
      track('cfo_analyze', { mode: 'fallback', hasData: m.hasData ? 1 : 0 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cfo">
      <div className="cfo-hd">
        <div className="cfo-title">🧮 CFO AI — วิเคราะห์สุขภาพการเงิน</div>
        <span className="cfo-sub">จาก “ตัวเลขจริง” ในคลังเมือง · ไม่ใช่คำแนะนำการลงทุน</span>
      </div>

      {bridge.days > 0 && (
        <div className="cfo-ops">📊 {bridge.note}</div>
      )}

      {!hasAny ? (
        <div className="cfo-empty">
          ยังไม่มีรายการการเงิน — บันทึกรายรับ/รายจ่ายในคลังเมือง หรือผลดำเนินงานในหน้าโรงงานอัจฉริยะก่อน แล้ว CFO AI จะวิเคราะห์ให้
        </div>
      ) : (
        <>
          {/* เมตริกประจำเดือน — โฟกัสความยั่งยืน (recurring) */}
          {m.hasData && <div className="cfo-grid">
            <div className="cfo-metric">
              <span>รายรับประจำ/เดือน</span>
              <b className="up">{fmtBaht(m.recurringRevenue)}</b>
            </div>
            <div className="cfo-metric">
              <span>รายจ่ายประจำ/เดือน</span>
              <b className="down">{fmtBaht(m.recurringExpense)}</b>
            </div>
            <div className="cfo-metric">
              <span>{m.recurringNet >= 0 ? 'กำไรประจำ/เดือน' : 'เผาเงิน/เดือน'}</span>
              <b className={m.recurringNet >= 0 ? 'up' : 'down'}>
                {m.recurringNet >= 0 ? '' : '−'}{fmtBaht(Math.abs(m.recurringNet))}
              </b>
            </div>
            <div className="cfo-metric">
              <span>{m.breakEvenGap > 0 ? 'ต้องเพิ่มรายรับประจำ' : 'จุดคุ้มทุน'}</span>
              <b className={m.breakEvenGap > 0 ? 'down' : 'up'}>
                {m.breakEvenGap > 0 ? fmtBaht(m.breakEvenGap) : '✅ คุ้มแล้ว'}
              </b>
            </div>
          </div>}

          {/* ธงสุขภาพการเงิน */}
          <div className="cfo-flags">
            {flags.map((f, i) => (
              <div key={i} className={`cfo-flag ${f.level}`}>
                <span className="cfo-flag-ic">{FLAG_ICON[f.level]}</span>
                <span>{f.msg}</span>
              </div>
            ))}
          </div>

          <button className="cfo-btn" onClick={askCfo} disabled={busy}>
            {busy ? '⏳ CFO AI กำลังวิเคราะห์…' : '🧠 ให้ CFO AI วิเคราะห์ + แนะนำการกระทำ'}
          </button>

          {err && <div className="cfo-err">{err}</div>}

          {(aiAdvice || aiSummary) && (
            <div className="cfo-result">
              {aiSummary && <p className="cfo-result-sum">{aiSummary}</p>}
              {aiAdvice && aiAdvice.length > 0 && (
                <ol className="cfo-advice">
                  {aiAdvice.map((a, i) => <li key={i}>{a}</li>)}
                </ol>
              )}
              <p className="cfo-disclaimer">
                💡 คำแนะนำจากตัวเลขที่คุณบันทึกเท่านั้น · CFO AI ไม่แต่งตัวเลขเพิ่ม · ไม่ใช่คำแนะนำการลงทุน
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
