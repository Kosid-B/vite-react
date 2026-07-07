import type { AppData, PageId } from '../types';
import { DEFAULT_DATA as SEED } from '../data';

/* seed = ข้อมูลตัวอย่างที่ระบบใส่ให้ตอนเริ่ม (demo) — user ใหม่ยังไม่ได้ลงมือ
 * จึงติ๊ก "ทำแล้ว" เฉพาะเมื่อค่า "ต่างจาก seed" (แปลว่าลงมือจริง) ไม่ใช่แค่มีค่า default */
const seedCo = SEED.aiCompany;
const rosterOf = (d: AppData) => d.aiCompany.agents.map(a => a.id).join(',');
const SEED_ROSTER = rosterOf(SEED);
const SEED_DONE_TASKS = seedCo.tasks.filter(t => t.status === 'done').length;

/* ===== Journey Guide — ตัวนำทาง gamification =====
 * นำ User ทีละขั้นจาก "ตั้งค่าใช้งาน" → "พัฒนาธุรกิจ 4 ระยะ" → "เข้าตลาด & หารายได้"
 * แก้ปัญหา UX: ปุ่มเยอะ ไม่รู้เริ่มตรงไหน — Guide ชี้ step ถัดไปให้กดไปทำได้เลย เห็นได้ทุกหน้า
 *
 * การจับว่า "ทำแล้ว":
 *  - ขั้นที่มีข้อมูลจริง (ตั้งเป้า/สร้างทีม/งานเสร็จ ฯลฯ) → เช็กจาก AppData ตรง ๆ
 *  - ขั้นเครื่องมือวิเคราะห์ (Personas/Journey/BMC…) → เช็กว่าเคย "เปิดใช้" หน้านั้นแล้ว (visitedPages)
 */

export interface JourneyStep {
  id: string;
  label: string;
  page: PageId;
  hint: string;
  done: (d: AppData) => boolean;
}
export interface JourneyPhase {
  key: string;
  title: string;
  icon: string;
  steps: JourneyStep[];
}

const visited = (d: AppData, p: PageId) => (d.visitedPages ?? []).includes(p);

export const JOURNEY: JourneyPhase[] = [
  {
    key: 'setup', title: 'ตั้งค่าบริษัท AI', icon: '⚙️',
    steps: [
      { id: 'industry', label: 'เลือกประเภทธุรกิจ', page: 'aicompany',
        hint: 'บอกระบบว่าคุณทำธุรกิจอะไร เพื่อให้ AI แนะนำได้ตรงบริบท',
        done: d => !!d.aiCompany.industry?.trim() && d.aiCompany.industry !== seedCo.industry },
      { id: 'goal', label: 'ตั้งเป้าหมายบริษัท', page: 'aicompany',
        hint: 'กำหนดเป้าหมายที่วัดผลได้ ให้ทีม AI ใช้เป็นทิศทาง',
        done: d => !!d.aiCompany.goal?.trim() && d.aiCompany.goal !== seedCo.goal },
      { id: 'team', label: 'สร้างทีม AI (อย่างน้อย 3 ตำแหน่ง)', page: 'aicompany',
        hint: 'มี CEO + ผู้บริหารในผังองค์กรอย่างน้อย 3 ตำแหน่ง',
        done: d => d.aiCompany.agents.length >= 3 && rosterOf(d) !== SEED_ROSTER },
      { id: 'mission', label: 'อนุมัติ Mission Statement', page: 'aicompany',
        hint: 'ให้ CEO ร่าง Mission แล้วบอร์ด (คุณ) อนุมัติ',
        done: d => d.aiCompany.missionApproved },
    ],
  },
  {
    key: 'understand', title: 'ระยะ 1 · เข้าใจลูกค้า & ตลาด', icon: '🔍',
    steps: [
      { id: 'personas', label: 'สร้าง Personas ลูกค้า', page: 'personas',
        hint: 'รู้ว่าขายใคร — พฤติกรรม แรงจูงใจ และปัญหาของลูกค้า',
        done: d => visited(d, 'personas') },
      { id: 'journey', label: 'วาง Journey Map', page: 'journey',
        hint: 'เส้นทางลูกค้า 8 ขั้น — touchpoints และ pain points',
        done: d => visited(d, 'journey') },
    ],
  },
  {
    key: 'design', title: 'ระยะ 2 · ออกแบบธุรกิจ', icon: '🧩',
    steps: [
      { id: 'bmc', label: 'ทำ Business Model (MIT24)', page: 'bmc',
        hint: 'กรอบสร้างธุรกิจ 24 ขั้น — Beachhead Market ถึง MVBP',
        done: d => visited(d, 'bmc') },
      { id: 'vrio', label: 'วิเคราะห์ VRIO', page: 'vrio',
        hint: 'หาความได้เปรียบเชิงแข่งขัน — Value, Rarity, Imitability, Organization',
        done: d => visited(d, 'vrio') },
    ],
  },
  {
    key: 'market', title: 'ระยะ 3 · วางแผนการตลาด', icon: '📣',
    steps: [
      { id: 'marketing', label: 'วางกลยุทธ์การตลาด', page: 'marketing',
        hint: 'ช่องทาง งบประมาณ และ CPL',
        done: d => visited(d, 'marketing') },
      { id: 'content', label: 'วาง Content Plan', page: 'content',
        hint: 'แผนคอนเทนต์รายเดือนต่อช่องทาง',
        done: d => visited(d, 'content') },
      { id: 'funnel', label: 'ออกแบบ Conversion Funnel', page: 'funnel',
        hint: 'หาจุดที่ lead หลุดมากที่สุด',
        done: d => visited(d, 'funnel') },
    ],
  },
  {
    key: 'execute', title: 'ระยะ 4 · ลงมือ & วัดผล', icon: '🚀',
    steps: [
      { id: 'sipoc', label: 'ทำแผนกระบวนการ SIPOC', page: 'sipoc',
        hint: 'Supplier → Input → Process → Output → Customer หา Gap และคอขวด',
        done: d => visited(d, 'sipoc') },
      { id: 'action', label: 'ทำ Priority Action ข้อแรกให้เสร็จ', page: 'actions',
        hint: 'ลงมือทำแผนงานสำคัญข้อแรกและติ๊กเสร็จ',
        done: d => d.actions.some(a => a.done) },
      { id: 'roi', label: 'คำนวณ ROI', page: 'roi',
        hint: 'วัดผลตอบแทนการลงทุน เทียบต้นทุน–รายได้',
        done: d => visited(d, 'roi') },
      { id: 'roadmap', label: 'วาง Product Roadmap', page: 'roadmap',
        hint: 'แผนพัฒนาผลิตภัณฑ์รายไตรมาส',
        done: d => visited(d, 'roadmap') },
    ],
  },
  {
    key: 'revenue', title: 'ระยะ 5 · เข้าตลาด & หารายได้', icon: '💰',
    steps: [
      { id: 'firstTask', label: 'ให้ทีม AI ทำงานเสร็จชิ้นแรก', page: 'aicompany',
        hint: 'เริ่มให้ทีม AI ทำงาน แล้วรอผลงานชิ้นแรกเสร็จ',
        done: d => d.aiCompany.tasks.filter(t => t.status === 'done').length > SEED_DONE_TASKS },
      { id: 'storefront', label: 'เปิดหน้าร้าน & เข้าตลาดธุรกิจ', page: 'storefront',
        hint: 'ให้ร้านคุณขึ้นตลาด /b เพื่อให้ลูกค้าและคู่ค้าค้นเจอ',
        done: d => !!d.visitedMarket },
      { id: 'skill', label: 'ซื้อ Skill แรกจาก Marketplace', page: 'aicompany',
        hint: 'ปลดล็อกความสามารถให้ทีมเอเจนต์ พร้อมรับ XP',
        done: d => (d.aiCompany.purchasedSkills ?? []).length >= 1 },
      { id: 'upgrade', label: 'ปลดล็อก Growth (AI Research, Analytics)', page: 'billing',
        hint: 'อัปเกรดแพ็กเกจเพื่อใช้ AI Research, Market และ Analytics เต็มรูปแบบ',
        done: d => d.subscription.plan === 'growth' || d.subscription.plan === 'scale' },
    ],
  },
];

export function journeySteps(): JourneyStep[] {
  return JOURNEY.flatMap(p => p.steps);
}

export function journeyProgress(d: AppData): { done: number; total: number; pct: number } {
  const all = journeySteps();
  const done = all.filter(s => s.done(d)).length;
  return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
}

/** step ถัดไปที่ยังไม่ทำ (ตัวที่ Guide จะชี้ให้ทำก่อน) */
export function nextStep(d: AppData): JourneyStep | null {
  return journeySteps().find(s => !s.done(d)) ?? null;
}

/** phase ปัจจุบัน (phase แรกที่ยังมี step ค้าง) */
export function currentPhase(d: AppData): JourneyPhase | null {
  return JOURNEY.find(p => p.steps.some(s => !s.done(d))) ?? null;
}
