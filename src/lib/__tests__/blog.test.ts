import { describe, it, expect } from 'vitest';
import { BLOG_POSTS, blogPostBySlug } from '../blogData';
import { blogPostHtml, blogIndexHtml, sitemapXml } from '../seoData';

const ORIGIN = 'https://ceoaithailand.org';

describe('blogData', () => {
  it('slug ไม่ซ้ำ + มีฟิลด์ครบทุกโพสต์', () => {
    const slugs = BLOG_POSTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of BLOG_POSTS) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
      expect(p.sections.length).toBeGreaterThan(0);
      expect(p.faq.length).toBeGreaterThan(0);
      expect(/^\d{4}-\d{2}-\d{2}$/.test(p.dateISO)).toBe(true);
    }
  });
  it('blogPostBySlug คืนโพสต์ถูก / undefined เมื่อไม่พบ', () => {
    expect(blogPostBySlug(BLOG_POSTS[0].slug)?.slug).toBe(BLOG_POSTS[0].slug);
    expect(blogPostBySlug('ไม่มีจริง')).toBeUndefined();
  });
});

describe('blogPostHtml', () => {
  it('render บทความ: มี title/H1/JSON-LD/canonical + escape', () => {
    const html = blogPostHtml(ORIGIN, BLOG_POSTS[0].slug)!;
    expect(html).toContain('<!doctype html>');
    expect(html).toContain(BLOG_POSTS[0].title);
    expect(html).toContain(`${ORIGIN}/blog/${BLOG_POSTS[0].slug}`);
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');
  });
  it('slug ไม่พบ → null', () => {
    expect(blogPostHtml(ORIGIN, 'nope')).toBeNull();
  });
});

describe('blogIndexHtml + sitemap', () => {
  it('index มีลิงก์ทุกบทความ', () => {
    const html = blogIndexHtml(ORIGIN);
    for (const p of BLOG_POSTS) expect(html).toContain(`/blog/${p.slug}`);
    expect(html).toContain('"@type":"ItemList"');
  });
  it('sitemap รวม /blog + ทุกบทความ', () => {
    const xml = sitemapXml([], ORIGIN);
    expect(xml).toContain(`${ORIGIN}/blog</loc>`);
    for (const p of BLOG_POSTS) expect(xml).toContain(`${ORIGIN}/blog/${p.slug}</loc>`);
  });
});
