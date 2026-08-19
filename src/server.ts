/// <reference types="@cloudflare/workers-types" />

import {
  storefrontSeo, directorySeo, directoryItemList, sitemapXml, jsonLdScript, llmsTxt, escapeHtml,
  homeSeo, faqPageHtml, mit24PageHtml, skillsPageHtml, trustPageHtml, sellPageHtml, securityPageHtml, aggregateFromRatings,
  blogIndexHtml, blogPostHtml, clientPageSeo,
  type SeoData, type SeoStorefront, type ReviewAggregate,
} from './lib/seoData';

import { resolveShortLinkWithSource, shortLinkTarget } from './lib/shortLinks';

export { CeoAiAgent } from './agent/CeoAiAgent';

interface Env {
  ANTHROPIC_API_KEY: string;
  CeoAiAgent: DurableObjectNamespace;
  ASSETS: Fetcher;
  // ค่า public (ไม่ใช่ secret) — anon key = public โดยดีไซน์ (ดู CLAUDE.md); ใช้อ่าน storefronts เพื่อทำ SEO ฝั่ง server
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SITE_ORIGIN?: string;
  /** โทเคนยืนยันความเป็นเจ้าของใน Google Search Console (ค่า public — ใส่ใน vars ได้ ไม่ใช่ secret) */
  GOOGLE_SITE_VERIFICATION?: string;
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

/**
 * เก็บ error ฝั่ง client ลง Supabase (rpc track_client_error · 0058) เพื่อค้นย้อนหลังได้
 * Workers Logs เก็บไม่กี่วัน — ตารางนี้คือความจำระยะยาวของเรา
 * เงียบเสมอเมื่อพลาด: การรายงาน error ต้องไม่กลายเป็นแหล่ง error เสียเอง
 */
async function saveClientError(env: Env, raw: string): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return;
  let p: { message?: string; source?: string; path?: string; stack?: string; ua?: string };
  try { p = JSON.parse(raw); } catch { return; }
  if (!p?.message || !p?.source) return;
  await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/track_client_error`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_message: p.message, p_source: p.source,
      p_path: p.path ?? null, p_stack: p.stack ?? null, p_ua: p.ua ?? null,
    }),
  });
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
  const setContent = (content: string): HTMLRewriterElementContentHandlers => ({
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
    // index.html มี <meta name="robots" content="index,follow"> อยู่แล้ว — เขียนทับเมื่อหน้านั้นสั่งเป็นอย่างอื่น
    // (เช่น /b ที่ยังไม่มีร้านพอ → noindex,follow กันโดนตีเป็น thin page)
    .on('meta[name="robots"]', { element(el) { if (seo.robots) el.setAttribute('content', seo.robots); } })
    .on('head', { element(el) { el.append(jsonLdScript(seo.jsonLd), { html: true }); } })
    .transform(shell);
}

/** แทรก <meta name="google-site-verification"> ให้ทุกหน้า HTML เมื่อมีค่าใน env
 *
 *  ทำไมทำผ่าน env ไม่ hardcode: โทเคนผูกกับบัญชี Search Console ไม่ใช่โค้ด
 *  ตั้งค่าแล้ว deploy ใหม่ได้เลยโดยไม่ต้องแก้ไฟล์ (ดู docs/marketing/SEARCH-CONSOLE-SETUP.md)
 *  ไม่มีค่า = ไม่แทรกอะไร (คืน response เดิม ไม่เสียค่า transform) */
function injectVerification(res: Response, token?: string): Response {
  if (!token) return res;
  // แตะเฉพาะ HTML — sitemap.xml, llms.txt, logo.svg และ API ต้องผ่านไปตามเดิม
  if (!(res.headers.get('content-type') ?? '').includes('text/html')) return res;
  return new HTMLRewriter()
    .on('head', {
      element(el) {
        el.append(`<meta name="google-site-verification" content="${escapeHtml(token)}">`, { html: true });
      },
    })
    .transform(res);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // จุดเดียวที่แทรกโทเคนยืนยัน Search Console — ครอบทุกเส้นทางที่คืน HTML โดยไม่ต้องแก้ทีละที่
    return injectVerification(await handle(request, env), env.GOOGLE_SITE_VERIFICATION);
  },
} satisfies ExportedHandler<Env>;

async function handle(request: Request, env: Env): Promise<Response> {
  {
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

    // Route /api/checkup-lead → ผู้ทำแบบตรวจสุขภาพขอรายงานเต็ม (หน้า /checkup สาธารณะ)
    // เขียนผ่าน rpc submit_checkup_lead (security definer) — ตาราง checkup_leads ปิด RLS ไว้
    // ตั้งใจตอบ 200 แม้บันทึกไม่สำเร็จ: ผู้ใช้ทำส่วนของเขาครบแล้ว ไม่ควรเห็น error จากฝั่งเรา
    if (url.pathname === '/api/checkup-lead' && request.method === 'POST') {
      if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return Response.json({ ok: false }, { status: 503 });
      try {
        const body = (await request.json()) as Record<string, unknown>;
        const email = String(body.email ?? '').trim().slice(0, 254);
        if (!email.includes('@')) return Response.json({ ok: false }, { status: 400 });
        const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/submit_checkup_lead`, {
          method: 'POST',
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            p_email: email,
            p_company: String(body.company ?? '').slice(0, 120) || null,
            p_pct: Number(body.pct) || 0,
            p_band: String(body.band ?? '').slice(0, 16) || null,
            p_answers: body.answers ?? {},
            p_source: (String(body.standard ?? '') || url.searchParams.get('utm_source') || '').slice(0, 32) || null,
          }),
        });
        if (!r.ok) console.error('[checkup-lead]', r.status, (await r.text()).slice(0, 300));
      } catch (e) {
        console.error('[checkup-lead]', String(e).slice(0, 300));
      }
      return Response.json({ ok: true });
    }

    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, ts: Date.now() });
    }

    // รับ error จากฝั่ง client (ErrorBoundary + global handlers) → เก็บ 2 ที่
    //   1) console.error → Cloudflare Workers Logs (เห็นสด ๆ ตอน debug)
    //   2) Supabase client_errors (0058) → ค้นย้อนหลังได้ เพราะ Workers Logs เก็บไม่กี่วัน
    //      (บทเรียน 17 ส.ค. 2569: GA บอกว่ามี error 35 เซสชัน แต่ตอบไม่ได้ว่าพังเพราะอะไร
    //       เพราะหลักฐานหมดอายุไปแล้ว — ดู docs/LESSONS-LEDGER.md)
    // ต้องไม่ทำให้ client พัง: อะไรล้มก็ยังคืน 204 (sendBeacon ไม่รออ่านผลอยู่แล้ว)
    if (url.pathname === '/api/client-error' && request.method === 'POST') {
      try {
        const raw = (await request.text()).slice(0, 4000);
        console.error('[client-error]', raw);
        await saveClientError(env, raw);
      } catch { /* noop */ }
      return new Response(null, { status: 204 });
    }

    // ===== SEO ฝั่ง server (marketplace) — เฉพาะ GET =====
    if (request.method === 'GET') {
      // ลิงก์สั้นสำหรับโซเชียล — คนที่เห็น Story/TikTok "พิมพ์ตาม" ไม่ได้กด
      // จึงต้องสั้นพอที่จะจำและพิมพ์ถูกจากการเห็นครั้งเดียว
      // ติด utm ให้เองเพื่อวัดผลได้โดยที่ผู้ใช้ไม่ต้องพิมพ์ query string
      const short = resolveShortLinkWithSource(url.pathname);
      // `?s=yt` ฯลฯ = บอกว่ามาจากแพลตฟอร์มไหน → แยกที่มาในรายงานได้ (ดู SOURCE_PRESETS)
      if (short.link) return Response.redirect(shortLinkTarget(short.link, origin, url.search, short.src), 302);

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
      // ⚠️ URL เดียวกันสองหน้าตา: /blog/x กับ /blog/x/ เคยเสิร์ฟเนื้อหาเดียวกันทั้งคู่
      //    ผลจริงที่วัดได้ใน GA4 (22 ก.ค.–18 ส.ค. 2569): บทความ pricing-no-loss ถูกแยกเป็น 2 แถว
      //    (7 คน / 1 คน) ⇒ อ่านตัวเลขผิดโดยไม่รู้ตัว + Google เห็นเป็นหน้าซ้ำ
      //    รูปแบบมาตรฐาน = **ไม่มี slash ท้าย** (ตรงกับ SHORT_LINKS และ sitemap.xml)
      const blogSlash = url.pathname.match(/^\/blog\/([^/]+)\/$/);
      if (blogSlash) {
        return Response.redirect(`${origin}/blog/${blogSlash[1]}${url.search}`, 301);
      }

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
          const stores = await listPublished(env);
          // ส่งจำนวนร้านจริงเข้าไป → ยังไม่ถึงเกณฑ์จะได้ noindex,follow (กัน thin page)
          const seo = directorySeo(origin, stores.length);
          seo.jsonLd.push(directoryItemList(stores, origin));
          return injectSeo(await env.ASSETS.fetch(request), seo);
        } catch { /* fallback → shell เดิม */ }
      }

      // หน้า React สาธารณะที่อยู่ใน sitemap (/start /sale /shop /legal)
      // ต้องมี title/description/canonical ของตัวเอง ไม่งั้น Google เห็นเป็นหน้าซ้ำกับหน้าแรก
      // แล้วขึ้น "พบแล้ว - ยังไม่ได้จัดทำดัชนี" โดยไม่ crawl เลย (เจอจริงใน Search Console 16 ส.ค. 2569)
      const pageSeo = clientPageSeo(url.pathname, origin);
      if (pageSeo) return injectSeo(await env.ASSETS.fetch(request), pageSeo);
    }

    // Serve static SPA assets
    return env.ASSETS.fetch(request);
  }
}
