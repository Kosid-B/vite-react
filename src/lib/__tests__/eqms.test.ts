import { describe, it, expect } from 'vitest';
import { eqmsStatus, CAPA_SLA_DAYS, type EqmsInput } from '../eqms';
import type { ISOClauseCheck, Nonconformity, InternalAudit } from '../../types';

const NOW = new Date('2026-08-02T00:00:00Z');
const clause = (id: string, status: ISOClauseCheck['status']): ISOClauseCheck => ({ id, title: id, status, evidence: '', notes: '' });
const nc = (o: Partial<Nonconformity>): Nonconformity => ({ id: o.id ?? 'n1', date: o.date ?? '2026-08-01', clause: o.clause ?? '8.7', description: '', severity: o.severity ?? 'minor', rootCause: o.rootCause ?? '', status: o.status ?? 'open', closedDate: o.closedDate });
const audit = (o: Partial<InternalAudit>): InternalAudit => ({ id: o.id ?? 'a1', plannedDate: o.plannedDate ?? '2026-09-01', scope: o.scope ?? 'ทั้งระบบ', auditor: '', status: o.status ?? 'planned', findings: '' });
const inp = (o: Partial<EqmsInput>): EqmsInput => ({ clauses: o.clauses ?? [], nonconformities: o.nonconformities ?? [], audits: o.audits ?? [], now: NOW });

describe('eqms — closed-loop PDCA/CAPA', () => {
  it('ยังไม่ประเมิน → headline เริ่มที่ Plan + health 0', () => {
    const s = eqmsStatus(inp({ clauses: [clause('4.1', 'na')] }));
    expect(s.pdca.plan).toBe(0);
    expect(s.loopHealth).toBe(0);
    expect(s.headline).toContain('Plan');
  });

  it('clause แดงไม่มี NC → เปิด open loop + auto CAPA', () => {
    const s = eqmsStatus(inp({ clauses: [clause('8.7', 'red'), clause('4.1', 'green')] }));
    expect(s.openLoops.some(l => l.kind === 'red_clause' && l.ref === '8.7')).toBe(true);
    expect(s.capaSuggestions.some(x => x.includes('8.7'))).toBe(true);
  });

  it('NC เกิน SLA → overdue + เร่งปิด', () => {
    const s = eqmsStatus(inp({
      clauses: [clause('8.7', 'green')],
      nonconformities: [nc({ clause: '8.7', severity: 'major', date: '2026-06-01', rootCause: 'ระบุแล้ว', status: 'in_progress' })],
    }));
    // major SLA 30 วัน · เปิดมา ~62 วัน → overdue
    expect(CAPA_SLA_DAYS.major).toBe(30);
    expect(s.overdueCount).toBe(1);
    expect(s.capaSuggestions.some(x => x.includes('เกิน SLA'))).toBe(true);
  });

  it('NC ไม่มี root cause → เตือนให้ระบุก่อน', () => {
    const s = eqmsStatus(inp({ nonconformities: [nc({ clause: '9.2', rootCause: '', status: 'open' })] }));
    expect(s.capaSuggestions.some(x => x.includes('root cause'))).toBe(true);
  });

  it('audit เกินกำหนด → open loop overdue_audit', () => {
    const s = eqmsStatus(inp({ clauses: [clause('4.1', 'green')], audits: [audit({ plannedDate: '2026-07-01', status: 'planned' })] }));
    expect(s.openLoops.some(l => l.kind === 'overdue_audit')).toBe(true);
  });

  it('วงจรปิดครบ: clauses green + NC ปิดหมด + audit เสร็จ → health 100, no loops', () => {
    const s = eqmsStatus(inp({
      clauses: [clause('4.1', 'green'), clause('8.7', 'green')],
      nonconformities: [nc({ clause: '8.7', status: 'closed', closedDate: '2026-07-20', rootCause: 'x' })],
      audits: [audit({ status: 'completed' })],
    }));
    expect(s.openLoops).toHaveLength(0);
    expect(s.loopHealth).toBe(100);
    expect(s.pdca.act).toBe(100);
    expect(s.headline).toContain('วงจรปิดครบ');
  });

  it('ncClosureRate ถูกต้อง', () => {
    const s = eqmsStatus(inp({ nonconformities: [nc({ id: 'a', status: 'closed', rootCause: 'x' }), nc({ id: 'b', status: 'open' })] }));
    expect(s.ncClosureRate).toBeCloseTo(0.5, 5);
  });
});
