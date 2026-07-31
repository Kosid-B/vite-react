import { describe, it, expect } from 'vitest';
import {
  escapeHtml, jsonLdScript, sectorLabel,
  storefrontSeo, directorySeo, directoryItemList, sitemapXml, llmsTxt,
  homeSeo, faqPageHtml, faqPageJsonLd, organizationJsonLd, softwareApplicationJsonLd, FAQ_ITEMS,
  mit24PageHtml, mit24FaqJsonLd, mit24ArticleJsonLd, MIT24_FAQ,
  type SeoStorefront,
} from '../seoData';

/**
 * SEO builders เป็น source of truth เดียวของทั้ง Worker (server.ts) และ client (seo.ts)
 * ชื่อ/คำอธิบายร้าน = user-controlled → ต้องกัน XSS (HTML + </script> breakout) ด้วยเทสต์
 */

const ORIGIN = 'https://ceoaithailand.org';

const SF: SeoStorefront = {
  slug: 'ร้านกาแฟ-ดี',
  name: 'ร้านกาแฟดี',
  dbd: '[I] ที่พักแรมและบริการด้านอาหาร',
  vp: 'กาแฟสดคั่วเองทุกวัน ส่งทั่วกรุงเทพ',
  images: ['https://cdn.example.com/shop.jpg'],
  phone: '081-781-7773',
};

describe('escapeHtml — กัน injection', () => {
  it('escape อักขระอันตรายครบ 5 ตัว', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;',
    );
  });
  it('รับค่าไม่ใช่ string ได้ (ไม่ throw)', () => {
    expect(escapeHtml(undefined as unknown as string)).toBe('undefined');
  });
});

describe('jsonLdScript — กัน </script> breakout', () => {
  it('escape < เป็น \\u003c ทุกตัว', () => {
    const out = jsonLdScript([{ name: '</script><script>alert(1)</script>' }]);
    expect(out).not.toContain('</script><script>');   // payload ต้องไม่มี tag จริง
    expect(out).toContain('\\u003c/script');
    // มี wrapper script เปิด/ปิดถูกต้องแค่คู่เดียว
    expect(out.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(out.endsWith('</script>')).toBe(true);
  });
  it('อ็อบเจ็กต์เดียว unwrap ไม่ห่อ array', () => {
    const out = jsonLdScript([{ a: 1 }]);
    expect(out).toContain('{"a":1}');
    expect(out).not.toContain('[{"a":1}]');
  });
});

describe('sectorLabel', () => {
  it('map รหัสหมวด DBD → ป้ายอ่านง่าย', () => {
    expect(sectorLabel('[I] ที่พักแรม')).toMatch(/^หมวด I ·/);
  });
  it('ไม่มีรหัส → คืนค่าเดิม/ไม่ระบุ', () => {
    expect(sectorLabel('')).toBe('ไม่ระบุหมวด');
  });
});

describe('storefrontSeo', () => {
  const seo = storefrontSeo(SF, ORIGIN);

  it('title รวมชื่อร้าน + หมวด + แบรนด์', () => {
    expect(seo.title).toContain('ร้านกาแฟดี');
    expect(seo.title).toContain('CEO AI Thailand');
  });
  it('canonical เข้ารหัส slug (กันอักขระไทย/ช่องว่างพัง URL)', () => {
    expect(seo.canonicalUrl).toBe(`${ORIGIN}/b/${encodeURIComponent(SF.slug)}`);
    expect(seo.canonicalUrl).not.toContain(' ');
  });
  it('description ตัดที่ ≤155 อักขระ', () => {
    const long = { ...SF, vp: 'ก'.repeat(400) };
    expect(storefrontSeo(long, ORIGIN).description.length).toBeLessThanOrEqual(155);
  });
  it('ใช้รูปแรกของร้าน ถ้าไม่มี fallback og-image', () => {
    expect(seo.imageUrl).toBe(SF.images![0]);
    expect(storefrontSeo({ ...SF, images: [] }, ORIGIN).imageUrl).toBe(`${ORIGIN}/og-image.png`);
  });
  it('JSON-LD = LocalBusiness + BreadcrumbList (มี telephone เมื่อมีเบอร์)', () => {
    const types = seo.jsonLd.map(o => (o as { '@type': string })['@type']);
    expect(types).toEqual(['LocalBusiness', 'BreadcrumbList']);
    expect((seo.jsonLd[0] as { telephone?: string }).telephone).toBe(SF.phone);
    const crumb = seo.jsonLd[1] as { itemListElement: unknown[] };
    expect(crumb.itemListElement).toHaveLength(3);
  });
  it('ไม่มีเบอร์ → ไม่มี field telephone', () => {
    const noPhone = storefrontSeo({ ...SF, phone: undefined }, ORIGIN);
    expect((noPhone.jsonLd[0] as { telephone?: string }).telephone).toBeUndefined();
  });
  it('ไม่มีรีวิว → ไม่มี aggregateRating (ไม่ปั้นดาวปลอม)', () => {
    expect((seo.jsonLd[0] as { aggregateRating?: unknown }).aggregateRating).toBeUndefined();
  });
  it('มีรีวิวจริง → emit AggregateRating ลง schema', () => {
    const rated = storefrontSeo({ ...SF, rating: 4.6, reviewCount: 12 }, ORIGIN);
    const agg = (rated.jsonLd[0] as { aggregateRating?: { ratingValue: number; reviewCount: number; '@type': string } }).aggregateRating;
    expect(agg?.['@type']).toBe('AggregateRating');
    expect(agg?.ratingValue).toBe(4.6);
    expect(agg?.reviewCount).toBe(12);
  });
  it('reviewCount = 0 → ไม่ emit (กันดาวลอย)', () => {
    const zero = storefrontSeo({ ...SF, rating: 5, reviewCount: 0 }, ORIGIN);
    expect((zero.jsonLd[0] as { aggregateRating?: unknown }).aggregateRating).toBeUndefined();
  });
  it('มี logoUrl → emit LocalBusiness.logo · ไม่มี → ไม่ emit', () => {
    const withLogo = storefrontSeo({ ...SF, logoUrl: `${ORIGIN}/b/x/logo.svg` }, ORIGIN);
    expect((withLogo.jsonLd[0] as { logo?: string }).logo).toBe(`${ORIGIN}/b/x/logo.svg`);
    expect((seo.jsonLd[0] as { logo?: string }).logo).toBeUndefined();
  });
});

describe('directorySeo + directoryItemList', () => {
  it('directorySeo เป็น CollectionPage ภาษาไทย', () => {
    const d = directorySeo(ORIGIN);
    expect((d.jsonLd[0] as { '@type': string })['@type']).toBe('CollectionPage');
    expect(d.canonicalUrl).toBe(`${ORIGIN}/b`);
  });
  it('ItemList จำกัดสูงสุด 50 รายการ + position เรียง 1..n', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ slug: `s${i}`, name: `ร้าน ${i}` }));
    const list = directoryItemList(many, ORIGIN) as { itemListElement: { position: number; url: string }[] };
    expect(list.itemListElement).toHaveLength(50);
    expect(list.itemListElement[0].position).toBe(1);
    expect(list.itemListElement[0].url).toBe(`${ORIGIN}/b/s0`);
  });
});

describe('sitemapXml', () => {
  const xml = sitemapXml(
    [{ slug: 'ร้าน-a', updatedAt: '2026-07-01' }, { slug: 'shop-b' }],
    ORIGIN,
  );
  it('มี XML declaration + urlset', () => {
    expect(xml.startsWith('<?xml version="1.0"')).toBe(true);
    expect(xml).toContain('<urlset');
  });
  it('มี public routes หลัก + หน้าร้านทุกร้าน', () => {
    expect(xml).toContain(`<loc>${ORIGIN}</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/b</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/start</loc>`);
    expect(xml).toContain(`${ORIGIN}/b/${encodeURIComponent('ร้าน-a')}`);
    expect(xml).toContain('<lastmod>2026-07-01</lastmod>');
  });
  it('slug ที่ไม่มี updatedAt ไม่ใส่ lastmod', () => {
    const only = sitemapXml([{ slug: 'shop-b' }], ORIGIN);
    const shopBlock = only.slice(only.indexOf('shop-b'));
    expect(shopBlock).not.toContain('<lastmod>');
  });
  it('มี /mit24 (บทความ answer-first) ใน sitemap', () => {
    expect(xml).toContain(`<loc>${ORIGIN}/mit24</loc>`);
  });
});

describe('mit24 (/mit24 answer-first article)', () => {
  const html = mit24PageHtml(ORIGIN);
  it('เป็น HTML doc + canonical /mit24 + robots index', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/mit24">`);
    expect(html).toContain('index,follow');
  });
  it('answer-first: ประโยคแรกตอบ "MIT 24 Steps คืออะไร" + มีทั้ง 4 ระยะ + 24 ขั้น', () => {
    expect(html).toContain(MIT24_FAQ[0].a);          // lead = คำตอบข้อแรก
    expect(html).toContain('Disciplined Entrepreneurship');
    expect(html).toContain('ระยะ 1:');
    expect(html).toContain('ระยะ 4:');
    expect(html).toContain('24. ');                   // ขั้นสุดท้าย (index 23 → เลข 24)
  });
  it('ฝัง Article + FAQPage schema + CTA ไป /start', () => {
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain(`${ORIGIN}/start`);
  });
  it('มี framing AI Operating System + ตารางแมป 4 คำถาม + C-suite AI', () => {
    expect(html).toContain('AI Business Operating System');
    expect(html).toContain('คิด ทำ และติดตามผล');   // differentiation จาก "คอร์สเรียน"
    expect(html).toContain('4 คำถามใหญ่');            // mapping table
    expect(html).toContain('AI CEO');
    expect(html).toContain('AI CFO');
    expect(html).toContain('Scalability');
  });
  it('mit24FaqJsonLd แปลง MIT24_FAQ เป็น Question/Answer ครบ', () => {
    const j = mit24FaqJsonLd() as Record<string, unknown>;
    expect(j['@type']).toBe('FAQPage');
    expect((j.mainEntity as unknown[]).length).toBe(MIT24_FAQ.length);
  });
  it('mit24ArticleJsonLd: publisher = B. Training + mainEntityOfPage /mit24', () => {
    const a = mit24ArticleJsonLd(ORIGIN) as Record<string, unknown>;
    expect(a['@type']).toBe('Article');
    expect((a.publisher as Record<string, unknown>).name).toBe('B. Training Consultant');
    expect(a.mainEntityOfPage).toBe(`${ORIGIN}/mit24`);
  });
});

describe('llmsTxt', () => {
  const txt = llmsTxt(ORIGIN);
  it('ขึ้นต้นด้วยชื่อผลิตภัณฑ์ + summary blockquote', () => {
    expect(txt.startsWith('# CEO AI Thailand')).toBe(true);
    expect(txt).toContain('\n> ');
  });
  it('มีหน้าเว็บสำคัญเป็น absolute URL จาก origin', () => {
    expect(txt).toContain(`${ORIGIN}/start`);
    expect(txt).toContain(`${ORIGIN}/b`);
    expect(txt).toContain(`${ORIGIN}/pricing`);
  });
  it('ตอกย้ำ positioning "สร้างธุรกิจ" (MIT 24 Steps × ระบบ ISO) + ผู้พัฒนา B. Training · compliance = ฟีเจอร์เสริม', () => {
    expect(txt).toContain('B. Training');
    expect(txt).toContain('24 Steps');            // เสาที่ 1 (MIT)
    expect(txt).toContain('ระบบบริหาร');           // เสาที่ 2 (ISO systems)
    expect(txt).toContain('ฟีเจอร์เสริม');          // compliance ไม่ใช่พระเอก
    expect(txt).toContain('คำถามที่พบบ่อย');
  });
});

describe('schema JSON-LD (GEO/AEO)', () => {
  it('organizationJsonLd ผูก parent = B. Training', () => {
    const o = organizationJsonLd(ORIGIN) as Record<string, unknown>;
    expect(o['@type']).toBe('Organization');
    expect(o.url).toBe(ORIGIN);
    expect((o.parentOrganization as Record<string, unknown>).name).toBe('B. Training Consultant');
  });
  it('softwareApplicationJsonLd มี offers ครบ 4 แพ็ก', () => {
    const s = softwareApplicationJsonLd(ORIGIN) as Record<string, unknown>;
    expect(s['@type']).toBe('SoftwareApplication');
    const offers = s.offers as Record<string, unknown>[];
    expect(offers).toHaveLength(4);
    expect(offers.map(o => o.price)).toEqual(['0', '790', '1490', '5900']);
  });
  it('faqPageJsonLd แปลง FAQ_ITEMS เป็น Question/Answer ครบ', () => {
    const f = faqPageJsonLd() as Record<string, unknown>;
    expect(f['@type']).toBe('FAQPage');
    const items = f.mainEntity as Record<string, unknown>[];
    expect(items).toHaveLength(FAQ_ITEMS.length);
    expect(items[0]['@type']).toBe('Question');
    expect((items[0].acceptedAnswer as Record<string, unknown>).text).toBe(FAQ_ITEMS[0].a);
  });
  it('homeSeo มี schema ครบ 3 ชนิด + canonical หน้าแรก', () => {
    const seo = homeSeo(ORIGIN);
    expect(seo.canonicalUrl).toBe(ORIGIN + '/');
    expect(seo.jsonLd).toHaveLength(3);
    expect(seo.title).toContain('CEO AI Thailand');
  });
});

describe('faqPageHtml (/faq static page)', () => {
  const html = faqPageHtml(ORIGIN);
  it('เป็น HTML doc เต็ม + มี FAQ ที่มองเห็น (crawlable) ทุกข้อ', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    FAQ_ITEMS.forEach(f => expect(html).toContain(escapeHtml(f.q)));
  });
  it('มี FAQPage JSON-LD ฝัง + CTA ไป /start', () => {
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain(`${ORIGIN}/start`);
    expect(html).toContain(`${ORIGIN}/faq`);
  });
});
