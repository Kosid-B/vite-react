import type { AppData, PageId } from '../types';
import { canAccess } from './access';

/* ===== Gamification — ระดับบริษัท, Quest ตั้งต้น, Badges =====
 * XP มาจากความคืบหน้าธุรกิจจริงเท่านั้น (ซื้อ Skill, งานเสร็จ, Priority Action ฯลฯ)
 * ไม่ให้แต้มกับการคลิกที่ไม่สะท้อนความคืบหน้า */

export const COMPANY_LEVELS = [
  { min: 0,     max: 999,      rank: 'Starter',      badge: '🌱', color: '#374151', desc: 'เพิ่งเริ่มต้น — ทำ Quest ตั้งต้นเพื่อสะสม XP' },
  { min: 1000,  max: 2999,     rank: 'Growing',      badge: '🌿', color: '#2d6a4f', desc: 'กำลังเติบโต — ทีม AI มีทักษะพื้นฐานครบ' },
  { min: 3000,  max: 5999,     rank: 'Professional', badge: '⭐', color: '#1a4f8a', desc: 'มืออาชีพ — ใช้ข้อมูลขับเคลื่อนการตัดสินใจ' },
  { min: 6000,  max: 9999,     rank: 'Advanced',     badge: '🏆', color: '#a05c1a', desc: 'ขั้นสูง — ทีม AI มีความสามารถรอบด้าน' },
  { min: 10000, max: Infinity, rank: 'Elite',        badge: '👑', color: '#c44b2b', desc: 'Elite — องค์กร AI ที่แข็งแกร่งระดับสูงสุด' },
];

export const XP_PER_TIER: Record<1 | 2 | 3, number> = { 1: 100, 2: 150, 3: 200 };

export function getCompanyLevel(xp: number) {
  return COMPANY_LEVELS.find(l => xp >= l.min && xp <= l.max) ?? COMPANY_LEVELS[0];
}

/* ----- XP รวมของบริษัท: skillXP + XP จากกิจกรรมจริง (คำนวณสด ไม่เก็บซ้ำ) ----- */
export const ACTIVITY_XP = {
  taskDone: 20,        // งานเอเจนต์เสร็จ 1 ชิ้น
  actionDone: 15,      // Priority Action เสร็จ 1 ข้อ
  agentHired: 10,      // เอเจนต์ในผังองค์กร 1 ตำแหน่ง
  toolAssigned: 10,    // เครื่องมือมี C-level ดูแล 1 ตัว
  missionApproved: 100,
  questBonus: 50,      // โบนัสต่อ Quest ที่สำเร็จ
};

export function companyXP(data: AppData): number {
  const c = data.aiCompany;
  const tasksDone = c.tasks.filter(t => t.status === 'done').length;
  const actionsDone = data.actions.filter(a => a.done).length;
  const toolsAssigned = Object.entries(c.toolOwners ?? {})
    .filter(([, agentId]) => c.agents.some(a => a.id === agentId)).length;
  const questsDone = QUESTS.filter(q => q.done(data)).length;
  return (c.skillXP ?? 0)
    + tasksDone * ACTIVITY_XP.taskDone
    + actionsDone * ACTIVITY_XP.actionDone
    + c.agents.length * ACTIVITY_XP.agentHired
    + toolsAssigned * ACTIVITY_XP.toolAssigned
    + (c.missionApproved ? ACTIVITY_XP.missionApproved : 0)
    + questsDone * ACTIVITY_XP.questBonus;
}

/* ----- Setup Quest — ภารกิจตั้งต้นให้บริษัทพร้อมใช้งานเต็มระบบ ----- */
export interface Quest {
  id: string;
  icon: string;
  label: string;
  desc: string;
  page: PageId;          // คลิกแล้วพาไปหน้าที่ทำภารกิจได้
  done: (d: AppData) => boolean;
}

export const QUESTS: Quest[] = [
  {
    id: 'industry', icon: '🏷️', label: 'เลือกประเภทธุรกิจ (DBD)', page: 'aicompany',
    desc: 'บอกระบบว่าบริษัทคุณทำธุรกิจอะไร เพื่อให้ AI แนะนำได้ตรงบริบท',
    done: d => !!d.aiCompany.industry?.trim(),
  },
  {
    id: 'goal', icon: '🎯', label: 'ตั้งเป้าหมายหลักของบริษัท', page: 'aicompany',
    desc: 'กำหนดเป้าหมายที่วัดผลได้ ให้ทีม AI ใช้เป็นทิศทางการทำงาน',
    done: d => !!d.aiCompany.goal?.trim(),
  },
  {
    id: 'team', icon: '👥', label: 'สร้างทีมผู้บริหาร (อย่างน้อย 3 ตำแหน่ง)', page: 'aicompany',
    desc: 'มี CEO และผู้บริหารในผังองค์กรอย่างน้อย 3 ตำแหน่ง',
    done: d => d.aiCompany.agents.length >= 3,
  },
  {
    id: 'tools', icon: '🧰', label: 'ให้ CEO จัด C-level ดูแลเครื่องมือครบ 10 ตัว', page: 'aicompany',
    desc: 'กดปุ่ม "ให้ CEO จัดผู้รับผิดชอบ" ใน section เครื่องมือ & ผู้รับผิดชอบ',
    done: d => Object.entries(d.aiCompany.toolOwners ?? {})
      .filter(([, id]) => d.aiCompany.agents.some(a => a.id === id)).length >= 10,
  },
  {
    id: 'skill', icon: '🛒', label: 'ซื้อ Skill แรกจาก Marketplace', page: 'aicompany',
    desc: 'ปลดล็อกความสามารถให้ทีมเอเจนต์ พร้อมรับ XP',
    done: d => (d.aiCompany.purchasedSkills ?? []).length >= 1,
  },
  {
    id: 'mission', icon: '🧭', label: 'อนุมัติ Mission Statement', page: 'aicompany',
    desc: 'ให้ CEO ร่าง Mission แล้วบอร์ด (คุณ) อนุมัติ',
    done: d => d.aiCompany.missionApproved,
  },
  {
    id: 'firstTask', icon: '⚡', label: 'ให้ทีม AI ทำงานเสร็จชิ้นแรก', page: 'aicompany',
    desc: 'เริ่มให้ทีม AI ทำงาน แล้วรอผลงานชิ้นแรกเสร็จ',
    done: d => d.aiCompany.tasks.some(t => t.status === 'done'),
  },
  {
    id: 'action', icon: '✅', label: 'ทำ Priority Action แรกให้เสร็จ', page: 'actions',
    desc: 'ลงมือทำแผนงานสำคัญข้อแรกและติ๊กเสร็จ',
    done: d => d.actions.some(a => a.done),
  },
  {
    id: 'upgrade', icon: '🚀', label: 'ปลดล็อกฟีเจอร์ Growth (AI Research, Analytics)', page: 'billing',
    desc: 'อัปเกรดแพ็กเกจเพื่อใช้ AI Research, Market และ Analytics เต็มรูปแบบ',
    done: d => canAccess(d, 'aisearch'),
  },
];

/* ----- Achievement Badges — คำนวณจากผลงานจริง ----- */
export interface Achievement {
  id: string;
  icon: string;
  label: string;
  desc: string;
  earned: (d: AppData) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-hire', icon: '🤝', label: 'First Hire',
    desc: 'มีเอเจนต์ตัวแรกในผังองค์กร',
    earned: d => d.aiCompany.agents.length >= 1,
  },
  {
    id: 'c-suite', icon: '🏛️', label: 'Full C-Suite',
    desc: 'มีผู้บริหารระดับ C-level ครบ 5 สาย (CEO/CMO/CFO/COO + อีก 1)',
    earned: d => d.aiCompany.agents.length >= 5,
  },
  {
    id: 'tool-master', icon: '🧰', label: 'Tool Master',
    desc: 'เครื่องมือทั้ง 10 ตัวมี C-level ดูแลครบ',
    earned: d => Object.entries(d.aiCompany.toolOwners ?? {})
      .filter(([, id]) => d.aiCompany.agents.some(a => a.id === id)).length >= 10,
  },
  {
    id: 'ten-tasks', icon: '⚙️', label: 'Machine at Work',
    desc: 'ทีม AI ทำงานเสร็จ 10 ชิ้น',
    earned: d => d.aiCompany.tasks.filter(t => t.status === 'done').length >= 10,
  },
  {
    id: 'skill-collector', icon: '📚', label: 'Skill Collector',
    desc: 'สะสม Skill ครบ 5 ตัว',
    earned: d => (d.aiCompany.purchasedSkills ?? []).length >= 5,
  },
  {
    id: 'mission-ready', icon: '🧭', label: 'Mission Ready',
    desc: 'Mission Statement ผ่านการอนุมัติจากบอร์ด',
    earned: d => d.aiCompany.missionApproved,
  },
  {
    id: 'executor', icon: '✅', label: 'Executor',
    desc: 'ทำ Priority Actions เสร็จครบทุกข้อ',
    earned: d => d.actions.length > 0 && d.actions.every(a => a.done),
  },
  {
    id: 'iso-ready', icon: '🛡️', label: 'ISO Ready',
    desc: 'เริ่มทำระบบคุณภาพ ISO 9001:2015',
    earned: d => !!d.iso9001,
  },
];
