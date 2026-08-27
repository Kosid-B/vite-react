/* Prerender SEO/GEO assets เป็นไฟล์ static ลง dist/ หลัง vite build
 * เพื่อให้ /llms.txt, /sitemap.xml, /faq, /mit24 ทำงานแม้โฮสต์ที่ไม่ใช่ Cloudflare Worker
 * (เช่น GitHub Pages / Cloudflare Pages) — ใช้ builder ตัวเดียวกับ Worker (single source ไม่ drift)
 * รันด้วย vite-node (รองรับ import .ts) · best-effort: ไม่ทำให้ build ล้ม */
import { mkdirSync, writeFileSync } from 'node:fs';
import { llmsTxt, sitemapXml, aboutPageHtml, faqPageHtml, mit24PageHtml, skillsPageHtml, trustPageHtml, sellPageHtml, securityPageHtml, blogIndexHtml, blogPostHtml } from '../src/lib/seoData.ts';
import { BLOG_POSTS } from '../src/lib/blogData.ts';

const ORIGIN = process.env.SITE_ORIGIN || 'https://ceoaithailand.org';
const OUT = 'dist';

try {
  writeFileSync(`${OUT}/llms.txt`, llmsTxt(ORIGIN));
  writeFileSync(`${OUT}/sitemap.xml`, sitemapXml([], ORIGIN));   // static routes (Worker เสิร์ฟตัว dynamic เมื่อ fronting)
  mkdirSync(`${OUT}/about`, { recursive: true });
  writeFileSync(`${OUT}/about/index.html`, aboutPageHtml(ORIGIN));
  mkdirSync(`${OUT}/faq`, { recursive: true });
  writeFileSync(`${OUT}/faq/index.html`, faqPageHtml(ORIGIN));
  mkdirSync(`${OUT}/mit24`, { recursive: true });
  writeFileSync(`${OUT}/mit24/index.html`, mit24PageHtml(ORIGIN));
  mkdirSync(`${OUT}/skills`, { recursive: true });
  writeFileSync(`${OUT}/skills/index.html`, skillsPageHtml(ORIGIN));
  mkdirSync(`${OUT}/trust`, { recursive: true });
  writeFileSync(`${OUT}/trust/index.html`, trustPageHtml(ORIGIN));
  mkdirSync(`${OUT}/sell`, { recursive: true });
  writeFileSync(`${OUT}/sell/index.html`, sellPageHtml(ORIGIN));
  mkdirSync(`${OUT}/security`, { recursive: true });
  writeFileSync(`${OUT}/security/index.html`, securityPageHtml(ORIGIN));
  // Blog: หน้า index + หน้าบทความรายตัว (server-render static = Google index ได้โดยไม่รอ JS)
  mkdirSync(`${OUT}/blog`, { recursive: true });
  writeFileSync(`${OUT}/blog/index.html`, blogIndexHtml(ORIGIN));
  for (const p of BLOG_POSTS) {
    mkdirSync(`${OUT}/blog/${p.slug}`, { recursive: true });
    writeFileSync(`${OUT}/blog/${p.slug}/index.html`, blogPostHtml(ORIGIN, p.slug));
  }
  console.log(`[prerender-seo] ✓ llms.txt · sitemap.xml · about · faq · mit24 · skills · trust · sell · security · blog (${BLOG_POSTS.length} posts)`);
} catch (e) {
  console.error('[prerender-seo] skipped (non-fatal):', e && e.message);
}
process.exit(0);   // ไม่ให้ build ล้มเพราะ prerender
