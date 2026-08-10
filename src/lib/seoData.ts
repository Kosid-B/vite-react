/* ===== SEO builders (pure) — source of truth เดียวสำหรับ Worker + client =====
 * Worker (src/server.ts) inject ฝั่ง server ผ่าน HTMLRewriter,
 * client (src/lib/seo.ts) inject ตอน render — ทั้งคู่เรียกฟังก์ชันในไฟล์นี้เพื่อให้ผลตรงกัน.
 * ห้าม import อะไรที่แตะ DOM/browser — ต้องรันได้ทั้งใน Cloudflare Worker และเบราว์เซอร์. */

import { DBD_SECTORS } from '../data/dbd';
import { DE24_DEFS, DE24_PHASE_LABELS } from './de24Sync';
import { validCoord } from './geo';
import { SAFETY_COMMITMENTS, SAFETY_FAQ } from './aiSafety';
import { HERO_VARIANTS, type HeroSeg } from './heroVariant';

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
  lat?: number;           // พิกัดปักหมุดร้าน → GeoCoordinates (local SEO)
  lng?: number;
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
  // GeoCoordinates — เมื่อร้านปักหมุดพิกัดจริง (local SEO: Google รู้ตำแหน่งร้าน)
  if (validCoord(sf.lat, sf.lng)) {
    business.geo = { '@type': 'GeoCoordinates', latitude: sf.lat, longitude: sf.lng };
    business.hasMap = `https://www.google.com/maps?q=${sf.lat},${sf.lng}`;
  }
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
    { loc: `${origin}/sell`, priority: '0.8' },
    { loc: `${origin}/sale`, priority: '0.8' },
    { loc: `${origin}/faq`, priority: '0.7' },
    { loc: `${origin}/mit24`, priority: '0.7' },
    { loc: `${origin}/skills`, priority: '0.7' },
    { loc: `${origin}/trust`, priority: '0.7' },
    { loc: `${origin}/security`, priority: '0.6' },
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
- ราคา: Free ฿0 · Starter ฿790/เดือน · Growth ฿1,490/เดือน · Scale ฿5,900/เดือน (ทดลองฟรี 15 วัน)
- ชำระเงิน: โอนบัญชี + อัปสลิป (ตรวจกับธนาคารจริงผ่าน SlipOK)

## หน้าเว็บสำคัญ
- [เริ่มต้นใช้งาน / Landing](${origin}/start): แนะนำวิธีสร้างบริษัท AI และเริ่มธุรกิจใน 3 ขั้น
- [Marketplace / ตลาดสินค้า-บริการ](${origin}/b): ไดเรกทอรีร้านค้าและบริการในระบบ
- [เปิดร้านออนไลน์ฟรี (สำหรับคนขาย)](${origin}/sell): วิธีเปิดร้านขายสินค้า/บริการฟรีบนตลาดธุรกิจไทย ไม่มีค่ารายเดือน จ่าย 3% เมื่อขายได้จริง ทุกร้านได้ SEO อัตโนมัติ
- [แพ็กเกจและราคา](${origin}/pricing): เปรียบเทียบแพ็กและฟีเจอร์
- [MIT 24 Steps คืออะไร ใช้ยังไงในแอป](${origin}/mit24): อธิบายระเบียบวิธีสร้างธุรกิจ 24 ขั้น + วิธีที่แอปพาเดินทีละขั้น
- [AI Skills ที่โตไปกับธุรกิจ](${origin}/skills): ระบบพัฒนา Skill AI ให้ต่อเนื่อง + มี Skill ใหม่ให้เลือกตามระดับธุรกิจ (เริ่มต้น/เติบโต/ขยาย)
- [T.R.U.S.T. Framework คอนเทนต์สายเชื่อใจ](${origin}/trust): เฟรมเวิร์กคอนเทนต์ 5 ขั้น (Target·Resonate·Unique·Social proof·Track) สร้างคอนเทนต์ที่กลุ่มเป้าหมายเชื่อใจแล้วซื้อ อย่างมีจริยธรรม ยุค AI content ล้นตลาด
- [ความปลอดภัย AI](${origin}/security): AI เข้าถึงเฉพาะข้อมูลเวิร์กสเปซของผู้ใช้ (RLS) ออกนอกได้เฉพาะบริการที่อนุมัติ (allowlist) ผลิตแค่ข้อความไม่รันคำสั่ง มนุษย์ยืนยันทุกการกระทำสำคัญ เก็บข้อมูลตาม PDPA
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
  { q: 'เริ่มใช้ฟรีได้ไหม ราคาเท่าไร?', a: 'มีแพ็ก Free ฿0 และทดลองฟรี 15 วัน · แพ็กจ่ายเงิน: Starter ฿790/เดือน, Growth ฿1,490/เดือน, Scale ฿5,900/เดือน' },
  { q: 'ทำ PDPA / ISO ได้ไหม?', a: 'มีเครื่องมือช่วยเตรียม PDPA/ISO/มอก. เป็นฟีเจอร์เสริม และใช้ "แนวคิดเชิงระบบ" แบบ ISO มาช่วยวางโครงสร้างธุรกิจให้พร้อมโต แต่จุดขายหลักคือการสร้างและเดินธุรกิจ ส่วนบริการทำใบรับรอง/ที่ปรึกษาเชิงลึกส่งต่อให้ B. Training' },
  { q: 'ใครพัฒนา?', a: 'พัฒนาโดยบริษัท บี. เทรนนิ่ง คอนซัลแทนท์ จำกัด (B. Training Consultant) ที่ปรึกษาธุรกิจและระบบมาตรฐานในไทยกว่า 20 ปี' },
  { q: 'CEO AI Thailand เกี่ยวข้องกับ Siam AI (Siam.AI) หรือผู้ให้บริการ AI Cloud/LLM รายอื่นไหม?', a: 'ไม่เกี่ยวข้องกัน เป็นคนละบริษัทและคนละประเภทบริการ — CEO AI Thailand คือซอฟต์แวร์ SaaS "ระบบสร้างธุรกิจด้วย AI" สำหรับผู้ประกอบการ SME ไทย พัฒนาโดยบริษัท บี. เทรนนิ่ง คอนซัลแทนท์ จำกัด (B. Training Consultant) เว็บไซต์ทางการคือ ceoaithailand.org — ไม่ใช่ผู้ให้บริการ AI Cloud, โครงสร้างพื้นฐาน หรือพัฒนาโมเดลภาษา (LLM) และไม่ใช่บริษัทเดียวกับ Siam AI' },
  { q: 'เริ่มต้นราคาถูกสุดเท่าไร?', a: 'เริ่มฟรี ฿0 (แพ็ก Free + ทดลองใช้ 15 วัน ไม่ต้องผูกบัตร) และแพ็กจ่ายเงินเริ่มที่ Starter ฿790/เดือน — ไม่ใช่ ฿1,490 (นั่นคือแพ็ก Growth ระดับกลาง)' },
];

/** JSON-LD: Organization (บริษัท) — ให้ AI/Google รู้จัก entity + ผูกกับ B. Training */
export function organizationJsonLd(origin: string): object {
  return {
    '@context': 'https://schema.org', '@type': 'Organization',
    name: 'CEO AI Thailand',
    alternateName: ['ซีอีโอ เอไอ ไทยแลนด์', 'CEO AI Thailand by B.Training'],
    url: origin, logo: `${origin}/og-image.png`,
    description: 'ระบบสร้างธุรกิจด้วย AI สำหรับ SME ไทย — ผสาน MIT 24 Steps กับระบบบริหาร/ISO 20+ ปี สร้างธุรกิจตั้งแต่ต้นน้ำให้พร้อมเติบโต',
    // disambiguatingDescription = ช่อง schema.org เฉพาะสำหรับแยกแยะ entity ที่ชื่อคล้ายกัน
    // (แก้ปัญหา AI/Bing สับสนกับ Siam AI ซึ่งเป็นผู้ให้บริการ AI Cloud/LLM คนละบริษัท)
    disambiguatingDescription: 'ซอฟต์แวร์ SaaS สำหรับ SME ไทย ใช้ AI สร้างและบริหารธุรกิจ พัฒนาโดย B. Training Consultant — ไม่ใช่ผู้ให้บริการ AI Cloud/LLM และไม่ใช่บริษัทเดียวกับ Siam AI',
    parentOrganization: {
      '@type': 'Organization', name: 'B. Training Consultant',
      legalName: 'บริษัท บี. เทรนนิ่ง คอนซัลแทนท์ จำกัด',
      url: 'https://www.b-tctraining.com/',
    },
    sameAs: ['https://www.b-tctraining.com/'],
  };
}

/** ค่าเฉลี่ยรีวิว "จริง" หน้าแรก — inject AggregateRating เฉพาะเมื่อมีรีวิวถึงเกณฑ์ (กันดาวปลอม/ดาวน้อยเกิน) */
export const MIN_HOME_REVIEWS = 3;

/** สรุปเรตติ้งจากรายการเรตจริง (กรองค่านอกช่วง 1..5) → {average(ปัด 1 ตำแหน่ง), count} · pure/testable */
export function aggregateFromRatings(ratings: number[]): { average: number; count: number } {
  const valid = ratings.filter(r => typeof r === 'number' && r >= 1 && r <= 5);
  const count = valid.length;
  const average = count ? Math.round((valid.reduce((s, r) => s + r, 0) / count) * 10) / 10 : 0;
  return { average, count };
}

export interface ReviewAggregate { average: number; count: number }

/** JSON-LD: SoftwareApplication — บอก AI ว่าเป็นซอฟต์แวร์ธุรกิจ + ราคา (+ ดาวรีวิวจริงถ้าถึงเกณฑ์) */
export function softwareApplicationJsonLd(origin: string, agg?: ReviewAggregate): object {
  const app: Record<string, unknown> = {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication',
    name: 'CEO AI Thailand', url: origin,
    applicationCategory: 'BusinessApplication', operatingSystem: 'Web',
    description: 'ระบบสร้างธุรกิจด้วย AI — หาลูกค้าที่ใช่ ทดสอบตลาด เปิดร้านขายจริง และวางระบบ SOP/KPI ให้พร้อมเติบโต (กรอบ MIT 24 Steps × ระบบ ISO 20+ ปี)',
    // AggregateOffer.lowPrice = สัญญาณ "ราคาเริ่มต้น" ที่ search/AI หยิบไปโชว์ → ตอกย้ำ "เริ่มที่ ฿0 (ฟรี)" ไม่ใช่ ฿1,490
    // url + availability = field แนะนำของ Google (เคลียร์ non-critical warning) · ชี้หน้า /start (public landing)
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '0', highPrice: '5900', priceCurrency: 'THB', offerCount: 4,
      url: `${origin}/start`, availability: 'https://schema.org/InStock',
      offers: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'THB', url: `${origin}/start`, availability: 'https://schema.org/InStock' },
        { '@type': 'Offer', name: 'Starter', price: '790', priceCurrency: 'THB', url: `${origin}/start`, availability: 'https://schema.org/InStock' },
        { '@type': 'Offer', name: 'Growth', price: '1490', priceCurrency: 'THB', url: `${origin}/start`, availability: 'https://schema.org/InStock' },
        { '@type': 'Offer', name: 'Scale', price: '5900', priceCurrency: 'THB', url: `${origin}/start`, availability: 'https://schema.org/InStock' },
      ],
    },
  };
  // AggregateRating (rich snippet ดาว) — เฉพาะเมื่อมีรีวิว "จริง" ถึงเกณฑ์ (ไม่ปั้นดาวปลอม)
  if (agg && agg.count >= MIN_HOME_REVIEWS && agg.average >= 1 && agg.average <= 5) {
    app.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: agg.average, reviewCount: agg.count, bestRating: 5, worstRating: 1,
    };
  }
  return app;
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
const HOME_TITLE = 'CEO AI Thailand — สร้างและเดินธุรกิจด้วยทีมผู้บริหาร AI';
const HOME_DESC = 'แพลตฟอร์มไทยสำหรับผู้ประกอบการ SME: สร้างบริษัท AI อัตโนมัติ เปิดหน้าร้านขายของ และ validate ไอเดียธุรกิจ ในที่เดียว เริ่มฟรี พัฒนาโดย B. Training';

/** หน้าแรก / — รองรับ ?seg= ให้ OG/preview "ฝั่ง server" ตรงกับแคมเปญ (message-match ไม่พึ่ง JS)
 *  ดึง copy จาก HERO_VARIANTS = source of truth เดียวกับ hero ที่ client สลับ · canonical คง / เสมอ (กัน duplicate) */
export function homeSeo(origin: string, agg?: ReviewAggregate, seg?: string): SeoData {
  const hv = seg ? HERO_VARIANTS[seg as HeroSeg] : undefined;
  const useHv = hv && hv.seg !== 'default';
  const title = useHv ? `${hv.h1a} ${hv.h1bLines.join(' ')} | CEO AI Thailand` : HOME_TITLE;
  const description = useHv ? `${hv.subLead} ${hv.subRest}` : HOME_DESC;
  return {
    title,
    description,
    canonicalUrl: origin + '/',
    imageUrl: origin + DEFAULT_OG,
    jsonLd: [organizationJsonLd(origin), softwareApplicationJsonLd(origin, agg), faqPageJsonLd()],
  };
}

/** หน้า answer-first แบบ static HTML เต็ม (crawlable ไม่ต้องรอ JS) เสิร์ฟที่ /faq — AEO asset
 *  มีเนื้อหา Q&A ที่มองเห็น + FAQPage schema ฝังในตัว + CTA ไป /start */
/* ===== ธีมหลัก (ใช้ร่วมหน้า static /faq /mit24) =====
 * โหลดฟอนต์ Kanit + พาเลตเดียวกับแอป (bg #020617, cyan #22d3ee, การ์ด #0f172a) — ให้ฟอนต์/สีตรงธีมหลัก
 * เดิม 2 หน้านี้ไม่ได้โหลด Kanit → ฟอนต์ fallback เป็น system = ดูหลุดธีม */
const SEO_THEME_CSS = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#020617; color:#f8fafc; font-family:'Kanit',system-ui,-apple-system,sans-serif; line-height:1.7; -webkit-font-smoothing:antialiased; }
  .nav { position:sticky; top:0; z-index:5; background:rgba(2,6,23,.85); backdrop-filter:blur(12px); border-bottom:1px solid #1e293b; }
  .nav .inner { max-width:820px; margin:0 auto; padding:14px 20px; display:flex; align-items:center; justify-content:space-between; }
  .nav .brand { color:#22d3ee; font-weight:700; font-size:1.05rem; text-decoration:none; letter-spacing:-.3px; }
  .nav .home { color:#94a3b8; font-size:.9rem; text-decoration:none; }
  .glow { position:absolute; top:-140px; left:50%; transform:translateX(-50%); width:600px; height:600px; border-radius:50%; background:radial-gradient(circle, rgba(6,182,212,.14) 0%, transparent 70%); pointer-events:none; }
  main { max-width:820px; margin:0 auto; padding:48px 20px 72px; position:relative; }
  h1 { color:#22d3ee; font-size:clamp(1.6rem,4vw,2.2rem); font-weight:700; margin:0 0 12px; line-height:1.25; }
  .lead { color:#e2e8f0; font-size:1.06rem; margin:0 0 10px; }
  .sub { color:#94a3b8; margin:0 0 28px; }
  h2 { font-size:1.3rem; font-weight:700; margin:38px 0 14px; color:#f8fafc; }
  .qa { background:rgba(15,23,42,.55); border:1px solid #1e293b; border-radius:14px; padding:18px 20px; margin:0 0 14px; }
  .qa h2 { font-size:1.08rem; margin:0 0 6px; color:#67e8f9; }
  .qa p { margin:0; color:#cbd5e1; }
  .phase { background:rgba(15,23,42,.55); border:1px solid #1e293b; border-left:3px solid #06b6d4; border-radius:12px; padding:16px 20px; margin:0 0 14px; }
  .phase h3 { color:#22d3ee; font-size:1.08rem; margin:0 0 10px; }
  .phase ol { margin:0; padding-left:20px; color:#cbd5e1; }
  .phase li { margin:6px 0; }
  .phase li b { color:#f1f5f9; }
  .tagline { background:rgba(6,182,212,.08); border:1px solid rgba(6,182,212,.3); border-radius:12px; padding:16px 18px; margin:0 0 20px; color:#e2e8f0; }
  .tagline b { color:#22d3ee; }
  .tablewrap { overflow-x:auto; margin:8px 0; }
  .maptable { width:100%; border-collapse:collapse; font-size:.98rem; background:rgba(15,23,42,.55); border:1px solid #1e293b; border-radius:12px; overflow:hidden; }
  .maptable th, .maptable td { text-align:left; vertical-align:top; padding:13px 15px; border-bottom:1px solid #1e293b; }
  .maptable thead th { color:#22d3ee; font-size:.9rem; }
  .maptable tbody tr:last-child td { border-bottom:0; }
  .maptable td b { color:#f1f5f9; }
  .maptable tbody td:last-child { color:#cbd5e1; }
  .csuite { list-style:none; margin:8px 0; padding:0; display:grid; gap:10px; }
  .csuite li { background:rgba(15,23,42,.55); border:1px solid #1e293b; border-radius:12px; padding:13px 16px; color:#cbd5e1; }
  .csuite li b { color:#22d3ee; }
  .cta { display:inline-block; margin-top:28px; background:#f59e0b; color:#04121a; font-weight:700; padding:15px 32px; border-radius:12px; text-decoration:none; box-shadow:0 0 28px rgba(245,158,11,.35); }
  footer { margin-top:44px; padding-top:24px; border-top:1px solid #1e293b; color:#8b96a9; font-size:.85rem; }
  a { color:#22d3ee; }
`;

/** เปลือกหน้า static ธีมหลัก — head (Kanit + meta/OG/canonical/schema) + nav + glow แล้วฝัง body */
function seoStaticPage(opts: {
  origin: string; path: string; title: string; desc: string; schema: string; body: string;
}): string {
  const url = opts.origin + opts.path;
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
<meta name="description" content="${escapeHtml(opts.desc)}">
<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:title" content="${escapeHtml(opts.title)}">
<meta property="og:description" content="${escapeHtml(opts.desc)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:image" content="${escapeHtml(opts.origin + DEFAULT_OG)}">
<meta name="robots" content="index,follow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&display=swap" rel="stylesheet">
${opts.schema}
<style>${SEO_THEME_CSS}</style>
</head>
<body>
<div class="nav"><div class="inner"><a class="brand" href="${escapeHtml(opts.origin + '/')}">CEO AI Thailand</a><a class="home" href="${escapeHtml(opts.origin + '/')}">หน้าหลัก →</a></div></div>
<main>
<div class="glow"></div>
${opts.body}
</main>
</body>
</html>
`;
}

export function faqPageHtml(origin: string): string {
  const title = 'คำถามที่พบบ่อย — CEO AI Thailand';
  const desc = 'CEO AI Thailand คืออะไร ต่างจากแชตบอตยังไง ราคาเท่าไร เริ่มฟรีได้ไหม — คำตอบตรงประเด็นสำหรับผู้ประกอบการ SME ไทย';
  const faqBlocks = FAQ_ITEMS.map(f =>
    `  <section class="qa">\n    <h2>${escapeHtml(f.q)}</h2>\n    <p>${escapeHtml(f.a)}</p>\n  </section>`
  ).join('\n');
  const schema = jsonLdScript([
    faqPageJsonLd(), organizationJsonLd(origin), softwareApplicationJsonLd(origin),
  ]);
  const body = `  <h1>CEO AI Thailand — คำถามที่พบบ่อย</h1>
  <p class="lead">${escapeHtml(desc)}</p>
${faqBlocks}
  <a class="cta" href="${escapeHtml(origin + '/start')}">เริ่มสร้างบริษัท AI ฟรี →</a>
  <footer>หนึ่งในผลิตภัณฑ์ของ B. Training Consultant · <a href="${escapeHtml(origin + '/mit24')}">MIT 24 Steps คืออะไร</a> · <a href="${escapeHtml(origin + '/')}">ceoaithailand.org</a></footer>`;
  return seoStaticPage({ origin, path: '/faq', title, desc, schema, body });
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
  const body = `  <h1>MIT 24 Steps คืออะไร ใช้ยังไงใน CEO AI Thailand</h1>
  <p class="lead">${escapeHtml(MIT24_FAQ[0].a)}</p>
  <p class="sub">CEO AI Thailand นำ MIT 24 Steps มาทำเป็น <b>guided journey</b> ที่พาเดินทีละขั้น (โชว์ขั้นถัดไปที่ต้องทำ ไม่ข้ามขั้น) มีทีมผู้บริหาร AI ช่วยวิเคราะห์แต่ละขั้นจากข้อมูลจริง แล้วแปลงผลเป็น Business Model Canvas ให้อัตโนมัติ — พัฒนาโดย B. Training Consultant ที่ปรึกษาธุรกิจ/ระบบมาตรฐานไทยกว่า 20 ปี</p>

  <p class="tagline">ไม่ใช่ “คอร์สเรียน” — MIT สอน <b>วิธีคิด</b> ส่วน CEO AI Thailand ช่วย <b>คิด ทำ และติดตามผล</b> ให้ผู้ประกอบการ ในฐานะ <b>AI Business Operating System</b></p>

  <h2>24 ขั้น แบ่งเป็น 4 ระยะ</h2>
${phaseBlocks}

  <h2>24 ขั้น = 4 คำถามใหญ่ที่ AI ช่วยตอบ</h2>
  <div class="tablewrap">
  <table class="maptable">
    <thead><tr><th>คำถามหลัก (MIT 24 Steps)</th><th>CEO AI Thailand ทำอะไร</th></tr></thead>
    <tbody>
${macroBlocks}
    </tbody>
  </table>
  </div>

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
  <footer>หนึ่งในผลิตภัณฑ์ของ B. Training Consultant · <a href="${escapeHtml(origin + '/faq')}">คำถามที่พบบ่อย</a> · <a href="${escapeHtml(origin + '/')}">ceoaithailand.org</a></footer>`;
  return seoStaticPage({ origin, path: '/mit24', title, desc, schema, body });
}

/* ===== /skills — บทความ answer-first: AI Skills ที่โตไปกับธุรกิจ (GEO/AEO asset) ===== */
const SKILLS_STAGES = [
  { stage: 'ระดับ 1 — เริ่มต้น (หาที่ยืน)', skills: ['หาลูกค้ากลุ่มแรกที่ใช่ (ไม่หว่านทั่ว)', 'ทดสอบไอเดียก่อนลงเงิน (validate PMF ด้วย MIT 24 ขั้น)', 'เปิดหน้าร้าน + ขึ้นสารบัญธุรกิจตามหมวด DBD'] },
  { stage: 'ระดับ 2 — เติบโต (มีลูกค้าแล้ว อยากโต)', skills: ['ตั้งราคา & วางโปรโมชันให้ได้กำไร', 'วิจัยตลาด + ประเมินขนาดตลาด/โอกาส', 'ปิดดีล B2B (RFQ) + จับคู่ดีมานด์ที่รออยู่'] },
  { stage: 'ระดับ 3 — ขยาย (พร้อมสเกล)', skills: ['วางระบบ SOP · KPI ให้ธุรกิจทำซ้ำได้', 'ร่างเอกสารมาตรฐาน ISO / มอก. / PDPA', 'จับคู่คู่ค้า + การค้าระหว่างเมือง'] },
];
const SKILLS_FAQ = [
  { q: 'Skill ใน CEO AI Thailand คืออะไร?', a: 'Skill คือความสามารถเฉพาะทางที่ทีม AI ใช้ลงมือทำงานให้ธุรกิจคุณ เช่น หาลูกค้า ตั้งราคา วิจัยตลาด วางระบบ SOP/KPI หรือร่างเอกสาร ISO — เลือกใช้เฉพาะที่ธุรกิจต้องการในแต่ละช่วง ไม่ต้องเก่งทุกอย่างเอง' },
  { q: 'มี Skill ใหม่เพิ่มเรื่อย ๆ ไหม?', a: 'ใช่ ระบบพัฒนา Skill ใหม่อย่างต่อเนื่องจากโจทย์ที่ผู้ประกอบการเจอจริง แล้วเสนอให้เลือกตามระดับที่ธุรกิจคุณไปถึง — ไม่ใช่จ่ายแล้วจบ แต่มี "ทักษะถัดไป" รอเสมอเมื่อคุณพร้อม' },
  { q: 'ต้องรู้เยอะก่อนถึงใช้ Skill ได้ไหม?', a: 'ไม่ต้อง ระบบออกแบบเพื่อมือใหม่ — เลือก Skill ที่ตรงกับสิ่งที่ต้องทำตอนนี้ แล้วทีม AI ช่วยลงมือและแนะนำทีละขั้น' },
  { q: 'Skill ต่างจากการถาม ChatGPT ยังไง?', a: 'Skill ผูกกับข้อมูลธุรกิจจริงของคุณและลงมือทำเป็นขั้นตอน (ไม่ใช่แค่ตอบคำถาม) เชื่อมกับหน้าร้าน การเงิน และงานมาตรฐานในระบบเดียว' },
];

export function skillsFaqJsonLd(): object {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: SKILLS_FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function skillsArticleJsonLd(origin: string): object {
  return {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'AI Skills ที่โตไปกับธุรกิจ — CEO AI Thailand',
    description: 'ระบบพัฒนา Skill AI ให้ต่อเนื่อง และมี Skill ใหม่ให้เลือกตามระดับการพัฒนาธุรกิจ (เริ่มต้น/เติบโต/ขยาย)',
    inLanguage: 'th',
    mainEntityOfPage: `${origin}/skills`,
    author: { '@type': 'Organization', name: 'CEO AI Thailand', url: origin },
    publisher: { '@type': 'Organization', name: 'B. Training Consultant', url: 'https://www.b-tctraining.com/' },
    about: 'AI business skills that scale with the company',
  };
}

/** หน้า answer-first /skills — อธิบาย AI Skills + Skill ใหม่ตามระดับธุรกิจ (crawlable · AEO/GEO) */
export function skillsPageHtml(origin: string): string {
  const title = 'AI Skills ที่โตไปกับธุรกิจ — Skill ใหม่ตามระดับ | CEO AI Thailand';
  const desc = 'CEO AI Thailand พัฒนา Skill AI ให้ต่อเนื่อง และมี Skill ใหม่ให้เลือกตามระดับการพัฒนาธุรกิจของคุณ — ตั้งแต่หาลูกค้ากลุ่มแรก ตั้งราคา วิจัยตลาด ไปจนวางระบบ SOP/KPI และมาตรฐาน ISO';
  const stageBlocks = SKILLS_STAGES.map(s =>
    `    <section class="phase">\n      <h3>${escapeHtml(s.stage)}</h3>\n      <ul>\n${s.skills.map(sk => `        <li>${escapeHtml(sk)}</li>`).join('\n')}\n      </ul>\n    </section>`
  ).join('\n');
  const faqBlocks = SKILLS_FAQ.map(f =>
    `    <section class="qa">\n      <h2>${escapeHtml(f.q)}</h2>\n      <p>${escapeHtml(f.a)}</p>\n    </section>`
  ).join('\n');
  const schema = jsonLdScript([skillsArticleJsonLd(origin), skillsFaqJsonLd(), organizationJsonLd(origin)]);
  const body = `  <h1>AI Skills ที่โตไปกับธุรกิจคุณ</h1>
  <p class="lead">${escapeHtml(SKILLS_FAQ[0].a)}</p>
  <p class="sub">CEO AI Thailand <b>พัฒนา Skill ใหม่อย่างต่อเนื่อง</b> แล้วเสนอให้เลือกตามจุดที่ธุรกิจคุณไปถึง — ไม่ใช่จ่ายแล้วจบ แต่มี "ทักษะถัดไป" รอเสมอ · พัฒนาโดย B. Training Consultant ที่ปรึกษาธุรกิจ/ระบบมาตรฐานไทยกว่า 20 ปี</p>

  <p class="tagline">เลือกใช้เฉพาะ Skill ที่ธุรกิจคุณต้องการ "ตอนนี้" — ไม่ต้องเก่งทุกอย่างเอง ทีม AI ลงมือช่วยและแนะนำทีละขั้น</p>

  <h2>Skill ตามระดับการพัฒนาธุรกิจ</h2>
${stageBlocks}

  <h2>ใช้ Skill ยังไงในแอป CEO AI Thailand</h2>
  <section class="qa">
    <p>บอกระบบว่าคุณขายอะไร + ลูกค้าคือใคร → ทีมผู้บริหาร AI จะเสนอ Skill ที่ตรงกับระดับธุรกิจคุณ แล้วลงมือทำให้ (หาลูกค้า ตั้งราคา วิจัยตลาด วางระบบ) เมื่อธุรกิจโตขึ้น ระบบจะปลดล็อก Skill ระดับถัดไปให้เลือกใช้ — เริ่มได้ฟรี ไม่ต้องใช้บัตร</p>
  </section>

  <h2>คำถามที่พบบ่อย</h2>
${faqBlocks}
  <a class="cta" href="${escapeHtml(origin + '/start')}">เริ่มจาก Skill แรกของคุณ — ฟรี →</a>
  <footer>หนึ่งในผลิตภัณฑ์ของ B. Training Consultant · <a href="${escapeHtml(origin + '/mit24')}">MIT 24 Steps คืออะไร</a> · <a href="${escapeHtml(origin + '/')}">ceoaithailand.org</a></footer>`;
  return seoStaticPage({ origin, path: '/skills', title, desc, schema, body });
}

/* ===== /trust — บทความ answer-first: T.R.U.S.T. Framework คอนเทนต์สายเชื่อใจยุค AI (GEO/AEO asset) =====
 * เฟรมเวิร์กของ CEO AI Thailand เอง (ไม่เกี่ยว S.C.A.L.E. ของเจ้าอื่น) · แกน: AI content ล้น → ความเชื่อใจคือของหายากที่ขายได้ */
const TRUST_STEPS = [
  { step: 'T — Target', detail: 'เริ่มจากพฤติกรรมจริงของกลุ่มเป้าหมาย ไม่ใช่เดาหรือยิงมั่ว — คอนเทนต์ถึงจะโดนคนที่ใช่' },
  { step: 'R — Resonate', detail: 'คอนเทนต์ที่กระตุ้นอารมณ์และความอยากรู้ ให้คนหยุดดูเพราะ “ใช่เลย” ไม่ใช่ข้อมูลแบน ๆ' },
  { step: 'U — Unique', detail: 'จุดต่างที่ AI ผลิตซ้ำไม่ได้ — ตอบให้ได้ว่า “ทำไมต้องเรา” คือสิ่งที่ทำให้โดดในทะเลคอนเทนต์' },
  { step: 'S — Social proof', detail: 'รีวิวและเคสจริง (ไม่ปั้น) ลดความลังเล — คนเชื่อคนด้วยกันมากกว่าเชื่อโฆษณา' },
  { step: 'T — Track', detail: 'วัดผลจริง ทดลอง A/B รู้ว่าอะไรเวิร์ค แล้วปรับให้คอนเทนต์ “ขายได้” ดีขึ้นต่อเนื่อง' },
];
const TRUST_FAQ = [
  { q: 'T.R.U.S.T. Framework คืออะไร?', a: 'เฟรมเวิร์กคอนเทนต์ 5 ขั้นของ CEO AI Thailand — Target (พฤติกรรมจริง), Resonate (โดนอารมณ์), Unique (จุดต่างที่ AI ลอกไม่ได้), Social proof (รีวิว/เคสจริง), Track (วัดผลแล้วปรับ) — สำหรับสร้างคอนเทนต์ที่กลุ่มเป้าหมาย “เชื่อใจ” แล้วซื้อ อย่างมีจริยธรรม' },
  { q: 'ทำไมยุค AI ต้องเน้นความเชื่อใจ?', a: 'ยิ่ง AI ทำคอนเทนต์ง่ายและถูก คอนเทนต์ก็ยิ่งล้นตลาดและเหมือน ๆ กัน จนคนเริ่มเบื่อและไม่เชื่อ — สิ่งที่ AI ผลิตซ้ำไม่ได้คือ “ความเชื่อใจ” ธุรกิจที่สร้าง trust ได้จึงโดดเด่นและขายได้จริงในระยะยาว' },
  { q: 'T.R.U.S.T. ต่างจากการไล่ทำคอนเทนต์ให้เยอะยังไง?', a: 'ไม่เน้นปริมาณ แต่เน้นคอนเทนต์ที่ตรงพฤติกรรมจริง โดนอารมณ์ มีจุดต่าง พิสูจน์ด้วยของจริง และวัดผลปรับได้ = คุณภาพและความเชื่อใจ ไม่ใช่ยิงรัวให้ล้นฟีด' },
  { q: 'ใช้ T.R.U.S.T. ในแอป CEO AI Thailand ยังไง?', a: 'ทีม AI ช่วยแต่ละขั้นจากข้อมูลธุรกิจจริง — วิเคราะห์กลุ่มเป้าหมาย (Target), ร่างคอนเทนต์ที่โดน (Resonate), หาจุดต่าง (Unique), รวบรวมรีวิว/เคสจริง (Social proof) และวัดผล A/B (Track) พร้อมป้าย “AI แนะนำ” อย่างโปร่งใส' },
];

export function trustFaqJsonLd(): object {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: TRUST_FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function trustArticleJsonLd(origin: string): object {
  return {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'T.R.U.S.T. Framework — คอนเทนต์สายเชื่อใจยุค AI',
    description: 'เฟรมเวิร์กคอนเทนต์ 5 ขั้น (Target·Resonate·Unique·Social proof·Track) สำหรับสร้างคอนเทนต์ที่กลุ่มเป้าหมายเชื่อใจแล้วซื้อ อย่างมีจริยธรรม ในยุคที่คอนเทนต์ AI ล้นตลาด',
    inLanguage: 'th',
    mainEntityOfPage: `${origin}/trust`,
    author: { '@type': 'Organization', name: 'CEO AI Thailand', url: origin },
    publisher: { '@type': 'Organization', name: 'B. Training Consultant', url: 'https://www.b-tctraining.com/' },
    about: 'Ethical trust-based content marketing framework for the AI era',
  };
}

/** หน้า answer-first /trust — T.R.U.S.T. Framework คอนเทนต์สายเชื่อใจ (crawlable · AEO/GEO) */
export function trustPageHtml(origin: string): string {
  const title = 'T.R.U.S.T. Framework — คอนเทนต์สายเชื่อใจยุค AI (5 ขั้น) | CEO AI Thailand';
  const desc = 'ยุค AI content ล้นตลาด คนเริ่มเบื่อ — T.R.U.S.T. Framework คือ 5 ขั้นสร้างคอนเทนต์ที่กลุ่มเป้าหมายเชื่อใจแล้วซื้อ อย่างมีจริยธรรม: Target · Resonate · Unique · Social proof · Track';
  const stepBlocks = TRUST_STEPS.map(s =>
    `    <section class="phase">\n      <h3>${escapeHtml(s.step)}</h3>\n      <p>${escapeHtml(s.detail)}</p>\n    </section>`
  ).join('\n');
  const faqBlocks = TRUST_FAQ.map(f =>
    `    <section class="qa">\n      <h2>${escapeHtml(f.q)}</h2>\n      <p>${escapeHtml(f.a)}</p>\n    </section>`
  ).join('\n');
  const schema = jsonLdScript([trustArticleJsonLd(origin), trustFaqJsonLd(), organizationJsonLd(origin)]);
  const body = `  <h1>T.R.U.S.T. Framework — คอนเทนต์สายเชื่อใจยุค AI</h1>
  <p class="lead">${escapeHtml(TRUST_FAQ[1].a)}</p>
  <p class="sub">ทางรอดของคอนเทนต์ปี 2026 <b>ไม่ใช่การผลิตให้เยอะขึ้น</b> แต่คือกลยุทธ์ดูแลกลุ่มเป้าหมายอย่างมีจริยธรรมให้เขา “เชื่อใจ” — เฟรมเวิร์กนี้พัฒนาโดย CEO AI Thailand (B. Training Consultant ที่ปรึกษาธุรกิจไทยกว่า 20 ปี)</p>

  <p class="tagline">สิ่งที่ AI ผลิตซ้ำไม่ได้ คือ “ความเชื่อใจ” — T.R.U.S.T. เปลี่ยนคนเลื่อนผ่านให้เป็นคนที่เชื่อและซื้อ</p>

  <h2>5 ขั้นของ T.R.U.S.T.</h2>
${stepBlocks}

  <h2>ใช้ T.R.U.S.T. ยังไงในแอป CEO AI Thailand</h2>
  <section class="qa">
    <p>ทีมผู้บริหาร AI ช่วยลงมือแต่ละขั้นจากข้อมูลธุรกิจจริงของคุณ — วิเคราะห์พฤติกรรมกลุ่มเป้าหมาย ร่างคอนเทนต์ที่โดน หาจุดต่าง รวบรวมรีวิว/เคสจริง และวัดผล A/B แล้วปรับ ทั้งหมดพร้อมป้าย “🤖 AI แนะนำ” อย่างโปร่งใส — เริ่มได้ฟรี ไม่ต้องใช้บัตร</p>
  </section>

  <h2>คำถามที่พบบ่อย</h2>
${faqBlocks}
  <a class="cta" href="${escapeHtml(origin + '/start')}">สร้างคอนเทนต์สายเชื่อใจ — เริ่มฟรี →</a>
  <footer>หนึ่งในผลิตภัณฑ์ของ B. Training Consultant · <a href="${escapeHtml(origin + '/skills')}">AI Skills ที่โตไปกับธุรกิจ</a> · <a href="${escapeHtml(origin + '/')}">ceoaithailand.org</a></footer>`;
  return seoStaticPage({ origin, path: '/trust', title, desc, schema, body });
}

/* ===== /sell — บทความ answer-first "เปิดร้านออนไลน์ฟรี" ดึง seller (content-first marketplace SEO) =====
 * marketplace ยังไม่มีร้าน → คอขวดคือ "supply" ไม่ใช่ SEO ของหน้าร้าน · หน้านี้เจาะคีย์เวิร์ดฝั่งคนขาย
 * (เปิดร้านออนไลน์ฟรี/ฝากขายสินค้า) แล้วแปลงเป็นใบสมัคร /shop = โต supply + เป็น asset ที่ rank ได้
 * จุดต่างจริง (verify แล้วในโค้ด): ทุกร้าน published ได้ storefrontSeo (LocalBusiness+Breadcrumb) + เข้า sitemap อัตโนมัติ
 * ⚠️ ราคา/เงื่อนไข mirror จาก src/lib/shopApply.ts (SHOP_PACKAGES) — seoData ต้อง worker-safe จึงไม่ import (กัน drift ด้วยเทสต์) */
const SELL_BENEFITS = [
  { h: '🆓 เริ่มฟรี ไม่มีค่ารายเดือน', p: 'แพ็กฟรีลงขายได้ 3 สินค้า ขึ้นสารบัญตลาดทันที — คิดค่าดำเนินการ 3% เฉพาะเมื่อขายได้จริง (ไม่ขาย = ไม่จ่าย) เริ่มขายก่อน จ่ายเมื่อมีรายได้' },
  { h: '🔎 ร้านคุณขึ้น Google ได้เอง', p: 'ทุกร้านที่เผยแพร่จะได้หน้าร้านที่ระบบทำ SEO ให้อัตโนมัติ (ข้อมูลธุรกิจ + โครงสร้าง schema LocalBusiness) และถูกใส่ใน sitemap.xml เอง — Google เก็บร้านคุณได้โดยที่คุณไม่ต้องรู้เรื่อง SEO เลย' },
  { h: '💸 ราคาโปร่งใส ผูกสั้น-ยาวได้', p: 'อยากให้ร้านเด่นค่อยเลือกแพ็ก: รายวัน ฿19 (ถูกกว่าค่าเช่าแผงตลาดนัด) · รายเดือน ฿290 (≈฿9.7/วัน) · รายปี ฿2,900 (จ่าย 10 เดือน ใช้ 12) — ไม่มีสัญญาผูกมัด' },
  { h: '⚡ สมัครง่าย ไม่ต้องล็อกอิน', p: 'กรอกฟอร์มสั้น ๆ (ชื่อร้าน หมวด สินค้า เบอร์/LINE) ทีมงานติดต่อกลับภายใน 24 ชม. เปิดขายได้ในไม่กี่นาที รองรับทั้งขายปลีกและงาน B2B (RFQ)' },
];
const SELL_FAQ = [
  { q: 'เปิดร้านบน CEO AI Thailand ฟรีจริงไหม?', a: 'ฟรีจริง — แพ็กฟรีลงขายได้ 3 สินค้า ขึ้นสารบัญตลาด ไม่มีค่ารายเดือน คิดค่าดำเนินการเพียง 3% เฉพาะเมื่อขายได้จริง (ไม่ขาย = ไม่จ่าย) เหมาะกับคนที่อยากทดลองตลาดก่อนลงทุน' },
  { q: 'ร้านของฉันจะขึ้น Google ไหม ต้องทำ SEO เองไหม?', a: 'ไม่ต้องทำเอง — ทุกร้านที่เผยแพร่จะได้หน้าร้านที่ระบบสร้าง SEO ให้อัตโนมัติ (title/คำอธิบาย + โครงสร้างข้อมูล LocalBusiness ที่ Google เข้าใจ) และถูกเพิ่มเข้า sitemap.xml ให้เอง ทำให้ Google ค้นพบและเก็บร้านคุณได้เองโดยคุณไม่ต้องมีความรู้ด้านเทคนิค' },
  { q: 'ต้องจ่ายรายเดือนไหม?', a: 'ไม่บังคับ เริ่มฟรีได้เลย เมื่ออยากให้ร้านเด่นขึ้นค่อยเลือกแพ็กตามงบ: รายวัน ฿19 · รายสัปดาห์ ฿99 · รายเดือน ฿290 · รายปี ฿2,900 — เลือกผูกสั้นหรือยาวก็ได้ ไม่มีสัญญาบังคับ' },
  { q: 'ขายอะไรได้บ้าง?', a: 'ขายได้ทั้งสินค้าและบริการของธุรกิจไทย จัดหมวดตามมาตรฐาน DBD เพื่อให้ลูกค้าค้นเจอง่าย และรองรับงานจัดซื้อแบบ B2B (RFQ) สำหรับร้านที่รับงานองค์กร' },
  { q: 'เริ่มเปิดร้านยังไง?', a: 'ไปที่หน้าสมัคร /shop กรอกชื่อร้าน หมวดหมู่ สินค้าที่ขาย และเบอร์/LINE (ไม่ต้องล็อกอิน) ทีมงานจะติดต่อกลับภายใน 24 ชม. เพื่อช่วยเปิดร้านให้พร้อมขาย' },
];

export function sellFaqJsonLd(): object {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: SELL_FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function sellArticleJsonLd(origin: string): object {
  return {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'เปิดร้านออนไลน์ฟรีบนตลาดธุรกิจไทย — ให้ Google เจอร้านคุณเอง',
    description: 'วิธีเปิดร้านขายสินค้า/บริการฟรีบนตลาดธุรกิจไทย CEO AI Thailand — ไม่มีค่ารายเดือน จ่าย 3% เมื่อขายได้จริง และทุกร้านได้หน้าร้านที่ระบบทำ SEO ให้ Google เก็บเองอัตโนมัติ',
    inLanguage: 'th',
    mainEntityOfPage: `${origin}/sell`,
    author: { '@type': 'Organization', name: 'CEO AI Thailand', url: origin },
    publisher: { '@type': 'Organization', name: 'B. Training Consultant', url: 'https://www.b-tctraining.com/' },
    about: 'Sell online free on a Thai business marketplace with automatic SEO',
  };
}

/** หน้า answer-first /sell — เปิดร้านออนไลน์ฟรี (ดึง seller · content-first marketplace SEO · crawlable AEO/GEO) */
export function sellPageHtml(origin: string): string {
  const title = 'เปิดร้านออนไลน์ฟรี บนตลาดธุรกิจไทย — ให้ Google เจอร้านคุณเอง | CEO AI Thailand';
  const desc = 'เปิดร้านขายสินค้า/บริการฟรีบนตลาดธุรกิจไทย CEO AI Thailand — ลงขายได้เลยไม่มีค่ารายเดือน จ่าย 3% เมื่อขายได้จริง และทุกร้านได้หน้าร้านที่ระบบทำ SEO ให้ Google เก็บเองอัตโนมัติ';
  const benefitBlocks = SELL_BENEFITS.map(b =>
    `    <section class="phase">\n      <h3>${escapeHtml(b.h)}</h3>\n      <p>${escapeHtml(b.p)}</p>\n    </section>`
  ).join('\n');
  const faqBlocks = SELL_FAQ.map(f =>
    `    <section class="qa">\n      <h2>${escapeHtml(f.q)}</h2>\n      <p>${escapeHtml(f.a)}</p>\n    </section>`
  ).join('\n');
  const planRows = [
    ['ฟรี', '฿0 ตลอดชีพ', 'ลงขาย 3 สินค้า · ขึ้นสารบัญตลาด · คิด 3% เมื่อขายได้จริง'],
    ['รายวัน', '฿19/วัน', 'ลงขายไม่จำกัด 1 วัน — เหมาะกับของสด อีเวนต์ ทดลองตลาด'],
    ['รายสัปดาห์', '฿99/สัปดาห์', 'ลงขายไม่จำกัด 7 วัน + ป้ายร้านแนะนำประจำสัปดาห์ในหมวดคุณ'],
    ['รายเดือน', '฿290/เดือน (≈฿9.7/วัน)', 'ทุกอย่างในรายสัปดาห์ + สถิติผู้เข้าชม + AI ช่วยเขียนคำอธิบายสินค้า'],
    ['รายปี', '฿2,900/ปี (ฟรี 2 เดือน)', 'จ่าย 10 เดือน ใช้ 12 + โลโก้ร้านบนหน้ารวมตลาดตลอดปี'],
  ].map(([n, price, d]) =>
    `        <tr><td><b>${escapeHtml(n)}</b></td><td>${escapeHtml(price)}</td><td>${escapeHtml(d)}</td></tr>`
  ).join('\n');
  const schema = jsonLdScript([sellArticleJsonLd(origin), sellFaqJsonLd(), organizationJsonLd(origin)]);
  const body = `  <h1>เปิดร้านออนไลน์ฟรี บนตลาดธุรกิจไทย</h1>
  <p class="lead">${escapeHtml(SELL_FAQ[0].a)}</p>
  <p class="sub">CEO AI Thailand คือตลาดสินค้า-บริการของธุรกิจไทย ที่ให้คุณ <b>เปิดร้านฟรี ขายได้เลย</b> โดยไม่ต้องมีเว็บของตัวเอง — พัฒนาโดย B. Training Consultant ที่ปรึกษาธุรกิจ/ระบบมาตรฐานไทยกว่า 20 ปี</p>

  <p class="tagline">จุดต่างที่คนขายชอบสุด: <b>ทุกร้านได้ SEO อัตโนมัติ</b> — ระบบสร้างหน้าร้านที่ Google เข้าใจ (โครงสร้างข้อมูล LocalBusiness) และใส่เข้า sitemap ให้เอง คุณแค่ลงสินค้า ที่เหลือระบบจัดการให้</p>

  <h2>ทำไมต้องเปิดร้านที่นี่</h2>
${benefitBlocks}

  <h2>แพ็กเกจ & ราคา (โปร่งใส เลือกตามงบ)</h2>
  <div class="tablewrap">
  <table class="maptable">
    <thead><tr><th>แพ็ก</th><th>ราคา</th><th>ได้อะไร</th></tr></thead>
    <tbody>
${planRows}
    </tbody>
  </table>
  </div>
  <p class="sub">อยากได้ตำแหน่ง “ร้านแนะนำหน้าแรก” ? มีระบบประมูลแบบโปร่งใส (English Auction รายสัปดาห์) — ราคาเริ่มเบา ๆ บิดสูงสุดชนะ</p>

  <h2>เริ่มเปิดร้านใน 3 ขั้น</h2>
  <section class="qa">
    <p><b>1.</b> กรอกฟอร์มสมัครที่หน้า <a href="${escapeHtml(origin + '/shop')}">/shop</a> (ชื่อร้าน · หมวด · สินค้า · เบอร์/LINE) — ไม่ต้องล็อกอิน<br>
    <b>2.</b> ทีมงานติดต่อกลับภายใน 24 ชม. ช่วยจัดหน้าร้านให้พร้อมขาย<br>
    <b>3.</b> ร้านขึ้นสารบัญตลาด + ระบบทำ SEO ให้อัตโนมัติ — เริ่มรับลูกค้าได้เลย</p>
  </section>

  <h2>คำถามที่พบบ่อย</h2>
${faqBlocks}
  <a class="cta" href="${escapeHtml(origin + '/shop')}">เปิดร้านฟรีตอนนี้ →</a>
  <footer>หนึ่งในผลิตภัณฑ์ของ B. Training Consultant · <a href="${escapeHtml(origin + '/b')}">ดูตลาดธุรกิจไทย</a> · <a href="${escapeHtml(origin + '/')}">ceoaithailand.org</a></footer>`;
  return seoStaticPage({ origin, path: '/sell', title, desc, schema, body });
}

/* ===== /security — ความปลอดภัย AI (answer-first · ตอบกระแสข่าว AI เข้าถึง/แฮกระบบภายนอก) ===== */
export function securityFaqJsonLd(): object {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: SAFETY_FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}
export function securityArticleJsonLd(origin: string): object {
  return {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: 'ความปลอดภัย AI ของ CEO AI Thailand — AI ที่ถูกจำกัดขอบเขตชัดเจน',
    description: 'AI ของ CEO AI Thailand เข้าถึงเฉพาะข้อมูลเวิร์กสเปซของคุณ (RLS), ออกนอกได้เฉพาะบริการที่อนุมัติ (allowlist), ผลิตแค่ข้อความไม่รันคำสั่ง และมนุษย์ยืนยันทุกการกระทำสำคัญ',
    inLanguage: 'th',
    mainEntityOfPage: `${origin}/security`,
    author: { '@type': 'Organization', name: 'CEO AI Thailand', url: origin },
    publisher: { '@type': 'Organization', name: 'B. Training Consultant', url: 'https://www.b-tctraining.com/' },
    about: 'AI safety, data isolation, egress allowlist, PDPA',
  };
}

/** หน้า answer-first /security — เกราะความปลอดภัย AI (crawlable · AEO/GEO) */
export function securityPageHtml(origin: string): string {
  const title = 'ความปลอดภัย AI — AI ที่ถูกจำกัดขอบเขต ไม่แตะระบบคนอื่น | CEO AI Thailand';
  const desc = 'ยุคที่มีข่าว AI เข้าถึง/แฮกระบบภายนอก — CEO AI Thailand ออกแบบ AI ให้ปลอดภัย: เข้าถึงเฉพาะข้อมูลเวิร์กสเปซคุณ (RLS), ออกนอกได้เฉพาะบริการที่อนุมัติ (allowlist), ผลิตแค่ข้อความ และมนุษย์ยืนยันทุกการกระทำสำคัญ';
  const cmtBlocks = SAFETY_COMMITMENTS.map(c =>
    `    <section class="phase">\n      <h3>${escapeHtml(c.icon + ' ' + c.title)}</h3>\n      <p>${escapeHtml(c.body)}</p>\n    </section>`
  ).join('\n');
  const faqBlocks = SAFETY_FAQ.map(f =>
    `    <section class="qa">\n      <h2>${escapeHtml(f.q)}</h2>\n      <p>${escapeHtml(f.a)}</p>\n    </section>`
  ).join('\n');
  const schema = jsonLdScript([securityArticleJsonLd(origin), securityFaqJsonLd(), organizationJsonLd(origin)]);
  const body = `  <h1>ความปลอดภัย AI ของ CEO AI Thailand</h1>
  <p class="lead">${escapeHtml(SAFETY_FAQ[1].a)}</p>
  <p class="sub">มีข่าวเรื่อง AI เข้าถึงหรือ “แฮก” ระบบภายนอกโดยไม่ตั้งใจในสภาพแวดล้อมวิจัย — เราจึงออกแบบ AI ของเราให้มี <b>ขอบเขตแคบและกันเผื่อไว้หลายชั้น</b> ตั้งแต่ระดับฐานข้อมูลจนถึงเครือข่าย · พัฒนาโดย B. Training Consultant ที่ปรึกษาระบบมาตรฐานไทยกว่า 20 ปี</p>

  <p class="tagline">แก่น: AI ของเราเป็น <b>ผู้ช่วยผลิตเนื้อหา/วางแผน</b> ที่เข้าถึงเฉพาะข้อมูลของคุณ — ไม่ใช่ agent ที่ไปเชื่อมหรือควบคุมระบบภายนอกเอง</p>

  <h2>เกราะป้องกัน 6 ชั้น</h2>
${cmtBlocks}

  <h2>คำถามที่พบบ่อยเรื่องความปลอดภัย</h2>
${faqBlocks}
  <a class="cta" href="${escapeHtml(origin + '/start')}">เริ่มใช้อย่างมั่นใจ — ฟรี →</a>
  <footer>หนึ่งในผลิตภัณฑ์ของ B. Training Consultant · <a href="${escapeHtml(origin + '/trust')}">T.R.U.S.T. คอนเทนต์สายเชื่อใจ</a> · <a href="${escapeHtml(origin + '/')}">ceoaithailand.org</a></footer>`;
  return seoStaticPage({ origin, path: '/security', title, desc, schema, body });
}
