import { describe, it, expect } from 'vitest';
import { cfoKpis, cfoProjection, cfoReportText } from '../cfoReport';
import { DEFAULT_DATA } from '../../data';
import type { AppData, FinanceEntry } from '../../types';

/* CFO KPI + ประมาณการ 12 เดือน — ตัวเลขการเงินต้องตรง (บอร์ดใช้ตัดสินใจ) */

// plan free = ไม่มีค่าแพ็ก auto → คุมรายรับ/จ่ายจาก finance ล้วน
const fin = (entries: FinanceEntry[]): AppData => ({
  ...DEFAULT_DATA,
  subscription: { ...DEFAULT_DATA.subscription, plan: 'free' },
  finance: entries,
});
const rev = (n: number): FinanceEntry => ({ id: 'r', label: 'ขาย', amount: n, kind: 'revenue', date: '2026-07-01' });
const exp = (n: number): FinanceEntry => ({ id: 'e', label: 'จ่าย', amount: n, kind: 'expense', date: '2026-07-02' });

describe('cfoKpis', () => {
  it('กำไร → net profit 🟢, ขาดทุน → 🔴', () => {
    const win = cfoKpis(fin([rev(100000), exp(30000)]));
    expect(win.find(k => k.label.includes('Net Profit'))?.status).toBe('🟢');
    const lose = cfoKpis(fin([rev(10000), exp(50000)]));
    expect(lose.find(k => k.label.includes('Net Profit'))?.status).toBe('🔴');
  });
  it('คุ้มทุน → break-even 🟢', () => {
    expect(cfoKpis(fin([rev(50000), exp(10000)])).find(k => k.label.includes('Break-even'))?.status).toBe('🟢');
  });
});

describe('cfoProjection', () => {
  it('conservative < base < optimistic (โต 3/6/10%)', () => {
    const p = cfoProjection(fin([rev(1000)]));
    expect(p.conservative).toBeLessThan(p.base);
    expect(p.base).toBeLessThan(p.optimistic);
    expect(p.base).toBe(Math.round(1000 * Math.pow(1.06, 12)));
  });
  it('มีรายได้ ≥ รายจ่าย → คุ้มทุนเดือน 0', () => {
    expect(cfoProjection(fin([rev(1000)])).breakEvenMonth).toBe(0);
  });
  it('รายจ่ายสูงเกินโตไม่ทันใน 12 เดือน → breakEvenMonth null', () => {
    expect(cfoProjection(fin([rev(1000), exp(50000)])).breakEvenMonth).toBeNull();
  });
});

describe('cfoReportText', () => {
  it('มีหัวข้อ KPI + ประมาณการ + ชื่อบริษัท', () => {
    const txt = cfoReportText(fin([rev(20000), exp(5000)]));
    expect(txt).toContain('CFO');
    expect(txt).toContain('KPI');
    expect(txt).toContain('ประมาณการ 12 เดือน');
  });
});
