import type { AppData } from '../types';
import { DEFAULT_DATA as SEED } from '../data';
import { DBD_SECTORS } from '../data/dbd';

/* ===== Setup Wizard อัจฉริยะ — ตรรกะบริสุทธิ์ (ทดสอบได้) =====
 * ปลุกผู้ใช้ใหม่ให้ "ตั้งค่าบริษัทเสร็จ" (activation) ตั้งแต่ครั้งแรก:
 * เก็บ industry + goal อินไลน์ + ชี้ไปสร้างทีม — ไม่ปล่อยให้เคว้งหน้าเปล่า
 * ปรับตามสถานะจริง (adaptive): ข้ามขั้นที่ทำแล้ว, กลับมาทำต่อจากจุดที่ค้าง */

const seedCo = SEED.aiCompany;
const rosterKey = (agents: { id: string }[]) => agents.map(a => a.id).join(',');
const SEED_ROSTER = rosterKey(seedCo.agents);

/** ตัวเลือกประเภทธุรกิจ (หมวดใหญ่ตาม DBD) */
export const INDUSTRY_OPTIONS: string[] = DBD_SECTORS.map(s => s.label);

/** ความยาวเป้าหมายขั้นต่ำ กันการกรอกลวก ๆ */
export const GOAL_MIN_LEN = 8;

/* ---- ตัวชี้วัดว่าแต่ละขั้น "เสร็จ" หรือยัง (ตรงกับ lib/journey.ts เพื่อความสอดคล้อง) ---- */
export function industryDone(d: AppData): boolean {
  const v = d.aiCompany.industry?.trim();
  return !!v && v !== seedCo.industry;
}
export function goalDone(d: AppData): boolean {
  const v = d.aiCompany.goal?.trim();
  return !!v && v !== seedCo.goal;
}
export function teamDone(d: AppData): boolean {
  return d.aiCompany.agents.length >= 3 && rosterKey(d.aiCompany.agents) !== SEED_ROSTER;
}

export type SetupStepId = 'industry' | 'goal' | 'team';
export type SetupStepKind = 'input-select' | 'input-text' | 'nav';

export interface SetupStepDef {
  id: SetupStepId;
  kind: SetupStepKind;
  label: string;
  hint: string;
  done: (d: AppData) => boolean;
}

export const SETUP_STEPS: SetupStepDef[] = [
  {
    id: 'industry', kind: 'input-select', label: 'เลือกประเภทธุรกิจ',
    hint: 'บอกระบบว่าคุณสนใจทำธุรกิจด้านไหน เพื่อให้ทีม AI แนะนำได้ตรงบริบท',
    done: industryDone,
  },
  {
    id: 'goal', kind: 'input-text', label: 'ตั้งเป้าหมายบริษัท',
    hint: 'เป้าหมายที่วัดผลได้ เช่น "ยอดขาย ฿100,000/เดือน ภายใน 90 วัน"',
    done: goalDone,
  },
  {
    id: 'team', kind: 'nav', label: 'สร้างทีม AI (อย่างน้อย 3 ตำแหน่ง)',
    hint: 'ไปหน้า "บริษัท AI" เพื่อจ้างทีม แล้วมอบหมายงานจริง',
    done: teamDone,
  },
];

/** ความคืบหน้าการตั้งค่า (0–100%) */
export function setupProgress(d: AppData): { done: number; total: number; pct: number } {
  const total = SETUP_STEPS.length;
  const done = SETUP_STEPS.filter(s => s.done(d)).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** ขั้นแรกที่ยังไม่เสร็จ (ไว้ resume) — null = เสร็จครบ */
export function firstIncompleteStep(d: AppData): SetupStepDef | null {
  return SETUP_STEPS.find(s => !s.done(d)) ?? null;
}

/** ขั้นที่ผู้ใช้กรอกอินไลน์ได้และยังไม่เสร็จ (ให้ wizard แสดงเฉพาะที่ยังต้องทำ) */
export function pendingInputSteps(d: AppData): SetupStepDef[] {
  return SETUP_STEPS.filter(s => s.kind !== 'nav' && !s.done(d));
}

export function isSetupComplete(d: AppData): boolean {
  return SETUP_STEPS.every(s => s.done(d));
}

/* ---- reducers (immutable) — เขียนค่าที่ผู้ใช้กรอกเข้า AppData ---- */

/** ตั้งประเภทธุรกิจ */
export function applyIndustry(d: AppData, value: string): AppData {
  return { ...d, aiCompany: { ...d.aiCompany, industry: value.trim() } };
}

/** ตั้งเป้าหมายบริษัท (แตะเฉพาะ goal — ไม่ยุ่งกับ mission/approval flow) */
export function applyGoal(d: AppData, value: string): AppData {
  return { ...d, aiCompany: { ...d.aiCompany, goal: value.trim() } };
}

/** ค่าที่ควรใช้เป็นค่าเริ่มต้นในช่องกรอก (ไม่โชว์ค่า seed ตัวอย่าง) */
export function initialFieldValue(d: AppData, id: SetupStepId): string {
  if (id === 'industry') return industryDone(d) ? d.aiCompany.industry : '';
  if (id === 'goal') return goalDone(d) ? d.aiCompany.goal : '';
  return '';
}
