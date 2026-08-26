/* skillOverrides — กติกาที่ทับ skill ภายนอกที่ sync เข้ามา (24 ส.ค. 2569)
 *
 * 🔴 ปัญหาที่แก้: skill ชุด `thai-*` ที่ sync มาจากคลังภายนอก **มีแหล่งความจริงของตัวเอง**
 *    `thai-marketing-strategy/SKILL.md:19–21` สั่งตรง ๆ ว่า
 *      "ถ้าไม่เจอ → สร้างไฟล์ ... บันทึกเป็น `BRAND.md`" และเทมเพลตขึ้นหัวว่า
 *      "BRAND.md — ข้อมูลแบรนด์ (แหล่งความจริงเดียว)"
 *    ทำตาม = ได้แหล่งความจริงเรื่องแบรนด์ **ตัวที่สาม** ซ้อนกับ
 *      ① `brandBrief.ts` (ของรีโปนี้ · มีเทสต์บังคับ)
 *      ② `marketing_brand_rules` 10 ข้อ (ของอีกระบบ · เจ้าของตัดสิน 24 ส.ค. 2569)
 *    ซึ่งเป็นความสิ้นเปลืองแบบเดียวกับที่ Architecture Consolidation Audit เพิ่งไปเจอ
 *
 * ⚠️ ไม่ได้ห้ามใช้ skill พวกนี้ — ใช้ได้และมีประโยชน์
 *    แต่เมื่อขัดกัน **ของรีโปนี้ชนะเสมอ** และห้ามสร้างไฟล์ที่อ้างตัวเป็นแหล่งความจริง
 *
 * pure ทั้งไฟล์ · กลไกเฝ้า: `skillOverrides.test.ts`
 */

import { MIN_SAMPLE_FOR_RATE } from './decisionRules';

/** skill ภายนอกที่ sync มาแล้วและเรียกใช้ได้จริง (ตรวจ 24 ส.ค. 2569) */
export const SYNCED_EXTERNAL_SKILLS = [
  'thai-marketing-strategy',
  'thai-content-social',
  'thai-performance-ads',
  'thai-seo',
  'ai-dark-marketing',
] as const;
export type SyncedSkill = typeof SYNCED_EXTERNAL_SKILLS[number];

export interface SkillOverride {
  /** skill ไหนที่โดนทับ ('*' = ทุกตัว) */
  skill: SyncedSkill | '*';
  /** skill นั้นสั่งอะไร */
  theySay: string;
  /** ของเราคืออะไร */
  weDo: string;
  /** ทำไมต้องทับ — ต้องอธิบายได้ ไม่ใช่แค่ห้าม */
  why: string;
}

export const SKILL_OVERRIDES: SkillOverride[] = [
  {
    skill: '*',
    theySay: 'หา/สร้าง `BRAND.md` แล้วใช้เป็นแหล่งความจริงเดียวของแบรนด์',
    weDo: 'แหล่งความจริงคือ `src/lib/brandBrief.ts` เสมอ · **ห้ามสร้าง `BRAND.md` ในรีโปนี้**',
    why: 'มีแหล่งความจริงเรื่องแบรนด์อยู่แล้ว 2 ที่ (brandBrief.ts + marketing_brand_rules ของอีกระบบ) ' +
      'เพิ่มตัวที่สาม = ไฟล์ทั้งสามจะขัดกันเงียบ ๆ แล้วไม่มีใครรู้ว่าอันไหนถูก',
  },
  {
    skill: 'thai-performance-ads',
    theySay: 'ผลต่างที่ถือว่ามีนัย ≥ 20% · ขยายงบเมื่อ ROAS เกินเป้า 5 วันติดและ conversion ≥ 30',
    weDo: `ใช้เกณฑ์ตัวอย่างของเรา (\`MIN_SAMPLE_FOR_RATE\` = ${MIN_SAMPLE_FOR_RATE}) และการเพิ่มงบต้องผ่านด่าน ` +
      '`paid-scale` ของ `founderMindset` ครบ 6 ด่านก่อนเสมอ',
    why: 'เกณฑ์ในคลังภายนอกเป็นค่ากลางของตลาด ไม่ใช่ค่าที่พิสูจน์จากธุรกิจของผู้ใช้ ' +
      '⇒ ต้องอ่านเป็น policy ไม่ใช่ validated (`THRESHOLD_STATUS`)',
  },
  {
    skill: 'thai-content-social',
    theySay: 'ผลิตคอนเทนต์ตาม pillar/hook ที่กำหนด',
    weDo: 'ทุกชิ้นต้องผ่าน `violatesBrand()` และ skill `content-link-contract` (ต้องมีปลายทางจริง)',
    why: 'คอนเทนต์ที่ไม่มีปลายทาง = เสียของทั้งหมด · ปลายทางที่ไม่มีเนื้อหาจริง = เสียความไว้ใจถาวร',
  },
  {
    skill: 'ai-dark-marketing',
    theySay: 'ความเร่งด่วนและ social proof เป็นแรงผลักดันการตัดสินใจซื้อ (บทเรียนข้อ 16–17)',
    weDo: 'สร้างความตึงจาก **ตัวเลขของผู้ใช้เองที่เขาตอบไม่ได้** ตาม `emotionalArc.BEATS` — ' +
      'ห้ามนับถอยหลัง/จำนวนจำกัด/รีวิวที่ยังไม่มีจริง (`FORBIDDEN_TRIGGERS` มีของแทนที่ให้ทุกข้อ)',
    why: 'กฎแบรนด์ระดับ block ห้าม dark pattern อยู่แล้ว และเรายังไม่มีลูกค้าจ่ายจริงสักราย ' +
      '⇒ social proof ที่ปั้นตอนนี้คือคำโกหกที่จับได้ง่ายที่สุด · ' +
      '⚠️ skill นี้ description เขียนว่าเรื่องฮอร์โมน แต่เนื้อในไม่มีเลย — ห้ามอ้างว่าหลักการมาจากที่นี่',
  },
  {
    skill: 'thai-marketing-strategy',
    theySay: 'ถามผู้ใช้ 6 คำถามเพื่อสร้าง Brand Profile',
    weDo: 'อ่านจาก `genomeFromApp()` ก่อน แล้วถามเฉพาะช่องที่ระบบยังไม่รู้',
    why: 'Dynamic PLG — ระบบรู้อะไรแล้วยังถามซ้ำ = ผิดกฎของโปรเจกต์',
  },
];

/** ชื่อไฟล์ที่ห้ามมีในรีโปนี้ เพราะมันจะกลายเป็นแหล่งความจริงคู่แข่ง */
export const FORBIDDEN_SOURCE_FILES = ['BRAND.md', 'brand-profile.md'] as const;

/** บล็อกที่แปะเข้า prompt เมื่อจะเรียก skill ภายนอก */
export function skillOverrideBlock(): string {
  return [
    '## เมื่อใช้ skill ภายนอก (thai-*) — ของรีโปนี้ชนะเสมอเมื่อขัดกัน',
    ...SKILL_OVERRIDES.map((o) => `  · [${o.skill}] เขาสั่ง: ${o.theySay}\n    ⇒ เราทำ: ${o.weDo}`),
    '',
    `🔴 ห้ามสร้างไฟล์เหล่านี้ในรีโปนี้: ${FORBIDDEN_SOURCE_FILES.join(' · ')}`,
  ].join('\n');
}
