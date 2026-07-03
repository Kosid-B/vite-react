# Marketplace SEO — CEO AI Thailand (ผูกกับโค้ดจริง)

> สร้างจาก skill `marketplace-seo`. เอกสารนี้ = คู่มืออ้างอิงของ SEO ที่ **implement ในโค้ดแล้ว** +
> เช็กลิสต์งานต่อยอด. หลักการ: SEO ตลาดคือ *เกมสเกล* — เราไม่ปั้นหน้าเดียว แต่ทำ **เทมเพลต**
> ให้ทุกหน้าร้าน `/b/<slug>` และหน้าหมวดติดอันดับได้เอง.

## สิ่งที่ทำไปแล้วในโค้ด (this PR)
| ส่วน | ไฟล์ | ทำอะไร |
|---|---|---|
| Pure SEO builders | `src/lib/seoData.ts` | สร้าง title/description/canonical/OG + JSON-LD (LocalBusiness, BreadcrumbList, CollectionPage, ItemList) + `sitemapXml()` — source of truth เดียว, escape กัน XSS |
| **Server-side inject** | `src/server.ts` (Cloudflare Worker) | intercept `GET /b/<slug>`, `/b`, `/sitemap.xml` → อ่าน `storefronts` ผ่าน Supabase REST → `HTMLRewriter` ใส่ meta/JSON-LD ลง `index.html` **ก่อนส่งให้ crawler** (Google index ได้โดยไม่ต้องรอ JS) |
| Client-side inject | `src/lib/seo.ts` + `src/pages/PublicStorefront.tsx` | `applySeo()` อัปเดต title/meta/canonical/OG/JSON-LD ตอน render (Googlebot render JS ได้ + SPA nav + Vercel/GH Pages parity) |
| หน้าตลาด content | `src/pages/PublicStorefront.tsx` | intro paragraph SEO (อธิบายตลาด+หมวด) เหนือ grid, H1 ชัด, ItemList JSON-LD |
| Config | `wrangler.jsonc` | `vars`: SUPABASE_URL/ANON_KEY (public) + SITE_ORIGIN |

**Deploy:** merge → Cloudflare Workers auto-deploy → ทำงานทันที (ไม่ต้อง manual).

## Keyword Strategy (page-type mapping)
| ประเภทหน้า | รูปแบบคีย์เวิร์ด | ตัวอย่าง (ไทย) |
|---|---|---|
| หน้าแรก | แบรนด์ + หมวดหลัก | "CEO AI Thailand — จ้างทีม AI บริหารธุรกิจ" |
| หน้าตลาด `/b` | หมวด + ตัวขยาย | "ตลาดสินค้าและบริการธุรกิจไทย", "หาคู่ค้า B2B" |
| หน้าหมวด (chip DBD) | [หมวด] + จังหวัด/ตัวขยาย | "ร้านเกษตรออนไลน์", "บริการที่ปรึกษา ISO" |
| หน้าร้าน `/b/<slug>` | ชื่อร้าน + สินค้า/บริการ | long-tail เฉพาะร้าน — ไม่ซ้ำกัน |
| บล็อก/คู่มือ (อนาคต) | intent เชิงข้อมูล | "เปิดร้านออนไลน์ฟรี ไม่ต้องมีบัญชี ทำยังไง" |

## Category Page Priority
จัดลำดับหมวด DBD ที่จะโฟกัสด้วย 4 เกณฑ์: (1) volume ค้นหา (2) การแข่งขัน (3) intent ซื้อ
(4) **listing density** — มีร้านพอไหมที่จะเสิร์ฟคำค้นนั้น. เริ่มจากหมวดที่ **มีร้านจริงเยอะ + คนค้นหาเยอะ**
(เช่น อาหาร/เกษตร/งานฝีมือ/บริการที่ปรึกษา) ก่อนหมวดที่ยังไม่มีร้าน.

## Schema Markup (implement แล้วใน seoData.ts)
```
หน้าตลาด /b          : CollectionPage + ItemList (รายชื่อร้าน)
หน้าร้าน /b/<slug>   : LocalBusiness (name, description, image, url, telephone, addressCountry:TH)
                       + BreadcrumbList (หน้าแรก → ตลาด → ร้าน)
```
ทดสอบด้วย **Google Rich Results Test** (ใส่ URL `https://ceoaithailand.org/b/<slug>` หลัง deploy).

## Internal Linking (มีแล้ว/ควรเพิ่ม)
- ✅ Breadcrumb ในJSON-LD (โครงสร้าง) — *ควรเพิ่ม breadcrumb ที่มองเห็นบนหน้า UI ด้วย (todo)*
- ✅ หน้าร้าน → กลับหน้าตลาด `/b` (ปุ่ม pub-brand)
- ✅ หน้าตลาด → หน้าสมัครร้าน `/shop`
- ⬜ **Related listings** ("ร้านหมวดเดียวกัน") ท้ายหน้าร้าน — cross-link เพิ่ม crawl depth (todo)
- ⬜ Footer top-categories ทั่วไซต์ (todo)

## Technical SEO Checklist
- [x] หน้าร้าน/ตลาดมี title + meta description ไม่ซ้ำกัน (server + client)
- [x] Canonical ต่อหน้า (`/b/<slug>`) ไม่ชี้หน้าแรกทั้งหมดอีกต่อไป
- [x] OG/Twitter ต่อร้าน → แชร์ FB/LINE ขึ้น preview ของร้านนั้น
- [x] JSON-LD ถูกต้อง (LocalBusiness/ItemList/Breadcrumb) + escape กัน XSS
- [x] `sitemap.xml` แบบ dynamic รวมทุก `/b/<slug>` (เดิมมี URL เดียว)
- [x] `robots.txt` allow + ชี้ sitemap (มีอยู่แล้ว)
- [x] H1 เดียวต่อหน้า, `alt`/`loading=lazy` บนรูป (มีอยู่แล้ว)
- [ ] ส่ง sitemap เข้า **Google Search Console** (งานคน — ทำหลัง merge)
- [ ] Breadcrumb ที่มองเห็นบน UI + related-listings (dev todo รอบหน้า)
- [ ] noindex หน้ากรอง/ค้นหาที่ทำ thin page (ยังไม่มีปัญหา — ตลาดยังเล็ก)

## Metrics (วัดหลัง deploy)
| ตัวชี้วัด | เครื่องมือ | ความถี่ |
|---|---|---|
| Impressions/clicks หน้า `/b/*` | Google Search Console | สัปดาห์ |
| จำนวนหน้า indexed | Search Console (Coverage) | เดือน |
| Organic → activation (`/start`,`/shop`) | GA4 `G-CHJ99RY1Q1` | สัปดาห์ |

## ขั้นตอนคนต้องทำหลัง merge (สำคัญ)
1. ยืนยัน `https://ceoaithailand.org/sitemap.xml` คืนหลาย URL (หลัง Cloudflare deploy)
2. ตรวจ 1 หน้าร้านด้วย **Rich Results Test** ว่า LocalBusiness ผ่าน
3. **Google Search Console** → เพิ่ม property `ceoaithailand.org` → Submit sitemap
4. Seed liquidity: ชวนธุรกิจ 10–20 รายเปิดร้านจริง → Google มีของ index + คนเห็นว่ามีคนใช้
