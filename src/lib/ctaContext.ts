/* ctaContext — พา "สิ่งที่เรารู้เกี่ยวกับคนคนนี้" ข้ามหน้าไปด้วย (กฎ Dynamic PLG)
 *
 * เคยพลาดจริง (16 ส.ค. 2569): คนอ่านบทความ "ตั้งราคายังไงไม่ให้ขาดทุน" จนจบแล้วกด CTA
 *   → ตกลงหน้า /start แบบทั่วไปที่พูดกับทุกคนเหมือนกันหมด
 *   ทั้งที่ ณ จุดนั้นเรารู้ชัดที่สุดในทั้ง funnel ว่าเขากังวลเรื่องอะไร
 *   = ทิ้งบริบทที่หามาได้ยากที่สุด ตรงจุดที่มันมีค่าที่สุด
 *
 * กฎ: ทุกลิงก์สาธารณะที่พาไป /start ต้องพก seg + from ติดไปด้วยเสมอ
 *   seg  → หน้า Landing เลือกพาดหัวที่ตรงกับเขา (heroVariant.segmentFor อ่านค่านี้)
 *   from → รู้ว่ามาจากบทความไหน (แยกผลได้ว่าเนื้อหาตัวไหนพาคนมาจริง)
 *
 * pure ทั้งไฟล์
 */

import type { HeroSeg } from './heroVariant';
import { BLOG_POSTS } from './blogData';

/** หมวดบทความ → segment ของหน้า Landing
 *  ใช้ "หมวด" ไม่ใช่ "สแลก" เพราะบทความใหม่ในหมวดเดิมจะได้ seg ที่ถูกต้องเองโดยไม่ต้องมาแก้ตาราง */
export const CATEGORY_SEG: Record<string, HeroSeg> = {
  'เริ่มต้นธุรกิจ': 'newbie',
  'วางแผนธุรกิจ': 'newbie',
  'การเงิน & ราคา': 'seller',
  'ต้นทุนและกำไร': 'seller',
  'การตลาด': 'seller',
  'การตลาดยุค AI': 'owner',
  'วางระบบธุรกิจ': 'owner',
  'ความปลอดภัยธุรกิจ': 'owner',
  'ความเสี่ยงและความต่อเนื่อง': 'owner',
  'เกษตรและแปรรูป': 'palm',
};

/** seg ที่ใช้เมื่อยังไม่รู้จักหมวดนั้น
 *  🔁 เปลี่ยนกลับเป็น 'newbie' 23 ส.ค. 2569 (เจ้าของตัดสินใจระดับกลุ่มเป้าหมาย)
 *  16 ส.ค. เคยเปลี่ยนเป็น 'seller' เพราะอ่านสถิติผู้ชม YouTube — **นั่นคือ Current Audience
 *  ไม่ใช่ Target Market** · ค่าตั้งต้นต้องพูดกับ Broad Market = คนที่อยากเริ่มธุรกิจ
 *  คนที่ขายอยู่แล้วยังมี seg ของตัวเอง ('seller'/'owner') เมื่อมาจากคอนเทนต์เรื่องต้นทุน/ระบบ
 *  (YouTube คลิป 942 วิว: อายุ 18-24 = 0.0% · 45 ปีขึ้นไป = 58.1% → ส่วนใหญ่มีธุรกิจอยู่แล้ว) */
export const FALLBACK_SEG: HeroSeg = 'newbie';

export function segForCategory(category: string): HeroSeg {
  return CATEGORY_SEG[category] ?? FALLBACK_SEG;
}

export function segForSlug(slug: string): HeroSeg {
  const post = BLOG_POSTS.find(p => p.slug === slug);
  return post ? segForCategory(post.category) : FALLBACK_SEG;
}

/** สร้าง URL ของ CTA พร้อมบริบท — ใช้แทนการเขียน `${origin}/start` ตรง ๆ ทุกที่
 *  path เริ่มต้นเป็น /start เพราะเป็นปลายทาง PLG หลัก (ลองเองได้ ไม่ต้องคุยกับใคร) */
export function ctaHref(origin: string, opts: { seg: HeroSeg; from: string; path?: string }): string {
  const p = opts.path ?? '/start';
  return `${origin}${p}?seg=${encodeURIComponent(opts.seg)}&from=${encodeURIComponent(opts.from)}`;
}

/** บทความที่ CTA สัญญาว่า "จะได้คำนวณ" → ต้องพาไปที่ **เครื่องมือ** ไม่ใช่หน้าสมัคร
 *
 * 🔴 ปัญหาจริงที่แก้ (19 ส.ค. 2569): CTA ของบทความเหล่านี้เขียนว่า
 *   "ให้ AI ช่วยคิดต้นทุน + ตั้งราคาให้มีกำไร — ฟรี" / "คิดต้นทุนต่อหน่วยให้ชัด"
 *   แต่ลิงก์ไป `/start` ซึ่งเป็น **หน้าสมัคร** — กดแล้วไม่ได้คำนวณอะไรเลย
 *   = คำสัญญาที่ปลายทางไม่มี ซ้ำรอยเดียวกับตอนจบคลิปที่บอก "คำนวณฟรี" แล้วพาไปบทความ
 *   (GA4 22 ก.ค.–18 ส.ค.: คนอยู่บนบทความเฉลี่ย 2–4 วินาที แล้วปิด)
 *
 * หลัก: **คำที่เขียนบนปุ่มต้องตรงกับสิ่งที่เจอหลังกด** — ไม่มีข้อยกเว้น
 */
export const BLOG_TOOL_CTA: Record<string, string> = {
  'pricing-no-loss': '/calc',
  'ai-era-hardware-cost': '/calc',
  'palm-price-what-you-control': '/calc',
};

/** CTA ของบทความ — seg มาจากหมวดของบทความนั้นเอง
 *  บทความที่มีเครื่องมือตรงเรื่อง → ไปที่เครื่องมือ (ติด utm ให้วัดได้ว่ามาจากบทความไหน) */
export function blogCtaHref(origin: string, slug: string, category: string): string {
  const seg = segForCategory(category);
  const tool = BLOG_TOOL_CTA[slug];
  // ⚠️ ลิงก์ไปเครื่องมือก็ต้องพก seg + from ไปด้วย (กฎ Dynamic PLG — ห้ามทิ้งบริบท)
  //    และ /calc ต้อง **อ่าน seg ไปใช้จริง** ไม่ใช่แค่รับมาแล้วทิ้ง
  //    (เคยพลาดแบบนั้นมาแล้ว: เติม ?seg= ให้ CTA แต่ /start ไม่ได้อ่านค่านั้นเลย)
  const base = ctaHref(origin, { seg, from: `blog_${slug}`, path: tool ?? '/start' });
  return tool
    ? `${base}&utm_source=blog&utm_medium=article_cta&utm_campaign=${encodeURIComponent(slug)}`
    : base;
}
