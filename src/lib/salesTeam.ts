import type { AppData, DealStatus } from '../types';

/* ===== CMO สร้างทีมขาย (Sales Team) เพื่อดำเนินงาน =====
 * ทีมขายที่ CMO ตั้งขึ้น + เดินงานจริงบน "sales pipeline" ที่ดึงจากดีลในตลาด (marketplace.deals)
 * เสนอตำแหน่งผ่านสายงาน CMO → CEO → บอร์ด (hire) · pipeline วัดผลจากข้อมูลจริง */

/** ตำแหน่งในทีมขายที่ CMO ตั้ง (เสนอเป็น M-level hire) */
export const SALES_TEAM: { role: string; mandate: string }[] = [
  { role: 'Sales Manager', mandate: 'บริหารทีมขายและ Pipeline ตั้งแต่ Lead ถึงปิดการขาย ตั้งเป้า/โควตา ทำ Sales Forecast รายเดือน รายงาน CMO' },
  { role: 'Sales Development Rep (SDR)', mandate: 'หาลูกค้าใหม่และคัดกรอง (qualify) leads จาก Open RFQ + ตลาด นัดหมายส่งต่อให้ AE ตามเกณฑ์ BANT' },
  { role: 'Account Executive (AE)', mandate: 'เจรจาและปิดการขาย ดูแลดีลจากจับคู่ → เจรจา → ปิด ทำใบเสนอราคาและติดตามจนปิดดีล' },
  { role: 'Sales Operations', mandate: 'วิเคราะห์ pipeline/conversion ทำ forecast จัดการข้อมูลดีล และรายงาน KPI ทีมขายต่อ CMO' },
];

export interface PipelineStage {
  key: DealStatus;
  label: string;
  icon: string;
  count: number;
  value: number;      // มูลค่ารวม (บาท)
  weight: number;     // น้ำหนักโอกาสปิด (สำหรับ weighted forecast)
}

/** เดิน pipeline จากดีลจริงในตลาด → นับ/มูลค่าต่อสเตจ + conversion + forecast ถ่วงน้ำหนัก */
export function salesPipeline(d: AppData) {
  const deals = d.marketplace?.deals ?? [];
  const defs: { key: DealStatus; label: string; icon: string; weight: number }[] = [
    { key: 'matched',     label: 'จับคู่/ลีด',  icon: '🎯', weight: 0.2 },
    { key: 'negotiating', label: 'กำลังเจรจา',  icon: '🤝', weight: 0.5 },
    { key: 'closed',      label: 'ปิดได้',       icon: '✅', weight: 1 },
    { key: 'cancelled',   label: 'ยกเลิก',       icon: '✕',  weight: 0 },
  ];
  const stages: PipelineStage[] = defs.map(s => {
    const grp = deals.filter(x => x.status === s.key);
    return { key: s.key, label: s.label, icon: s.icon, count: grp.length,
      value: grp.reduce((a, x) => a + (x.amount || 0), 0), weight: s.weight };
  });
  const active = deals.filter(x => x.status !== 'cancelled');
  const won = stages.find(s => s.key === 'closed')!;
  const openStages = stages.filter(s => s.key === 'matched' || s.key === 'negotiating');
  const wonValue = won.value;
  // มูลค่าถ่วงน้ำหนัก = ดีลที่ยังเปิด × โอกาสปิด (ไม่รวมที่ปิดแล้ว)
  const forecast = openStages.reduce((a, s) => a + s.value * s.weight, 0);
  const convRate = active.length ? Math.round((won.count / active.length) * 100) : 0;
  return { stages, totalDeals: deals.length, activeDeals: active.length,
    wonValue, forecast: Math.round(forecast), convRate, hasDeals: deals.length > 0 };
}

/** แผนตั้งทีมขาย + เดินงาน (สำหรับเสนอ CEO/บอร์ด) */
export function salesPlanText(d: AppData): string {
  const p = salesPipeline(d);
  const c = d.aiCompany;
  const L: string[] = [];
  L.push('🧑‍💼 CMO เสนอตั้งทีมขาย (Sales Team) + แผนดำเนินงาน');
  L.push(`ธุรกิจ: ${c?.name || '-'} (${c?.industry || 'ไม่ระบุ'})`);
  L.push('');
  L.push('1) โครงสร้างทีมขาย (เสนอผ่าน CMO → CEO → บอร์ด):');
  SALES_TEAM.forEach(r => L.push(`   • ${r.role} — ${r.mandate}`));
  L.push('');
  L.push('2) Pipeline การขาย (สถานะปัจจุบันจากดีลจริง):');
  p.stages.forEach(s => L.push(`   ${s.icon} ${s.label}: ${s.count} ดีล · ฿${s.value.toLocaleString('th-TH')}`));
  L.push(`   → ปิดได้แล้ว ฿${p.wonValue.toLocaleString('th-TH')} · Conversion ${p.convRate}% · Forecast ถ่วงน้ำหนัก ฿${p.forecast.toLocaleString('th-TH')}`);
  L.push('');
  L.push('3) วิธีดำเนินงาน (Sales Motion):');
  L.push('   • SDR ดึงลีดจาก Open RFQ + ตลาด → qualify (BANT) → ส่ง AE');
  L.push('   • AE เจรจา/ทำใบเสนอราคา → ปิดดีล → บันทึกเข้า pipeline');
  L.push('   • Sales Ops ทำ forecast + รายงาน conversion ต่อ CMO ทุกสัปดาห์');
  L.push('');
  L.push('4) KPI: จำนวนลีด/สัปดาห์ · Conversion % · มูลค่าปิดต่อเดือน · Sales cycle (วัน)');
  return L.join('\n');
}

/** คำสั่งให้ agent ทีมขาย "ดำเนินงาน" — สร้างแผนลงมือจาก pipeline ปัจจุบัน */
export function salesTeamInstruction(d: AppData): string {
  const p = salesPipeline(d);
  const c = d.aiCompany;
  const stageLine = p.stages.map(s => `${s.label} ${s.count} ดีล (฿${s.value.toLocaleString('th-TH')})`).join(' · ');
  return [
    `ทำหน้าที่หัวหน้าทีมขาย (Sales Manager) ของ ${c?.name || 'บริษัท'} (${c?.industry || '-'})`,
    `Pipeline ปัจจุบัน: ${stageLine}`,
    `Conversion ${p.convRate}% · Forecast ถ่วงน้ำหนัก ฿${p.forecast.toLocaleString('th-TH')}`,
    p.hasDeals ? '' : '(ยังไม่มีดีล — เริ่มจากหาลีดใหม่ + ใช้ตัวอย่างสมจริงจากอุตสาหกรรม)',
    '',
    'ให้จัดทำ "แผนดำเนินงานทีมขายสัปดาห์นี้" เพื่อเสนอ CMO:',
    '1) เป้าหมายสัปดาห์นี้ (จำนวนลีดใหม่ · ดีลที่ต้องดันให้ปิด · มูลค่าเป้า)',
    '2) งานราย role: SDR (หาลีดจากไหน/qualify อย่างไร) · AE (ดีลไหนต้องปิด/ข้อเสนอ) · Sales Ops (forecast/รายงาน)',
    '3) 3 การลงมือทำสำคัญที่วัดผลได้ + วิธีดันดีลที่ค้างในสเตจเจรจาให้ปิด',
    '4) ความเสี่ยง pipeline (ดีลค้างนาน/กระจุกลูกค้าน้อยราย) + แนวทางแก้',
    '',
    'ตอบเป็นภาษาไทย กระชับ นำไปใช้ได้จริง',
  ].filter(Boolean).join('\n');
}
