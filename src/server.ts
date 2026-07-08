/// <reference types="@cloudflare/workers-types" />

import {
  storefrontSeo, directorySeo, directoryItemList, sitemapXml, jsonLdScript,
  type SeoData, type SeoStorefront,
} from './lib/seoData';

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
async function fetchStorefront(slug: string, env: Env): Promise<SeoStorefront | null> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const q = `${env.SUPABASE_URL}/rest/v1/storefronts?slug=eq.${encodeURIComponent(slug)}` +
    `&published=eq.true&select=slug,name,dbd,kind,vp,description,promo,images,phone&limit=1`;
  const res = await fetch(q, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as SeoStorefront[];
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
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
      // sitemap.xml แบบ dynamic จากตาราง storefronts (override public/sitemap.xml)
      if (url.pathname === '/sitemap.xml') {
        try {
          const xml = sitemapXml(await listPublished(env), origin);
          return new Response(xml, {
            headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
          });
        } catch { /* fallback → static asset */ }
      }

      // /b/<slug> → inject meta ต่อร้าน
      const m = url.pathname.match(/^\/b\/([^/]+)\/?$/);
      if (m) {
        try {
          const sf = await fetchStorefront(decodeURIComponent(m[1]), env);
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
