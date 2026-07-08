import { describe, it, expect } from 'vitest';
import {
  escapeHtml, jsonLdScript, sectorLabel,
  storefrontSeo, directorySeo, directoryItemList, sitemapXml,
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
});
