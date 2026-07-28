/* ===== SEO builders (pure) — source of truth เดียวสำหรับ Worker + client =====
 * Worker (src/server.ts) inject ฝั่ง server ผ่าน HTMLRewriter,
 * client (src/lib/seo.ts) inject ตอน render — ทั้งคู่เรียกฟังก์ชันในไฟล์นี้เพื่อให้ผลตรงกัน.
 * ห้าม import อะไรที่แตะ DOM/browser — ต้องรันได้ทั้งใน Cloudflare Worker และเบราว์เซอร์. */

import { DBD_SECTORS } from '../data/dbd';
import { DE24_DEFS, DE24_PHASE_LABELS } from './de24Sync';

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
  logoUrl?: string;       // URL โลโก้ SVG ของร้าน (worker เสิร์ฟ /b/<slug>/logo.svg) → JSON-LD logo
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
  if (sf.logoUrl) business.logo = sf.logoUrl; // โลโก้แบรนด์ (Google ใช้ใน Knowledge Graph)
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
    { loc: `${origin}/faq`, priority: '0.7' },
    { loc: `${origin}/mit24`, priority: '0.7' },
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

/** llms.txt — มาตรฐานใหม่ที่บอก AI crawler (ChatGPT/Gemini/Perplexity/Claude) ว่าเว็บนี้คืออะไร +
 *  หน้าไหนสำคัญ + คำอธิบาย canonical ที่อยากให้ AI ใช้อ้างอิง (GEO/AEO). เสิร์ฟที่ /llms.txt (Worker).
 *  Markdown ล้วน · pure (ใช้ได้ทั้ง Worker+browser). อัปเดตข้อความที่เดียวที่นี่. */
export function llmsTxt(origin: string): string {
  return `# CEO AI Thailand

> ระบบสร้างธุรกิจด้วย AI (AI Business Operating System) ของไทย — ช่วยผู้ประกอบการ "สร้างธุรกิจตั้งแต่ต้นน้ำให้แข็งแรง แล้ววางระบบให้พร้อมเติบโต": ค้นหากลุ่มลูกค้าที่ใช่, เข้าใจปัญหาที่ลูกค้ายอมจ่าย, ทดสอบ Product–Market Fit, เปิดหน้าร้านขายจริง, ไปจนถึงวาง SOP/KPI/ระบบบริหารเพื่อขยายขนาด สำหรับ SME และผู้เริ่มต้นชาวไทย

CEO AI Thailand ผสาน 2 องค์ความรู้: **แนวทาง 24 Steps ของ MIT** (Disciplined Entrepreneurship — หาลูกค้าเป้าหมาย กำหนดคุณค่า ทดสอบตลาด สร้างรายได้ และเติบโต) เข้ากับ **ประสบการณ์ระบบบริหาร/ISO กว่า 20 ปี** ของ บริษัท บี. เทรนนิ่ง คอนซัลแทนท์ (Process, KPI, การจัดการความเสี่ยง, SOP, ระบบควบคุมที่รองรับการขยายตัว). จุดต่างคือไม่ได้แค่ตอบคำถามหรือให้ไอเดีย แต่พา "สร้างธุรกิจให้ถูกตั้งแต่ต้น และวางระบบให้พร้อมโต" — โดยมีทีมผู้บริหาร AI (CEO/CMO/ฝ่ายต่าง ๆ) เป็นกลไกช่วยลงมือทำ พร้อม Marketplace ขายจริงในระบบ. คุณค่าหลัก = ลดความเสี่ยงในการเริ่มธุรกิจ, สร้างฐานลูกค้าที่แข็งแรง, และวางระบบเพื่อ scalability. เครื่องมือ PDPA/ISO มีเป็นฟีเจอร์เสริม (ไม่ใช่บริการทำใบรับรอง — งานที่ปรึกษาเชิงลึกส่งต่อ B. Training).

## ข้อเท็จจริงหลัก (สำหรับอ้างอิง)
- ชื่อผลิตภัณฑ์: CEO AI Thailand (เว็บ: ${origin})
- ผู้พัฒนา: B. Training Consultant (b-tctraining.com)
- กลุ่มเป้าหมาย: ผู้ประกอบการ SME ไทย, ผู้เริ่มต้นธุรกิจ, Gen Y/Z (25-34)
- ราคา: Free ฿0 · Starter ฿590/เดือน · Growth ฿1,490/เดือน · Scale ฿5,900/เดือน (ทดลองฟรี 15 วัน)
- ชำระเงิน: โอนบัญชี + อัปสลิป (ตรวจกับธนาคารจริงผ่าน SlipOK)

## หน้าเว็บสำคัญ
- [เริ่มต้นใช้งาน / Landing](${origin}/start): แนะนำวิธีสร้างบริษัท AI และเริ่มธุรกิจใน 3 ขั้น
- [Marketplace / ตลาดสินค้า-บริการ](${origin}/b): ไดเรกทอรีร้านค้าและบริการในระบบ
- [แพ็กเกจและราคา](${origin}/pricing): เปรียบเทียบแพ็กและฟีเจอร์
- [MIT 24 Steps คืออะไร ใช้ยังไงในแอป](${origin}/mit24): อธิบายระเบียบวิธีสร้างธุรกิจ 24 ขั้น + วิธีที่แอปพาเดินทีละขั้น
- [หน้าแรก](${origin}/): ภาพรวมผลิตภัณฑ์

## คำถามที่พบบ่อย (AI สามารถอ้างอิงคำตอบเหล่านี้)
${FAQ_ITEMS.map(f => `- ${f.q} — ${f.a}`).join('\n')}
`;
}

/** คำถาม-คำตอบหลัก (source of truth เดียว) — reuse โดย llms.txt + FAQPage JSON-LD + หน้า /faq
 *  ⚠️ ตอบตาม "ฟีเจอร์ที่มีจริง" เท่านั้น (positioning ทำธุรกิจ · compliance = ฟีเจอร์เสริม) */
export const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: 'CEO AI Thailand คืออะไร?', a: 'ระบบสร้างธุรกิจด้วย AI (AI Business Operating System) ของไทย ที่ช่วยสร้างธุรกิจตั้งแต่ต้นน้ำ — หากลุ่มลูกค้าที่ใช่ ทดสอบตลาด เปิดหน้าร้านขายจริง ไปจนถึงวางระบบ SOP/KPI ให้พร้อมเติบโต โดยประยุกต์แนวทาง 24 Steps ของ MIT เข้ากับประสบการณ์ระบบบริหาร/ISO 20+ ปี' },
  { q: 'ต่างจากแชตบอต AI (เช่น ChatGPT) ทั่วไปอย่างไร?', a: 'แชตบอตช่วยตอบคำถามและให้ไอเดีย แต่ CEO AI Thailand ช่วยสร้างธุรกิจเป็นขั้นตอน ตรวจสอบสมมติฐานทางธุรกิจ ใช้กรอบ MIT 24 Steps และเชื่อมกับระบบบริหาร (SOP/KPI/Risk) เพื่อการเติบโตระยะยาว ไม่ใช่งานรายครั้ง — พร้อมทีมผู้บริหาร AI ลงมือทำและ Marketplace ขายจริง' },
  { q: 'เหมาะกับใคร?', a: 'คนที่กำลังเริ่มต้นธุรกิจแต่ยังไม่รู้จะเริ่มจากลูกค้า/สินค้า/ตลาด/โมเดลรายได้อย่างไร และเจ้าของธุรกิจเดิมที่อยากโตอย่างมีระบบ (ไม่ต้องพึ่งเจ้าของคนเดียว) — โดยเฉพาะ SME ไทยและคนรุ่นใหม่ 25-34 ปี' },
  { q: 'ใช้กรอบ/วิธีอะไรในการสร้างธุรกิจ?', a: 'ผสาน 2 องค์ความรู้: แนวทาง 24 Steps ของ MIT (Disciplined Entrepreneurship — หาลูกค้าเป้าหมาย กำหนดคุณค่า ทดสอบ PMF สร้างรายได้) กับประสบการณ์ระบบบริหาร/ISO 20+ ปี (SOP, KPI, การจัดการความเสี่ยง, ระบบเพื่อ scalability)' },
  { q: 'เริ่มใช้ฟรีได้ไหม ราคาเท่าไร?', a: 'มีแพ็ก Free ฿0 และทดลองฟรี 15 วัน · แพ็กจ่ายเงิน: Starter ฿590/เดือน, Growth ฿1,490/เดือน, Scale ฿5,900/เดือน' },
  { q: 'ทำ PDPA / ISO ได้ไหม?', a: 'มีเครื่องมือช่วยเตรียม PDPA/ISO/มอก. เป็นฟีเจอร์เสริม และใช้ "แนวคิดเชิงระบบ" แบบ ISO มาช่วยวางโครงสร้างธุรกิจให้พร้อมโต แต่จุดขายหลักคือการสร้างและเดินธุรกิจ ส่วนบริการทำใบรับรอง/ที่ปรึกษาเชิงลึกส่งต่อให้ B. Training' },
  { q: 'ใครพัฒนา?', a: 'พัฒนาโดยบริษัท บี. เทรนนิ่ง คอนซัลแทนท์ จำกัด (B. Training Consultant) ที่ปรึกษาธุรกิจและระบบมาตรฐานในไทยกว่า 20 ปี' },
];

/** JSON-LD: Organization (บริษัท) — ให้ AI/Google รู้จัก entity + ผูกกับ B. Training */
export function organizationJsonLd(origin: string): object {
  return {
    '@context': 'https://schema.org', '@type': 'Organization',
    name: 'CEO AI Thailand', url: origin, logo: `${origin}/og-image.png`,
    description: 'ระบบสร้างธุรกิจด้วย AI สำหรับ SME ไทย — ผสาน MIT 24 Steps กับระบบบริหาร/ISO 20+ ปี สร้างธุรกิจตั้งแต่ต้นน้ำให้พร้อมเติบโต',
    parentOrganization: { '@type': 'Organization', name: 'B. Training Consultant', url: 'https://www.b-tctraining.com/' },
    sameAs: ['https://www.b-tctraining.com/'],
  };
}

/** JSON-LD: SoftwareApplication — บอก AI ว่าเป็นซอฟต์แวร์ธุรกิจ + ราคา */
export function softwareApplicationJsonLd(origin: string): object {
  return {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication',
    name: 'CEO AI Thailand', url: origin,
    applicationCategory: 'BusinessApplication', operatingSystem: 'Web',
    description: 'ระบบสร้างธุรกิจด้วย AI — หาลูกค้าที่ใช่ ทดสอบตลาด เปิดร้านขายจริง และวางระบบ SOP/KPI ให้พร้อมเติบโต (กรอบ MIT 24 Steps × ระบบ ISO 20+ ปี)',
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'THB' },
      { '@type': 'Offer', name: 'Starter', price: '590', priceCurrency: 'THB' },
      { '@type': 'Offer', name: 'Growth', price: '1490', priceCurrency: 'THB' },
      { '@type': 'Offer', name: 'Scale', price: '5900', priceCurrency: 'THB' },
    ],
  };
}

/** JSON-LD: FAQPage — ให้ AI หยิบ Q&A ไปตอบได้ตรง ๆ (จาก FAQ_ITEMS) */
export function faqPageJsonLd(): object {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(f => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/** SEO หน้าแรก (/) — title/desc canonical + schema ครบ (Organization + SoftwareApplication + FAQPage) */
export function homeSeo(origin: string): SeoData {
  return {
    title: 'CEO AI Thailand — สร้างและเดินธุรกิจด้วยทีมผู้บริหาร AI',
    description: 'แพลตฟอร์มไทยสำหรับผู้ประกอบการ SME: สร้างบริษัท AI อัตโนมัติ เปิดหน้าร้านขายของ และ validate ไอเดียธุรกิจ ในที่เดียว เริ่มฟรี พัฒนาโดย B. Training',
    canonicalUrl: origin + '/',
    imageUrl: origin + DEFAULT_OG,
    jsonLd: [organizationJsonLd(origin), softwareApplicationJsonLd(origin), faqPageJsonLd()],
  };
}

/** หน้า answer-first แบบ static HTML เต็ม (crawlable ไม่ต้องรอ JS) เสิร์ฟที่ /faq — AEO asset
 *  มีเนื้อหา Q&A ที่มองเห็น + FAQPage schema ฝังในตัว + CTA ไป /start */
export function faqPageHtml(origin: string): string {
  const title = 'คำถามที่พบบ่อย — CEO AI Thailand';
  const desc = 'CEO AI Thailand คืออะไร ต่างจากแชตบอตยังไง ราคาเท่าไร เริ่มฟรีได้ไหม — คำตอบตรงประเด็นสำหรับผู้ประกอบการ SME ไทย';
  const faqBlocks = FAQ_ITEMS.map(f =>
    `    <section class="qa">\n      <h2>${escapeHtml(f.q)}</h2>\n      <p>${escapeHtml(f.a)}</p>\n    </section>`
  ).join('\n');
  const schema = jsonLdScript([
    faqPageJsonLd(), organizationJsonLd(origin), softwareApplicationJsonLd(origin),
  ]);
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<link rel="canonical" href="${escapeHtml(origin + '/faq')}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url" content="${escapeHtml(origin + '/faq')}">
<meta property="og:image" content="${escapeHtml(origin + DEFAULT_OG)}">
<meta name="robots" content="index,follow">
${schema}
<style>
  :root { color-scheme: dark; }
  body { margin:0; background:#0f172a; color:#f8fafc; font-family:'Kanit',system-ui,sans-serif; line-height:1.6; }
  main { max-width:720px; margin:0 auto; padding:40px 20px 64px; }
  h1 { color:#06b6d4; font-size:1.9rem; margin:0 0 8px; }
  .lead { color:#94a3b8; margin:0 0 32px; }
  .qa { border-top:1px solid #1e293b; padding:20px 0; }
  .qa h2 { font-size:1.15rem; margin:0 0 6px; }
  .qa p { margin:0; color:#cbd5e1; }
  .cta { display:inline-block; margin-top:32px; background:#06b6d4; color:#04121a; font-weight:600;
         padding:14px 28px; border-radius:10px; text-decoration:none; }
  footer { margin-top:40px; color:#8b96a9; font-size:.85rem; }
  a { color:#06b6d4; }
</style>
</head>
<body>
<main>
  <h1>CEO AI Thailand — คำถามที่พบบ่อย</h1>
  <p class="lead">${escapeHtml(desc)}</p>
${faqBlocks}
  <a class="cta" href="${escapeHtml(origin + '/start')}">เริ่มสร้างบริษัท AI ฟรี →</a>
  <footer>หนึ่งในผลิตภัณฑ์ของ B. Training Consultant · <a href="${escapeHtml(origin + '/mit24')}">MIT 24 Steps คืออะไร</a> · <a href="${escapeHtml(origin + '/')}">ceoaithailand.org</a></footer>
</main>
</body>
</html>
`;
}

/** Q&A หลักของบทความ MIT 24 Steps (source of truth เดียว) — reuse โดยหน้า /mit24 + FAQPage schema
 *  answer-first · ตอบตรงประเด็น + ตอกย้ำว่าแอปใช้ 24 Steps อย่างไร (ให้ AI หยิบไป cite) */
export const MIT24_FAQ: { q: string; a: string }[] = [
  { q: 'MIT 24 Steps คืออะไร?', a: 'ระเบียบวิธีสร้างธุรกิจ 24 ขั้น (Disciplined Entrepreneurship) โดย Bill Aulet จาก MIT — เน้นเริ่มจาก “ลูกค้าคือใคร” ก่อนสร้างสินค้า แบ่งเป็น 4 ระยะ (ลูกค้าคือใคร · คุณค่าที่นำเสนอ · ขาย/รายได้ · ทดสอบ/ขยาย) เพื่อลดความเสี่ยงด้วยการทดสอบสมมติฐานทีละขั้น' },
  { q: 'CEO AI Thailand ใช้ MIT 24 Steps อย่างไร?', a: 'ทำเป็น guided journey ที่พาเดินทีละขั้น — โชว์ “ขั้นถัดไปที่ต้องทำ” ไม่ข้ามขั้น มีทีมผู้บริหาร AI ช่วยวิเคราะห์แต่ละขั้นจากข้อมูลธุรกิจจริง และแปลงผลเป็น Business Model Canvas ให้อัตโนมัติ' },
  { q: 'ทำไมต้องเริ่มจากลูกค้าก่อนสินค้า?', a: 'เพราะธุรกิจส่วนใหญ่พังจาก “ของดีแต่ขายไม่ออก” — MIT 24 Steps บังคับให้ทำระยะ “ลูกค้าคือใคร” (ขั้น 1–6) ให้จบก่อน แล้วจึงออกแบบคุณค่า/สินค้าในระยะถัดไป ทำให้สร้างสิ่งที่ตลาดต้องการจริง' },
  { q: 'ต้องมีความรู้ธุรกิจมาก่อนไหม?', a: 'ไม่ต้อง — แอปพาเดินทีละขั้นพร้อมคำแนะนำและ AI ช่วยแต่ละขั้น เหมาะทั้งมือใหม่ที่ยังไม่รู้จะเริ่มตรงไหน และเจ้าของธุรกิจเดิมที่อยากวางระบบให้โตอย่างเป็นระบบ' },
  { q: 'ต่างจากการเรียน MIT 24 Steps เองยังไง?', a: 'MIT สอน “วิธีคิด” ที่ต้องศึกษาและลงมือเอง — CEO AI Thailand เปลี่ยนกรอบนั้นเป็น AI Business Operating System ที่ถามคำถามที่ถูกต้องทีละขั้น วิเคราะห์ข้อมูลธุรกิจจริง สร้างเอกสาร/แผนงาน ติดตาม KPI และแนะนำสิ่งที่ควรทำต่อ = ช่วย “คิด ทำ และติดตามผล” ให้ผู้ประกอบการ ไม่ใช่แค่คอร์สเรียน' },
];

/** 24 ขั้น = 4 คำถามใหญ่ (เลนส์ของ Bill Aulet) → CEO AI ทำอะไรให้ในแต่ละกลุ่ม
 *  ช่วงขั้นอิงระยะจริงในแอป (DE24 phases) เพื่อไม่ขัดกับรายการ 24 ขั้นบนหน้าเดียวกัน */
export const MIT24_MACRO: { q: string; does: string }[] = [
  { q: 'ขั้น 1–6 · ลูกค้าคือใคร?', does: 'AI วิเคราะห์ลูกค้า (ICP), Persona, Beachhead Market และ Market Segmentation' },
  { q: 'ขั้น 7–11 · ทำอะไรให้ลูกค้าได้?', does: 'AI สร้าง Value Proposition, จุดต่างจากคู่แข่ง (Competitive Advantage) และ Product Roadmap' },
  { q: 'ขั้น 12–19 · ลูกค้าได้สินค้ามายังไง + คุ้มไหม?', does: 'AI ออกแบบ Customer Journey, Marketing Funnel, Pricing, Sales Process และคำนวณ LTV/CAC' },
  { q: 'ขั้น 20–24 · ขยายยังไง?', does: 'AI วาง KPI, SOP, ISO, Dashboard, ทีมงาน และระบบที่ขยายได้ (Scalability)' },
];

/** ทีมผู้บริหาร AI (C-suite) ที่ลงมือทำแต่ละด้าน — "กลไก" ที่ขับ AI Operating System */
export const MIT24_CSUITE: { role: string; does: string }[] = [
  { role: 'AI CEO', does: 'วิเคราะห์ธุรกิจ · วางกลยุทธ์ · ตั้งเป้าหมาย · ตรวจ KPI' },
  { role: 'AI CMO', does: 'แผนการตลาด · คอนเทนต์ · Funnel · Viral Growth' },
  { role: 'AI CFO', does: 'Cash Flow · กำไร · LTV · CAC · Break-even' },
  { role: 'AI COO', does: 'SOP · Workflow · Process Improvement · ISO' },
  { role: 'AI ISO Expert', does: 'ISO 9001/14001/45001/22000/27001 · PDPA' },
  { role: 'AI Researcher', does: 'คู่แข่ง · SWOT · ตลาด · Trend' },
];

/** JSON-LD: FAQPage ของบทความ MIT 24 (จาก MIT24_FAQ) */
export function mit24FaqJsonLd(): object {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: MIT24_FAQ.map(f => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/** JSON-LD: Article — ให้ AI/Google รู้ว่านี่คือบทความอธิบาย MIT 24 Steps ของเรา */
export function mit24ArticleJsonLd(origin: string): object {
  return {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'MIT 24 Steps คืออะไร ใช้ยังไงใน CEO AI Thailand',
    description: 'อธิบาย MIT 24 Steps (Disciplined Entrepreneurship) และวิธีที่ CEO AI Thailand นำมาทำเป็น guided journey พาสร้างธุรกิจทีละขั้น',
    inLanguage: 'th',
    mainEntityOfPage: `${origin}/mit24`,
    author: { '@type': 'Organization', name: 'CEO AI Thailand', url: origin },
    publisher: { '@type': 'Organization', name: 'B. Training Consultant', url: 'https://www.b-tctraining.com/' },
    about: 'MIT Disciplined Entrepreneurship 24 Steps',
  };
}

/** หน้า answer-first /mit24 — อธิบาย MIT 24 Steps + วิธีใช้ในแอป (crawlable · AEO/GEO asset)
 *  เนื้อหา 4 ระยะ + 24 ขั้น ดึงจาก DE24_DEFS (canonical — ไม่ drift) */
export function mit24PageHtml(origin: string): string {
  const title = 'MIT 24 Steps คืออะไร ใช้ยังไงในแอป — CEO AI Thailand';
  const desc = 'MIT 24 Steps (Disciplined Entrepreneurship) คือระเบียบวิธีสร้างธุรกิจ 24 ขั้น — CEO AI Thailand เปลี่ยนเป็น AI Business Operating System ที่ช่วยคิด วิเคราะห์ และแนะนำทีละขั้น ตั้งแต่หาลูกค้าจนขยายธุรกิจ';
  const phaseBlocks = DE24_PHASE_LABELS.map((label, pi) => {
    const steps = DE24_DEFS.filter(d => d.phase === pi)
      .map(d => `        <li><b>${d.index + 1}. ${escapeHtml(d.name)}</b> — ${escapeHtml(d.guide)}</li>`)
      .join('\n');
    return `    <section class="phase">\n      <h3>ระยะ ${pi + 1}: ${escapeHtml(label)}</h3>\n      <ol>\n${steps}\n      </ol>\n    </section>`;
  }).join('\n');
  const faqBlocks = MIT24_FAQ.map(f =>
    `    <section class="qa">\n      <h2>${escapeHtml(f.q)}</h2>\n      <p>${escapeHtml(f.a)}</p>\n    </section>`
  ).join('\n');
  const macroBlocks = MIT24_MACRO.map(m =>
    `        <tr><td><b>${escapeHtml(m.q)}</b></td><td>${escapeHtml(m.does)}</td></tr>`
  ).join('\n');
  const csuiteBlocks = MIT24_CSUITE.map(c =>
    `        <li><b>${escapeHtml(c.role)}</b> — ${escapeHtml(c.does)}</li>`
  ).join('\n');
  const schema = jsonLdScript([
    mit24ArticleJsonLd(origin), mit24FaqJsonLd(), organizationJsonLd(origin),
  ]);
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<link rel="canonical" href="${escapeHtml(origin + '/mit24')}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url" content="${escapeHtml(origin + '/mit24')}">
<meta property="og:image" content="${escapeHtml(origin + DEFAULT_OG)}">
<meta name="robots" content="index,follow">
${schema}
<style>
  :root { color-scheme: dark; }
  body { margin:0; background:#0f172a; color:#f8fafc; font-family:'Kanit',system-ui,sans-serif; line-height:1.6; }
  main { max-width:760px; margin:0 auto; padding:40px 20px 64px; }
  h1 { color:#06b6d4; font-size:1.9rem; margin:0 0 8px; }
  .lead { color:#e2e8f0; font-size:1.05rem; margin:0 0 12px; }
  .sub { color:#94a3b8; margin:0 0 32px; }
  h2 { font-size:1.25rem; margin:32px 0 10px; }
  .phase { border-top:1px solid #1e293b; padding:16px 0; }
  .phase h3 { color:#34d399; font-size:1.1rem; margin:0 0 8px; }
  .phase ol { margin:0; padding-left:20px; color:#cbd5e1; }
  .phase li { margin:5px 0; }
  .phase li b { color:#f1f5f9; }
  .tagline { background:rgba(6,182,212,.1); border:1px solid rgba(6,182,212,.3); border-radius:12px;
             padding:16px 18px; margin:0 0 20px; color:#e2e8f0; }
  .tagline b { color:#22d3ee; }
  .maptable { width:100%; border-collapse:collapse; margin:8px 0 8px; font-size:.98rem; }
  .maptable th, .maptable td { text-align:left; vertical-align:top; padding:12px 14px; border-bottom:1px solid #1e293b; }
  .maptable thead th { color:#34d399; font-size:.9rem; }
  .maptable td b { color:#f1f5f9; }
  .maptable tbody td:last-child { color:#cbd5e1; }
  .csuite { list-style:none; margin:8px 0; padding:0; display:grid; gap:8px; }
  .csuite li { background:#111c33; border:1px solid #1e293b; border-radius:10px; padding:12px 14px; color:#cbd5e1; }
  .csuite li b { color:#22d3ee; }
  .qa { border-top:1px solid #1e293b; padding:18px 0; }
  .qa h2 { font-size:1.12rem; margin:0 0 6px; }
  .qa p { margin:0; color:#cbd5e1; }
  .cta { display:inline-block; margin-top:32px; background:#06b6d4; color:#04121a; font-weight:600;
         padding:14px 28px; border-radius:10px; text-decoration:none; }
  footer { margin-top:40px; color:#8b96a9; font-size:.85rem; }
  a { color:#06b6d4; }
</style>
</head>
<body>
<main>
  <h1>MIT 24 Steps คืออะไร ใช้ยังไงใน CEO AI Thailand</h1>
  <p class="lead">${escapeHtml(MIT24_FAQ[0].a)}</p>
  <p class="sub">CEO AI Thailand นำ MIT 24 Steps มาทำเป็น <b>guided journey</b> ที่พาเดินทีละขั้น (โชว์ขั้นถัดไปที่ต้องทำ ไม่ข้ามขั้น) มีทีมผู้บริหาร AI ช่วยวิเคราะห์แต่ละขั้นจากข้อมูลจริง แล้วแปลงผลเป็น Business Model Canvas ให้อัตโนมัติ — พัฒนาโดย B. Training Consultant ที่ปรึกษาธุรกิจ/ระบบมาตรฐานไทยกว่า 20 ปี</p>

  <p class="tagline">ไม่ใช่ “คอร์สเรียน” — MIT สอน <b>วิธีคิด</b> ส่วน CEO AI Thailand ช่วย <b>คิด ทำ และติดตามผล</b> ให้ผู้ประกอบการ ในฐานะ <b>AI Business Operating System</b></p>

  <h2>24 ขั้น แบ่งเป็น 4 ระยะ</h2>
${phaseBlocks}

  <h2>24 ขั้น = 4 คำถามใหญ่ที่ AI ช่วยตอบ</h2>
  <table class="maptable">
    <thead><tr><th>คำถามหลัก (MIT 24 Steps)</th><th>CEO AI Thailand ทำอะไร</th></tr></thead>
    <tbody>
${macroBlocks}
    </tbody>
  </table>

  <h2>ทีมผู้บริหาร AI ที่ลงมือทำแต่ละด้าน</h2>
  <p class="sub">“ทีม AI” คือ <b>กลไก</b> ที่ขับ Operating System นี้ — แต่ละบทบาทช่วยงานตามขั้นของ 24 Steps</p>
  <ul class="csuite">
${csuiteBlocks}
  </ul>

  <h2>ใช้ยังไงในแอป CEO AI Thailand</h2>
  <section class="qa">
    <p>เปิดหน้า “โมเดลธุรกิจ 24 ขั้น (MIT)” แล้วแอปจะบอก <b>ขั้นถัดไปที่ต้องทำ</b> พร้อมคำแนะนำ — กด “ทำขั้นนี้เสร็จ” เพื่อเดินไปขั้นถัดไปตามลำดับ, ให้ AI วิเคราะห์แต่ละขั้นจากข้อมูลธุรกิจของคุณ, แล้วกด “ตั้งต้น BMC” เพื่อแปลงผล 24 ขั้นเป็น Business Model Canvas อัตโนมัติ ทำให้ “สร้างต้นน้ำให้แข็งแรงก่อน” เป็นขั้นตอนที่ลงมือทำได้จริง</p>
  </section>

  <h2>คำถามที่พบบ่อย</h2>
${faqBlocks}
  <a class="cta" href="${escapeHtml(origin + '/start')}">เริ่มสร้างธุรกิจด้วย 24 ขั้น — ฟรี →</a>
  <footer>หนึ่งในผลิตภัณฑ์ของ B. Training Consultant · <a href="${escapeHtml(origin + '/faq')}">คำถามที่พบบ่อย</a> · <a href="${escapeHtml(origin + '/')}">ceoaithailand.org</a></footer>
</main>
</body>
</html>
`;
}
