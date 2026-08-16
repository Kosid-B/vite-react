/* หน้า 'process' — ทะเบียนกระบวนการ + ตัววัด (ขั้นที่ 1 ของ "SaaS แทนเอกสาร ISO")
 *
 * ต่างจากไฟล์ Excel ตรงที่หน้านี้ "เถียงกลับ" ได้
 *   ใส่ตัววัดโดยไม่บอกว่ามาจากความเสี่ยงหรือคุณค่าอะไร → ขึ้นเตือนทันทีว่านี่คือ NC ที่ข้อ 9.1
 *   ไม่ต้องรอผู้ตรวจมาถามว่า "ทำไมถึงวัดตัวนี้" แล้วค่อยรู้ว่าตอบไม่ได้
 *
 * ตรรกะทั้งหมดอยู่ใน lib/processRegister.ts (pure, ทดสอบแล้ว) — ไฟล์นี้เป็นแค่หน้าจอ */
import { useMemo, useState } from 'react';
import type { AppData, PageId } from '../types';
import { track } from '../lib/analytics';
import { STANDARDS, type StandardId } from '../lib/isoStandards';
import {
  registerIssues, registerHealth, registerCsv, registerJson, emptyRegister, seedProcesses,
  type ProcessRegisterData, type ProcessRow, type MetricRow,
} from '../lib/processRegister';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
  onNavigate: (page: PageId) => void;
}

const STD_IDS = Object.keys(STANDARDS) as StandardId[];
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function ProcessRegister({ data, onUpdate, onNavigate }: Props) {
  const reg: ProcessRegisterData = useMemo(
    () => data.processRegister ?? emptyRegister('iso9001'),
    [data.processRegister],
  );
  const std = STANDARDS[reg.standard];
  const issues = useMemo(() => registerIssues(reg), [reg]);
  const health = useMemo(() => registerHealth(reg), [reg]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const save = (next: ProcessRegisterData) => onUpdate({ ...data, processRegister: next });
  const setProcesses = (rows: ProcessRow[]) => save({ ...reg, processes: rows });
  const patch = (id: string, p: Partial<ProcessRow>) =>
    setProcesses(reg.processes.map((r) => (r.id === id ? { ...r, ...p, updatedAt: new Date().toISOString() } : r)));

  function switchStandard(next: StandardId) {
    if (reg.processes.length > 0 && !confirm(
      `เปลี่ยนเป็น ${STANDARDS[next].code} — ข้อกำหนดคนละชุดกัน ข้อที่ผูกไว้เดิมจะไม่ตรง\nกระบวนการและตัววัดที่กรอกไว้ยังอยู่ครบ ต้องการเปลี่ยนไหม?`,
    )) return;
    save({ ...reg, standard: next });
  }

  function seed() {
    const rows = seedProcesses(reg.standard, (i) => newId(`p${i}`));
    setProcesses([...rows, ...reg.processes]);
    setMsg(`✅ วางโครง ${rows.length} กระบวนการ ครอบคลุมข้อกำหนดครบทุกข้อแล้ว — ที่เหลือคือ "ตัววัด" ซึ่งมีแต่คุณที่ตอบได้`);
    track('process_register_seeded', { standard: reg.standard, count: rows.length });
  }

  function addProcess() {
    const row: ProcessRow = { id: newId('p'), name: '', metrics: [], clauses: [], docs: [] };
    setProcesses([...reg.processes, row]);
    setOpenId(row.id);
  }

  function addMetric(pid: string) {
    const row = reg.processes.find((r) => r.id === pid);
    if (!row) return;
    const m: MetricRow = { id: newId('m'), name: '' };
    patch(pid, { metrics: [...row.metrics, m] });
  }
  function patchMetric(pid: string, mid: string, p: Partial<MetricRow>) {
    const row = reg.processes.find((r) => r.id === pid);
    if (!row) return;
    patch(pid, { metrics: row.metrics.map((m) => (m.id === mid ? { ...m, ...p } : m)) });
  }

  function toggleClause(pid: string, cid: string) {
    const row = reg.processes.find((r) => r.id === pid);
    if (!row) return;
    patch(pid, { clauses: row.clauses.includes(cid) ? row.clauses.filter((c) => c !== cid) : [...row.clauses, cid] });
  }

  /** ข้อกำหนดที่กระบวนการอื่นถือไว้แล้ว — กันสองกระบวนการอ้างข้อเดียวกันจนไม่มีใครรับจริง */
  const ownerOfClause = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of reg.processes) for (const c of p.clauses) if (!m.has(c)) m.set(c, p.id);
    return m;
  }, [reg.processes]);

  const issuesOf = (pid: string) => issues.filter((i) => i.processId === pid);
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🧭 ทะเบียนกระบวนการและตัววัด</h1>
        <p className="page-meta">
          แทนที่จะเขียนเอกสารก่อนแล้วค่อยหาว่าใครทำ — เริ่มจาก <b>งานจริงที่ทำอยู่</b> แล้วให้ระบบบอกว่าข้อกำหนดข้อไหนยังไม่มีเจ้าของ
          และตัววัดตัวไหนที่ตอบผู้ตรวจไม่ได้ · ข้อมูลเป็นของคุณ ส่งออกได้ตลอดเวลา
        </p>
      </div>

      {/* ── แถบสุขภาพทะเบียน ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        {[
          { k: 'กระบวนการ', v: String(health.processes), s: 'ที่ระบุไว้' },
          { k: 'ตัววัด', v: String(health.metrics), s: 'ทั้งหมด' },
          {
            k: 'ตัววัดที่ตอบได้ว่ามาจากอะไร',
            v: `${health.metricsWithWhy}/${health.metrics}`,
            s: 'ตัวเลขที่สำคัญที่สุดในหน้านี้',
            bad: health.metrics > 0 && health.metricsWithWhy < health.metrics,
          },
          {
            k: 'ข้อกำหนดที่มีเจ้าของ',
            v: `${health.clausesCovered}/${health.clausesTotal}`,
            s: std.code,
            bad: health.clausesCovered < health.clausesTotal,
          },
          {
            k: 'พร้อมให้ตรวจ',
            v: health.ready ? 'พร้อม' : 'ยัง',
            s: health.ready ? 'ไม่เหลือประเด็นระดับตก' : `เหลือ ${health.blockers} เรื่องต้องแก้`,
            bad: !health.ready,
          },
        ].map((c) => (
          <div key={c.k} style={{
            border: `1px solid ${c.bad ? '#f59e0b' : 'var(--sand)'}`, borderRadius: 10,
            padding: '10px 14px', background: 'var(--cream2)',
          }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink3)', fontWeight: 700 }}>{c.k}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.bad ? '#b45309' : 'var(--ink)', lineHeight: 1.3 }}>{c.v}</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{c.s}</div>
          </div>
        ))}
      </div>

      {/* ── แถบเครื่องมือ ── */}
      <div className="pn-row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <select className="pn-input" value={reg.standard} onChange={(e) => switchStandard(e.target.value as StandardId)} style={{ maxWidth: 260 }}>
          {STD_IDS.map((s) => <option key={s} value={s}>{STANDARDS[s].icon} {STANDARDS[s].code} — {STANDARDS[s].focus}</option>)}
        </select>
        <button className="pn-btn pn-btn-primary" onClick={addProcess}>➕ เพิ่มกระบวนการ</button>
        <button className="pn-btn" onClick={seed} title="วางโครงกระบวนการที่ครอบคลุมข้อกำหนดครบทุกข้อ">🧱 เริ่มจากโครงตั้งต้น</button>
        <button className="pn-btn" onClick={() => download(`ทะเบียนกระบวนการ-${reg.standard}-${stamp}.csv`, '﻿' + registerCsv(reg), 'text/csv;charset=utf-8')} disabled={reg.processes.length === 0}>⬇️ CSV</button>
        <button className="pn-btn" onClick={() => download(`ทะเบียนกระบวนการ-${reg.standard}-${stamp}.json`, registerJson(reg, new Date().toISOString()), 'application/json')} disabled={reg.processes.length === 0}>⬇️ JSON</button>
        <button className="pn-btn" onClick={() => onNavigate('iso9001')} title="ดูข้อกำหนดเต็มและประเมินช่องว่าง">📋 หน้าประเมิน ISO</button>
      </div>
      {msg && <div className="pn-warn" style={{ marginBottom: 12 }}>{msg}</div>}

      {/* ── ประเด็นที่ต้องแก้ ── */}
      {issues.length > 0 && (
        <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '14px 16px', background: 'var(--cream2)', marginBottom: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 10 }}>
            🔎 สิ่งที่ผู้ตรวจจะเจอ — {health.blockers} เรื่องระดับตก · {health.warns} เรื่องที่มักโดนเจาะ
          </div>
          <div style={{ display: 'grid', gap: 7 }}>
            {issues.slice(0, 12).map((i, n) => (
              <div key={n} style={{
                borderLeft: `3px solid ${i.level === 'blocker' ? '#dc2626' : '#f59e0b'}`,
                paddingLeft: 10, fontSize: 12.5, lineHeight: 1.6,
              }}>
                <b>{i.level === 'blocker' ? '⛔ ' : '⚠️ '}{i.what}</b>
                <div style={{ color: 'var(--ink3)', fontSize: 11.5 }}>{i.audit}</div>
              </div>
            ))}
            {issues.length > 12 && <div style={{ fontSize: 12, color: 'var(--ink3)' }}>…และอีก {issues.length - 12} เรื่อง</div>}
          </div>
        </div>
      )}

      {/* ── รายการกระบวนการ ── */}
      {reg.processes.length === 0 ? (
        <div className="pn-empty" style={{ border: '1px dashed var(--sand)', borderRadius: 12, padding: '28px 20px', textAlign: 'center' }}>
          <div style={{ marginBottom: 10, lineHeight: 1.8 }}>
            ยังไม่มีกระบวนการในทะเบียน<br />
            <span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>
              เริ่มจากโครงตั้งต้นได้ — เราวางชื่อกระบวนการ ผู้รับผิดชอบ และข้อกำหนดที่แต่ละอันรับผิดชอบให้ครบ<br />
              แต่ <b>ไม่เติมตัววัดให้</b> เพราะตัววัดที่ไม่ได้มาจากงานจริงของคุณ คือตัวที่ตอบผู้ตรวจไม่ได้
            </span>
          </div>
          <button className="pn-btn pn-btn-primary" onClick={seed}>🧱 เริ่มจากโครงตั้งต้น ({STANDARDS[reg.standard].code})</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {reg.processes.map((p) => {
            const open = openId === p.id;
            const bad = issuesOf(p.id).filter((i) => i.level === 'blocker').length;
            return (
              <div key={p.id} style={{ border: `1px solid ${bad ? '#f59e0b' : 'var(--sand)'}`, borderRadius: 12, background: 'var(--cream2)', overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenId(open ? null : p.id)}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', flex: 1 }}>
                    {p.name.trim() || <span style={{ color: 'var(--ink3)', fontWeight: 500 }}>(ยังไม่ตั้งชื่อกระบวนการ)</span>}
                    <span style={{ fontWeight: 500, color: 'var(--ink3)', fontSize: 11.5 }}>
                      {p.owner ? ` · ${p.owner}` : ''}
                      {` · ตัววัด ${p.metrics.length} · ข้อกำหนด ${p.clauses.length}`}
                    </span>
                  </span>
                  {bad > 0 && <span style={{ fontSize: 11, color: '#b45309', fontWeight: 700, flex: 'none' }}>⛔ {bad}</span>}
                  <span style={{ color: 'var(--ink3)', flex: 'none' }}>{open ? '▲' : '▼'}</span>
                </button>

                {open && (
                  <div style={{ padding: '0 16px 16px', display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
                      <label>
                        <div className="pn-lbl">ชื่อกระบวนการ (ชื่อที่คนหน้างานเรียก)</div>
                        <input className="pn-input" value={p.name} onChange={(e) => patch(p.id, { name: e.target.value })} placeholder="เช่น รับคำสั่งซื้อและยืนยันกับลูกค้า" />
                      </label>
                      <label>
                        <div className="pn-lbl">ผู้รับผิดชอบ (ตำแหน่ง ไม่ใช่ชื่อคน)</div>
                        <input className="pn-input" value={p.owner ?? ''} onChange={(e) => patch(p.id, { owner: e.target.value })} placeholder="เช่น ผู้จัดการฝ่ายขาย" />
                      </label>
                      <label>
                        <div className="pn-lbl">เข้า (Input)</div>
                        <input className="pn-input" value={p.input ?? ''} onChange={(e) => patch(p.id, { input: e.target.value })} />
                      </label>
                      <label>
                        <div className="pn-lbl">ออก (Output)</div>
                        <input className="pn-input" value={p.output ?? ''} onChange={(e) => patch(p.id, { output: e.target.value })} />
                      </label>
                    </div>

                    {/* ตัววัด */}
                    <div>
                      <div className="pn-lbl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>ตัววัด — ทุกตัวต้องบอกได้ว่า “มาจากอะไร”</span>
                        <button className="pn-btn" style={{ padding: '2px 10px', fontSize: 11.5 }} onClick={() => addMetric(p.id)}>➕ ตัววัด</button>
                      </div>
                      {p.metrics.length === 0 && (
                        <div style={{ fontSize: 12, color: '#b45309', padding: '6px 0' }}>
                          ยังไม่มีตัววัด — ข้อ 9.1 จะถามว่า “รู้ได้ยังไงว่ากระบวนการนี้ดีหรือแย่”
                        </div>
                      )}
                      <div style={{ display: 'grid', gap: 8 }}>
                        {p.metrics.map((m) => (
                          <div key={m.id} style={{
                            border: `1px solid ${m.whyFrom?.trim() ? 'var(--sand)' : '#f59e0b'}`,
                            borderRadius: 9, padding: 10, background: 'var(--cream)', display: 'grid', gap: 8,
                          }}>
                            {/* auto-fit ใช้ไม่ได้ที่นี่ (มี track 'auto' ต่อท้าย จะยุบเหลือคอลัมน์เดียว) — กำหนดสัดส่วนตรง ๆ */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 2fr) minmax(100px, 1fr) minmax(100px, 1fr) auto', gap: 8, alignItems: 'end' }}>
                              <label><div className="pn-lbl">ชื่อตัววัด</div>
                                <input className="pn-input" value={m.name} onChange={(e) => patchMetric(p.id, m.id, { name: e.target.value })} placeholder="% ส่งมอบตรงเวลา" /></label>
                              <label><div className="pn-lbl">เป้าหมาย</div>
                                <input className="pn-input" value={m.target ?? ''} onChange={(e) => patchMetric(p.id, m.id, { target: e.target.value })} placeholder="≥ 95%" /></label>
                              <label><div className="pn-lbl">ความถี่</div>
                                <input className="pn-input" value={m.freq ?? ''} onChange={(e) => patchMetric(p.id, m.id, { freq: e.target.value })} placeholder="รายเดือน" /></label>
                              <button className="pn-btn" style={{ padding: '6px 10px' }} title="ลบตัววัด"
                                onClick={() => patch(p.id, { metrics: p.metrics.filter((x) => x.id !== m.id) })}>🗑️</button>
                            </div>
                            <label>
                              <div className="pn-lbl" style={{ color: m.whyFrom?.trim() ? undefined : '#b45309' }}>
                                🔑 มาจากอะไร — ความเสี่ยง อันตราย หรือคุณค่าที่ตัววัดนี้เฝ้าอยู่
                              </div>
                              <input className="pn-input" value={m.whyFrom ?? ''} onChange={(e) => patchMetric(p.id, m.id, { whyFrom: e.target.value })}
                                placeholder="เช่น ความเสี่ยง 'ส่งช้าแล้วลูกค้าย้ายเจ้า' จากทะเบียนความเสี่ยงข้อ R-03" />
                              {!m.whyFrom?.trim() && (
                                <div style={{ fontSize: 11.5, color: '#b45309', marginTop: 3 }}>
                                  ช่องนี้ว่าง = ตอบไม่ได้เมื่อผู้ตรวจถามว่า “ทำไมถึงวัดตัวนี้” — เป็น NC ที่พบบ่อยที่สุดที่ข้อ 9.1
                                </div>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* เอกสารที่ใช้ */}
                    <label>
                      <div className="pn-lbl">เอกสาร/บันทึกที่ใช้จริง (คั่นด้วย ·)</div>
                      <input className="pn-input" value={p.docs.join(' · ')}
                        onChange={(e) => patch(p.id, { docs: e.target.value.split('·').map((s) => s.trim()).filter(Boolean) })}
                        placeholder="ใบยืนยันคำสั่งซื้อ · บันทึกการทบทวนข้อกำหนด" />
                    </label>

                    {/* ข้อกำหนดที่รับผิดชอบ */}
                    <div>
                      <div className="pn-lbl">ข้อกำหนดที่กระบวนการนี้รับผิดชอบ ({std.code})</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {std.clauses.map((c) => {
                          const mine = p.clauses.includes(c.id);
                          const takenBy = ownerOfClause.get(c.id);
                          const taken = !mine && takenBy !== undefined;
                          return (
                            <button
                              key={c.id}
                              onClick={() => toggleClause(p.id, c.id)}
                              title={`${c.id} ${c.title}${taken ? ' — กระบวนการอื่นถือไว้แล้ว' : ''}`}
                              style={{
                                fontSize: 11.5, padding: '3px 9px', borderRadius: 999, cursor: 'pointer',
                                border: `1px solid ${mine ? '#0891b2' : 'var(--sand)'}`,
                                background: mine ? 'rgba(8,145,178,0.12)' : 'var(--cream)',
                                color: mine ? '#0e7490' : taken ? 'var(--ink3)' : 'var(--ink)',
                                fontWeight: mine ? 700 : 400,
                                opacity: taken ? 0.5 : 1,
                              }}
                            >
                              {c.id}{taken ? ' ·' : ''}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 5 }}>
                        จาง = กระบวนการอื่นรับผิดชอบข้อนั้นอยู่แล้ว (เลือกซ้ำได้ แต่สองเจ้าของมักแปลว่าไม่มีใครรับจริง)
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="pn-btn" onClick={() => {
                        if (confirm(`ลบกระบวนการ "${p.name || '(ไม่มีชื่อ)'}" ออกจากทะเบียน?`)) {
                          setProcesses(reg.processes.filter((r) => r.id !== p.id));
                        }
                      }}>🗑️ ลบกระบวนการนี้</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="pn-disclaimer" style={{ marginTop: 16 }}>
        ⚠️ หน้านี้ช่วยจัดระบบและเตรียมความพร้อม ไม่ใช่การตรวจรับรอง — การตัดสินขั้นสุดท้ายเป็นของผู้ตรวจจากหน่วยรับรอง
      </div>
    </div>
  );
}
