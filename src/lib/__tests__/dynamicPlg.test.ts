import { describe, it, expect } from 'vitest';
import { CATEGORY_SEG, FALLBACK_SEG, segForCategory, segForSlug, blogCtaHref } from '../ctaContext';
import { START_HEROES, startHeroFor } from '../startHero';
import { HERO_VARIANTS, segmentFor } from '../heroVariant';
import { BLOG_POSTS } from '../blogData';
import { blogPostHtml } from '../seoData';

/* ══════════════════════════════════════════════════════════════════════
 * สัญญา Dynamic PLG — "ระบบต้องเปลี่ยนตามคนที่ใช้ ไม่ใช่พูดกับทุกคนเหมือนกัน"
 *
 * เคยพลาดจริง (16 ส.ค. 2569): คนอ่านบทความเรื่องราคาจนจบแล้วกด CTA
 *   → ตกหน้า /start ที่พาดหัวว่า "ไม่มีใครจ้าง" ซึ่งไม่เกี่ยวกับเขาเลย
 *   บริบทที่หามาได้ยากที่สุดถูกทิ้งตรงจุดที่มันมีค่าที่สุด
 *
 * เทสต์ชุดนี้บังคับ "ทั้งสายส่ง" ไม่ใช่แค่ปลายใดปลายหนึ่ง:
 *   บทความ → CTA ต้องพก seg → หน้าปลายทางต้องมีพาดหัวของ seg นั้นจริง
 * ══════════════════════════════════════════════════════════════════════ */

const ORIGIN = 'https://ceoaithailand.org';

describe('บริบทต้องเดินทางไปกับผู้ใช้ (ไม่ตกหล่นระหว่างหน้า)', () => {
  it('ทุกบทความมี CTA ที่พก seg + from ไปด้วย', () => {
    for (const p of BLOG_POSTS) {
      const html = blogPostHtml(ORIGIN, p.slug)!;
      const cta = (html.match(/class="cta" href="([^"]*)"/) ?? [])[1] ?? '';
      expect(cta, `${p.slug} CTA ไม่มี seg`).toContain('seg=');
      expect(cta, `${p.slug} CTA ไม่มี from`).toContain(`from=blog_${p.slug}`);
    }
  });

  it('seg ที่ CTA ส่งไป ต้องเป็นค่าที่ segmentFor อ่านออกจริง', () => {
    for (const p of BLOG_POSTS) {
      const seg = segForSlug(p.slug);
      expect(segmentFor(`?seg=${seg}`), `${p.slug} → segmentFor อ่าน seg=${seg} ไม่ออก`).toBe(seg);
    }
  });

  it('ทุก seg ที่ส่งไป ปลายทางต้องมีพาดหัวของตัวเอง (ส่งไปแล้วปลายทางไม่ใช้ = เท่ากับไม่ได้ส่ง)', () => {
    const sent = new Set(BLOG_POSTS.map(p => segForSlug(p.slug)));
    for (const seg of sent) {
      expect(startHeroFor(seg), `ส่ง seg=${seg} ไปแต่ /start ไม่มีพาดหัวของ seg นี้`).toBeTruthy();
    }
  });

  it('ทุกหมวดบทความที่มีอยู่จริง ถูกจับคู่ไว้แล้ว (ไม่ตกไป fallback เงียบ ๆ)', () => {
    const unmapped = [...new Set(BLOG_POSTS.map(p => p.category))].filter(c => !CATEGORY_SEG[c]);
    expect(unmapped, `หมวดที่ยังไม่จับคู่ seg: ${unmapped.join(', ')}`).toEqual([]);
    expect(segForCategory('หมวดที่ไม่มีจริง')).toBe(FALLBACK_SEG);
  });

  it('ทุก seg ในตารางเป็น seg ที่ระบบรู้จัก และมีค่าตั้งต้นเสมอ', () => {
    for (const seg of Object.keys(CATEGORY_SEG)) expect(HERO_VARIANTS[CATEGORY_SEG[seg]]).toBeTruthy();
    // เปลี่ยน 16 ส.ค. 2569: 'default' ต้องมีพาดหัวของตัวเอง เพราะคนที่เราไม่รู้ที่มา
    // ต้องเจอข้อความที่ตรงกับผู้ชมส่วนใหญ่จริง (เจ้าของธุรกิจ 35-65) ไม่ใช่ข้อความกลาง ๆ
    expect(startHeroFor('default'), 'ไม่มีพาดหัวค่าตั้งต้น = คนที่ไม่รู้ที่มาจะไม่เห็นอะไรเลย').toBeTruthy();
    expect(startHeroFor('default')!.h1).not.toContain('ไม่มีใครจ้าง');
  });

  it('blogCtaHref เข้ารหัส query ถูกต้อง', () => {
    // บทความที่ยังไปหน้า Landing ตามปกติ
    expect(blogCtaHref(ORIGIN, 'first-customers-no-ads', 'การตลาด'))
      .toBe(`${ORIGIN}/start?seg=seller&from=blog_first-customers-no-ads`);
    // บทความที่ CTA สัญญาว่า "จะได้คำนวณ" → ไปเครื่องมือ (19 ส.ค. 2569)
    // แต่ยังต้องพก seg + from ครบเหมือนเดิม แล้วค่อยต่อ utm
    expect(blogCtaHref(ORIGIN, 'pricing-no-loss', 'การเงิน & ราคา')).toBe(
      `${ORIGIN}/calc?seg=seller&from=blog_pricing-no-loss` +
      `&utm_source=blog&utm_medium=article_cta&utm_campaign=pricing-no-loss`,
    );
  });
});

describe('พาดหัวที่เปลี่ยนตามคน ต้องไม่แลกความซื่อสัตย์', () => {
  const allText = Object.values(START_HEROES).flatMap(h => [h!.badge, h!.h1, h!.h1hl, ...h!.sub, ...h!.chips]);

  it('ห้ามมีตัวเลขสถิติที่ไม่มีแหล่ง (เลข 3 หลักขึ้นไป หรือเลขคั่นจุลภาค)', () => {
    for (const t of allText) {
      expect(t, `มีตัวเลขที่อ้างไม่ได้: "${t}"`).not.toMatch(/\d{3,}|\d,\d/);
    }
  });

  it('ห้ามสัญญาผลลัพธ์ทางธุรกิจ หรืออ้างค่าเฉลี่ยตลาดที่เราไม่มี', () => {
    const joined = allText.join(' ');
    for (const bad of ['การันตี', 'รับรองว่า', 'ยอดขายเพิ่มแน่นอน', 'ค่าเฉลี่ยอุตสาหกรรม', 'รวยแน่', 'ได้เงินแน่']) {
      expect(joined, `มีคำว่า "${bad}"`).not.toContain(bad);
    }
  });

  it('ทุกพาดหัวเริ่มจากปัญหาของเขา แล้วค่อยเสนอทางออก (h1 ≠ h1hl และมีเนื้อหาพอ)', () => {
    for (const [seg, h] of Object.entries(START_HEROES)) {
      expect(h!.h1, seg).not.toBe(h!.h1hl);
      expect(h!.sub.length, `${seg} คำอธิบายสั้นไป`).toBeGreaterThanOrEqual(2);
      expect(h!.chips.length, `${seg} ไม่มีชิปผลลัพธ์`).toBeGreaterThanOrEqual(3);
    }
  });

  it('ห้ามขึ้นต้นด้วยศัพท์มาตรฐานกับคนเริ่มธุรกิจ (iso-from-day-one)', () => {
    for (const [seg, h] of Object.entries(START_HEROES)) {
      for (const bad of ['ISO', 'ข้อกำหนด', 'มาตรฐานสากล']) {
        expect(h!.h1, `${seg} พาดหัวมีคำว่า ${bad}`).not.toContain(bad);
      }
    }
  });
});
