import { useState } from 'react';
import type { AppData, ISO9001Data, ISOClauseCheck, ISOStatus, Nonconformity, ISODocument, InternalAudit } from '../types';
import ExpertEdge from '../components/ExpertEdge';
import { assessReadiness } from '../lib/isoGapAssessment';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

const STATUS_COLOR: Record<ISOStatus, string> = {
  green: '#16a34a',
  amber: '#d97706',
  red: '#dc2626',
  na: '#94a3b8',
};
const STATUS_BG: Record<ISOStatus, string> = {
  green: '#dcfce7',
  amber: '#fef3c7',
  red: '#fee2e2',
  na: '#f1f5f9',
};
const STATUS_LABEL: Record<ISOStatus, string> = {
  green: 'สอดคล้อง ✓',
  amber: 'กำลังดำเนินการ',
  red: 'ยังไม่สอดคล้อง',
  na: 'ไม่เกี่ยวข้อง',
};
const CLAUSE_GROUPS = [
  { section: '4', title: 'บริบทขององค์กร', ids: ['4.1','4.2','4.3','4.4'] },
  { section: '5', title: 'ภาวะผู้นำ', ids: ['5.1','5.2','5.3'] },
  { section: '6', title: 'การวางแผน', ids: ['6.1','6.2','6.3'] },
  { section: '7', title: 'ส่วนสนับสนุน', ids: ['7.1','7.2','7.3','7.4','7.5'] },
  { section: '8', title: 'การดำเนินการ', ids: ['8.1','8.2','8.3','8.4','8.5','8.6','8.7'] },
  { section: '9', title: 'การประเมินสมรรถนะ', ids: ['9.1','9.2','9.3'] },
  { section: '10', title: 'การปรับปรุง', ids: ['10.1','10.2','10.3'] },
];
const SEV_COLOR: Record<string,string> = { major:'#dc2626', minor:'#d97706', observation:'#2563eb' };
const SEV_LABEL: Record<string,string> = { major:'Major NC', minor:'Minor NC', observation:'ข้อสังเกต' };

function uid() { return 'iso-' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); }

export default function ISO9001({ data, onUpdate }: Props) {
  const iso = data.iso9001!;
  const [tab, setTab] = useState<'overview'|'clauses'|'nc'|'docs'|'audit'>('overview');
  const [editClause, setEditClause] = useState<string | null>(null);
  const [clauseDraft, setClauseDraft] = useState<Partial<ISOClauseCheck>>({});
  const [ncDraft, setNcDraft] = useState<Partial<Nonconformity>>({});
  const [addingNC, setAddingNC] = useState(false);
  const [docDraft, setDocDraft] = useState<Partial<ISODocument>>({});
  const [addingDoc, setAddingDoc] = useState(false);
  const [auditDraft, setAuditDraft] = useState<Partial<InternalAudit>>({});
  const [addingAudit, setAddingAudit] = useState(false);

  function patch(next: Partial<ISO9001Data>) {
    onUpdate({ ...data, iso9001: { ...iso, ...next } });
  }

  // Clause compliance stats
  const green = iso.clauses.filter(c => c.status === 'green').length;
  const amber = iso.clauses.filter(c => c.status === 'amber').length;
  const red = iso.clauses.filter(c => c.status === 'red').length;
  const applicable = iso.clauses.filter(c => c.status !== 'na').length;
  const readinessScore = applicable > 0 ? Math.round((green / applicable) * 100) : 0;
  const gap = assessReadiness(iso.clauses);

  /** ไปแก้ clause ที่ระบุ (จากรายการ "สิ่งที่ต้องทำก่อน audit") */
  function goToClause(id: string) {
    const cl = iso.clauses.find(c => c.id === id);
    setClauseDraft(cl ? { ...cl } : {});
    setEditClause(id);
    setTab('clauses');
    setTimeout(() => document.getElementById(`iso-clause-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }

  function saveClause() {
    if (!editClause) return;
    patch({ clauses: iso.clauses.map(c => c.id === editClause ? { ...c, ...clauseDraft } : c) });
    setEditClause(null);
    setClauseDraft({});
  }

  function saveNC() {
    const nc: Nonconformity = {
      id: uid(),
      date: new Date().toISOString().slice(0,10),
      clause: ncDraft.clause ?? '',
      description: ncDraft.description ?? '',
      severity: ncDraft.severity ?? 'minor',
      rootCause: ncDraft.rootCause ?? '',
      status: 'open',
    };
    patch({ nonconformities: [...iso.nonconformities, nc] });
    setNcDraft({}); setAddingNC(false);
  }

  function saveDoc() {
    const doc: ISODocument = {
      id: uid(),
      docNo: docDraft.docNo ?? '',
      title: docDraft.title ?? '',
      clause: docDraft.clause ?? '',
      revision: docDraft.revision ?? 'Rev.0',
      effectiveDate: docDraft.effectiveDate ?? new Date().toISOString().slice(0,10),
      owner: docDraft.owner ?? '',
    };
    patch({ documents: [...iso.documents, doc] });
    setDocDraft({}); setAddingDoc(false);
  }

  function saveAudit() {
    const a: InternalAudit = {
      id: uid(),
      plannedDate: auditDraft.plannedDate ?? '',
      scope: auditDraft.scope ?? '',
      auditor: auditDraft.auditor ?? '',
      status: 'planned',
      findings: '',
    };
    patch({ audits: [...iso.audits, a] });
    setAuditDraft({}); setAddingAudit(false);
  }

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'overview', label: 'ภาพรวม' },
    { key: 'clauses', label: 'Clause Checklist' },
    { key: 'nc', label: `NC Log (${iso.nonconformities.filter(n=>n.status==='open').length} เปิด)` },
    { key: 'docs', label: `เอกสาร (${iso.documents.length})` },
    { key: 'audit', label: `Internal Audit` },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">ISO 9001:2015 QMS</div>
        <div className="page-meta">
          <span className="meta-chip">{iso.tier === 'certified' ? '✓ ได้รับรองแล้ว' : 'กำลังเตรียมการรับรอง'}</span>
          {iso.certBody && <span className="meta-chip">{iso.certBody}</span>}
          {iso.certExpiry && <span className="meta-chip">หมดอายุ {iso.certExpiry}</span>}
          <span className="meta-chip iso-readiness-chip" style={{ background: readinessScore>=70?'rgba(16,185,129,.15)':readinessScore>=40?'rgba(245,158,11,.15)':'rgba(239,68,68,.15)', color: readinessScore>=70?'#10b981':readinessScore>=40?'#fbbf24':'#f87171' }}>
            Readiness {readinessScore}%
          </span>
        </div>
      </div>

      <ExpertEdge />

      {/* Tabs */}
      <div className="iso-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`iso-tab${tab===t.key?' active':''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ===== Overview ===== */}
      {tab === 'overview' && (
        <div>
          {/* Readiness gauge */}
          <div className="iso-cards">
            <div className="iso-kpi-card">
              <div className="iso-kpi-label">Readiness Score</div>
              <div className="iso-kpi-val" style={{ color: readinessScore>=70?'#16a34a':readinessScore>=40?'#d97706':'#dc2626' }}>{readinessScore}%</div>
              <div className="iso-progress-wrap"><div className="iso-progress-bar" style={{ width:`${readinessScore}%`, background: readinessScore>=70?'#16a34a':readinessScore>=40?'#d97706':'#dc2626' }} /></div>
            </div>
            <div className="iso-kpi-card"><div className="iso-kpi-label">สอดคล้อง</div><div className="iso-kpi-val" style={{color:'#16a34a'}}>{green}</div><div className="iso-kpi-sub">Clauses</div></div>
            <div className="iso-kpi-card"><div className="iso-kpi-label">กำลังดำเนินการ</div><div className="iso-kpi-val" style={{color:'#d97706'}}>{amber}</div><div className="iso-kpi-sub">Clauses</div></div>
            <div className="iso-kpi-card"><div className="iso-kpi-label">ยังไม่สอดคล้อง</div><div className="iso-kpi-val" style={{color:'#dc2626'}}>{red}</div><div className="iso-kpi-sub">Clauses</div></div>
            <div className="iso-kpi-card"><div className="iso-kpi-label">Open NC</div><div className="iso-kpi-val" style={{color: iso.nonconformities.filter(n=>n.status==='open').length>0?'#dc2626':'#16a34a'}}>{iso.nonconformities.filter(n=>n.status==='open').length}</div><div className="iso-kpi-sub">รายการ</div></div>
          </div>

          {/* 🎯 ที่ปรึกษา active — สิ่งที่ต้องทำก่อน audit (codify B. Training 20 ปี) */}
          <div className="iso-panel iso-advisor" style={{ marginTop: 14 }}>
            <div className="iso-adv-hd">
              <span>🎯 สิ่งที่ต้องทำก่อน Audit</span>
              <span className={`iso-adv-level lv-${gap.level}`}>{gap.levelLabel}</span>
            </div>
            <div className="iso-adv-sub">ประเมินโดยเทียบข้อกำหนด ISO 9001:2015 ทีละข้อ — เหมือนที่ปรึกษาตรวจให้ (แต่ได้ทันที)</div>

            {gap.mandatoryDocsMissing.length > 0 && (
              <div className="iso-adv-mand">
                ⚠️ <b>เอกสารบังคับที่ยังขาด</b> (auditor เช็คแน่นอน): {gap.mandatoryDocsMissing.join(' · ')}
              </div>
            )}

            {gap.prioritizedActions.length === 0 ? (
              <div className="iso-adv-done">🎉 ทุกข้อสอดคล้องแล้ว — พร้อมนัดหน่วยรับรอง (CB) ทำ Stage 2 audit</div>
            ) : (
              <ol className="iso-adv-list">
                {gap.prioritizedActions.slice(0, 6).map(a => (
                  <li key={a.id} className={`iso-adv-item st-${a.status}`}>
                    <div className="iso-adv-main">
                      <div className="iso-adv-title">
                        <span className="iso-adv-clause">ข้อ {a.id}</span> {a.title}
                        {a.mandatoryDoc && <span className="iso-adv-badge">เอกสารบังคับ</span>}
                      </div>
                      <div className="iso-adv-action">→ {a.action}</div>
                      <div className="iso-adv-doc">📄 เตรียม: {a.keyDoc}</div>
                    </div>
                    <button className="iso-adv-go" onClick={() => goToClause(a.id)}>ไปทำ →</button>
                  </li>
                ))}
              </ol>
            )}
            {gap.prioritizedActions.length > 6 && (
              <div className="iso-adv-more">…และอีก {gap.prioritizedActions.length - 6} ข้อ — ดูทั้งหมดในแท็บ Clause Checklist</div>
            )}
            <div className="iso-adv-exp">
              🏅 โดยทีมที่ปรึกษา B. Training — วิธีประเมินเดียวกันนี้ใช้ได้กับ <b>ISO 14001</b> (สิ่งแวดล้อม) ·
              <b> ISO 45001</b> (อาชีวอนามัยและความปลอดภัย) · <b>ISO 22301</b> (ความต่อเนื่องทางธุรกิจ) —
              โครง Annex SL เดียวกัน ประสบการณ์ 10+ ปี
            </div>
          </div>

          {/* Basic settings */}
          <div className="iso-panel">
            <div className="iso-panel-hd">ข้อมูลพื้นฐาน QMS</div>
            <div className="iso-form-grid">
              <div className="iso-field">
                <label>สถานะการรับรอง</label>
                <select value={iso.tier} onChange={e => patch({ tier: e.target.value as ISO9001Data['tier'] })}>
                  <option value="basic">กำลังเตรียมรับรอง</option>
                  <option value="certified">ได้รับรอง ISO 9001 แล้ว</option>
                </select>
              </div>
              <div className="iso-field">
                <label>หน่วยงานรับรอง (CB)</label>
                <input value={iso.certBody} onChange={e => patch({ certBody: e.target.value })} placeholder="เช่น SGS, Bureau Veritas, TÜV" />
              </div>
              <div className="iso-field">
                <label>วันหมดอายุใบรับรอง</label>
                <input type="date" value={iso.certExpiry} onChange={e => patch({ certExpiry: e.target.value })} />
              </div>
              <div className="iso-field">
                <label>Internal Audit ครั้งถัดไป</label>
                <input type="date" value={iso.nextAuditDate} onChange={e => patch({ nextAuditDate: e.target.value })} />
              </div>
              <div className="iso-field iso-field-full">
                <label>ขอบเขตระบบ QMS (Scope)</label>
                <textarea value={iso.scope} onChange={e => patch({ scope: e.target.value })} rows={2} placeholder="อธิบายขอบเขตของระบบ QMS ตามข้อ 4.3" />
              </div>
              <div className="iso-field iso-field-full">
                <label>นโยบายคุณภาพ (Quality Policy - ข้อ 5.2)</label>
                <textarea value={iso.qualityPolicy} onChange={e => patch({ qualityPolicy: e.target.value })} rows={3} placeholder="ระบุนโยบายคุณภาพขององค์กร..." />
              </div>
            </div>
          </div>

          {/* Section heat map */}
          <div className="iso-panel" style={{ marginTop: 14 }}>
            <div className="iso-panel-hd">สถานะแต่ละหมวด</div>
            <div className="iso-heatmap">
              {CLAUSE_GROUPS.map(grp => {
                const clauses = iso.clauses.filter(c => grp.ids.includes(c.id));
                const grpGreen = clauses.filter(c=>c.status==='green').length;
                const grpApplicable = clauses.filter(c=>c.status!=='na').length;
                const pct = grpApplicable > 0 ? Math.round((grpGreen/grpApplicable)*100) : 100;
                return (
                  <div key={grp.section} className="iso-hm-row">
                    <div className="iso-hm-section">ข้อ {grp.section}</div>
                    <div className="iso-hm-title">{grp.title}</div>
                    <div className="iso-hm-dots">
                      {clauses.map(c => (
                        <span key={c.id} className="iso-hm-dot" style={{ background: STATUS_COLOR[c.status] }} title={`${c.id} — ${STATUS_LABEL[c.status]}`} />
                      ))}
                    </div>
                    <div className="iso-hm-pct" style={{ color: pct>=70?'#16a34a':pct>=40?'#d97706':'#dc2626' }}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== Clauses ===== */}
      {tab === 'clauses' && (
        <div>
          {CLAUSE_GROUPS.map(grp => (
            <div key={grp.section} className="iso-panel" style={{ marginBottom: 14 }}>
              <div className="iso-panel-hd">ข้อ {grp.section} — {grp.title}</div>
              {iso.clauses.filter(c => grp.ids.includes(c.id)).map(clause => (
                <div key={clause.id} id={`iso-clause-${clause.id}`} className="iso-clause-row">
                  <div className="iso-clause-id">{clause.id}</div>
                  <div className="iso-clause-body">
                    <div className="iso-clause-title">{clause.title}</div>
                    {clause.evidence && <div className="iso-clause-evidence">หลักฐาน: {clause.evidence}</div>}
                    {clause.notes && <div className="iso-clause-notes">{clause.notes}</div>}
                  </div>
                  <div className="iso-clause-status">
                    <span className="iso-status-badge" style={{ background: STATUS_BG[clause.status], color: STATUS_COLOR[clause.status] }}>
                      {STATUS_LABEL[clause.status]}
                    </span>
                  </div>
                  <button className="iso-edit-btn" onClick={() => { setEditClause(clause.id); setClauseDraft({ status: clause.status, evidence: clause.evidence, notes: clause.notes }); }}>แก้ไข</button>
                </div>
              ))}
            </div>
          ))}

          {/* Edit clause modal */}
          {editClause && (
            <div className="iso-modal-bg" onClick={() => setEditClause(null)}>
              <div className="iso-modal" onClick={e => e.stopPropagation()}>
                <div className="iso-modal-hd">แก้ไขข้อ {editClause}</div>
                <div className="iso-field">
                  <label>สถานะ</label>
                  <select value={clauseDraft.status ?? 'amber'} onChange={e => setClauseDraft(p=>({...p,status:e.target.value as ISOStatus}))}>
                    <option value="green">สอดคล้อง ✓</option>
                    <option value="amber">กำลังดำเนินการ</option>
                    <option value="red">ยังไม่สอดคล้อง</option>
                    <option value="na">ไม่เกี่ยวข้อง (N/A)</option>
                  </select>
                </div>
                <div className="iso-field">
                  <label>หลักฐาน / เอกสารอ้างอิง</label>
                  <input value={clauseDraft.evidence ?? ''} onChange={e => setClauseDraft(p=>({...p,evidence:e.target.value}))} placeholder="เช่น QP-01, WI-Sales-001" />
                </div>
                <div className="iso-field">
                  <label>หมายเหตุ</label>
                  <textarea value={clauseDraft.notes ?? ''} onChange={e => setClauseDraft(p=>({...p,notes:e.target.value}))} rows={3} placeholder="บันทึกช่องว่าง หรือแผนการดำเนินงาน..." />
                </div>
                <div className="iso-modal-actions">
                  <button className="iso-btn-save" onClick={saveClause}>บันทึก</button>
                  <button className="iso-btn-cancel" onClick={() => setEditClause(null)}>ยกเลิก</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== NC Log ===== */}
      {tab === 'nc' && (
        <div>
          <div className="iso-panel">
            <div className="iso-panel-hd" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              บันทึกความไม่เป็นไปตามข้อกำหนด (NCR)
              <button className="iso-add-btn" onClick={() => setAddingNC(true)}>+ เพิ่ม NC</button>
            </div>

            {addingNC && (
              <div className="iso-add-form">
                <div className="iso-form-grid">
                  <div className="iso-field">
                    <label>ข้อ ISO ที่เกี่ยวข้อง</label>
                    <input value={ncDraft.clause??''} onChange={e=>setNcDraft(p=>({...p,clause:e.target.value}))} placeholder="เช่น 8.7, 9.2" />
                  </div>
                  <div className="iso-field">
                    <label>ระดับ</label>
                    <select value={ncDraft.severity??'minor'} onChange={e=>setNcDraft(p=>({...p,severity:e.target.value as Nonconformity['severity']}))}>
                      <option value="major">Major NC</option>
                      <option value="minor">Minor NC</option>
                      <option value="observation">ข้อสังเกต</option>
                    </select>
                  </div>
                  <div className="iso-field iso-field-full">
                    <label>คำอธิบายความไม่สอดคล้อง</label>
                    <textarea value={ncDraft.description??''} onChange={e=>setNcDraft(p=>({...p,description:e.target.value}))} rows={2} placeholder="อธิบายพบอะไร ที่ไหน เมื่อไหร่..." />
                  </div>
                  <div className="iso-field iso-field-full">
                    <label>สาเหตุหลัก (Root Cause)</label>
                    <textarea value={ncDraft.rootCause??''} onChange={e=>setNcDraft(p=>({...p,rootCause:e.target.value}))} rows={2} placeholder="วิเคราะห์สาเหตุที่แท้จริง..." />
                  </div>
                </div>
                <div className="iso-modal-actions">
                  <button className="iso-btn-save" onClick={saveNC}>บันทึก NC</button>
                  <button className="iso-btn-cancel" onClick={() => { setAddingNC(false); setNcDraft({}); }}>ยกเลิก</button>
                </div>
              </div>
            )}

            {iso.nonconformities.length === 0 && !addingNC && (
              <div className="iso-empty">ยังไม่มีบันทึก NC — ระบบ QMS ที่ดีมักมีการบันทึกเพื่อแสดงให้ผู้ตรวจสอบเห็นว่ามีกระบวนการจัดการปัญหา</div>
            )}

            {iso.nonconformities.map(nc => (
              <div key={nc.id} className={`iso-nc-row nc-${nc.severity}`}>
                <div className="iso-nc-head">
                  <span className="iso-nc-sev" style={{ color: SEV_COLOR[nc.severity] }}>{SEV_LABEL[nc.severity]}</span>
                  <span className="iso-nc-clause">ข้อ {nc.clause}</span>
                  <span className="iso-nc-date">{nc.date}</span>
                  <span className={`iso-nc-status-badge ${nc.status}`}>{nc.status === 'open' ? '● เปิด' : nc.status === 'in_progress' ? '◐ กำลังแก้ไข' : '✓ ปิดแล้ว'}</span>
                  <select className="iso-nc-move" value={nc.status} onChange={e => patch({ nonconformities: iso.nonconformities.map(n => n.id===nc.id ? {...n, status: e.target.value as Nonconformity['status']} : n) })}>
                    <option value="open">เปิด</option>
                    <option value="in_progress">กำลังแก้ไข</option>
                    <option value="closed">ปิด</option>
                  </select>
                  <button className="iso-nc-del" onClick={() => patch({ nonconformities: iso.nonconformities.filter(n=>n.id!==nc.id) })}>×</button>
                </div>
                <div className="iso-nc-desc">{nc.description}</div>
                {nc.rootCause && <div className="iso-nc-cause">สาเหตุ: {nc.rootCause}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Documents ===== */}
      {tab === 'docs' && (
        <div className="iso-panel">
          <div className="iso-panel-hd" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            ทะเบียนเอกสาร (Document Registry — ข้อ 7.5)
            <button className="iso-add-btn" onClick={() => setAddingDoc(true)}>+ เพิ่มเอกสาร</button>
          </div>

          {addingDoc && (
            <div className="iso-add-form">
              <div className="iso-form-grid">
                <div className="iso-field"><label>เลขที่เอกสาร</label><input value={docDraft.docNo??''} onChange={e=>setDocDraft(p=>({...p,docNo:e.target.value}))} placeholder="QP-001" /></div>
                <div className="iso-field"><label>ชื่อเอกสาร</label><input value={docDraft.title??''} onChange={e=>setDocDraft(p=>({...p,title:e.target.value}))} placeholder="Quality Manual" /></div>
                <div className="iso-field"><label>ข้อ ISO อ้างอิง</label><input value={docDraft.clause??''} onChange={e=>setDocDraft(p=>({...p,clause:e.target.value}))} placeholder="4.4, 7.5" /></div>
                <div className="iso-field"><label>ฉบับที่</label><input value={docDraft.revision??''} onChange={e=>setDocDraft(p=>({...p,revision:e.target.value}))} placeholder="Rev.0" /></div>
                <div className="iso-field"><label>วันที่มีผลบังคับใช้</label><input type="date" value={docDraft.effectiveDate??''} onChange={e=>setDocDraft(p=>({...p,effectiveDate:e.target.value}))} /></div>
                <div className="iso-field"><label>เจ้าของเอกสาร</label><input value={docDraft.owner??''} onChange={e=>setDocDraft(p=>({...p,owner:e.target.value}))} placeholder="ผู้จัดการคุณภาพ" /></div>
              </div>
              <div className="iso-modal-actions">
                <button className="iso-btn-save" onClick={saveDoc}>บันทึก</button>
                <button className="iso-btn-cancel" onClick={() => { setAddingDoc(false); setDocDraft({}); }}>ยกเลิก</button>
              </div>
            </div>
          )}

          {iso.documents.length === 0 && !addingDoc && (
            <div className="iso-empty">ยังไม่มีเอกสาร — เริ่มต้นด้วย Quality Manual (QM-001) และ Quality Policy</div>
          )}

          {iso.documents.length > 0 && (
            <table className="iso-doc-table">
              <thead><tr><th>เลขที่</th><th>ชื่อเอกสาร</th><th>ข้อ ISO</th><th>ฉบับที่</th><th>วันที่บังคับใช้</th><th>เจ้าของ</th><th /></tr></thead>
              <tbody>
                {iso.documents.map(doc => (
                  <tr key={doc.id}>
                    <td><strong>{doc.docNo}</strong></td>
                    <td>{doc.title}</td>
                    <td>{doc.clause}</td>
                    <td>{doc.revision}</td>
                    <td>{doc.effectiveDate}</td>
                    <td>{doc.owner}</td>
                    <td><button className="iso-nc-del" onClick={() => patch({ documents: iso.documents.filter(d=>d.id!==doc.id) })}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ===== Internal Audit ===== */}
      {tab === 'audit' && (
        <div>
          <div className="iso-panel">
            <div className="iso-panel-hd" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              แผนการตรวจประเมินภายใน (Internal Audit — ข้อ 9.2)
              <button className="iso-add-btn" onClick={() => setAddingAudit(true)}>+ วางแผนตรวจ</button>
            </div>

            {addingAudit && (
              <div className="iso-add-form">
                <div className="iso-form-grid">
                  <div className="iso-field"><label>วันที่ตรวจ</label><input type="date" value={auditDraft.plannedDate??''} onChange={e=>setAuditDraft(p=>({...p,plannedDate:e.target.value}))} /></div>
                  <div className="iso-field"><label>ผู้ตรวจ (Auditor)</label><input value={auditDraft.auditor??''} onChange={e=>setAuditDraft(p=>({...p,auditor:e.target.value}))} placeholder="ชื่อผู้ตรวจสอบภายใน" /></div>
                  <div className="iso-field iso-field-full"><label>ขอบเขตการตรวจ</label><textarea value={auditDraft.scope??''} onChange={e=>setAuditDraft(p=>({...p,scope:e.target.value}))} rows={2} placeholder="เช่น ข้อ 7.1-7.5, 8.1-8.7 ส่วนการผลิต" /></div>
                </div>
                <div className="iso-modal-actions">
                  <button className="iso-btn-save" onClick={saveAudit}>บันทึก</button>
                  <button className="iso-btn-cancel" onClick={() => { setAddingAudit(false); setAuditDraft({}); }}>ยกเลิก</button>
                </div>
              </div>
            )}

            {iso.audits.length === 0 && !addingAudit && (
              <div className="iso-empty">ยังไม่มีแผนการตรวจ — ควรกำหนดอย่างน้อยปีละ 1 ครั้งต่อกระบวนการ</div>
            )}

            {iso.audits.map(a => (
              <div key={a.id} className="iso-audit-row">
                <div className="iso-audit-date">{a.plannedDate}</div>
                <div className="iso-audit-scope">{a.scope}</div>
                <div className="iso-audit-auditor">ผู้ตรวจ: {a.auditor}</div>
                <select className="iso-audit-status" value={a.status} onChange={e => patch({ audits: iso.audits.map(au => au.id===a.id ? {...au, status: e.target.value as InternalAudit['status']} : au) })}>
                  <option value="planned">วางแผนแล้ว</option>
                  <option value="completed">เสร็จสิ้น</option>
                  <option value="overdue">เกินกำหนด</option>
                </select>
                {a.status === 'completed' && (
                  <textarea className="iso-audit-findings" value={a.findings} onChange={e => patch({ audits: iso.audits.map(au => au.id===a.id ? {...au, findings:e.target.value} : au) })} placeholder="สรุปผลการตรวจ..." rows={2} />
                )}
                <button className="iso-nc-del" onClick={() => patch({ audits: iso.audits.filter(au=>au.id!==a.id) })}>×</button>
              </div>
            ))}
          </div>

          <div className="iso-panel" style={{ marginTop: 14 }}>
            <div className="iso-panel-hd">วัตถุประสงค์คุณภาพ (Quality Objectives — ข้อ 6.2)</div>
            {(iso.qualityObjectives ?? []).map((obj, i) => (
              <div key={i} className="iso-obj-row">
                <span className="iso-obj-num">{i+1}</span>
                <input className="iso-obj-input" value={obj} onChange={e => patch({ qualityObjectives: iso.qualityObjectives.map((o,j)=>j===i?e.target.value:o) })} />
                <button className="iso-nc-del" onClick={() => patch({ qualityObjectives: iso.qualityObjectives.filter((_,j)=>j!==i) })}>×</button>
              </div>
            ))}
            <button className="iso-add-btn" style={{ marginTop: 8 }} onClick={() => patch({ qualityObjectives: [...(iso.qualityObjectives ?? []), ''] })}>+ เพิ่มวัตถุประสงค์</button>
          </div>
        </div>
      )}
    </div>
  );
}
