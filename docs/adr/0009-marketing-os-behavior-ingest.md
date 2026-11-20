# ADR-0009 — ป้อน Marketing OS ผ่าน `marketing-behavior-ingest` (ประตูจริงของเขา)

- **สถานะ**: `proposed` — รู้ทางแล้ว แต่ต้องได้ของจากเจ้าของ 2 อย่างก่อนเริ่ม
- **วันที่**: 20 พ.ย. 2569
- **ที่มา**: เจ้าของตอบว่าแอป Marketing OS ชี้ไป Supabase **`bjozpwdtqbpwcxnqguka`**

## บริบท — ADR-0002 ตั้งอยู่บนสมมติฐานที่ผิด

ADR-0002 เข้าใจว่าการยิง `marketing-track` = "ให้ OS เห็น event" · **ผิด**

ตรวจแล้ว 20 พ.ย. 2569:

| | ปลายทางของ `marketing-track` | แอป Marketing OS |
|---|---|---|
| ฐานข้อมูล | `waigsnxhrlwtiotspaim` (**ของเรา**) | `bjozpwdtqbpwcxnqguka` (**ของเขา**) |
| ตารางที่รับ | `marketing_events` | 🔴 **ไม่มีตารางนี้** |
| workspace id ในโค้ด | `98911455-…` | `e82e7d93-…` |

⇒ event ที่ส่งผ่าน `marketing-track` ลงฐาน**เรา** · OS ไม่อ่านฐานนั้น ⇒ **ไม่เคยถึง OS**

🟢 แต่ฝั่งเขามีประตูของตัวเองอยู่แล้ว และ**สร้างมาให้เว็บเราเรียกโดยเฉพาะ**:
edge function `marketing-behavior-ingest` (v3) บน `bjozpwdtqbpwcxnqguka`
มี origin allowlist = **`https://ceoaithailand.org` + `www`** เท่านั้น — ไม่มีโดเมนอื่นเลย

## 🟢 ประตูนั้นทำงานได้แล้วจริง — ไม่ต้องแก้ฝั่งเขา

วัดสดจากฐาน `bjozpwdtqbpwcxnqguka` (20 พ.ย. 2569):

```
rpc receive_marketing_behavior : มีจริง
marketing_behavior_batches     : 1 แถว
  batch 7b514619-… · mode "test" · consent "analytics_opt_in" · 1 event
  created_at  2026-11-14T08:07:41Z
  archived_at 2026-11-14T08:15:42Z      ← เก็บลง private bucket สำเร็จ
marketing_behavior_events      : 1 แถว (source "website" · name "view"
                                 · topic "first_customer" · format "article")
```

⇒ มีคนยิง batch ทดสอบเข้าไปสำเร็จแล้วเมื่อ 14 พ.ย. **ครบวงจรถึงขั้นเก็บคลัง**
⇒ 🔴 **สิ่งที่ขาดคือฝั่งเราไม่เคยยิง** — งานทั้งหมดอยู่ในรีโปนี้ ไม่ใช่ที่โค้ดของอีกระบบ
   (เจ้าของเสนอให้ไปแก้ `D:\CEOAITHAILAND Marketing-P1.0.2-baseline` — ไม่จำเป็น และผมเข้าไม่ถึงด้วย)

## สัญญาของประตูนั้น (อ่านจากซอร์สจริง ไม่ใช่เดา)

```
POST https://bjozpwdtqbpwcxnqguka.supabase.co/functions/v1/marketing-behavior-ingest
verify_jwt = true            ⇒ ต้องมี Authorization + apikey = **anon key ของ project เขา**
origin ต้องเป็น ceoaithailand.org / www  (❌ localhost ไม่อยู่ในรายการ)
content-type: application/json · เพดาน 16,000 ไบต์

{ version: 1, batchId: <uuid>, consent: 'analytics_opt_in', mode: 'live' | 'test',
  events: [ {                                      // 1–20 ตัว · strict (คีย์เกิน = ปฏิเสธ)
    id: <uuid>, session: <uuid>, at: <ISO datetime>,
    source: 'website' | 'saas',
    name:   'view' | 'engaged' | 'action',
    topic:  'business_validation' | 'first_customer' | 'content_marketing' | 'business_systems',
    format: 'article' | 'short_video' | 'checklist' | 'interactive',
  } ] }
```

กฎที่เขาบังคับเอง: `id` ห้ามซ้ำในก้อนเดียว · `at` ต้องอยู่ในช่วง −24 ชม. ถึง +60 วินาที ·
rate limit ต่อ IP ต่อนาที (HMAC ไม่เก็บ IP) · เก็บสำเนาลง private bucket + `marketing_behavior_batches`

🔴 **สามข้อที่เปลี่ยนวิธีทำงานของเรา**

1. **`consent: 'analytics_opt_in'` เป็นค่าคงที่บังคับ** ⇒ **ห้ามส่งถ้าผู้ใช้ไม่ได้กดยินยอม**
   นี่ไม่ใช่ข้อจำกัดทางเทคนิค แต่เป็นข้อผูกพัน: ส่งโดยไม่มี consent จริง = โกหกฝั่งเขาและผิด PDPA
2. **taxonomy ของเขาแคบมาก** — `name` 3 ค่า · `topic` 4 ค่า · `format` 4 ค่า
   ⇒ event ของเรา **179 ชื่อ** แมปได้จริงไม่กี่ตัว · 🔴 **ที่แมปไม่ได้ ห้ามเดาให้ลงช่อง**
   (ยัดลง `business_validation` เพราะไม่รู้จะใส่อะไร = สร้างข้อมูลที่ดูเหมือนจริง)
3. **`mode: 'test'`** = ทางพิสูจน์ว่าท่อทำงานได้โดย**ไม่ปนข้อมูลจริง** 🟢 ใช้ท่านี้ตอนตรวจครั้งแรก
   และเพราะ localhost ไม่อยู่ใน allowlist ⇒ **ทดสอบจากเครื่องไม่ได้ ต้องทดสอบบน production ด้วย `test`**

## สิ่งที่สร้างไว้แล้ววันนี้ใช้ต่อได้ทั้งหมด

| ของที่มี | ใช้กับประตูนี้ยังไง |
|---|---|
| `osPackage.pack()` | ประตูนี้ **เป็น batch จริง** (≤20 · ≤16KB) ⇒ ซองได้ใช้เป็นรูปแบบสายส่ง ไม่ใช่แค่ที่เก็บ |
| `canonicalJson()` | ตรงแนวคิดกับ `canonical()` ของเขาเป๊ะ (คีย์เรียง + hash) — เขาใช้ SHA-256 เราใช้ fnv1a |
| `osOutbox` | คิว + ส่งซ้ำ + นับของหาย ใช้ได้เหมือนกัน (เขามี rate limit ⇒ ยิ่งต้องมีคิว) |
| `eventFormat` (CEF) | เพิ่มทางแปลงออกตัวที่สอง `cefToBehavior()` — นี่คือเหตุผลที่ชั้นกลางมีอยู่ (ADR-0008) |

## การตัดสินใจ

ต่อ sink ตัวที่สองจาก CEF → `marketing-behavior-ingest` · **ยังไม่เริ่ม** จนได้ 2 อย่างจากเจ้าของ:

1. **anon key ของ `bjozpwdtqbpwcxnqguka`** (publishable = public โดยดีไซน์ เหมือน key ของเราที่อยู่ใน `wrangler.jsonc`)
   ⇒ ตั้งเป็น `VITE_MARKETING_OS_URL` + `VITE_MARKETING_OS_ANON_KEY` ใน GitHub Secrets **และ**
   ใน build step ของ `cloudflare-deploy.yml` (ไม่ใส่ทั้งสองที่ = เงียบสนิทโดยไม่มีใครรู้ · ledger #18)
   🔴 ผมไม่ดึงคีย์มาใส่เอง — เป็นคีย์ของอีกระบบ เจ้าของตัดสิน
2. **ยืนยันว่าผูก `consent` กับอะไร** — เรามี `CookieConsent` อยู่แล้ว ต้องรู้ว่าช่อง "วิเคราะห์"
   ของแถบนั้นนับเป็น `analytics_opt_in` ได้หรือไม่ (ถ้าไม่ ต้องเพิ่มช่องใหม่ = งาน UI)

## ผลที่ตามมา

- 🔴 **ท่า A ไม่ได้ส่งข้อมูลถึง OS และไม่เคยส่ง** — คุณค่าที่เหลือจริงของมันคือ
  ตาราง event ชั้นละเอียดใน **ฐานเราเอง** + VIEW สุขภาพการวัดที่ขยับเองได้ (ของที่เมื่อก่อนไม่มี)
  ⇒ ADR-0002 ถูกแก้บริบทแล้ว **ไม่ลบ** (ประวัติที่ถูกลบสอนอะไรไม่ได้)
- ⚠️ ถ้าทำ ADR นี้ จะมีสองสายส่งคู่กัน (ฐานเรา + ฐานเขา) ⇒ ต้องไม่ให้กฎ PII/consent มีสองมาตรฐาน
  ⇒ บังคับผ่าน CEF ชั้นเดียวเหมือนเดิม

## ทางเลือกที่ไม่เลือก

| ทางเลือก | ทำไมไม่เลือก |
|---|---|
| ย้าย `marketing-track` ไป deploy บนฐานเขา | ฐานเขาไม่มีตาราง `marketing_events`/rpc `ingest_marketing_event` ⇒ ต้องแก้ schema ของอีกระบบ |
| ซิงก์ `marketing_events` ของเรา → ฐานเขาเป็นรอบ ๆ | เขียนข้ามฐานเข้าตารางของอีกระบบ = ข้ามเส้นแบ่งเต็มตัว · และเขามีประตูให้อยู่แล้ว |
| เดา topic/format ให้ครบทุก event | สร้างข้อมูลที่ดูเหมือนจริง — ผิดกฎสูงสุดตรง ๆ |
| ส่งโดยไม่เช็ค consent (ใส่ค่าคงที่ไปเลย) | ค่านั้นเป็น**คำประกาศ**ว่าผู้ใช้ยินยอม · ส่งทั้งที่ไม่ได้ยินยอม = โกหก + ผิด PDPA |

## กลไก (ตอนลงมือ)

ด่าน `ownershipBoundary.test.ts` ต้องขยายให้รู้จักปลายทางที่สอง (ยังคงกฎ "ไฟล์เดียวที่รู้ปลายทาง") ·
เทสต์ต้องบังคับว่า `cefToBehavior()` คืน `null` สำหรับ event ที่แมปไม่ได้ และ
**ห้ามส่งเมื่อไม่มี consent** (mutation: ถอดเงื่อนไข consent ⇒ ต้องแดง)
