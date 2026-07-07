import type { AppData, PageId } from '../types';
import { DEFAULT_DATA as SEED } from '../data';

/* ===== Journey Guide — เส้นทางสร้างธุรกิจตาม MIT 24 Steps (Disciplined Entrepreneurship) =====
 * จุดต่างจากแพลตฟอร์มอื่น: คนไทยมักถูกสอนให้ "สร้างสินค้าก่อน" แล้วค่อยหาลูกค้า → ขายไม่ออก
 * ที่นี่บังคับลำดับแบบ MIT: "รู้จักลูกค้าก่อน" (Phase 1) แล้วจึงออกแบบคุณค่า/สินค้า
 * นำ User มือใหม่ทีละขั้น เห็นได้ทุกหน้า ชี้ step ถัดไปให้กดไปทำได้เลย
 *
 * การจับว่า "ทำแล้ว":
 *  - ขั้นตั้งค่า/รายได้ที่มีข้อมูลจริง → เช็กจาก AppData และต้อง "ต่างจาก seed/demo" (user ลงมือเอง)
 *  - ขั้น MIT 24 Steps → เช็กจาก businessModel.de24 (ติ๊กจริงในหน้า Business Model · MIT24)
 *  - ขั้นเครื่องมือวิเคราะห์ → เช็กว่าเคยเปิดใช้หน้านั้น (visitedPages)
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

/* seed = ข้อมูลตัวอย่าง (demo) — user ใหม่ยังไม่ได้ลงมือ จึงติ๊ก done เฉพาะเมื่อค่า "ต่างจาก seed" */
const seedCo = SEED.aiCompany;
const rosterOf = (d: AppData) => d.aiCompany.agents.map(a => a.id).join(',');
const SEED_ROSTER = rosterOf(SEED);
const SEED_DONE_TASKS = seedCo.tasks.filter(t => t.status === 'done').length;

/* MIT 24 Steps — 4 ระยะ (index ใน businessModel.de24): ต้องติ๊กครบทุกขั้นในระยะจึงนับว่า "จบระยะ" */
const de24PhaseDone = (d: AppData, from: number, to: number) => {
  const arr = d.businessModel?.de24 ?? [];
  const slice = arr.slice(from, to + 1);
  return slice.length === to - from + 1 && slice.every(s => s?.done);
};

export const JOURNEY: JourneyPhase[] = [
  {
    key: 'setup', title: 'เริ่มต้น · ตั้งค่าบริษัท AI', icon: '⚙️',
    steps: [
      { id: 'industry', label: 'เลือกประเภทธุรกิจ', page: 'aicompany',
        hint: 'บอกระบบว่าคุณสนใจทำธุรกิจด้านไหน เพื่อให้ AI แนะนำได้ตรงบริบท',
        done: d => !!d.aiCompany.industry?.trim() && d.aiCompany.industry !== seedCo.industry },
      { id: 'goal', label: 'ตั้งเป้าหมายบริษัท', page: 'aicompany',
        hint: 'กำหนดเป้าหมายที่วัดผลได้ ให้ทีม AI ใช้เป็นทิศทาง',
        done: d => !!d.aiCompany.goal?.trim() && d.aiCompany.goal !== seedCo.goal },
      { id: 'team', label: 'สร้างทีม AI (อย่างน้อย 3 ตำแหน่ง)', page: 'aicompany',
        hint: 'มี CEO + ผู้บริหารในผังองค์กรอย่างน้อย 3 ตำแหน่ง',
        done: d => d.aiCompany.agents.length >= 3 && rosterOf(d) !== SEED_ROSTER },
    ],
  },
  {
    key: 'customer', title: 'บทที่ 1 · รู้จักลูกค้าก่อน (MIT ขั้น 1–6)', icon: '🔍',
    steps: [
      { id: 'personas', label: 'สร้าง Persona ลูกค้าตัวจริง', page: 'personas',
        hint: 'เริ่มจาก "ใครคือลูกค้า" — เพศ อายุ รายได้ แรงผลักดัน ความกลัว (ก่อนคิดเรื่องสินค้า!)',
        done: d => (d.visitedPages ?? []).includes('personas') },
      { id: 'journey', label: 'เขียนวงจรการใช้ผลิตภัณฑ์ (Journey Map)', page: 'journey',
        hint: 'ลูกค้าค้นพบ→ประเมิน→ซื้อ→ใช้→จ่ายเงินอย่างไร',
        done: d => (d.visitedPages ?? []).includes('journey') },
      { id: 'mit_customer', label: 'ทำ MIT 24 Steps ระยะ 1: ลูกค้าคือใคร', page: 'bmc',
        hint: 'ขั้น 1–6: แบ่งตลาด → เลือกตลาดหัวหาด → TAM → Persona → Use Case (ติ๊กครบในหน้า Business Model)',
        done: d => de24PhaseDone(d, 0, 5) },
    ],
  },
  {
    key: 'value', title: 'บทที่ 2 · สร้างคุณค่าที่ลูกค้ายอมจ่าย (MIT ขั้น 7–11)', icon: '💎',
    steps: [
      { id: 'mit_value', label: 'ทำ MIT 24 Steps ระยะ 2: คุณค่าที่นำเสนอ', page: 'bmc',
        hint: 'ขั้น 7–11: ร่างภาพสินค้า → แปลงคุณค่าเป็นตัวเลข → ลูกค้า 10 คนถัดไป → แก่นธุรกิจ → ตำแหน่งแข่งขัน',
        done: d => de24PhaseDone(d, 6, 10) },
      { id: 'vrio', label: 'วิเคราะห์ความได้เปรียบ (VRIO)', page: 'vrio',
        hint: 'ยืนยันว่าคุณค่าของคุณคู่แข่งลอกยาก — Value, Rarity, Imitability, Organization',
        done: d => (d.visitedPages ?? []).includes('vrio') },
    ],
  },
  {
    key: 'sales', title: 'บทที่ 3 · วางการตลาด & รายได้ (MIT ขั้น 12–19)', icon: '📣',
    steps: [
      { id: 'mit_sales', label: 'ทำ MIT 24 Steps ระยะ 3: ขาย & รายได้', page: 'bmc',
        hint: 'ขั้น 12–19: DMU → กระบวนการหาลูกค้า → โมเดลธุรกิจ → ราคา → LTV → กระบวนการขาย → COCA',
        done: d => de24PhaseDone(d, 11, 18) },
      { id: 'marketing', label: 'วางกลยุทธ์การตลาด', page: 'marketing',
        hint: 'ช่องทาง งบประมาณ และ CPL — จากลูกค้าที่รู้จักแล้ว',
        done: d => (d.visitedPages ?? []).includes('marketing') },
      { id: 'content', label: 'วาง Content Plan', page: 'content',
        hint: 'แผนคอนเทนต์รายเดือนต่อช่องทาง',
        done: d => (d.visitedPages ?? []).includes('content') },
      { id: 'funnel', label: 'ออกแบบ Conversion Funnel', page: 'funnel',
        hint: 'หาจุดที่ lead หลุดมากที่สุด',
        done: d => (d.visitedPages ?? []).includes('funnel') },
    ],
  },
  {
    key: 'scale', title: 'บทที่ 4 · ทดสอบ & ขยายธุรกิจ (MIT ขั้น 20–24)', icon: '🚀',
    steps: [
      { id: 'mit_scale', label: 'ทำ MIT 24 Steps ระยะ 4: ทดสอบ & ขยาย', page: 'bmc',
        hint: 'ขั้น 20–24: ระบุ/ทดสอบสมมติฐาน → MVBP → พิสูจน์ว่าลูกค้าจะซื้อ → แผนพัฒนาผลิตภัณฑ์',
        done: d => de24PhaseDone(d, 19, 23) },
      { id: 'sipoc', label: 'ทำแผนกระบวนการ SIPOC', page: 'sipoc',
        hint: 'Supplier → Input → Process → Output → Customer หา Gap และคอขวด',
        done: d => (d.visitedPages ?? []).includes('sipoc') },
      { id: 'action', label: 'ทำ Priority Action ข้อแรกให้เสร็จ', page: 'actions',
        hint: 'ลงมือทำแผนงานสำคัญข้อแรกและติ๊กเสร็จ',
        done: d => d.actions.some(a => a.done) },
      { id: 'roi', label: 'คำนวณ ROI', page: 'roi',
        hint: 'วัดผลตอบแทนการลงทุน เทียบต้นทุน–รายได้',
        done: d => (d.visitedPages ?? []).includes('roi') },
      { id: 'roadmap', label: 'วาง Product Roadmap', page: 'roadmap',
        hint: 'แผนพัฒนาผลิตภัณฑ์รายไตรมาส',
        done: d => (d.visitedPages ?? []).includes('roadmap') },
    ],
  },
  {
    key: 'revenue', title: 'บทที่ 5 · ออกสู่ตลาด & หารายได้', icon: '💰',
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
