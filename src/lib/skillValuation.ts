import type { CaseStudy } from '../types';
import type { SkillCategory, SkillTier } from '../data/skillCatalog';
import { CATEGORY_META } from '../data/skillCatalog';

/** ข้อเสนอ Skill ที่สกัดจาก Case Study พร้อมการประเมินมูลค่าแบบโปร่งใส
 *  ใช้ใน Content Studio (Admin) — แปลงบทเรียนจากเคสให้เป็น Skill ขายได้ */
export interface SkillProposal {
  name: string;
  desc: string;
  category: SkillCategory;
  tier: SkillTier;
  price: number;
  icon: string;
  tags: string[];
  valueNote: string;
  /** เหตุผลการประเมิน (แสดงให้ Admin เห็นก่อนตัดสินใจ — ไม่ใช่กล่องดำ) */
  rationale: string[];
}

/** ราคาอ้างอิงต่อ tier — ตรงกับบันไดราคาในแคตตาล็อก (Foundation/Professional/Enterprise) */
export const TIER_PRICE: Record<SkillTier, number> = { 1: 990, 2: 1500, 3: 2490 };
/** มูลค่าเทียบ "จ้างที่ปรึกษา" ต่อ tier (บาท) — ใช้สร้าง valueNote ที่จับต้องได้ */
export const TIER_CONSULTANT_EQUIV: Record<SkillTier, number> = { 1: 8000, 2: 15000, 3: 30000 };

const TIER_LABEL: Record<SkillTier, string> = { 1: 'Foundation', 2: 'Professional', 3: 'Enterprise' };

/** คีย์เวิร์ดต่อหมวด — ใช้เดาหมวดจากเนื้อหา (ไทย+อังกฤษ) */
const CATEGORY_KEYWORDS: { cat: SkillCategory; words: string[] }[] = [
  { cat: 'strategy',   words: ['กลยุทธ์', 'ต่อรอง', 'เจรจา', 'ดีล', 'positioning', 'หมวดหมู่', 'category', 'disruption', 'พลิก', 'โมเดล', 'model', 'วิสัยทัศน์', 'timing', 'จังหวะ'] },
  { cat: 'sales',      words: ['ขาย', 'sales', 'รายได้', 'revenue', 'ปิดการขาย', 'ลูกค้า', 'funnel', 'closing', 'อัปเซล', 'upsell'] },
  { cat: 'marketing',  words: ['การตลาด', 'marketing', 'แบรนด์', 'brand', 'โฆษณา', 'ads', 'content', 'seo', 'ไวรัล', 'viral', 'story', 'เรื่องราว', 'ambassador'] },
  { cat: 'analytics',  words: ['ข้อมูล', 'data', 'วิเคราะห์', 'analytics', 'metric', 'kpi', 'cohort', 'a/b', 'conversion', 'วัดผล'] },
  { cat: 'technology', words: ['เทคโนโลยี', 'technology', 'วิศวกร', 'engineer', 'ระบบ', 'system', 'automation', 'อัตโนมัติ', 'ai', 'โค้ด', 'code', 'แพลตฟอร์ม', 'platform'] },
  { cat: 'hr',         words: ['ทีม', 'team', 'พนักงาน', 'hr', 'บุคคล', 'วัฒนธรรม', 'culture', 'ผู้นำ', 'leadership', 'จ้าง', 'hiring', 'talent'] },
  { cat: 'impact',     words: ['ผลกระทบ', 'impact', 'สังคม', 'social', 'ยั่งยืน', 'sustainab', 'esg', 'ชุมชน', 'community'] },
];

function caseText(c: CaseStudy): string {
  return [
    c.title, c.tag, c.industry, c.result, c.keyLesson,
    ...(c.lessons ?? []).map((l) => `${l.title ?? ''} ${l.body}`),
    ...(c.applyTo ?? []),
  ].join(' ').toLowerCase();
}

/** เดาหมวดจากเนื้อหา — นับคีย์เวิร์ดที่เจอ หมวดที่ได้คะแนนสูงสุดชนะ (เสมอ → strategy) */
export function guessCategory(c: CaseStudy): SkillCategory {
  const text = caseText(c);
  let best: SkillCategory = 'strategy';
  let bestScore = 0;
  for (const { cat, words } of CATEGORY_KEYWORDS) {
    const score = words.reduce((n, w) => (text.includes(w) ? n + 1 : n), 0);
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return best;
}

/** ประเมิน tier จาก "ความลึกของเนื้อหา" — ยิ่งมีบทเรียน/แนวใช้จริง/บทเรียนหลักมาก ยิ่ง tier สูง
 *  โปร่งใส: อิงจำนวน lessons + applyTo + keyLesson (นับได้ ตรวจได้) */
export function estimateTier(c: CaseStudy): SkillTier {
  const lessons = (c.lessons ?? []).filter((l) => l.body.trim()).length;
  const applies = (c.applyTo ?? []).filter(Boolean).length;
  const hasKey = Boolean(c.keyLesson?.trim());
  const depth = lessons + applies + (hasKey ? 1 : 0);
  if (lessons >= 3 && applies >= 3 && hasKey) return 3;
  if (depth >= 4) return 2;
  return 1;
}

const bahtFmt = (n: number) => '฿' + n.toLocaleString('en-US');

/** สร้างข้อเสนอ Skill + การประเมินมูลค่าจาก Case Study (deterministic — เทสต์ได้) */
export function suggestSkillFromCase(c: CaseStudy): SkillProposal {
  const category = guessCategory(c);
  const tier = estimateTier(c);
  const price = TIER_PRICE[tier];
  const consultant = TIER_CONSULTANT_EQUIV[tier];
  const icon = CATEGORY_META[category].icon;

  const base = (c.tag || c.title || 'บทเรียนธุรกิจ').trim();
  const name = base.length > 48 ? base.slice(0, 47).trimEnd() + '…' : base;
  const desc =
    (c.keyLesson?.trim() ||
      (c.lessons ?? []).map((l) => l.body).find((b) => b.trim()) ||
      c.title).slice(0, 180);

  const tags = Array.from(
    new Set([c.industry, c.company, ...(c.tag ? [c.tag] : [])].map((t) => (t ?? '').trim()).filter(Boolean)),
  ).slice(0, 3);

  const lessons = (c.lessons ?? []).filter((l) => l.body.trim()).length;
  const applies = (c.applyTo ?? []).filter(Boolean).length;

  const valueNote =
    `เทียบจ้างที่ปรึกษา ${bahtFmt(consultant)}+ · กลั่นจากกรณีศึกษา ` +
    `${c.company ? c.company + ' ' : ''}เป็นเพลย์บุ๊กใช้ซ้ำได้ตลอดชีพ`;

  const rationale = [
    `หมวด: ${CATEGORY_META[category].label} (เดาจากคีย์เวิร์ดในเนื้อหา)`,
    `ระดับ: Tier ${tier} ${TIER_LABEL[tier]} — อิงความลึก ${lessons} บทเรียน + ${applies} แนวนำไปใช้${c.keyLesson ? ' + บทเรียนหลัก' : ''}`,
    `ราคาแนะนำ: ${bahtFmt(price)} (บันไดราคา Tier ${tier}) — เทียบที่ปรึกษา ${bahtFmt(consultant)}`,
    'ปรับหมวด/ระดับ/ราคาได้ก่อนบันทึก — นี่คือค่าเริ่มต้นที่ประเมินให้',
  ];

  return { name, desc, category, tier, price, icon, tags, valueNote, rationale };
}
