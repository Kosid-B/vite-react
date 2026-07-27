/** ตรวจว่าข้อมูลแต่ละส่วน "ยังเป็นตัวอย่าง (demo seed)" หรือผู้ใช้ปรับเป็นของตัวเองแล้ว
 *  ใช้โชว์ป้าย "ข้อมูลตัวอย่าง — แทนที่ด้วยของคุณ" (#3 PLG · ลดสับสน real vs demo) — pure, ทดสอบได้
 *  หลักการเดียวกับ src/lib/journey.ts (เทียบกับ SEED = DEFAULT_DATA) */
import { DEFAULT_DATA as SEED } from '../data';
import type { AppData } from '../types';

const roster = (d: AppData) => (d.aiCompany?.agents ?? []).map(a => a.id).join(',');
const personaSig = (list: AppData['personas']) => (list ?? []).map(p => p.name).join('|');

/** บริษัทยังเป็นข้อมูลตัวอย่าง = industry + goal ยังตรง seed (ผู้ใช้ยังไม่ปรับให้เป็นธุรกิจตัวเอง) */
export function isDemoCompany(d: AppData): boolean {
  return d.aiCompany?.industry === SEED.aiCompany.industry
    && d.aiCompany?.goal === SEED.aiCompany.goal;
}

/** ทีม AI (roster) ยังเป็น demo = ชุดเอเจนต์ยังตรง seed */
export function isDemoRoster(d: AppData): boolean {
  return roster(d) === roster(SEED);
}

/** personas ยังเป็น demo = รายชื่อยังตรง seed */
export function isDemoPersonas(d: AppData): boolean {
  return personaSig(d.personas) === personaSig(SEED.personas);
}
