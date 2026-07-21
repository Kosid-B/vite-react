import { useState } from 'react';
import type { AppData, BmcBlockKey } from '../types';
import {
  BMC_BLOCKS, outcomesFor, addOutcome, updateOutcome, removeOutcome,
  outcomePct, outcomeStatus, STATUS_META, outcomesSummary,
} from '../lib/bmcOutcomes';
import { track } from '../lib/analytics';

/**
 * Outcome Tracker — ป้อนผลลัพธ์จริงตามกระบวนการที่กำหนดใน BMC (9 ช่อง)
 * ปิดลูป วางแผน (BMC) → ลงมือ → วัดผลจริง · รองรับ KPI (เป้า→ผลจริง→สถานะ) + ข้อความ + ลิงก์หลักฐาน
 */
export default function BmcOutcomeTracker({ data, onUpdate }: { data: AppData; onUpdate: (d: AppData) => void }) {
  const [block, setBlock] = useState<BmcBlockKey>('revenue');
  const [metric, setMetric] = useState('');
  const [target, setTarget] = useState('');
  const [actual, setActual] = useState('');
  const [unit, setUnit] = useState('');
  const [note, setNote] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const summary = outcomesSummary(data);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!metric.trim()) return;
    onUpdate(addOutcome(data, {
      block, metric,
      target: parseFloat(target) || 0,
      actual: parseFloat(actual) || 0,
      unit, note, evidenceUrl,
    }, new Date()));
    track('bmc_outcome_added', { block });
    setMetric(''); setTarget(''); setActual(''); setUnit(''); setNote(''); setEvidenceUrl('');
  }

  return (
    <div className="oc-wrap">
      <div className="oc-head">
        <h3>📊 ผลลัพธ์จริง (Outcome Tracker)</h3>
        <p>ป้อนผลลัพธ์ที่ได้จากการทำงานจริง ผูกกับแต่ละช่องของ Business Model Canvas — ปิดลูป วางแผน → ลงมือ → วัดผล</p>
      </div>

      {/* สรุปภาพรวม แผน vs ผลจริง */}
      <div className="oc-summary">
        <div className="oc-kpi"><span className="oc-kpi-num">{summary.avgPct}%</span><span className="oc-kpi-lbl">สำเร็จเฉลี่ย</span></div>
        <div className="oc-kpi"><span className="oc-kpi-num" style={{ color: '#22c55e' }}>{summary.done}</span><span className="oc-kpi-lbl">✅ สำเร็จ</span></div>
        <div className="oc-kpi"><span className="oc-kpi-num" style={{ color: '#f59e0b' }}>{summary.ontrack}</span><span className="oc-kpi-lbl">🟡 ตามแผน</span></div>
        <div className="oc-kpi"><span className="oc-kpi-num" style={{ color: '#ef4444' }}>{summary.behind}</span><span className="oc-kpi-lbl">🔴 ต่ำกว่าเป้า</span></div>
      </div>

      {/* ฟอร์มเพิ่มผลลัพธ์ */}
      <form className="oc-form" onSubmit={submit}>
        <div className="oc-form-row">
          <select value={block} onChange={e => setBlock(e.target.value as BmcBlockKey)} aria-label="ช่อง BMC">
            {BMC_BLOCKS.map(b => <option key={b.key} value={b.key}>{b.emoji} {b.title} · {b.sub}</option>)}
          </select>
          <input value={metric} onChange={e => setMetric(e.target.value)} placeholder="ตัวชี้วัด เช่น ลูกค้าใหม่ / รายได้" required />
        </div>
        <div className="oc-form-row">
          <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="เป้าหมาย" inputMode="decimal" />
          <input type="number" value={actual} onChange={e => setActual(e.target.value)} placeholder="ผลจริง" inputMode="decimal" />
          <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="หน่วย (ราย/บาท)" className="oc-unit" />
        </div>
        <div className="oc-form-row">
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="บันทึกข้อความ (ไม่บังคับ)" />
        </div>
        <div className="oc-form-row">
          <input value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} placeholder="ลิงก์หลักฐาน เช่น Google Drive/รูป (ไม่บังคับ)" type="url" />
          <button type="submit" className="oc-add">+ บันทึกผลลัพธ์</button>
        </div>
      </form>

      {/* รายการผลลัพธ์ แยกตามช่อง */}
      <div className="oc-blocks">
        {BMC_BLOCKS.map(b => {
          const items = outcomesFor(data, b.key);
          if (!items.length) return null;
          return (
            <div key={b.key} className="oc-block">
              <div className="oc-block-title">{b.emoji} {b.title} <span>· {b.sub}</span></div>
              {items.map(o => {
                const pct = outcomePct(o);
                const st = STATUS_META[outcomeStatus(o)];
                return (
                  <div key={o.id} className="oc-item">
                    <div className="oc-item-top">
                      <span className="oc-metric">{o.metric}</span>
                      <span className="oc-status" style={{ color: st.color }}>{st.icon} {st.label}</span>
                      <button className="oc-del" onClick={() => onUpdate(removeOutcome(data, o.id))} aria-label="ลบ">🗑</button>
                    </div>
                    <div className="oc-item-nums">
                      <label>ผลจริง
                        <input type="number" value={o.actual}
                          onChange={e => onUpdate(updateOutcome(data, o.id, { actual: parseFloat(e.target.value) || 0 }, new Date()))} />
                      </label>
                      <span className="oc-slash">/ {o.target}{o.unit ? ` ${o.unit}` : ''}</span>
                      <span className="oc-pct">{pct}%</span>
                    </div>
                    <div className="oc-bar"><div className="oc-bar-fill" style={{ width: `${Math.min(100, pct)}%`, background: st.color }} /></div>
                    {o.note && <div className="oc-note">📝 {o.note}</div>}
                    {o.evidenceUrl && <a className="oc-evi" href={o.evidenceUrl} target="_blank" rel="noopener noreferrer">🔗 หลักฐาน</a>}
                  </div>
                );
              })}
            </div>
          );
        })}
        {summary.total === 0 && <div className="oc-empty">ยังไม่มีผลลัพธ์ — เพิ่มรายการแรกด้านบน แล้วผลจะสรุปเป็น % ให้อัตโนมัติ</div>}
      </div>
    </div>
  );
}
