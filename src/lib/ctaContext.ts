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

/** seg ที่ใช้เมื่อยังไม่รู้จักหมวดนั้น — 'newbie' เพราะกลุ่มเป้าหมายรอบนี้คือคนกำลังเริ่มธุรกิจ */
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

/** CTA ของบทความ — seg มาจากหมวดของบทความนั้นเอง */
export function blogCtaHref(origin: string, slug: string, category: string): string {
  return ctaHref(origin, { seg: segForCategory(category), from: `blog_${slug}` });
}
