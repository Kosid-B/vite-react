# เปิดประตูให้ Google — ขั้นตอนที่ทำครั้งเดียว (~15 นาที)

> **ทำไมต้องทำ:** ผู้เข้าชมเว็บ 60 คน (11–15 ส.ค. 2569) มาจาก Google **0 คน**
> ทั้งที่มี sitemap 23 URL + บทความ 10 ชิ้น · ตรวจในโค้ดแล้วพบว่า **ไม่เคยมี
> `google-site-verification` ในเว็บเลย** → Search Console ไม่เคยถูกยืนยัน → sitemap ไม่เคยถูกส่ง
>
> รายละเอียดการวินิจฉัย: [WHY-NO-ONE-SIGNS-UP.md](WHY-NO-ONE-SIGNS-UP.md) ข้อ 4

---

## ส่วนที่โค้ดทำให้แล้ว ✅

- `robots.txt` เปิดให้ crawler ทุกตัว รวม AI (GPTBot / PerplexityBot / ClaudeBot / Google-Extended)
- `sitemap.xml` สร้างอัตโนมัติจาก Worker (รวมหน้าร้านจริงแบบ dynamic)
- **รองรับโทเคนยืนยันผ่าน env แล้ว** — ตั้งค่าเดียวจบ ไม่ต้องแก้โค้ด (`GOOGLE_SITE_VERIFICATION`)
- หน้า `/b` ที่ยังไม่มีร้านพอ จะ `noindex,follow` และไม่ถูกลิสต์ใน sitemap โดยอัตโนมัติ

## ส่วนที่ต้องทำเอง (ต้องใช้บัญชี Google — ทำแทนไม่ได้)

### ขั้นที่ 1 — เพิ่มเว็บใน Search Console

1. เข้า https://search.google.com/search-console
2. เลือก **"URL prefix"** แล้วใส่ `https://ceoaithailand.org`
3. เลือกวิธียืนยันแบบ **"HTML tag"** → จะได้ค่าหน้าตาแบบนี้:

```html
<meta name="google-site-verification" content="AbCdEf1234_ตัวอย่างเท่านั้น" />
```

**เอาเฉพาะค่าใน `content=`** (ส่วนที่ขึ้นต้นด้วยตัวอักษรผสมตัวเลข) ไม่ต้องเอาแท็กทั้งอัน

### ขั้นที่ 2 — ใส่ค่าลงระบบ

เลือกทางใดทางหนึ่ง:

**ทาง ก (แนะนำ) — Cloudflare Dashboard** ไม่ต้อง deploy ใหม่จาก repo
`Workers & Pages → ceo-ai-thailand → Settings → Variables → GOOGLE_SITE_VERIFICATION` → ใส่ค่า → Save

**ทาง ข — แก้ในโค้ด** แล้ว push (auto-deploy)
ใส่ค่าใน `wrangler.jsonc` → `vars.GOOGLE_SITE_VERIFICATION`

> ค่านี้เป็น **public ไม่ใช่ secret** (ใครเปิด view-source ก็เห็น) จึงใส่ใน `vars` ได้
> ไม่ต้องทำเป็น secret และไม่ขัดกฎ "ห้าม commit .env"

### ขั้นที่ 3 — ยืนยัน แล้วส่ง sitemap

1. กลับไปที่ Search Console กด **Verify**
2. เมนู **Sitemaps** → ใส่ `sitemap.xml` → **Submit**
3. เมนู **URL Inspection** → ใส่ `https://ceoaithailand.org` → **Request Indexing**
   (ทำซ้ำกับหน้าสำคัญ: `/start`, `/blog`, และบทความ 2–3 ชิ้นที่ดีที่สุด)

### ขั้นที่ 4 — ทางเลือกสำรอง ถ้าทาง HTML tag มีปัญหา

ยืนยันผ่าน **DNS TXT** ใน Cloudflare แทน (ไม่ต้องแตะโค้ดเลย):
Search Console เลือก "Domain" → คัดลอกค่า TXT → Cloudflare DNS → เพิ่ม TXT ที่ `@`

---

## วิธีเช็คว่าได้ผลจริง

| เช็คอะไร | ทำยังไง | ผลที่ควรเห็น |
|---|---|---|
| meta ติดจริงไหม | เปิดเว็บ → view-source → ค้น `google-site-verification` | เจอแท็ก |
| Google เก็บหน้าไปหรือยัง | ค้นใน Google: `site:ceoaithailand.org` | ควรเห็นหน้าเว็บขึ้นมา |
| `/b` ถูกกันไว้จริงไหม | เปิด `https://ceoaithailand.org/b` → view-source → ค้น `robots` | `noindex,follow` (ตราบใดที่ร้าน < 5) |
| sitemap ไม่ชวนไปหน้าว่าง | เปิด `https://ceoaithailand.org/sitemap.xml` | **ไม่มี** `<loc>…/b</loc>` |

⚠️ **อย่าเพิ่งตกใจถ้ายังไม่ขึ้นทันที** — เว็บใหม่ที่ยังไม่มีลิงก์จากที่อื่นชี้เข้ามา
Google มักใช้เวลาหลายวันถึงหลายสัปดาห์ · ตัวชี้วัดที่ควรดูคือ **Impressions ใน Search Console**
ไม่ใช่จำนวนผู้เข้าชม (คลิกจะตามมาทีหลัง)

---

## หลังจากนั้น: เกณฑ์อ่านผลใน 30 วัน

| ผลที่เห็นใน Search Console | แปลว่า | ทำต่อ |
|---|---|---|
| Impressions > 0 แต่ CTR ต่ำมาก | Google เห็นเราแล้ว แต่ title/description ไม่ชวนคลิก | แก้ title/description ของหน้าที่มี impression สูงสุด |
| Impressions ~0 หลัง index แล้ว | คำที่เราเขียนไม่ตรงกับที่คนค้นหา | ทำ keyword research จาก **คำที่ลูกค้าพูดในบทสัมภาษณ์จริง** |
| ไม่ถูก index เลยใน 30 วัน | อาจมีปัญหาทางเทคนิค | ดู Coverage report หาสาเหตุที่ Google ระบุ |

## เมื่อไหร่ควรเปิด `/b` ให้ Google เก็บ

เมื่อมีหน้าร้านเผยแพร่จริง **≥ 5 ร้าน** — ระบบจะเปิดให้เองอัตโนมัติ ไม่ต้องแก้อะไร
(ค่าเกณฑ์อยู่ที่ `MIN_STOREFRONTS_TO_INDEX` ใน `src/lib/seoData.ts`)

เหตุผลที่ต้องรอ: หน้า category ที่มีแต่กริดว่าง ๆ คือ **thin page** — ถ้า Google เจอครั้งแรก
แล้วประเมินว่าไม่มีคุณค่า จะกู้อันดับคืนยากกว่าการไม่ให้เจอตั้งแต่แรก
