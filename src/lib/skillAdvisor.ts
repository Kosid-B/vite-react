import type { AppData } from '../types';
import type { SkillEntry, SkillCategory } from '../data/skillCatalog';

/* ===== Agentic Skill Advisor — CEO ของ User เลือก Skill พัฒนาธุรกิจให้เอง =====
 * วิเคราะห์ช่องว่างธุรกิจจริง (จากกลยุทธ์/ข้อมูลบริษัท) → เลือก Skill ที่ควรพัฒนาก่อน
 * rule-based (ไม่เปลือง AI call) · เชื่อมกับ Marketplace = VRIO agentic ที่ลอกทั้งระบบยาก */

export interface SkillRec {
  skill: SkillEntry;
  reason: string;                 // เหตุผลที่ CEO เลือก (ผูกกับกลยุทธ์)
  priority: 'high' | 'medium';
  tiedTo: string;                 // ด้านกลยุทธ์ที่เสริม
}

interface Gap { cat: SkillCategory; w: number; reason: string; tied: string; }

export function recommendSkills(d: AppData, catalog: SkillEntry[], limit = 4): SkillRec[] {
  const c = d.aiCompany;
  const owned = new Set(c.purchasedSkills ?? []);
  const contentMonths = d.contentPlan?.length ?? 0;
  const isoOn = !!d.iso9001?.enabled;
  const industrial = /อุตสาหกรรม|ผลิต|โรงงาน|manufact|วิศวกรรม/i.test(`${c.industry ?? ''} ${c.productDbd ?? ''}`);
  const doneTasks = c.tasks.filter(t => t.status === 'done').length;

  // ช่องว่างธุรกิจ → น้ำหนักต่อหมวด Skill
  const gaps: Gap[] = [
    ...(!c.goal?.trim() || !c.productDesc?.trim()
      ? [{ cat: 'strategy' as const, w: 5, reason: 'ยังไม่มีเป้าหมาย/ผลิตภัณฑ์ที่ชัด — วางกลยุทธ์ให้ธุรกิจก่อนเร่งโต', tied: 'วางรากฐานกลยุทธ์' }]
      : [{ cat: 'strategy' as const, w: 2.5, reason: 'ต่อยอดกลยุทธ์ให้คมขึ้น (โมเดลธุรกิจ/ความได้เปรียบ)', tied: 'กลยุทธ์' }]),
    ...(contentMonths < 2
      ? [{ cat: 'marketing' as const, w: 4.2, reason: 'แผนการตลาด/คอนเทนต์ยังน้อย — ต้องดึงลูกค้าเข้าให้สม่ำเสมอ', tied: 'หาลูกค้า' }]
      : [{ cat: 'marketing' as const, w: 2.8, reason: 'เพิ่มประสิทธิภาพการตลาด ลด CAC', tied: 'หาลูกค้า' }]),
    { cat: 'sales', w: 3.6, reason: 'เสริมทักษะปิดการขาย/ตั้งราคา เปลี่ยน lead เป็นรายได้จริง', tied: 'เพิ่มรายได้' },
    { cat: 'analytics', w: doneTasks > 5 ? 3.6 : 2.6, reason: 'ใช้ข้อมูลตัดสินใจ วัดผล และหาโอกาสโต', tied: 'ตัดสินใจด้วยข้อมูล' },
    ...(industrial && !isoOn
      ? [{ cat: 'technology' as const, w: 4, reason: 'ธุรกิจสายผลิต/อุตสาหกรรม — ต้องมีระบบ & มาตรฐาน (ISO/TIS) รองรับ', tied: 'มาตรฐาน & ระบบ' }]
      : [{ cat: 'technology' as const, w: 2.2, reason: 'วางระบบ/ออโตเมชันให้ธุรกิจสเกลได้', tied: 'ระบบ & ออโตเมชัน' }]),
    { cat: 'hr', w: 2, reason: 'จัดทีม/สมรรถนะให้พร้อมขยาย', tied: 'สร้างทีม' },
  ];

  const catBest = new Map<SkillCategory, Gap>();
  for (const g of gaps) {
    const cur = catBest.get(g.cat);
    if (!cur || cur.w < g.w) catBest.set(g.cat, g);
  }

  const scored = catalog
    .filter(s => !owned.has(s.id))
    .map(s => {
      const g = catBest.get(s.category);
      let score = g ? g.w : 1;
      if (s.official) score += 1.2;   // CEO ให้น้ำหนัก Skill ทางการของบริษัท (B. Training)
      if (s.tier === 1) score += 0.4; // เริ่มจากของพื้นฐานที่ใช้ได้เร็วก่อน
      return { skill: s, score, g };
    })
    .sort((a, b) => b.score - a.score);

  // ไม่ให้หมวดเดียวรวบทั้งหมด (สูงสุด 2/หมวด)
  const perCat: Record<string, number> = {};
  const out: SkillRec[] = [];
  for (const s of scored) {
    if ((perCat[s.skill.category] ?? 0) >= 2) continue;
    perCat[s.skill.category] = (perCat[s.skill.category] ?? 0) + 1;
    out.push({
      skill: s.skill,
      reason: s.g?.reason ?? 'เสริมความสามารถให้ทีม AI',
      priority: s.score >= 4 ? 'high' : 'medium',
      tiedTo: s.g?.tied ?? 'พัฒนาธุรกิจ',
    });
    if (out.length >= limit) break;
  }
  return out;
}
