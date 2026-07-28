import { describe, it, expect } from 'vitest';
import { cfoMetrics, cfoFlags, cfoLocalAdvice, cfoPrompt } from '../cfoAnalysis';
import { DEFAULT_DATA } from '../../data';
import type { AppData, FinanceEntry } from '../../types';

// ตัดค่าแพ็กเกจอัตโนมัติออก (plan=free → ไม่มี auto expense) เพื่อคุมตัวเลขในเทสต์
function withFinance(entries: FinanceEntry[]): AppData {
  return {
    ...DEFAULT_DATA,
    finance: entries,
    subscription: { ...DEFAULT_DATA.subscription, plan: 'free' },
  };
}

const rev = (amount: number, recurring = false): FinanceEntry =>
  ({ id: `r_${amount}_${recurring}`, label: 'ขาย', amount, kind: 'revenue', date: '2026-07-01', recurring });
const exp = (amount: number, recurring = false, label = 'ค่าใช้จ่าย'): FinanceEntry =>
  ({ id: `e_${amount}_${recurring}_${label}`, label, amount, kind: 'expense', date: '2026-07-01', recurring });

describe('cfoMetrics', () => {
  it('ไม่มีรายการ → hasData=false และตัวเลขเป็น 0', () => {
    const m = cfoMetrics(withFinance([]));
    expect(m.hasData).toBe(false);
    expect(m.revenue).toBe(0);
    expect(m.recurringNet).toBe(0);
    expect(m.breakEvenGap).toBe(0);
    expect(m.topExpense).toBeNull();
  });

  it('แยกรายรับ/รายจ่ายประจำ และคำนวณ recurringNet ถูก', () => {
    const m = cfoMetrics(withFinance([rev(100000, true), exp(60000, true), exp(30000, false)]));
    expect(m.recurringRevenue).toBe(100000);
    expect(m.recurringExpense).toBe(60000);
    expect(m.recurringNet).toBe(40000);
    expect(m.breakEvenGap).toBe(0); // คุ้มทุนแล้ว
  });

  it('เผาเงิน (recurringNet<0) → breakEvenGap = ส่วนที่ขาด', () => {
    const m = cfoMetrics(withFinance([rev(20000, true), exp(50000, true)]));
    expect(m.recurringNet).toBe(-30000);
    expect(m.breakEvenGap).toBe(30000);
  });

  it('topExpense = รายจ่ายก้อนใหญ่สุด + %ของรายจ่ายรวม', () => {
    const m = cfoMetrics(withFinance([exp(80000, false, 'ค่าโฆษณา'), exp(20000, false, 'ค่าเช่า')]));
    expect(m.topExpense?.label).toBe('ค่าโฆษณา');
    expect(m.topExpense?.amount).toBe(80000);
    expect(m.topExpense?.pct).toBe(80);
  });

  it('net = revenue - expense เสมอ (invariant)', () => {
    const m = cfoMetrics(withFinance([rev(100000), exp(30000)]));
    expect(m.net).toBe(m.revenue - m.expense);
  });
});

describe('cfoFlags', () => {
  it('ไม่มีข้อมูล → เตือนให้กรอกก่อน', () => {
    const flags = cfoFlags(cfoMetrics(withFinance([])));
    expect(flags).toHaveLength(1);
    expect(flags[0].level).toBe('warn');
  });

  it('เผาเงิน → มีธง risk', () => {
    const flags = cfoFlags(cfoMetrics(withFinance([rev(20000, true), exp(50000, true)])));
    expect(flags.some(f => f.level === 'risk')).toBe(true);
  });

  it('คุ้มทุนรายเดือน → มีธง good', () => {
    const flags = cfoFlags(cfoMetrics(withFinance([rev(100000, true), exp(40000, true)])));
    expect(flags.some(f => f.level === 'good')).toBe(true);
  });

  it('รายจ่ายกระจุก ≥50% → มีธง warn', () => {
    const flags = cfoFlags(cfoMetrics(withFinance([rev(100000, true), exp(70000, true, 'ค่าโฆษณา')])));
    expect(flags.some(f => f.msg.includes('กระจุก'))).toBe(true);
  });
});

describe('cfoLocalAdvice', () => {
  it('ไม่มีข้อมูล → แนะนำให้กรอกก่อน', () => {
    const a = cfoLocalAdvice(cfoMetrics(withFinance([])));
    expect(a.length).toBeGreaterThan(0);
    expect(a[0]).toContain('กรอก');
  });

  it('เผาเงิน → แนะนำหารายรับประจำเพิ่ม', () => {
    const a = cfoLocalAdvice(cfoMetrics(withFinance([rev(20000, true), exp(50000, true)])));
    expect(a.some(x => x.includes('รายรับประจำ'))).toBe(true);
  });

  it('คืน array เสมอ (ไม่ว่าง)', () => {
    const a = cfoLocalAdvice(cfoMetrics(withFinance([rev(100000, true), exp(40000, true)])));
    expect(Array.isArray(a)).toBe(true);
    expect(a.length).toBeGreaterThan(0);
  });
});

describe('cfoPrompt', () => {
  it('มีตัวเลขจริง + กติกาห้ามแต่งตัวเลข', () => {
    const p = cfoPrompt(withFinance([rev(100000, true), exp(40000, true)]));
    expect(p).toContain('ห้ามแต่งตัวเลข');
    expect(p).toContain('100000');
    expect(p).toContain('CFO');
    expect(p).toContain('ไม่ใช่คำแนะนำการลงทุน');
  });
});
