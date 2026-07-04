import type { AppData, Agent, AICompany } from '../types';
import { weekTag } from './segmentation';

/* ===== C-Level ทุกตำแหน่งวิเคราะห์ + รายงานผลต่อ CEO ทุกวันศุกร์ ===== */

const CLEVEL_RE = /c[efmopst]o|chief|ประธาน|ผู้อำนวยการ|หัวหน้า|cxo|cto|cio|cro|chro/i;

/** เอเจนต์ระดับ C-Level (ยกเว้น CEO เอง — CEO เป็นผู้รับรายงาน) */
export function cLevelAgents(c: AICompany): Agent[] {
  const isCeo = (a: Agent) => /ceo|ประธานเจ้าหน้าที่บริหาร/i.test(a.role);
  const cs = (c.agents ?? []).filter(a => CLEVEL_RE.test(a.role) && !isCeo(a));
  // ถ้าไม่พบ C-level ชัดเจน ใช้เอเจนต์ที่รายงานตรงต่อ CEO (ยกเว้น CEO)
  if (cs.length > 0) return cs;
  const ceo = (c.agents ?? []).find(isCeo);
  return (c.agents ?? []).filter(a => a.id !== ceo?.id && (a.reportsTo === ceo?.id || !a.reportsTo));
}

/** ถึงเวลารายงานรอบสัปดาห์ไหม (วันศุกร์เป็นต้นไป และยังไม่ได้ทำสัปดาห์นี้) */
export function shouldRunCLevel(d: AppData, now = new Date()): boolean {
  const friOrLater = now.getDay() === 5 || now.getDay() === 6 || now.getDay() === 0;
  return friOrLater && d.cLevelReports?.weekTag !== weekTag(now);
}

/** คำสั่งให้ C-level แต่ละคนวิเคราะห์งานในความรับผิดชอบ + ประเมินความเสี่ยงจาก Mission + รายงานต่อ CEO */
export function weeklyInstruction(agent: Agent, d: AppData): string {
  const c = d.aiCompany;
  const mission = c?.mission || c?.goal || '-';
  return [
    `ทำหน้าที่ ${agent.role} (${agent.name}) — สรุปผลการดำเนินงานในความรับผิดชอบประจำสัปดาห์ เพื่อรายงานต่อ CEO`,
    `บทบาท/หน้าที่: ${agent.mandate}`,
    `บริษัท: ${c?.name || '-'} · อุตสาหกรรม: ${c?.industry || '-'} · เป้าหมาย: ${c?.goal || '-'}`,
    `Mission บริษัท: ${mission}`,
    '',
    'รายงานให้ครอบคลุม (กระชับ อ่านง่าย ภาษาไทย):',
    '1) ผลงาน/ความคืบหน้าสัปดาห์นี้ในความรับผิดชอบของตำแหน่ง',
    '2) ตัวเลข/ตัวชี้วัดสำคัญ (ถ้ามี)',
    '3) ประเมินความเสี่ยงจาก Mission ที่เกี่ยวกับภารกิจของตำแหน่งนี้ (Risk Assessment):',
    '   ระบุ 2–3 ความเสี่ยง แต่ละข้อให้: หมวด (การเงิน/ปฏิบัติการ/ตลาด/กฎหมาย/ชื่อเสียง/เทคโนโลยี) ·',
    '   คะแนนโอกาสเกิด(1–5) × ผลกระทบ(1–5) = ระดับ (วิกฤต 15–25 / สูง 10–14 / กลาง 5–9 / ต่ำ 1–4) ·',
    '   แนวทางลดความเสี่ยง (ป้องกัน + เตรียมรับมือ) · สัญญาณเตือนล่วงหน้าที่ต้องเฝ้าดู',
    '4) 2–3 ข้อเสนอ/ขั้นตอนถัดไป ที่ขอ CEO ตัดสินใจหรืออนุมัติ',
  ].join('\n');
}
