import type { AppData } from '../types';
import { financeSummary, allEntries, PLAN_PRICE } from './finance';

/* ===== CFO รายงานผลการดำเนินงาน (การเงิน) ต่อ CEO =====
 * KPI ตามกรอบ Financial Dashboard (8–12 ตัว) จากข้อมูลจริงใน AppData
 * หมายเหตุ: เพื่อการติดตาม/วางแผนภายในเท่านั้น ไม่ใช่งบการเงินที่ตรวจสอบแล้ว */

const baht = (n: number) => '฿' + Math.round(n).toLocaleString('th-TH');
const light = (v: number, g: number, y: number) => (v >= g ? '🟢' : v >= y ? '🟡' : '🔴');

export interface CfoKpi { label: string; value: string; status: '🟢' | '🟡' | '🔴' | ''; }

export function cfoKpis(d: AppData): CfoKpi[] {
  const fin = financeSummary(d);
  const entries = allEntries(d);
  const expenses = entries.filter(e => e.kind === 'expense');
  const monthlyBurn = PLAN_PRICE[d.subscription?.plan ?? 'free'] ?? 0;
  const opexRatio = fin.revenue > 0 ? Math.round((fin.expense / fin.revenue) * 100) : 0;
  const dealsClosed = (d.marketplace?.deals ?? []).filter(x => x.status === 'closed');
  const dealRev = dealsClosed.reduce((s, x) => s + (x.amount || 0), 0);

  return [
    { label: 'รายได้รวม (Revenue)', value: baht(fin.revenue), status: '' },
    { label: 'รายจ่ายรวม (Expenses)', value: baht(fin.expense), status: '' },
    { label: 'กำไรสุทธิ (Net Profit)', value: baht(fin.net), status: fin.net >= 0 ? '🟢' : '🔴' },
    { label: 'อัตรากำไรสุทธิ (Net Margin)', value: fin.margin + '%', status: light(fin.margin, 20, 10) },
    { label: 'กระแสเงินสดสุทธิ (Cashflow)', value: baht(fin.net), status: fin.net >= 0 ? '🟢' : '🔴' },
    { label: 'อัตราส่วนค่าใช้จ่าย (OpEx Ratio)', value: opexRatio + '%', status: opexRatio === 0 ? '' : (opexRatio < 30 ? '🟢' : opexRatio <= 50 ? '🟡' : '🔴') },
    { label: 'รายได้จากดีลที่ปิด', value: `${baht(dealRev)} (${dealsClosed.length} ดีล)`, status: '' },
    { label: 'ค่าใช้จ่ายประจำ/เดือน (Burn)', value: baht(monthlyBurn), status: '' },
    { label: 'จำนวนรายการค่าใช้จ่าย', value: expenses.length + ' รายการ', status: '' },
    { label: 'สถานะคุ้มทุน (Break-even)', value: fin.breakEven ? 'คุ้มทุนแล้ว' : 'ยังไม่คุ้มทุน', status: fin.breakEven ? '🟢' : '🟡' },
  ];
}

/* ===== ประมาณการ 12 เดือน (3 สถานการณ์) + จุดคุ้มทุน — กรอบ Financial Projection ===== */
export interface CfoProjection {
  months: number;
  conservative: number; base: number; optimistic: number; // รายได้เดือนที่ 12
  breakEvenMonth: number | null; // เดือนที่คาดว่าคุ้มทุน (base) — null ถ้าไม่ถึงใน 12 เดือน
  monthlyExpense: number;
}

export function cfoProjection(d: AppData): CfoProjection {
  const fin = financeSummary(d);
  const startRev = fin.revenue;         // ใช้รายได้ปัจจุบันเป็นฐาน
  const monthlyExpense = fin.expense || 0;
  const grow = (rate: number) => startRev * Math.pow(1 + rate, 12);
  // หา break-even เดือนแรก (base 6%/เดือน) ที่รายได้ ≥ รายจ่าย
  let be: number | null = null;
  if (monthlyExpense > 0) {
    for (let m = 1; m <= 12; m++) {
      if (startRev * Math.pow(1.06, m) >= monthlyExpense) { be = m; break; }
    }
    if (be === null && startRev >= monthlyExpense) be = 0;
  } else if (startRev > 0) be = 0;
  return {
    months: 12,
    conservative: Math.round(grow(0.03)),
    base: Math.round(grow(0.06)),
    optimistic: Math.round(grow(0.10)),
    breakEvenMonth: be,
    monthlyExpense,
  };
}

/** ข้อความรายงาน CFO → CEO พร้อมบทวิเคราะห์ + ประมาณการ (คัดลอก/แนบได้) */
export function cfoReportText(d: AppData): string {
  const fin = financeSummary(d);
  const kpis = cfoKpis(d);
  const proj = cfoProjection(d);
  const payables = allEntries(d).filter(e => e.kind === 'expense');
  const dateTh = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  const L: string[] = [];
  L.push(`💰 CFO รายงานผลการดำเนินงานด้านการเงิน — เรียน CEO`);
  L.push(`${d.aiCompany?.name || 'บริษัท'} · ${dateTh}`);
  L.push('');
  L.push('1) KPI การเงิน (Dashboard):');
  kpis.forEach(k => L.push(`   ${k.status ? k.status + ' ' : ''}${k.label}: ${k.value}`));
  L.push('');
  L.push('2) รายการที่ต้องจ่าย (Payables):');
  if (payables.length === 0) L.push('   — ไม่มี');
  else payables.slice(0, 10).forEach(e => L.push(`   • ${e.label || 'ค่าใช้จ่าย'} — ${baht(e.amount)}${e.recurring ? ' (ประจำ)' : ''}`));
  L.push('');
  L.push('3) ประมาณการ 12 เดือน (รายได้เดือนที่ 12 · 3 สถานการณ์):');
  L.push(`   • อนุรักษ์นิยม (+3%/ด.) ${baht(proj.conservative)} · ฐาน (+6%) ${baht(proj.base)} · ดี (+10%) ${baht(proj.optimistic)}`);
  L.push(`   • จุดคุ้มทุน (ฐาน): ${proj.breakEvenMonth === null ? 'ยังไม่ถึงใน 12 เดือน — ต้องเพิ่มรายได้/ลดต้นทุน'
    : proj.breakEvenMonth === 0 ? 'คุ้มทุนแล้วในปัจจุบัน' : `ประมาณเดือนที่ ${proj.breakEvenMonth}`}`);
  L.push('');
  L.push('4) บทวิเคราะห์ & ข้อเสนอ CFO ต่อ CEO:');
  L.push(`   ${fin.breakEven
    ? '• สถานะแข็งแรง: รายรับครอบคลุมรายจ่าย — เสนอจัดสรรกำไรลงทุนช่องทางที่ ROI สูงสุด และกันสำรอง 3 เดือน'
    : (fin.revenue === 0
      ? '• ยังไม่มีรายได้: เสนอเร่งปิดดีลแรกภายใน 30 วัน + คุมค่าใช้จ่ายคงที่ให้ต่ำสุด (runway ยาวขึ้น)'
      : '• ขาดทุน/ยังไม่คุ้มทุน: เสนอ 2 มาตรการคู่ขนาน — เพิ่มรายได้ (ขึ้นราคา/อัปเซล) + ตัดค่าใช้จ่ายที่ ROI ต่ำ')}`);
  L.push(`   • ตัวแปรที่อ่อนไหวสุดคืออัตราการเติบโตของรายได้ — โฟกัสการตลาดที่แปลงเป็นยอดขายจริง`);
  L.push('');
  L.push('— เพื่อการติดตาม/วางแผนภายในเท่านั้น มิใช่งบการเงินที่ตรวจสอบแล้ว —');
  return L.join('\n');
}
