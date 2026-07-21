import { describe, it, expect } from 'vitest';
import { assessReadiness, ISO_CLAUSE_GUIDE } from '../isoGapAssessment';
import type { ISOClauseCheck, ISOStatus } from '../../types';

const c = (id: string, status: ISOStatus): ISOClauseCheck => ({ id, title: 'ข้อ ' + id, status, evidence: '', notes: '' });

describe('assessReadiness', () => {
  it('ทุก green → readiness 100% + level ready + ไม่มี action', () => {
    const r = assessReadiness([c('4.3', 'green'), c('5.2', 'green')]);
    expect(r.readiness).toBe(100);
    expect(r.level).toBe('ready');
    expect(r.prioritizedActions).toHaveLength(0);
    expect(r.mandatoryDocsMissing).toHaveLength(0);
  });

  it('na ไม่นับใน applicable', () => {
    const r = assessReadiness([c('4.3', 'green'), c('8.3', 'na')]);
    expect(r.applicable).toBe(1);
    expect(r.readiness).toBe(100);
  });

  it('red/amber → อยู่ใน prioritizedActions พร้อม action+keyDoc จาก guide', () => {
    const r = assessReadiness([c('5.2', 'red'), c('4.3', 'green')]);
    expect(r.prioritizedActions).toHaveLength(1);
    expect(r.prioritizedActions[0].id).toBe('5.2');
    expect(r.prioritizedActions[0].keyDoc).toBe(ISO_CLAUSE_GUIDE['5.2'].keyDoc);
    expect(r.prioritizedActions[0].mandatoryDoc).toBe(true);
  });

  it('เรียง priority 1 มาก่อน + red มาก่อน amber ในระดับเดียวกัน', () => {
    // 6.3 = priority 3, 4.3 = priority 1 red, 5.2 = priority 1 amber
    const r = assessReadiness([c('6.3', 'red'), c('4.3', 'red'), c('5.2', 'amber')]);
    expect(r.prioritizedActions.map(a => a.id)).toEqual(['4.3', '5.2', '6.3']);
  });

  it('เอกสารบังคับที่ยังไม่ green → อยู่ใน mandatoryDocsMissing', () => {
    const r = assessReadiness([c('9.2', 'red'), c('9.3', 'amber'), c('4.3', 'green')]);
    expect(r.mandatoryDocsMissing).toContain(ISO_CLAUSE_GUIDE['9.2'].keyDoc);
    expect(r.mandatoryDocsMissing).toContain(ISO_CLAUSE_GUIDE['9.3'].keyDoc);
    expect(r.mandatoryDocsMissing).not.toContain(ISO_CLAUSE_GUIDE['4.3'].keyDoc); // green แล้ว
  });

  it('level ตามช่วง readiness (2/4 = 50% → progress)', () => {
    expect(assessReadiness([c('4.3','green'),c('5.2','green'),c('6.2','red'),c('7.5','red')]).level).toBe('progress');
  });

  it('clause ที่ไม่มีใน guide ยังทำงาน (fallback)', () => {
    const r = assessReadiness([c('99.9', 'red')]);
    expect(r.prioritizedActions[0].action).toBeTruthy();
    expect(r.prioritizedActions[0].priority).toBe(2);
  });
});
