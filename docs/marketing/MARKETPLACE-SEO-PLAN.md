# Marketplace SEO Plan — CEO AI Thailand (/b) + Cross-link Ecosystem

> ## 🛑 ตรวจสภาพจริง 19 ส.ค. 2569 — แผนด้านล่างยัง **ทำไม่ได้** ตอนนี้
>
> ตรวจสดจากฐานข้อมูล production วันนี้:
>
> | สิ่งที่แผนนี้ต้องใช้ | มีจริงเท่าไหร่ |
> |---|---|
> | หน้าร้าน (`storefronts`) | **0** |
> | สินค้า/สกิลที่ลงขาย | **0** |
> | ใบขอราคา (RFQ) | **0** |
> | ออเดอร์ | **0** |
> | การประมูล | **0** |
>
> **SEO ตลาดคือเกมสเกลของ "หน้าที่มีของอยู่ในนั้น" — เรายังไม่มีของสักชิ้น**
> โค้ดเราเองก็รู้: `MIN_STOREFRONTS_TO_INDEX = 5` ทำให้ `/b` ขึ้น `noindex` อยู่ตอนนี้ (ถูกต้องแล้ว)
> การไปทำ category page ตอนนี้ = สร้าง thin page ซึ่งเป็น anti-pattern ข้อแรกของ skill เอง
>
> ### 🔴 ข้อความในแผนเดิมที่ข้อมูลใหม่พิสูจน์แล้วว่าไม่จริง
> 1. ~~"Organic ปัจจุบัน: google/organic เป็น #2 source — ฐานมีแล้ว"~~
>    → ข้อมูล first-party ของเราเอง (`landing_funnel`, 11–19 ส.ค.): direct 38 · social 31 · other 3 ·
>      **search 0** · และ GA4 28 วัน (22 ก.ค.–18 ส.ค.) = 345 การดู · 62 ผู้ใช้ · **รายได้ ฿0.00**
> 2. ~~"บทความ 'จ้างที่ปรึกษา ISO ราคาเท่าไร' ✅ มีแล้ว"~~ → ไม่มีใน `BLOG_POSTS` (มี 10 บทความ ไม่มีเรื่องนี้)
>    บทความที่อ้างถึงอยู่คนละเว็บ (b-tctraining) — แผนเดิมปนสองเว็บเข้าด้วยกัน
> 3. ~~"listing <500 (early)"~~ → ความจริงคือ **0** ไม่ใช่ "น้อย" แต่คือ "ยังไม่มี"
> 4. category priority ที่นำด้วย **ISO/มอก.** ขัดกับ positioning ที่ยืนยันแล้วใน CLAUDE.md
>    (compliance = ฟีเจอร์เสริม ไม่ใช่พระเอก · และ *"ห้ามขึ้นต้นคอนเทนต์ด้วยคำว่า ISO กับคนเพิ่งเริ่มธุรกิจ"*)
>    รวมทั้งขัดกับกลุ่มเป้าหมายที่วัดได้จริง (เจ้าของธุรกิจที่ขายอยู่แล้ว 35–65)
>
> ### สิ่งที่ทำแทนตอนนี้ → [ทางที่ skill เองบอกไว้ใน Recovery]
> > *"Very few listings: Focus on content-driven SEO until listing volume supports strong category pages."*
>
> **กลยุทธ์ปัจจุบัน = เครื่องมือนำ (tool-led) ไม่ใช่บทความนำ** — เหตุผลอยู่ในหลักฐาน:
> GA4 บอกว่าคนที่มาถึงบทความอยู่เฉลี่ย **2–4 วินาที** แล้วปิด (pricing 2 วิ · ปาล์ม 3 วิ · ลูกค้าแรก 4 วิ)
> บทความไม่ทำงานกับผู้ชมกลุ่มนี้ — เขามาเพื่อ **"ทำ"** ไม่ใช่ **"อ่าน"**
>
> | ลำดับ | ทำอะไร | สถานะ |
> |---|---|---|
> | 1 | `/calc` — เครื่องคำนวณกำไร/จุดคุ้มทุน เรนเดอร์ฝั่ง server ไม่ต้องรอ JS | ✅ ขึ้นแล้ว 19 ส.ค. |
> | 2 | ลิงก์การตลาดเรื่องราคา (`/ราคา` `/price`) ชี้มาที่เครื่องมือ ไม่ใช่บทความ | ✅ |
> | 3 | CTA ของบทความที่สัญญาว่า "จะได้คำนวณ" ชี้มาที่เครื่องมือ ไม่ใช่หน้าสมัคร | ✅ (3 บทความ) |
> | 4 | `/calc` เข้า sitemap ให้ Google หาเจอเอง | ✅ |
> | 5 | บทความ 10 ชิ้น = คอนเทนต์สนับสนุนที่ลิงก์เข้าเครื่องมือ | 🟡 ทำต่อ |
> | 6 | **category page ของตลาด** | ⏸️ **แช่แข็งจนกว่าจะมีหน้าร้าน 5 ร้าน** |
>
> ⚠️ ตัวปลดล็อกแผนด้านล่างคือ **หน้าร้านร้านแรก** ซึ่งเป็นปัญหาฝั่งสินค้า/การขาย ไม่ใช่ปัญหา SEO
> SEO แก้เรื่อง "คนหาเจอไหม" ไม่ได้แก้เรื่อง "มีอะไรให้เจอหรือเปล่า"

---

> เฟรม: Category-page-first · scale via templates · schema + internal linking
> ผูกกับโค้ดจริง: server-side SEO ใน `src/server.ts` (HTMLRewriter) + `src/lib/seoData.ts` + `/sitemap.xml`

## Brief
| หัวข้อ | ค่า |
|---|---|
| ประเภท | Marketplace B2B — หน้าร้าน SME ไทย + สินค้า/บริการ (skill) |
| พื้นที่ | ประเทศไทย (Thai-language) |
| จำนวน listing | 🔴 **0** (ตรวจ 19 ส.ค. 2569) → category page ทำไม่ได้ ต้องรอ supply |
| Organic ปัจจุบัน | 🔴 **search = 0** (first-party `landing_funnel` 11–19 ส.ค. 2569 · แก้จากที่เคยเขียนว่า "#2 source") |
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
> ⚠️ ประโยคเดิมตรงนี้ ("GA4 ยืนยัน google/organic = #2 source → คอนเทนต์ ISO ทำงาน") **ไม่จริงแล้ว**
> ข้อมูลจริง 19 ส.ค. 2569: search = 0 · บทความมีคนอยู่เฉลี่ย 2–4 วินาที
> ⇒ คอนเทนต์ต้องลิงก์เข้า **เครื่องมือ** (`/calc`) ไม่ใช่เข้า category ที่ยังไม่มีของ

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
