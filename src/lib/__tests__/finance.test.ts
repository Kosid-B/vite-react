import { describe, it, expect } from 'vitest';
import { financeSummary, fmtBaht } from '../finance';
import { DEFAULT_DATA } from '../../data';
import type { AppData, FinanceEntry } from '../../types';

function withFinance(entries: FinanceEntry[]): AppData {
  return { ...DEFAULT_DATA, finance: entries };
}

describe('financeSummary', () => {
  it('net = revenue - expense เสมอ (invariant)', () => {
    const s = financeSummary(withFinance([
      { id: '1', label: 'ขาย', amount: 100000, kind: 'revenue', date: '2026-07-01' },
      { id: '2', label: 'ค่าโฆษณา', amount: 30000, kind: 'expense', date: '2026-07-02' },
    ]));
    expect(s.net).toBe(s.revenue - s.expense);
    expect(s.revenue).toBeGreaterThanOrEqual(100000);
    expect(s.expense).toBeGreaterThanOrEqual(30000);
  });

  it('มีรายได้ → hasRevenue จริง และ margin สอดคล้อง', () => {
    const s = financeSummary(withFinance([
      { id: '1', label: 'ขาย', amount: 50000, kind: 'revenue', date: '2026-07-01' },
    ]));
    expect(s.hasRevenue).toBe(true);
    expect(s.margin).toBe(Math.round((s.net / s.revenue) * 100));
  });

  it('ไม่มีรายได้ → margin 0, hasRevenue false', () => {
    const s = financeSummary(withFinance([
      { id: '1', label: 'ค่าใช้จ่าย', amount: 5000, kind: 'expense', date: '2026-07-01' },
    ]));
    expect(s.hasRevenue).toBe(false);
    expect(s.margin).toBe(0);
  });
});

describe('fmtBaht', () => {
  it('จัดรูปแบบเงินบาท', () => {
    expect(fmtBaht(1500)).toContain('฿');
    expect(fmtBaht(1500)).toContain('1,500');
  });
});
