import { describe, it, expect } from 'vitest';
import { BLOG_POSTS } from '../blogData';
import { blogCtaHref, BLOG_TOOL_CTA } from '../ctaContext';
import { calcPageHtml } from '../calcPage';

/* คำที่เขียนบนปุ่ม ต้องตรงกับสิ่งที่เจอหลังกด — ไม่มีข้อยกเว้น
 *
 * 🔴 บั๊กจริงที่เทสต์นี้จับได้ (19 ส.ค. 2569):
 *   บทความ 3 ชิ้นมี CTA ว่า "ให้ AI ช่วยคิดต้นทุน + ตั้งราคาให้มีกำไร — ฟรี",
 *   "คิดต้นทุนต่อหน่วยให้ชัด", "คิดต้นทุนต่อไร่ให้ชัด"
 *   แต่ทั้งสามลิงก์ไป `/start` = **หน้าสมัคร** กดแล้วไม่ได้คำนวณอะไรเลย
 *   ซ้ำรอยเดียวกับตอนจบคลิปที่บอก "คำนวณฟรี" แล้วพาไปบทความ (GA4: อยู่ 2–4 วินาที)
 */

const ORIGIN = 'https://ceoaithailand.org';

/** คำบนปุ่มที่แปลว่า "กดแล้วจะได้ลงมือคำนวณ" */
const PROMISES_CALC = /คิดต้นทุน|ตั้งราคา|คำนวณ/;

describe('CTA ของบทความ ต้องพาไปที่สิ่งที่ปุ่มสัญญาไว้', () => {
  it('มีบทความให้ตรวจจริง (กันเทสต์เขียวเพราะลิสต์ว่าง)', () => {
    expect(BLOG_POSTS.length).toBeGreaterThanOrEqual(8);
  });

  it.each(BLOG_POSTS.map((p) => [p.slug, p.ctaText, p.category] as const))(
    '%s — ปุ่มที่สัญญาว่า "คำนวณ" ต้องไม่พาไปหน้าสมัคร',
    (slug, ctaText, category) => {
      if (!PROMISES_CALC.test(ctaText)) return;
      const href = blogCtaHref(ORIGIN, slug, category);
      expect(href, `ปุ่ม "${ctaText}" ของ ${slug} พาไปหน้าสมัคร — กดแล้วไม่ได้คำนวณอะไร`)
        .not.toContain('/start');
      expect(href, `${slug} ควรพาไปเครื่องมือ`).toContain('/calc');
    },
  );

  it('ลิงก์ไปเครื่องมือต้องติดแท็ก + พกบริบทไปด้วย (Dynamic PLG ห้ามทิ้ง seg/from)', () => {
    for (const slug of Object.keys(BLOG_TOOL_CTA)) {
      const u = new URL(blogCtaHref(ORIGIN, slug, 'การเงิน & ราคา'));
      expect(u.searchParams.get('utm_source')).toBe('blog');
      expect(u.searchParams.get('utm_campaign')).toBe(slug);
      expect(u.searchParams.get('seg'), 'ทิ้ง seg = ทิ้งบริบทที่หามาได้ยากที่สุด').toBeTruthy();
      expect(u.searchParams.get('from')).toBe(`blog_${slug}`);
    }
  });

  it('🔴 /calc ต้อง "อ่าน seg ไปใช้จริง" ไม่ใช่แค่รับมาแล้วทิ้ง (เคยพลาดแบบนี้กับ /start)', () => {
    const palm = calcPageHtml(ORIGIN, '?seg=palm');
    const food = calcPageHtml(ORIGIN, '?seg=food');
    expect(palm).toContain('กิโล');      // ปาล์มขายเป็นกิโล ไม่ใช่ชิ้น
    expect(food).toContain('จาน');       // ร้านอาหารขายเป็นจาน
    expect(palm).not.toBe(food);
    // seg ที่ไม่รู้จัก ต้องไม่พัง และกลับไปใช้ค่าตั้งต้น
    expect(calcPageHtml(ORIGIN, '?seg=ไม่มีจริง')).toContain('ชิ้น');
  });

  it('ทุก slug ใน BLOG_TOOL_CTA ต้องเป็นบทความที่มีอยู่จริง', () => {
    const slugs = new Set(BLOG_POSTS.map((p) => p.slug));
    for (const s of Object.keys(BLOG_TOOL_CTA)) {
      expect(slugs.has(s), `${s} ไม่มีในบทความจริง`).toBe(true);
    }
  });

  it('บทความที่ไม่ได้สัญญาว่าคำนวณ ยังไปหน้าเดิมได้ (ไม่บังคับทุกอัน)', () => {
    expect(blogCtaHref(ORIGIN, 'sim-update-scam-check', 'ความปลอดภัยธุรกิจ')).toContain('/start');
  });
});
