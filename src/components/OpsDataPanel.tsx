import { useMemo, useRef, useState } from 'react';
import type { AppData } from '../types';
import {
  buildMetricSchema, evaluatePerformance, csvTemplate, parseOpsCsv,
  type OpsEntry,
} from '../lib/opsMetrics';

/* บันทึกผลการดำเนินงาน (รายวัน/สัปดาห์) — ตัวชี้วัดออกแบบจาก BMC + ประเภทธุรกิจของผู้ใช้
 * ผู้ใช้กรอกในฟอร์มที่ระบบออกแบบให้ หรืออัปโหลด CSV → ระบบประเมินสมรรถนะธุรกิจ */
export default function OpsDataPanel({ data, onUpdate }: { data: AppData; onUpdate: (d: AppData) => void }) {
  const bmc = data.businessModel?.bmc;
  const industry = data.aiCompany?.industry;
  const schema = useMemo(() => buildMetricSchema(bmc, industry), [bmc, industry]);
  const entries = useMemo<OpsEntry[]>(() => data.opsData?.entries ?? [], [data.opsData]);

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const report = useMemo(() => evaluatePerformance(schema, entries), [schema, entries]);
  const daily = schema.filter(m => m.cadence === 'daily');
  const weekly = schema.filter(m => m.cadence === 'weekly');

  function saveEntry() {
    const values: Record<string, number> = {};
    for (const m of schema) {
      const raw = form[m.key];
      if (raw !== undefined && raw !== '') {
        const n = Number(raw);
        if (!Number.isNaN(n)) values[m.key] = n;
      }
    }
    if (Object.keys(values).length === 0) { setMsg('⚠️ กรอกอย่างน้อย 1 ช่องก่อนบันทึก'); return; }
    // รวมกับ entry วันเดียวกันถ้ามี
    const rest = entries.filter(e => e.date !== date);
    const existing = entries.find(e => e.date === date);
    const merged: OpsEntry = { date, values: { ...(existing?.values ?? {}), ...values } };
    const next = [...rest, merged].sort((a, b) => a.date.localeCompare(b.date));
    onUpdate({ ...data, opsData: { entries: next } });
    setForm({});
    setMsg(`✅ บันทึกข้อมูลวันที่ ${date} แล้ว (${Object.keys(values).length} ตัวชี้วัด)`);
  }

  function downloadTemplate() {
    const blob = new Blob([csvTemplate(schema)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ops-data-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseOpsCsv(String(reader.result ?? ''), schema);
      if (!rows.length) { setMsg('⚠️ ไม่พบข้อมูลที่ตรงรูปแบบ (ตรวจหัวคอลัมน์ + วันที่ YYYY-MM-DD)'); return; }
      const map = new Map(entries.map(e => [e.date, e.values]));
      for (const r of rows) map.set(r.date, { ...(map.get(r.date) ?? {}), ...r.values });
      const next = [...map.entries()].map(([d, v]) => ({ date: d, values: v })).sort((a, b) => a.date.localeCompare(b.date));
      onUpdate({ ...data, opsData: { entries: next } });
      setMsg(`✅ นำเข้า ${rows.length} แถวจากไฟล์แล้ว`);
    };
    reader.onerror = () => setMsg('⚠️ อ่านไฟล์ไม่สำเร็จ');
    reader.readAsText(file);
  }

  // 🔴 score = null แปลว่า "ยังประเมินไม่ได้" ห้ามระบายสีให้ดูเหมือนมีคำตอบ
  const scoreColor = report.score == null ? 'var(--st-mute,#94a3b8)'
    : report.score >= 70 ? '#22c55e' : report.score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="ops-card">
      <div className="ops-head">
        <span className="ops-title">📊 บันทึกผลการดำเนินงาน → ประเมินสมรรถนะ</span>
        <span className="ops-sub">ตัวชี้วัดออกแบบจาก BMC + ประเภทธุรกิจของคุณ · กรอกรายวัน/สัปดาห์ หรืออัปโหลดไฟล์</span>
      </div>

      {(!bmc || (bmc.revenue?.length ?? 0) === 0) && (
        <div className="ops-note">💡 ทำ Business Model (BMC) ก่อน ระบบจะออกแบบตัวชี้วัดให้ตรงธุรกิจมากขึ้น — ตอนนี้ใช้ชุดพื้นฐาน</div>
      )}

      {/* ฟอร์มบันทึก */}
      <div className="ops-form">
        <div className="ops-form-top">
          <label className="ops-date">วันที่ <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} /></label>
        </div>
        <div className="ops-groups">
          <OpsGroup title="รายวัน" metrics={daily} form={form} setForm={setForm} />
          {weekly.length > 0 && <OpsGroup title="รายสัปดาห์" metrics={weekly} form={form} setForm={setForm} />}
        </div>
        <div className="ops-actions">
          <button className="ops-save" onClick={saveEntry}>💾 บันทึกข้อมูลวันนี้</button>
          <button className="ops-tpl" onClick={downloadTemplate}>⬇ ดาวน์โหลดเทมเพลต CSV</button>
          <button className="ops-upl" onClick={() => fileRef.current?.click()}>📎 อัปโหลดไฟล์ CSV</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); if (fileRef.current) fileRef.current.value = ''; }} />
        </div>
        {msg && <div className="ops-msg">{msg}</div>}
      </div>

      {/* ประเมินสมรรถนะ */}
      <div className="ops-report">
        <div className="ops-report-hd">
          <span>สมรรถนะธุรกิจ</span>
          {report.score == null
            ? <span className="ops-score ops-score-na" style={{ color: scoreColor }}>
                ยังประเมินไม่ได้<small>บันทึกอีก {report.needMoreEntries} ครั้ง</small>
              </span>
            : <span className="ops-score" style={{ color: scoreColor }}>{report.score}<small>/100</small></span>}
        </div>
        <ul className="ops-summary">
          {report.summary.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
        {report.entriesUsed > 0 && (
          <div className="ops-metrics">
            {report.metrics.filter(m => m.latest != null).map(m => (
              <div key={m.key} className="ops-metric">
                <span className="ops-m-label">{m.label}</span>
                <span className="ops-m-val">{m.latest?.toLocaleString()} <small>{m.unit}</small></span>
                <span className={`ops-m-trend ${m.dir}`} title={m.whyFromShort}>
                  {m.dir === 'unknown' ? '·' : m.dir === 'up' ? '▲' : m.dir === 'down' ? '▼' : '—'}
                  {m.trendPct != null && m.trendPct !== 0 ? ' ' + Math.abs(m.trendPct) + '%' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="ops-count">บันทึกแล้ว {report.entriesUsed} ครั้ง</div>
      </div>
    </div>
  );
}

function OpsGroup({ title, metrics, form, setForm }: {
  title: string;
  metrics: ReturnType<typeof buildMetricSchema>;
  form: Record<string, string>;
  setForm: (fn: (p: Record<string, string>) => Record<string, string>) => void;
}) {
  return (
    <div className="ops-group">
      <div className="ops-group-hd">{title}</div>
      {metrics.map(m => (
        <label key={m.key} className="ops-field">
          <span className="ops-f-label">{m.label} <small>({m.unit})</small></span>
          <input type="number" inputMode="decimal" value={form[m.key] ?? ''}
            placeholder={m.hint ?? ''} onChange={e => setForm(p => ({ ...p, [m.key]: e.target.value }))} />
        </label>
      ))}
    </div>
  );
}
