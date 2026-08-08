/* Prerender SEO/GEO assets เป็นไฟล์ static ลง dist/ หลัง vite build
 * เพื่อให้ /llms.txt, /sitemap.xml, /faq, /mit24 ทำงานแม้โฮสต์ที่ไม่ใช่ Cloudflare Worker
 * (เช่น GitHub Pages / Cloudflare Pages) — ใช้ builder ตัวเดียวกับ Worker (single source ไม่ drift)
 * รันด้วย vite-node (รองรับ import .ts) · best-effort: ไม่ทำให้ build ล้ม */
import { mkdirSync, writeFileSync } from 'node:fs';
import { llmsTxt, sitemapXml, faqPageHtml, mit24PageHtml, skillsPageHtml } from '../src/lib/seoData.ts';

const ORIGIN = process.env.SITE_ORIGIN || 'https://ceoaithailand.org';
const OUT = 'dist';

try {
  writeFileSync(`${OUT}/llms.txt`, llmsTxt(ORIGIN));
  writeFileSync(`${OUT}/sitemap.xml`, sitemapXml([], ORIGIN));   // static routes (Worker เสิร์ฟตัว dynamic เมื่อ fronting)
  mkdirSync(`${OUT}/faq`, { recursive: true });
  writeFileSync(`${OUT}/faq/index.html`, faqPageHtml(ORIGIN));
  mkdirSync(`${OUT}/mit24`, { recursive: true });
  writeFileSync(`${OUT}/mit24/index.html`, mit24PageHtml(ORIGIN));
  mkdirSync(`${OUT}/skills`, { recursive: true });
  writeFileSync(`${OUT}/skills/index.html`, skillsPageHtml(ORIGIN));
  console.log('[prerender-seo] ✓ llms.txt · sitemap.xml · faq/index.html · mit24/index.html · skills/index.html');
} catch (e) {
  console.error('[prerender-seo] skipped (non-fatal):', e && e.message);
}
process.exit(0);   // ไม่ให้ build ล้มเพราะ prerender
