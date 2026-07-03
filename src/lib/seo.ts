/* ===== Client-side SEO — applySeo() =====
 * อัปเดต <title>/meta/canonical/OG/Twitter + JSON-LD ตอน React render (idempotent).
 * ช่วย Googlebot (render JS ได้) + SPA client-nav + deploy ที่ไม่ใช่ Cloudflare (Vercel/GH Pages).
 * บน production (Cloudflare Worker) meta ถูก inject ฝั่ง server แล้ว — helper นี้แค่ยืนยันให้ตรงกัน. */

import type { SeoData } from './seoData';

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function applySeo(seo: SeoData): void {
  if (typeof document === 'undefined') return;
  document.title = seo.title;
  setMeta('name', 'description', seo.description);
  setCanonical(seo.canonicalUrl);

  setMeta('property', 'og:title', seo.title);
  setMeta('property', 'og:description', seo.description);
  setMeta('property', 'og:url', seo.canonicalUrl);
  setMeta('property', 'og:image', seo.imageUrl);

  setMeta('name', 'twitter:title', seo.title);
  setMeta('name', 'twitter:description', seo.description);
  setMeta('name', 'twitter:image', seo.imageUrl);

  if (seo.jsonLd.length) {
    let ld = document.getElementById('ld-json-dynamic') as HTMLScriptElement | null;
    if (!ld) {
      ld = document.createElement('script');
      ld.id = 'ld-json-dynamic';
      ld.type = 'application/ld+json';
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify(seo.jsonLd.length === 1 ? seo.jsonLd[0] : seo.jsonLd);
  }
}

/** origin ของไซต์จริง — บน localhost/preview ใช้ canonical domain เพื่อไม่ให้ canonical ชี้ localhost */
export function siteOrigin(): string {
  if (typeof window === 'undefined') return 'https://ceoaithailand.org';
  const h = window.location.hostname;
  return (h === 'localhost' || h === '127.0.0.1') ? 'https://ceoaithailand.org' : window.location.origin;
}
