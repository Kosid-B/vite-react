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

/** map คำที่ผู้ใช้พิมพ์ (เช่นบนหน้า Landing) → หมวด DBD ที่ตรงที่สุด
 *  ครอบคลุมธุรกิจ SME ไทยที่พบบ่อย · label ต้องตรงกับ INDUSTRY_OPTIONS เป๊ะ (ให้ select preselect ได้) */
const INDUSTRY_HINTS: { label: string; kw: string[] }[] = [
  { label: 'ที่พักแรมและบริการด้านอาหาร', kw: ['กาแฟ', 'คาเฟ่', 'คาเฟ', 'ร้านอาหาร', 'อาหาร', 'เครื่องดื่ม', 'ชานม', 'เบเกอรี', 'ขนม', 'ก๋วยเตี๋ยว', 'ครัว', 'ภัตตาคาร', 'สตรีทฟู้ด', 'โรงแรม', 'ที่พัก', 'รีสอร์ท', 'รีสอร์', 'โฮมสเตย์', 'เกสต์เฮ้าส์'] },
  { label: 'การผลิต (Manufacturing)', kw: ['ผลิต', 'โรงงาน', 'แปรรูป', 'ผลิตภัณฑ์', 'otop', 'โอทอป', 'ตัดเย็บ', 'งานฝีมือ', 'เฟอร์นิเจอร์'] },
  { label: 'การขนส่งและสถานที่เก็บสินค้า', kw: ['ขนส่ง', 'โลจิสติกส์', 'โลจิสติก', 'เดลิเวอรี', 'ส่งของ', 'ส่งพัสดุ', 'คลังสินค้า', 'ขนย้าย', 'รถรับจ้าง'] },
  { label: 'การก่อสร้าง', kw: ['ก่อสร้าง', 'รับเหมา', 'ต่อเติม', 'รีโนเวท', 'ตกแต่งภายใน', 'ผู้รับเหมา'] },
  { label: 'เกษตรกรรม การป่าไม้ และการประมง', kw: ['เกษตร', 'ฟาร์ม', 'ปลูก', 'เลี้ยง', 'สวน', 'ไร่', 'ประมง', 'ปศุสัตว์', 'เพาะ'] },
  { label: 'ข้อมูลข่าวสารและการสื่อสาร', kw: ['ซอฟต์แวร์', 'software', 'แอป', 'application', 'ไอที', ' it', 'เว็บ', 'website', 'โปรแกรม', 'เขียนโค้ด', 'สื่อ', 'มีเดีย', 'คอนเทนต์', 'content', 'เพจ', 'ยูทูป'] },
  { label: 'กิจกรรมทางการเงินและการประกันภัย', kw: ['การเงิน', 'ประกัน', 'สินเชื่อ', 'ลงทุน', 'กองทุน', 'แลกเปลี่ยน'] },
  { label: 'กิจกรรมอสังหาริมทรัพย์', kw: ['อสังหา', 'คอนโด', 'ที่ดิน', 'ให้เช่า', 'นายหน้า', 'หอพัก', 'อพาร์ทเมนต์'] },
  { label: 'กิจกรรมด้านสุขภาพและงานสังคมสงเคราะห์', kw: ['คลินิก', 'สุขภาพ', 'พยาบาล', 'แพทย์', 'หมอ', 'ดูแลผู้สูงอายุ', 'กายภาพ', 'เภสัช'] },
  { label: 'การศึกษา', kw: ['โรงเรียน', 'สอน', 'ติว', 'คอร์ส', 'อบรม', 'การศึกษา', 'สถาบัน', 'เรียน'] },
  { label: 'ศิลปะ ความบันเทิง และนันทนาการ', kw: ['ท่องเที่ยว', 'ทัวร์', 'อีเวนต์', 'จัดงาน', 'บันเทิง', 'ยิม', 'ฟิตเนส', 'กีฬา', 'ดนตรี', 'ถ่ายภาพ'] },
  { label: 'กิจกรรมวิชาชีพ วิทยาศาสตร์ และเทคนิค', kw: ['บัญชี', 'ที่ปรึกษา', 'กฎหมาย', 'ทนาย', 'ออกแบบ', 'สถาปนิก', 'วิศวกร', 'วิจัย', 'การตลาด', 'โฆษณา', 'ดีไซน์'] },
  { label: 'กิจกรรมการบริหารและบริการสนับสนุน', kw: ['ทำความสะอาด', 'แม่บ้าน', 'รักษาความปลอดภัย', 'รปภ', 'จัดหางาน', 'เอาต์ซอร์ส'] },
  { label: 'กิจกรรมการบริการอื่นๆ', kw: ['สปา', 'นวด', 'เสริมสวย', 'ความงาม', 'ตัดผม', 'ซาลอน', 'เล็บ', 'สัก', 'ซักรีด', 'ซ่อม'] },
  // ทั่วไป "ค้าขาย" ไว้ท้าย ๆ (กว้าง) — จับหลังหมวดเฉพาะ
  { label: 'การขายส่งและขายปลีก การซ่อมยานยนต์', kw: ['ขายของ', 'ร้านค้า', 'ขายปลีก', 'ขายส่ง', 'ค้าขาย', 'สะดวกซื้อ', 'มินิมาร์ท', 'เสื้อผ้า', 'ออนไลน์', 'อีคอมเมิร์ซ', 'ร้านขาย', 'ขาย', 'ยานยนต์', 'อู่', 'อะไหล่'] },
];

export function matchIndustry(hint: string | null | undefined): string {
  const h = (hint ?? '').trim().toLowerCase();
  if (!h) return '';
  for (const { label, kw } of INDUSTRY_HINTS) {
    if (kw.some(k => h.includes(k.toLowerCase()))) return label;
  }
  return '';
}

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
/** ตั้งชื่อบริษัทเอง (ต่างจาก demo seed) */
export function nameDone(d: AppData): boolean {
  const v = d.aiCompany.name?.trim();
  return !!v && v !== seedCo.name;
}
/** activation จริง = ผู้ใช้ "ปรับบริษัทให้ต่างจาก demo seed" อย่างน้อย 1 อย่าง (ชื่อ/ประเภท/เป้าหมาย/ทีม)
 *  ⚠️ ห้ามวัดแค่ "มีชื่อ/มีเอเจนต์" — seed ใส่ค่าพวกนั้นมาให้แล้ว จะทำให้ทุก ws ดู activated 100% (วัดผิด) */
export function isRealActivation(d: AppData | null): boolean {
  if (!d) return false;
  return nameDone(d) || industryDone(d) || goalDone(d) || teamDone(d);
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
