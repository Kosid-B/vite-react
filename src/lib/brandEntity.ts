/* brandEntity — "CEO AI Thailand คือใคร" ในภาษาที่ **เครื่อง** อ่าน (Entity SEO)
 *
 * 🔴 ปัญหาที่ไฟล์นี้แก้ — และมันเริ่มที่บ้านเรา ไม่ใช่ที่ Google:
 *   ก่อนจะให้ Google เข้าใจว่าเราคือใคร รีโปของเราเองมีคำอธิบายแบรนด์ **4 แบบ**
 *     · index.html          "แพลตฟอร์มสร้างบริษัท AI อัตโนมัติ"
 *     · seoData.HOME_TITLE  "สร้างและเดินธุรกิจด้วยทีมผู้บริหาร AI"
 *     · CATEGORY.external   "AI Business Builder สำหรับคนไทย"
 *     · CLAUDE.md           "AI Business Operating System"
 *   ⇒ Entity Resolution ยากขึ้นเพราะ **เราเองยังพูดไม่ตรงกัน** ไม่ใช่เพราะ Google โง่
 *
 * 🔴 และสองอันแรกยังเป็น "สารเก่า" ที่เจ้าของยกเลิกไปแล้ว:
 *   CLAUDE.md เขียนชัดว่า *สารหลัก **ไม่ใช่** "จ้างทีม AI ทั้งบริษัท"*
 *   ⇒ สิ่งที่ Google อ่านอยู่ทุกวันนี้ คือสารที่เราเลิกใช้ไปแล้ว (ledger #41 ซ้ำอีกรอบ)
 *
 * ⚠️ สองผู้ฟัง สองพื้นผิว — ไม่ขัดกัน ถ้าแยกให้ชัด:
 *   · **หน้าเว็บพูดกับคน**    → พาดหัวต้องเป็น "ปัญหา" (competitiveStrategy.CATEGORY ยังคงเดิม
 *                              เพราะ "คนที่ไม่รู้ว่าตัวเองมีปัญหา ไม่ค้นหาชื่อหมวดหมู่")
 *   · **title/schema พูดกับเครื่อง** → ต้องเป็น "ชื่อหมวดที่ชัด" เพื่อให้แยก entity ออกจาก
 *                              CEO Thailand / Digital CEO / CEO Idol ที่ครองคำค้นอยู่
 *   ⇒ ไฟล์นี้คุมเฉพาะพื้นผิวที่พูดกับเครื่อง · ห้ามเอาไปใช้เป็นพาดหัวบนหน้าเว็บ
 *
 * pure ทั้งไฟล์ · ไม่แตะฐานข้อมูล
 */

import { SOCIAL } from '../config';

/** ชื่อแบรนด์ — ต้องสะกดแบบนี้ทุกที่ ทุกแพลตฟอร์ม (Entity Resolution อ่อนลงทันทีที่สะกดต่างกัน) */
export const BRAND_NAME = 'CEO AI Thailand';

/** ชื่อที่คนพิมพ์จริงเวลาค้นหาเรา — ใส่ใน schema `alternateName` ให้ Google ผูกเข้าด้วยกัน */
export const ALTERNATE_NAMES: readonly string[] = [
  'ceoaithailand',
  'CEOAIThailand',
  'ซีอีโอ เอไอ ไทยแลนด์',
];

/** หมวดหมู่ที่ใช้ "พูดกับเครื่อง" เท่านั้น — ห้ามใช้เป็นพาดหัวบนหน้าเว็บ */
export const SEARCH_CATEGORY = 'AI Business Operating System สำหรับ SME ไทย';

export const HOME_TITLE_ENTITY = `${BRAND_NAME} — ${SEARCH_CATEGORY}`;

export const HOME_DESC_ENTITY =
  `${BRAND_NAME} ช่วย SME ไทยวางกลยุทธ์ธุรกิจ การตลาด คอนเทนต์ การวัดผล ` +
  'MIT 24 Steps และ Next Best Action ด้วย AI ในระบบเดียว — เริ่มฟรี พัฒนาโดยทีมที่ปรึกษา B.TC';

/** โปรไฟล์ที่ต้องประกาศว่าเป็น entity เดียวกัน (`sameAs`)
 *  🔴 ใส่ได้เฉพาะ URL ที่ **มีอยู่จริง** — เดา URL แล้วใส่ = บอก Google ผิดเรื่อง entity
 *     ซึ่งแก้ยากกว่าไม่ใส่เลย · ช่องที่ยังว่างต้องรายงานว่าเป็นจุดบอด ไม่ใช่ปล่อยเงียบ */
export interface EntityProfile {
  key: string;
  label: string;
  url: string;
  /** ต้องมีเพื่อให้ Google ผูก entity ได้จริงไหม */
  required: boolean;
}

export function entityProfiles(): EntityProfile[] {
  return [
    { key: 'website', label: 'เว็บไซต์ทางการ', url: 'https://ceoaithailand.org', required: true },
    { key: 'youtube', label: 'YouTube', url: SOCIAL.youtubeUrl ?? '', required: true },
    { key: 'facebook', label: 'Facebook Page', url: SOCIAL.facebookPageUrl ?? '', required: true },
    { key: 'linkedin', label: 'LinkedIn', url: SOCIAL.linkedinUrl ?? '', required: true },
    { key: 'parent', label: 'บริษัทแม่ (B.TC)', url: 'https://www.b-tctraining.com/', required: false },
  ];
}

/** URL ที่ใส่ลง sameAs ได้จริง — กรองตัวว่างออก */
export function sameAsUrls(): string[] {
  return entityProfiles().filter((p) => p.key !== 'website' && p.url).map((p) => p.url);
}

export type IssueLevel = 'blocker' | 'warn' | 'blind';

export interface EntityIssue {
  level: IssueLevel;
  what: string;
  /** ทำอะไรถึงจะหาย — ห้ามคืนปัญหาเปล่า ๆ */
  fix: string;
}

/** ตรวจความสอดคล้องของ entity เท่าที่ **ตรวจได้จากรีโปนี้**
 *  🔴 ของที่ตรวจไม่ได้ (อันดับใน Google · backlink · ชื่อบนโปรไฟล์โซเชียล) คืนเป็น `blind`
 *     ไม่ใช่ให้คะแนน 0 — "ตรวจไม่ได้" กับ "ตรวจแล้วไม่มี" เป็นคนละเรื่อง */
export function entityIssues(): EntityIssue[] {
  const out: EntityIssue[] = [];
  for (const p of entityProfiles()) {
    if (p.required && !p.url) {
      out.push({
        level: 'blocker',
        what: `ยังไม่มี URL ของ ${p.label} ⇒ ใส่ใน sameAs ไม่ได้`,
        fix: `ให้เจ้าของส่ง URL ของ ${p.label} มาใส่ใน config.SOCIAL — ห้ามเดา URL เอง`,
      });
    }
  }
  out.push({
    level: 'blind',
    what: 'อันดับ/ยอดแสดงผลของคำค้นแบรนด์ · backlink · ชื่อที่ใช้จริงบนโปรไฟล์โซเชียล — ตรวจจากรีโปไม่ได้',
    fix: 'อ่านจาก Google Search Console และเปิดโปรไฟล์จริงดู แล้วบันทึกเป็นค่าตั้งต้น',
  });
  return out;
}
