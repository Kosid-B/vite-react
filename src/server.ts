/// <reference types="@cloudflare/workers-types" />

import {
  storefrontSeo, directorySeo, directoryItemList, sitemapXml, jsonLdScript, llmsTxt,
  homeSeo, faqPageHtml, mit24PageHtml, skillsPageHtml, trustPageHtml, sellPageHtml, securityPageHtml, aggregateFromRatings,
  blogIndexHtml, blogPostHtml,
  type SeoData, type SeoStorefront, type ReviewAggregate,
} from './lib/seoData';

import { resolveShortLink, shortLinkTarget } from './lib/shortLinks';

export { CeoAiAgent } from './agent/CeoAiAgent';

interface Env {
  ANTHROPIC_API_KEY: string;
  CeoAiAgent: DurableObjectNamespace;
  ASSETS: Fetcher;
  // ค่า public (ไม่ใช่ secret) — anon key = public โดยดีไซน์ (ดู CLAUDE.md); ใช้อ่าน storefronts เพื่อทำ SEO ฝั่ง server
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SITE_ORIGIN?: string;
}

/** อ่านแถวหน้าร้าน (เฉพาะที่เผยแพร่) ผ่าน Supabase REST — คืน null ถ้าไม่มี/พลาด (fallback shell) */
async function fetchStorefront(slug: string, env: Env, origin: string): Promise<SeoStorefront | null> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const q = `${env.SUPABASE_URL}/rest/v1/storefronts?slug=eq.${encodeURIComponent(slug)}` +
    `&published=eq.true&select=slug,name,dbd,kind,vp,description,promo,images,phone,rating,review_count,logo_svg,lat,lng&limit=1`;
  const res = await fetch(q, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<SeoStorefront & { review_count?: number; logo_svg?: string | null }>;
  const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (!row) return null;
  // map review_count (snake) → reviewCount (camel) + logoUrl (worker เสิร์ฟ SVG ที่ /b/<slug>/logo.svg)
  const logoUrl = row.logo_svg ? `${origin}/b/${encodeURIComponent(slug)}/logo.svg` : undefined;
  return { ...row, reviewCount: row.review_count, logoUrl };
}

/** อ่านโลโก้ SVG ของร้าน (published) — คืน null ถ้าไม่มี */
async function fetchStorefrontLogo(slug: string, env: Env): Promise<string | null> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const q = `${env.SUPABASE_URL}/rest/v1/storefronts?slug=eq.${encodeURIComponent(slug)}` +
    `&published=eq.true&select=logo_svg&limit=1`;
  const res = await fetch(q, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ logo_svg?: string | null }>;
  return rows?.[0]?.logo_svg ?? null;
}

/** รายชื่อร้านที่เผยแพร่ (slug + name + updatedAt) — ใช้ทำ sitemap และ ItemList หน้าตลาด */
async function listPublished(env: Env): Promise<{ slug: string; name: string; updatedAt?: string }[]> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return [];
  const q = `${env.SUPABASE_URL}/rest/v1/storefronts?published=eq.true` +
    `&select=slug,name,updated_at&order=updated_at.desc&limit=1000`;
  const res = await fetch(q, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as { slug: string; name: string; updated_at?: string }[];
  return (rows ?? []).map(r => ({
    slug: r.slug, name: r.name, updatedAt: r.updated_at ? String(r.updated_at).slice(0, 10) : undefined,
  }));
}

/** ดึงค่าเฉลี่ยรีวิว "จริง" (approved) จาก platform_testimonials — สำหรับ AggregateRating หน้าแรก
 *  anon key อ่าน approved ได้ตาม RLS (เหมือน client) · error/ไม่มีข้อมูล → null (ไม่ inject ดาว) */
async function fetchReviewsAggregate(env: Env): Promise<ReviewAggregate | null> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const q = `${env.SUPABASE_URL}/rest/v1/platform_testimonials?status=eq.approved&select=rating`;
  const res = await fetch(q, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return null;
  const rows = await res.json() as { rating: number }[];
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return aggregateFromRatings(rows.map(r => r.rating));
}

/** ส่ง shell (index.html) ผ่าน HTMLRewriter — แทน title/meta/canonical/OG + แนบ JSON-LD */
function injectSeo(shell: Response, seo: SeoData): Response {
  const setContent = (content: string): ElementHandler => ({
    element(el) { el.setAttribute('content', content); },
  });
  return new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(seo.title); } })
    .on('meta[name="description"]', setContent(seo.description))
    .on('meta[property="og:title"]', setContent(seo.title))
    .on('meta[property="og:description"]', setContent(seo.description))
    .on('meta[property="og:url"]', setContent(seo.canonicalUrl))
    .on('meta[property="og:image"]', setContent(seo.imageUrl))
    .on('meta[name="twitter:title"]', setContent(seo.title))
    .on('meta[name="twitter:description"]', setContent(seo.description))
    .on('meta[name="twitter:image"]', setContent(seo.imageUrl))
    .on('link[rel="canonical"]', { element(el) { el.setAttribute('href', seo.canonicalUrl); } })
    .on('head', { element(el) { el.append(jsonLdScript(seo.jsonLd), { html: true }); } })
    .transform(shell);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = env.SITE_ORIGIN || url.origin;

    // Route /api/guest-ask → guest ลอง AI จริงก่อนสมัคร (DO เดียวร่วมกัน 'guest-pool' + cap ต่อ IP/วัน)
    // แก้ pain "คิดว่าต้องสมัครถึงใช้ AI ได้" — ให้เห็นค่าจริงก่อน แล้วค่อยชวนสมัคร
    if (url.pathname === '/api/guest-ask' && request.method === 'POST') {
      const id = env.CeoAiAgent.idFromName('guest-pool');
      const stub = env.CeoAiAgent.get(id);
      const headers = new Headers(request.headers);
      headers.set('x-guest-ask', '1');                       // DO เช็ค flag นี้ → เข้า guest quota path
      return stub.fetch(new Request(request, { headers }));  // คง body + cf-connecting-ip เดิม
    }

    // Route /api/agent/CeoAiAgent/<agentId> → Durable Object แยกต่อ workspace (R8)
    if (url.pathname.startsWith('/api/agent/')) {
      const seg = url.pathname.split('/')[4] ?? '';           // /api/agent/CeoAiAgent/<id>
      const agentId = /^[A-Za-z0-9_-]{1,64}$/.test(seg) ? seg : 'default';
      const id = env.CeoAiAgent.idFromName(agentId);
      const stub = env.CeoAiAgent.get(id);
      return stub.fetch(request);
    }

    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, ts: Date.now() });
    }

    // รับ error จากฝั่ง client (ErrorBoundary + global handlers) → log ให้ Cloudflare observability เก็บ
    // = เห็นปัญหา production ก่อนผู้ใช้แจ้ง (ดูใน dashboard/ wrangler tail)
    if (url.pathname === '/api/client-error' && request.method === 'POST') {
      try { console.error('[client-error]', (await request.text()).slice(0, 4000)); } catch { /* noop */ }
      return new Response(null, { status: 204 });
    }

    // ===== SEO ฝั่ง server (marketplace) — เฉพาะ GET =====
    if (request.method === 'GET') {
      // ลิงก์สั้นสำหรับโซเชียล — คนที่เห็น Story/TikTok "พิมพ์ตาม" ไม่ได้กด
      // จึงต้องสั้นพอที่จะจำและพิมพ์ถูกจากการเห็นครั้งเดียว
      // ติด utm ให้เองเพื่อวัดผลได้โดยที่ผู้ใช้ไม่ต้องพิมพ์ query string
      const short = resolveShortLink(url.pathname);
      // `?s=yt` ฯลฯ = บอกว่ามาจากแพลตฟอร์มไหน → แยกที่มาในรายงานได้ (ดู SOURCE_PRESETS)
      if (short) return Response.redirect(shortLinkTarget(short, origin, url.search), 302);

      // sitemap.xml แบบ dynamic จากตาราง storefronts (override public/sitemap.xml)
      // ⚠️ ต้องคืน XML "เสมอ" — ห้าม fall through ไป ASSETS (index.html) เพราะ Google จะเห็นเป็น HTML แล้ว reject
      if (url.pathname === '/sitemap.xml') {
        let stores: { slug: string; name: string; updatedAt?: string }[] = [];
        try { stores = await listPublished(env); } catch { /* net/json error → sitemap หน้า static ล้วน */ }
        return new Response(sitemapXml(stores, origin), {
          headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
        });
      }

      // llms.txt → บอก AI crawler (ChatGPT/Gemini/Perplexity) ว่าเว็บนี้คืออะไร + หน้าสำคัญ (GEO/AEO)
      if (url.pathname === '/llms.txt') {
        return new Response(llmsTxt(origin), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
        });
      }

      // /faq → หน้า answer-first แบบ static HTML (crawlable ไม่ต้องรอ JS) + FAQPage schema (AEO)
      if (url.pathname === '/faq' || url.pathname === '/faq/') {
        return new Response(faqPageHtml(origin), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
        });
      }

      // /mit24 → บทความ answer-first: MIT 24 Steps คืออะไร ใช้ยังไงในแอป + Article/FAQPage schema (GEO/AEO)
      if (url.pathname === '/mit24' || url.pathname === '/mit24/') {
        return new Response(mit24PageHtml(origin), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
        });
      }

      // /skills → บทความ answer-first: AI Skills ที่โตไปกับธุรกิจ + Skill ใหม่ตามระดับ (GEO/AEO)
      if (url.pathname === '/skills' || url.pathname === '/skills/') {
        return new Response(skillsPageHtml(origin), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
        });
      }

      // /trust → บทความ answer-first: T.R.U.S.T. Framework คอนเทนต์สายเชื่อใจยุค AI (GEO/AEO)
      if (url.pathname === '/trust' || url.pathname === '/trust/') {
        return new Response(trustPageHtml(origin), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
        });
      }

      // /sell → บทความ answer-first "เปิดร้านออนไลน์ฟรี" ดึง seller (content-first marketplace SEO)
      if (url.pathname === '/sell' || url.pathname === '/sell/') {
        return new Response(sellPageHtml(origin), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
        });
      }

      // /security → ความปลอดภัย AI (answer-first · ตอบกระแสข่าว AI เข้าถึงระบบภายนอก)
      if (url.pathname === '/security' || url.pathname === '/security/') {
        return new Response(securityPageHtml(origin), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
        });
      }

      // /blog → index รวมบทความ SME (answer-first · ดึง traffic คนที่กำลังหาทางแก้ปัญหา)
      if (url.pathname === '/blog' || url.pathname === '/blog/') {
        return new Response(blogIndexHtml(origin), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
        });
      }
      // /blog/<slug> → บทความเดี่ยว (server-render เต็ม = Google index ได้โดยไม่รอ JS)
      const blogM = url.pathname.match(/^\/blog\/([^/]+)\/?$/);
      if (blogM) {
        const html = blogPostHtml(origin, decodeURIComponent(blogM[1]));
        if (html) {
          return new Response(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
          });
        }
        // slug ไม่พบ → ปล่อยผ่านไป SPA (ASSETS) ตามปกติ
      }

      // หน้าแรก / → inject schema (Organization + SoftwareApplication + FAQPage) ให้ AI/Google สกัด entity
      if (url.pathname === '/') {
        try {
          const agg = await fetchReviewsAggregate(env).catch(() => null);
          // ?seg= (แคมเปญ palm/food/…) → inject OG/preview ตรงกลุ่มฝั่ง server ไม่พึ่ง JS
          const seg = url.searchParams.get('seg') ?? undefined;
          return injectSeo(await env.ASSETS.fetch(request), homeSeo(origin, agg ?? undefined, seg));
        }
        catch { /* fallback → shell เดิม */ }
      }

      // /b/<slug>/logo.svg → เสิร์ฟโลโก้แบรนด์ของร้าน (SVG) สำหรับ JSON-LD logo + แชร์
      const logoM = url.pathname.match(/^\/b\/([^/]+)\/logo\.svg$/);
      if (logoM) {
        try {
          const svg = await fetchStorefrontLogo(decodeURIComponent(logoM[1]), env);
          if (svg && svg.trim().startsWith('<svg')) {
            return new Response(svg, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
          }
        } catch { /* fall through → 404 */ }
        return new Response('not found', { status: 404 });
      }

      // /b/<slug> → inject meta ต่อร้าน
      const m = url.pathname.match(/^\/b\/([^/]+)\/?$/);
      if (m) {
        try {
          const sf = await fetchStorefront(decodeURIComponent(m[1]), env, origin);
          if (sf) return injectSeo(await env.ASSETS.fetch(request), storefrontSeo(sf, origin));
        } catch { /* fallback → shell เดิม (React แสดง "ไม่พบร้าน") */ }
      }

      // /b (สารบัญตลาด) → CollectionPage + ItemList
      if (url.pathname === '/b' || url.pathname === '/b/') {
        try {
          const seo = directorySeo(origin);
          seo.jsonLd.push(directoryItemList(await listPublished(env), origin));
          return injectSeo(await env.ASSETS.fetch(request), seo);
        } catch { /* fallback → shell เดิม */ }
      }
    }

    // Serve static SPA assets
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
