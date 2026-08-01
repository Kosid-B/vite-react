import { describe, it, expect } from 'vitest';
import { pmfScore, PMF_THRESHOLD } from '../pmfSurvey';

describe('pmfScore — Sean Ellis 40% rule', () => {
  it('ไม่มีข้อมูล → nodata', () => {
    const r = pmfScore({ veryDisappointed: 0, somewhat: 0, notDisappointed: 0 });
    expect(r.verdict).toBe('nodata');
    expect(r.total).toBe(0);
  });

  it('≥40% ผิดหวังมาก → strong (ถึง PMF)', () => {
    const r = pmfScore({ veryDisappointed: 40, somewhat: 40, notDisappointed: 20 });
    expect(r.veryPct).toBe(40);
    expect(r.verdict).toBe('strong');
    expect(r.total).toBe(100);
  });

  it('พอดี 40% = strong (เกณฑ์ inclusive)', () => {
    expect(pmfScore({ veryDisappointed: 2, somewhat: 2, notDisappointed: 1 }).verdict).toBe('strong'); // 40%
  });

  it('25–39% → near', () => {
    const r = pmfScore({ veryDisappointed: 30, somewhat: 40, notDisappointed: 30 });
    expect(r.veryPct).toBe(30);
    expect(r.verdict).toBe('near');
  });

  it('<25% → weak', () => {
    const r = pmfScore({ veryDisappointed: 10, somewhat: 40, notDisappointed: 50 });
    expect(r.verdict).toBe('weak');
  });

  it('เตือนตัวอย่างน้อย (<30)', () => {
    const r = pmfScore({ veryDisappointed: 5, somewhat: 3, notDisappointed: 2 });  // 50% แต่ n=10
    expect(r.verdict).toBe('strong');
    expect(r.guidance).toContain('ตัวอย่างน้อย');
  });

  it('ปัดเศษ % ถูกต้อง + กันค่าติดลบ', () => {
    const r = pmfScore({ veryDisappointed: 1, somewhat: 2, notDisappointed: -5 });
    expect(r.total).toBe(3);
    expect(r.veryPct).toBeCloseTo(33.3, 1);
  });

  it('threshold export = 40', () => { expect(PMF_THRESHOLD).toBe(40); });
});
