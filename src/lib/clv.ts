import type { AppData } from '../types';
import { financeSummary } from './finance';

/* ===== Customer Lifetime Value (CLV/LTV) — CMO เสนอทุกวันศุกร์ =====
 * คำนวณจากข้อมูลจริงในระบบ (ดีลที่ปิด/รายได้) + สมมติฐานที่ปรับได้ (ระบุชัดเจน)
 * CLV = AOV × ความถี่/ปี × อายุลูกค้า(ปี) × margin · เทียบ CAC (LTV:CAC ≥ 3 = แข็งแรง) */

export interface ClvResult {
  aov: number;            // มูลค่าเฉลี่ยต่อการซื้อ
  customers: number;      // จำนวนลูกค้า (ประมาณจากดีลที่ปิด)
  freqPerYear: number;    // ความถี่ซื้อ/ปี (สมมติฐาน)
  lifespanYears: number;  // อายุลูกค้า (สมมติฐาน)
  marginPct: number;      // gross margin %
  clvGross: number;
  clvMargin: number;
  maxCac: number;         // CAC สูงสุดที่คุ้ม (LTV:CAC 3:1)
  churnMonthlyPct: number;// churn รายเดือนโดยนัยจากอายุลูกค้า
  hasData: boolean;
}

const DEFAULT_FREQ = 2;       // ซื้อ 2 ครั้ง/ปี (ปรับได้)
const DEFAULT_LIFESPAN = 2;   // อยู่กับเรา 2 ปี (ปรับได้)
const DEFAULT_MARGIN = 60;    // margin 60% (บริการ/ดิจิทัลไทย)

export function clvSummary(d: AppData): ClvResult {
  const deals = (d.marketplace?.deals ?? []).filter(x => x.status === 'closed');
  const fin = financeSummary(d);
  const dealAov = deals.length > 0 ? deals.reduce((s, x) => s + (x.amount || 0), 0) / deals.length : 0;
  // ถ้าไม่มีดีล ใช้รายได้รวมหารจำนวนลูกค้าโดยประมาณ (partners) หรือ 1
  const partners = d.marketplace?.partners?.length ?? 0;
  const aov = dealAov > 0 ? dealAov : (fin.revenue > 0 ? fin.revenue / Math.max(1, deals.length || partners || 1) : 0);
  const customers = deals.length || partners || 0;

  const clvGross = aov * DEFAULT_FREQ * DEFAULT_LIFESPAN;
  const clvMargin = Math.round(clvGross * (DEFAULT_MARGIN / 100));
  return {
    aov: Math.round(aov), customers,
    freqPerYear: DEFAULT_FREQ, lifespanYears: DEFAULT_LIFESPAN, marginPct: DEFAULT_MARGIN,
    clvGross: Math.round(clvGross), clvMargin,
    maxCac: Math.round(clvMargin / 3),
    churnMonthlyPct: Math.round((1 / (DEFAULT_LIFESPAN * 12)) * 1000) / 10,
    hasData: aov > 0,
  };
}

const baht = (n: number) => '฿' + Math.round(n).toLocaleString('th-TH');

export function clvText(d: AppData): string {
  const c = clvSummary(d);
  if (!c.hasData) return 'CLV: ยังไม่มีข้อมูลดีล/รายได้พอคำนวณ — ปิดดีลแรกหรือกรอกการเงินก่อน';
  return [
    `CLV (ประมาณการ): ${baht(c.clvMargin)} ต่อลูกค้า (หลังหัก margin ${c.marginPct}%)`,
    `AOV ${baht(c.aov)} × ${c.freqPerYear} ครั้ง/ปี × ${c.lifespanYears} ปี · ลูกค้า ~${c.customers} ราย`,
    `CAC สูงสุดที่คุ้ม (LTV:CAC 3:1): ${baht(c.maxCac)} ต่อลูกค้าใหม่`,
    `สมมติฐาน: ความถี่/อายุ/margin เป็นค่าเริ่มต้น — ปรับเมื่อมีข้อมูลจริงมากขึ้น`,
  ].join('\n');
}
