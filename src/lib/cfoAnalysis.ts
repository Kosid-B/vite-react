/** CFO AI — วิเคราะห์การเงิน "ธุรกิจตัวเอง" ของผู้ใช้ SME จากข้อมูลจริง (d.finance)
 *  ต่อยอดจาก finance.ts · ใช้ตัวเลขที่ผู้ใช้กรอกเอง (ไม่ต้องมี data feed ภายนอก) = เข้า positioning
 *  pure · ทดสอบได้ · ตัวเลขทุกตัวมาจากข้อมูลจริง — AI ห้ามแต่งเพิ่ม */

import type { AppData } from '../types';
import { allEntries, financeSummary, fmtBaht } from './finance';

export interface CfoMetrics {
  hasData: boolean;
  revenue: number; expense: number; net: number; margin: number;
  recurringRevenue: number;   // รายรับประจำ/เดือน
  recurringExpense: number;   // รายจ่ายประจำ/เดือน
  recurringNet: number;       // กำไรประจำ/เดือน (ลบ = เผาเงิน/burn)
  breakEvenGap: number;       // รายรับประจำที่ต้องเพิ่มเพื่อคุ้มทุนรายเดือน (0 = คุ้มแล้ว)
  topExpense: { label: string; amount: number; pct: number } | null;
  revenueCount: number; expenseCount: number;
}

export function cfoMetrics(d: AppData): CfoMetrics {
  const s = financeSummary(d);
  const entries = allEntries(d);
  const rec = entries.filter(e => e.recurring);
  const recurringRevenue = rec.filter(e => e.kind === 'revenue').reduce((a, e) => a + e.amount, 0);
  const recurringExpense = rec.filter(e => e.kind === 'expense').reduce((a, e) => a + e.amount, 0);
  const recurringNet = recurringRevenue - recurringExpense;
  const expenses = entries.filter(e => e.kind === 'expense');
  const top = expenses.slice().sort((a, b) => b.amount - a.amount)[0] ?? null;
  return {
    hasData: entries.length > 0,
    revenue: s.revenue, expense: s.expense, net: s.net, margin: s.margin,
    recurringRevenue, recurringExpense, recurringNet,
    breakEvenGap: recurringNet < 0 ? -recurringNet : 0,
    topExpense: top ? { label: top.label, amount: top.amount, pct: s.expense > 0 ? Math.round((top.amount / s.expense) * 100) : 0 } : null,
    revenueCount: entries.filter(e => e.kind === 'revenue').length,
    expenseCount: expenses.length,
  };
}

export interface CfoFlag { level: 'good' | 'warn' | 'risk'; msg: string }

/** ธงสุขภาพการเงิน (rule-based จากตัวเลขจริง) */
export function cfoFlags(m: CfoMetrics): CfoFlag[] {
  const f: CfoFlag[] = [];
  if (!m.hasData) return [{ level: 'warn', msg: 'ยังไม่มีรายการการเงิน — กรอกรายรับ/รายจ่ายก่อน CFO AI จึงวิเคราะห์ได้' }];
  if (m.revenue === 0) f.push({ level: 'warn', msg: 'ยังไม่มีรายได้บันทึก — โฟกัสปิดดีลแรกให้เกิดรายรับจริง' });
  if (m.recurringNet < 0) {
    f.push({ level: 'risk', msg: `รายจ่ายประจำมากกว่ารายรับประจำ — เผาเงิน ${fmtBaht(-m.recurringNet)}/เดือน · ต้องเพิ่มรายรับประจำ ${fmtBaht(m.breakEvenGap)} หรือ ลดรายจ่าย` });
  } else if (m.recurringRevenue > 0) {
    f.push({ level: 'good', msg: `คุ้มทุนระดับรายเดือนแล้ว (กำไรประจำ ${fmtBaht(m.recurringNet)}/เดือน)` });
  }
  if (m.revenue > 0 && m.margin < 10) f.push({ level: 'warn', msg: `margin บาง (${m.margin}%) — ระวังต้นทุน/ตั้งราคาใหม่` });
  if (m.topExpense && m.topExpense.pct >= 50) f.push({ level: 'warn', msg: `รายจ่ายกระจุกที่ “${m.topExpense.label}” ${m.topExpense.pct}% — ถ้าลด/ต่อรองได้ ผลไวสุด` });
  return f;
}

/** คำแนะนำ CFO แบบ local (ไม่มี AI ก็ใช้ได้ — rule-based) */
export function cfoLocalAdvice(m: CfoMetrics): string[] {
  if (!m.hasData) return ['กรอกรายรับ-รายจ่ายในคลังเมืองก่อน แล้ว CFO AI จะวิเคราะห์ให้'];
  const a: string[] = [];
  if (m.recurringNet < 0) {
    a.push(`ปิด burn: หารายรับประจำเพิ่ม ${fmtBaht(m.breakEvenGap)}/เดือน (เช่น ลูกค้า subscription/สัญญารายเดือน)`);
    if (m.topExpense) a.push(`ทบทวนรายจ่ายก้อนใหญ่สุด “${m.topExpense.label}” (${fmtBaht(m.topExpense.amount)}) — ตัด/ต่อรองได้ไหม`);
  } else if (m.recurringRevenue > 0) {
    a.push('รักษาการคุ้มทุน — นำกำไรประจำไปลงทุนหาลูกค้าเพิ่ม (reinvest)');
  }
  if (m.revenue > 0 && m.margin < 20) a.push(`ดัน margin: ขึ้นราคา/เพิ่มมูลค่า หรือลดต้นทุนแปรผัน (ตอนนี้ ${m.margin}%)`);
  if (m.revenue === 0) a.push('เป้าหมายแรก: สร้างรายได้จริง 1 รายการ (ดีลแรก) เพื่อเริ่มวัดสุขภาพการเงิน');
  return a.length ? a : ['การเงินสมดุลดี — โฟกัสการเติบโตของรายรับต่อไป'];
}

/** instruction ให้ ai-assist ทำหน้าที่ CFO วิเคราะห์ตัวเลขจริงเหล่านี้ (ห้ามแต่งตัวเลขเพิ่ม) */
export function cfoPrompt(d: AppData): string {
  const m = cfoMetrics(d);
  const industry = d.aiCompany?.industry ?? '';
  const goal = d.aiCompany?.goal ?? '';
  return [
    'ทำหน้าที่ CFO วิเคราะห์สุขภาพการเงินของธุรกิจ SME นี้จาก "ตัวเลขจริง" ด้านล่าง',
    industry ? `ประเภทธุรกิจ: ${industry}` : '',
    goal ? `เป้าหมาย: ${goal}` : '',
    '',
    'ตัวเลขการเงิน (บาท):',
    `- รายได้รวม ${m.revenue} · รายจ่ายรวม ${m.expense} · สุทธิ ${m.net} · margin ${m.margin}%`,
    `- รายรับประจำ/เดือน ${m.recurringRevenue} · รายจ่ายประจำ/เดือน ${m.recurringExpense} · กำไรประจำ/เดือน ${m.recurringNet}`,
    m.breakEvenGap > 0 ? `- ต้องเพิ่มรายรับประจำอีก ${m.breakEvenGap}/เดือน จึงคุ้มทุน` : '- คุ้มทุนระดับรายเดือนแล้ว',
    m.topExpense ? `- รายจ่ายก้อนใหญ่สุด: ${m.topExpense.label} = ${m.topExpense.amount} (${m.topExpense.pct}% ของรายจ่าย)` : '',
    '',
    'ข้อกำหนด:',
    '1. ห้ามแต่งตัวเลขเพิ่มจากที่ให้ · วิเคราะห์เฉพาะจากข้อมูลนี้',
    '2. บอก 3-5 การกระทำที่ทำได้จริง เรียงตามผลกระทบ (เพิ่มรายได้/ลดต้นทุน/ปรับราคา)',
    '3. ระบุ "ตัวเลขเป้าหมายถัดไป" ที่ชัด (เช่น รายรับประจำที่ต้องถึงเพื่อคุ้มทุน)',
    '4. กระชับ เป็นภาษาไทย · ไม่ใช่คำแนะนำการลงทุน',
  ].filter(Boolean).join('\n');
}
