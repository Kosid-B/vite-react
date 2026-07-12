/* ===== SEO builders (pure) — source of truth เดียวสำหรับ Worker + client =====
 * Worker (src/server.ts) inject ฝั่ง server ผ่าน HTMLRewriter,
 * client (src/lib/seo.ts) inject ตอน render — ทั้งคู่เรียกฟังก์ชันในไฟล์นี้เพื่อให้ผลตรงกัน.
 * ห้าม import อะไรที่แตะ DOM/browser — ต้องรันได้ทั้งใน Cloudflare Worker และเบราว์เซอร์. */

import { DBD_SECTORS } from '../data/dbd';

/** ข้อมูลร้านขั้นต่ำที่ใช้สร้าง SEO — ทั้ง Storefront (client) และแถวจาก REST (worker) เข้าได้ */
export interface SeoStorefront {
  slug: string;
  name: string;
  dbd: string;
  kind?: string;
  vp?: string;
  description?: string;
  promo?: string;
  images?: string[];
  phone?: string;
  rating?: number;        // ค่าเฉลี่ยรีวิวจริง 1..5 (จาก aggregateRating) — emit schema เฉพาะเมื่อมีจริง
  reviewCount?: number;   // จำนวนรีวิวจริง
}

export interface SeoData {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  jsonLd: object[];
}

const DEFAULT_OG = '/og-image.png';

/** ป้ายหมวด DBD อ่านง่าย — reuse โดย PublicStorefront.tsx ด้วย */
export function sectorLabel(dbd: string): string {
  const m = (dbd || '').match(/^\[([A-Z])\]/);
  const sec = m ? DBD_SECTORS.find(s => s.code === m[1]) : undefined;
  return sec ? `หมวด ${sec.code} · ${sec.label}` : (dbd || 'ไม่ระบุหมวด');
}

/** ชื่อหมวดล้วน (ไม่มีคำว่า "หมวด X ·") สำหรับ schema category */
function sectorName(dbd: string): string {
  const m = (dbd || '').match(/^\[([A-Z])\]/);
  const sec = m ? DBD_SECTORS.find(s => s.code === m[1]) : undefined;
  return sec ? sec.label : '';
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(s: string, n: number): string {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
}

/** สร้าง <script type="application/ld+json"> string ที่ปลอดภัยสำหรับ inject ลง HTML (worker)
 *  escape `<` เป็น < กัน `</script>` breakout */
export function jsonLdScript(objs: object[]): string {
  const payload = objs.length === 1 ? objs[0] : objs;
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

/** SEO ต่อหน้าร้าน /b/<slug> — LocalBusiness + BreadcrumbList */
export function storefrontSeo(sf: SeoStorefront, origin: string): SeoData {
  const name = (sf.name || 'ร้านค้า').trim();
  const label = sectorLabel(sf.dbd);
  const title = `${name} — ${label} | CEO AI Thailand`;
  const description = truncate(
    sf.vp || sf.description || `${name} บนตลาดธุรกิจไทย CEO AI Thailand`,
    155,
  );
  const canonicalUrl = `${origin}/b/${encodeURIComponent(sf.slug)}`;
  const imageUrl = (sf.images && sf.images[0]) || `${origin}${DEFAULT_OG}`;
  const cat = sectorName(sf.dbd);

  const business: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    description,
    url: canonicalUrl,
    image: imageUrl,
    address: { '@type': 'PostalAddress', addressCountry: 'TH' },
    areaServed: 'TH',
  };
  if (sf.phone) business.telephone = sf.phone;
  if (cat) business.knowsAbout = cat;
  // AggregateRating (rich snippet ดาวใน Google) — เฉพาะเมื่อมีรีวิว "จริง" เท่านั้น (ไม่ปั้นดาวปลอม)
  if (typeof sf.rating === 'number' && sf.rating >= 1 && sf.rating <= 5 && (sf.reviewCount ?? 0) >= 1) {
    business.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: sf.rating,
      reviewCount: sf.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'CEO AI Thailand', item: origin },
      { '@type': 'ListItem', position: 2, name: 'ตลาดธุรกิจไทย', item: `${origin}/b` },
      { '@type': 'ListItem', position: 3, name, item: canonicalUrl },
    ],
  };

  return { title, description, canonicalUrl, imageUrl, jsonLd: [business, breadcrumb] };
}

/** SEO หน้าตลาด /b — CollectionPage (ItemList แนบภายหลังด้วย directoryItemList) */
export function directorySeo(origin: string): SeoData {
  const title = 'ตลาดสินค้า & บริการธุรกิจไทย | CEO AI Thailand';
  const description =
    'ค้นหาสินค้าและบริการจากธุรกิจไทยที่ขับเคลื่อนด้วยทีม AI — เลือกตามหมวดหมู่ DBD ' +
    'ค้นหาร้าน สินค้า บริการ และคู่ค้า B2B ได้ฟรีบน CEO AI Thailand';
  const canonicalUrl = `${origin}/b`;
  const imageUrl = `${origin}${DEFAULT_OG}`;
  const jsonLd: object[] = [{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: canonicalUrl,
    inLanguage: 'th',
  }];
  return { title, description, canonicalUrl, imageUrl, jsonLd };
}

/** ItemList JSON-LD ของร้านที่เผยแพร่ (สูงสุด 50) — แนบเข้า jsonLd ของ directorySeo */
export function directoryItemList(
  list: { slug: string; name: string }[],
  origin: string,
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: list.slice(0, 50).map((sf, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: sf.name,
      url: `${origin}/b/${encodeURIComponent(sf.slug)}`,
    })),
  };
}

/** sitemap.xml — หน้าหลัก + public routes + ทุกหน้าร้านที่เผยแพร่ */
export function sitemapXml(
  entries: { slug: string; updatedAt?: string }[],
  origin: string,
): string {
  const urls: { loc: string; priority: string; lastmod?: string }[] = [
    { loc: origin, priority: '1.0' },
    { loc: `${origin}/b`, priority: '0.9' },
    { loc: `${origin}/start`, priority: '0.8' },
    { loc: `${origin}/shop`, priority: '0.7' },
    { loc: `${origin}/legal`, priority: '0.5' },
    ...entries.map(e => ({
      loc: `${origin}/b/${encodeURIComponent(e.slug)}`,
      priority: '0.6',
      lastmod: e.updatedAt,
    })),
  ];
  const body = urls
    .map(u =>
      '  <url>\n' +
      `    <loc>${escapeHtml(u.loc)}</loc>\n` +
      (u.lastmod ? `    <lastmod>${escapeHtml(u.lastmod)}</lastmod>\n` : '') +
      `    <priority>${u.priority}</priority>\n` +
      '  </url>')
    .join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body +
    '\n</urlset>\n'
  );
}
