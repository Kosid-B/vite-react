import type { ISOClauseCheck, Nonconformity, InternalAudit } from '../types';
import { eqmsStatus } from '../lib/eqms';

/* EqmsPanel — eQMS Closed-Loop (Superorganism เสา 4) ในหน้า ISO 9001
 * แสดงวงจร PDCA + loop health + รายการที่ "ยังไม่ปิดวงจร" + CAPA อัตโนมัติ (Act ต่อไป)
 * เปลี่ยน compliance จาก "ภาระ" → เครื่องมือปรับปรุงต่อเนื่อง */

interface Props {
  clauses: ISOClauseCheck[];
  nonconformities: Nonconformity[];
  audits: InternalAudit[];
}

const PDCA_META: { key: 'plan' | 'do' | 'check' | 'act'; label: string; color: string }[] = [
  { key: 'plan', label: 'Plan · ประเมินข้อกำหนด', color: '#6366f1' },
  { key: 'do', label: 'Do · ทำจนมีหลักฐาน', color: '#06b6d4' },
  { key: 'check', label: 'Check · ตรวจภายใน', color: '#f59e0b' },
  { key: 'act', label: 'Act · ปิด NC', color: '#16a34a' },
];
const SEV_COLOR = { high: '#dc2626', med: '#d97706', low: '#64748b' } as const;

export default function EqmsPanel({ clauses, nonconformities, audits }: Props) {
  // now ผ่าน prop ไม่ได้ (pure lib ต้องรับ now) — ใช้เวลาปัจจุบันจริงที่ชั้น UI
  const s = eqmsStatus({ clauses, nonconformities, audits, now: new Date() });
  const healthColor = s.loopHealth >= 80 ? '#16a34a' : s.loopHealth >= 50 ? '#d97706' : '#dc2626';

  return (
    <div className="iso-panel" style={{ marginTop: 14 }}>
      <div className="iso-adv-hd">
        <span>🔄 eQMS วงจรปิด (PDCA / CAPA)</span>
        <span style={{ fontWeight: 800, color: healthColor }}>Loop Health {s.loopHealth}</span>
      </div>
      <div className="iso-adv-sub">{s.headline}</div>

      {/* PDCA bars */}
      <div style={{ display: 'grid', gap: 8, margin: '12px 0' }}>
        {PDCA_META.map(p => (
          <div key={p.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink3,#475569)', marginBottom: 3 }}>
              <span>{p.label}</span><b style={{ color: p.color }}>{s.pdca[p.key]}%</b>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--sand,#e2e8f0)', overflow: 'hidden' }}>
              <div style={{ width: `${s.pdca[p.key]}%`, height: '100%', background: p.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* open loops */}
      {s.openLoops.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink,#0f172a)', marginBottom: 6 }}>
            🔓 วงจรที่ยังเปิด ({s.openLoops.length}{s.overdueCount > 0 ? ` · เกินกำหนด ${s.overdueCount}` : ''})
          </div>
          <div style={{ display: 'grid', gap: 5 }}>
            {s.openLoops.slice(0, 8).map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink3,#475569)' }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: SEV_COLOR[l.severity], flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{l.label}</span>
                {l.overdue && <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>เกิน {l.ageDays} วัน</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* auto CAPA (Act) */}
      {s.capaSuggestions.length > 0 && (
        <div style={{ background: 'var(--cream,#f8fafc)', border: '1px solid var(--sand,#e2e8f0)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink,#0f172a)', marginBottom: 5 }}>⚡ CAPA อัตโนมัติ — สิ่งที่ควร Act ต่อ</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--ink3,#475569)', lineHeight: 1.6 }}>
            {s.capaSuggestions.map((c, i) => <li key={i}>{c}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}
