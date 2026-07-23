# Marketplace SEO Plan — CEO AI Thailand (/b) + Cross-link Ecosystem
> เฟรม: Category-page-first · scale via templates · schema + internal linking
> ผูกกับโค้ดจริง: server-side SEO ใน `src/server.ts` (HTMLRewriter) + `src/lib/seoData.ts` + `/sitemap.xml`

## Brief
| หัวข้อ | ค่า |
|---|---|
| ประเภท | Marketplace B2B — หน้าร้าน SME ไทย + สินค้า/บริการ (skill) |
| พื้นที่ | ประเทศไทย (Thai-language) |
| จำนวน listing | <500 (early) → ต้องเน้น content + category ก่อน |
| Organic ปัจจุบัน | google/organic เป็น #2 source (จาก GA4) — ฐานมีแล้ว |
| หมวดหลัก | ที่ปรึกษา ISO/มอก. · บริการธุรกิจ · skill marketplace · หน้าร้าน SME |
| คู่แข่ง search | เว็บที่ปรึกษา ISO ไทย, marketplace บริการทั่วไป, สมอ./ราชการ (informational) |

## หลักการ: เป็น scale game — category page = ทรัพย์สิน SEO สูงสุด
listing น้อย (<500) → **ช่วงนี้เน้น content-driven + category ก่อน** แล้วค่อยดัน listing เมื่อ supply โต

---

## Phase 2: Keyword map ต่อ page type
| Page | Keyword pattern | ตัวอย่าง (ไทย) |
|---|---|---|
| Homepage /start | brand + หมวดหลัก | "จ้างทีม AI บริหารธุรกิจ SME ไทย" |
| Directory /b | ตลาด + หมวด | "ตลาดบริการ SME · หาที่ปรึกษา/สินค้า B2B" |
| Category /b?cat= | [หมวด] + modifier | "ที่ปรึกษา ISO 9001 ราคา", "รับทำเอกสาร มอก." |
| Storefront /b/<slug> | [ชื่อร้าน] + บริการ | long-tail unique ต่อร้าน |
| Blog/guide | informational intent | "ขอ มอก. ต้องทำอะไรบ้าง 2569", "จ้างที่ปรึกษา ISO ราคาเท่าไร" |

### Category priority (volume × intent × supply)
1. **ที่ปรึกษา ISO/มอก.** — volume สูง, intent สูง, B.TC มี authority
2. **รับทำเอกสารระบบคุณภาพ** — intent สูง (transactional)
3. **บริการ BCM/ISO 22301** — volume ต่ำแต่ competition ต่ำ = ชนะง่าย
4. หน้าร้าน SME ทั่วไป — รอ supply โต

---

## Phase 3: Optimize (ผูกกับสิ่งที่มีในโค้ดแล้ว ✅ / ต้องเพิ่ม ⚠️)
### Storefront /b/<slug> (server-side มีแล้ว)
- ✅ `title` = `${name} — ${sector} | CEO AI Thailand` (seoData.ts)
- ✅ meta description, canonical, OG/Twitter (HTMLRewriter inject ฝั่ง server)
- ✅ JSON-LD LocalBusiness + BreadcrumbList
- ⚠️ เพิ่ม AggregateRating schema เมื่อมีรีวิว

### Directory /b (มีแล้ว)
- ✅ CollectionPage + ItemList JSON-LD + intro paragraph
- ⚠️ เพิ่ม **category landing** แยกต่อหมวด (H1 + intro 100-150 คำ + filter + ItemList)

### Category page template (ต้องเพิ่ม)
```
H1: [หมวด] (เช่น "ที่ปรึกษา ISO 9001")
Intro 100-150 คำ: หมวดนี้คืออะไร ทำไมเลือกที่นี่ (มี B.TC 20 ปีหนุน)
Filter/sort: มองเห็น + crawlable
Listing cards: ชื่อ · รูป · เรต · ที่ตั้ง
Internal links: หมวดใกล้เคียง + sub-category
Schema: ItemList
```

## Phase 4: Technical SEO checklist (ผูกโค้ดจริง)
- [x] `/sitemap.xml` server-side (หน้าแรก + /start + /b + ทุก /b/<slug>) — `src/server.ts`
- [x] Storefront มี title/meta/canonical/JSON-LD ต่อร้าน (ไม่รอ JS)
- [x] Breadcrumb JSON-LD
- [ ] Category pages มี unique title + intro + ItemList (ต้องเพิ่ม)
- [ ] noindex filter combinations ที่ thin (กัน duplicate)
- [ ] ส่ง sitemap.xml เข้า Google Search Console (✅ verified แล้ว — เหลือ submit)
- [ ] Rich Results Test 1 storefront (ยืนยัน schema valid)
- [ ] Page speed <3s (category pages)

---

## Content strategy (ตัวขับ organic ที่ทำงานอยู่แล้ว — ต่อยอด)
> GA4 ยืนยัน google/organic = #2 source → คอนเทนต์ ISO ที่มีอยู่ทำงาน ให้เพิ่มแนวเดียวกัน + ลิงก์เข้า category

| บทความ (informational) | ลิงก์ไปหมวด | สถานะ |
|---|---|---|
| "จ้างที่ปรึกษา ISO ราคาเท่าไร 2569" | ที่ปรึกษา ISO | ✅ มีแล้ว |
| "PDPA ต้องมีเอกสารอะไรบ้าง" | (bridge → consulting) | ✅ มีแล้ว |
| "ขอ มอก. ต้องทำอะไรบ้าง เริ่มยังไง" | → TIS Automate | ⚠️ ทำเพิ่ม |
| "BCM / ISO 22301 คืออะไร ทำไมโรงงานต้องมี" | → BCMS | ⚠️ ทำเพิ่ม |
| "7 เอกสารที่ auditor ขอ" | ที่ปรึกษา ISO | ✅ (มีสคริปต์คลิป) |

## Cross-link ecosystem (SEO + funnel รวมกัน)
```
บทความ ISO (b-tctraining, organic) ──bridge card──> ceoaithailand.org/start
บทความ มอก. ──bridge──> tis-automate.vercel.app
บทความ BCM  ──bridge──> bcms.theossphere.com
หน้าร้าน /b/<slug> ──internal──> category ──> /start
```
> bridge card = ตัวเชื่อม SEO authority ของ b-tctraining → traffic เข้า 3 ผลิตภัณฑ์ (วัดด้วย utm_medium=content_card)

## Metrics (รายสัปดาห์)
| เมตริก | เครื่องมือ |
|---|---|
| Organic traffic ต่อ page type | GA4 |
| Ranking category keywords | GSC / Ahrefs |
| Indexed pages | GSC |
| CTR ต่อ page type | GSC |
| `content_card` referrals → conversion | GA4 funnel |

## งานลำดับแรก (ROI สูงสุด)
1. **Submit sitemap.xml เข้า GSC** (verified แล้ว เหลือกดส่ง) + Rich Results Test
2. เพิ่ม **category landing** 3 หมวดแรก (ที่ปรึกษา ISO / เอกสารระบบ / BCM) พร้อม intro + ItemList
3. เขียนบทความ "ขอ มอก." + "BCM คืออะไร" → ลิงก์เข้า TIS/BCMS
