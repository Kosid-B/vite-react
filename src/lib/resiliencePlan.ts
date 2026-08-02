// resiliencePlan.ts — Scenario/Resilience planner (Superorganism เสา 1: Identity & Resilience)
// "อภิสิ่งมีชีวิตอยู่รอดทุกวิกฤต" → จำลอง stress test กับการเงินจริงของธุรกิจ (d.finance)
// รายได้ตก/ต้นทุนพุ่ง → เหลือ runway กี่เดือน + ต้องอุดช่องว่างเท่าไรถึงรอด · ต่อยอด cfoMetrics/financeSummary
// pure/testable — ไม่แต่งตัวเลข ใช้รายรับ-รายจ่าย "ประจำ" ของผู้ใช้เป็นฐาน
import type { AppData } from '../types';
import { cfoMetrics } from './cfoAnalysis';
import { financeSummary, fmtBaht } from './finance';

export interface ResilienceScenario { revenueDropPct: number; expenseSpikePct: number }
export interface ResilienceInput {
  recurringRevenue: number;   // รายรับประจำ/เดือน (ฐาน)
  recurringExpense: number;   // รายจ่ายประจำ/เดือน (ฐาน)
  cashReserve: number;        // เงินสำรอง (บาท)
  scenario: ResilienceScenario;
}

export type ResilienceSeverity = 'resilient' | 'safe' | 'watch' | 'critical';

export interface ResiliencePlan {
  stressedRevenue: number;
  stressedExpense: number;
  stressedNet: number;        // กำไร/ขาดทุนประจำต่อเดือนภายใต้วิกฤต
  runwayMonths: number;       // เดือนที่ยืนได้ก่อนเงินสำรองหมด · Infinity = ยืนได้ไม่จำกัด (ไม่ขาดทุน)
  breakEvenGap: number;       // รายรับประจำที่ต้องเพิ่ม (หรือรายจ่ายที่ต้องตัด) เพื่อกลับมาไม่ขาดทุน
  severity: ResilienceSeverity;
  headline: string;
  mitigations: string[];
}

/** เกณฑ์ runway (เดือน) ที่ถือว่าปลอดภัย — SME ควรมีสำรอง ≥ 6 เดือน */
export const RUNWAY_SAFE_MONTHS = 6;
const clampPct = (p: number): number => Math.max(0, Math.min(100, p || 0));

/** ชุดสถานการณ์วิกฤตสำเร็จรูป (stress test มาตรฐาน) */
export const RESILIENCE_PRESETS: { id: string; label: string; scenario: ResilienceScenario }[] = [
  { id: 'lose_customers', label: 'ลูกค้าหาย 30%', scenario: { revenueDropPct: 30, expenseSpikePct: 0 } },
  { id: 'cost_spike', label: 'ต้นทุนพุ่ง 20%', scenario: { revenueDropPct: 0, expenseSpikePct: 20 } },
  { id: 'recession', label: 'วิกฤตหนัก: รายได้ −50% · ต้นทุน +20%', scenario: { revenueDropPct: 50, expenseSpikePct: 20 } },
];

/** จำลองสถานการณ์วิกฤตกับฐานการเงิน → runway + ช่องว่างที่ต้องอุด + แผนรับมือ — pure */
export function resiliencePlan(inp: ResilienceInput): ResiliencePlan {
  const baseRev = Math.max(0, inp.recurringRevenue);
  const baseExp = Math.max(0, inp.recurringExpense);
  const cash = Math.max(0, inp.cashReserve);

  const stressedRevenue = Math.round(baseRev * (1 - clampPct(inp.scenario.revenueDropPct) / 100));
  const stressedExpense = Math.round(baseExp * (1 + Math.max(0, inp.scenario.expenseSpikePct || 0) / 100));
  const stressedNet = stressedRevenue - stressedExpense;

  const burn = stressedNet < 0 ? -stressedNet : 0;
  const runwayMonths = burn === 0 ? Infinity : cash / burn;
  const breakEvenGap = burn;

  let severity: ResilienceSeverity;
  if (stressedNet >= 0) severity = 'resilient';
  else if (runwayMonths >= RUNWAY_SAFE_MONTHS) severity = 'safe';
  else if (runwayMonths >= 3) severity = 'watch';
  else severity = 'critical';

  const headline =
    severity === 'resilient' ? 'ทนวิกฤตนี้ได้ — ยังไม่ขาดทุนประจำ'
    : severity === 'safe' ? `พอไหว — ยืนได้ ~${runwayMonths.toFixed(1)} เดือน แต่ขาดทุน ${fmtBaht(burn)}/เดือน`
    : severity === 'watch' ? `ต้องระวัง — เงินสำรองยืนได้แค่ ~${runwayMonths.toFixed(1)} เดือน`
    : `วิกฤต — เงินสำรองยืนได้ ~${runwayMonths.toFixed(1)} เดือน ต้องรีบแก้`;

  const mitigations: string[] = [];
  if (breakEvenGap > 0) {
    const custEq = Math.ceil(breakEvenGap / 790); // เทียบเป็นลูกค้า Starter ฿790
    mitigations.push(`อุดช่องว่าง: เพิ่มรายรับประจำ ${fmtBaht(breakEvenGap)}/เดือน (~${custEq} ลูกค้า Starter ฿790) หรือ ตัดรายจ่ายประจำเท่ากัน`);
  }
  if (runwayMonths < RUNWAY_SAFE_MONTHS && breakEvenGap > 0) {
    const need = Math.max(0, Math.round(breakEvenGap * RUNWAY_SAFE_MONTHS - cash));
    mitigations.push(`กันเงินสำรองให้ยืน ≥ ${RUNWAY_SAFE_MONTHS} เดือน — ต้องมีเพิ่มอีกราว ${fmtBaht(need)}`);
  }
  if (severity === 'resilient') {
    mitigations.push('กระจายรายได้ อย่าพึ่งลูกค้ารายเดียว (กันรายได้หายทีเดียว) + คงสำรองไว้');
  } else {
    mitigations.push('ทำสัญญารายปี/พรีเพย์ เพื่อล็อกรายรับประจำให้แน่นก่อนวิกฤตมา');
  }

  return { stressedRevenue, stressedExpense, stressedNet, runwayMonths, breakEvenGap, severity, headline, mitigations };
}

/** ค่าตั้งต้นจากข้อมูลจริง: รายรับ/จ่ายประจำ (cfoMetrics) + ประเมินเงินสำรอง = กำไรสะสม (financeSummary.net ถ้าบวก) */
export function resilienceBaseFromData(d: AppData): { recurringRevenue: number; recurringExpense: number; cashReserve: number } {
  const m = cfoMetrics(d);
  const fin = financeSummary(d);
  return {
    recurringRevenue: m.recurringRevenue,
    recurringExpense: m.recurringExpense,
    cashReserve: Math.max(0, fin.net),
  };
}
