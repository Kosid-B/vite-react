import type { AppData, FinanceEntry } from '../types';

/* ===== การเงินธุรกิจ — ขับเศรษฐกิจเมืองบริษัท (SIM) =====
 * รายการมาจาก 2 ทาง: (1) กรอกเอง (d.finance) (2) ดึงอัตโนมัติจากสิ่งที่ระบบรู้ (ค่าแพ็กเกจที่จ่าย)
 * รายการอัตโนมัติคำนวณสด ไม่เก็บซ้ำใน d.finance */

export const PLAN_PRICE: Record<string, number> = { free: 0, starter: 390, growth: 1490, scale: 5900 };
const PLAN_LABEL: Record<string, string> = { free: 'ฟรี', starter: 'Starter', growth: 'Growth', scale: 'Scale' };

/** รายการอัตโนมัติจากข้อมูลที่ระบบรู้จริง — ปัจจุบัน: ค่าแพ็กเกจรายเดือนที่ผู้ใช้จ่าย */
export function autoEntries(d: AppData): FinanceEntry[] {
  const out: FinanceEntry[] = [];
  const plan = d.subscription?.plan ?? 'free';
  const price = PLAN_PRICE[plan] ?? 0;
  if (price > 0) {
    out.push({
      id: 'auto-subscription',
      label: `ค่าแพ็กเกจ ${PLAN_LABEL[plan]} (CEO AI Thailand)`,
      amount: price, kind: 'expense', date: '', recurring: true,
    });
  }
  return out;
}

export function isAutoEntry(id: string): boolean {
  return id.startsWith('auto-');
}

/** รายการทั้งหมด (อัตโนมัติ + กรอกเอง) เรียงใหม่→เก่า */
export function allEntries(d: AppData): FinanceEntry[] {
  const manual = [...(d.finance ?? [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return [...autoEntries(d), ...manual];
}

export interface FinanceSummary {
  revenue: number;
  expense: number;
  net: number;        // กำไรสุทธิ (บวก=กำไร ลบ=ขาดทุน)
  margin: number;     // % กำไรต่อรายได้
  entries: FinanceEntry[];
  hasRevenue: boolean;
  breakEven: boolean; // รายได้ ≥ รายจ่าย
}

export function financeSummary(d: AppData): FinanceSummary {
  const entries = allEntries(d);
  const revenue = entries.filter(e => e.kind === 'revenue').reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter(e => e.kind === 'expense').reduce((s, e) => s + e.amount, 0);
  const net = revenue - expense;
  return {
    revenue, expense, net,
    margin: revenue > 0 ? Math.round((net / revenue) * 100) : 0,
    entries,
    hasRevenue: revenue > 0,
    breakEven: revenue > 0 && revenue >= expense,
  };
}

export const fmtBaht = (n: number): string =>
  `฿${Math.round(n).toLocaleString('th-TH')}`;
