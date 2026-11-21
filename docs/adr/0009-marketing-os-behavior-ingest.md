# ADR-0009 — ป้อน Marketing OS ผ่าน `marketing-behavior-ingest` (ประตูจริงของเขา)

- **สถานะ**: `accepted` — 🟢 **พิสูจน์แล้ว 21 พ.ย. 2569** · ปล่อย `mode: 'test'` ก่อน แล้วเปลี่ยนเป็น `'live'` หลังเห็นแถวจริง
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

ต่อ sink ตัวที่สองจาก CEF → `marketing-behavior-ingest` · **สร้างแล้ว** (`src/lib/behaviorOs.ts`)

สองข้อที่เคยค้าง — แก้ได้โดยไม่ต้องรอ:

1. **คีย์ — อ่านจาก env เท่านั้น** (`VITE_MARKETING_OS_URL` + `VITE_MARKETING_OS_ANON_KEY`)
   🔴 **รอบแรกผมฝัง JWT ไว้ในไฟล์ตรง ๆ และผิด** — อ้างว่า "คีย์ของเราก็อยู่ในรีโป"
   ซึ่งไม่ตรง: ของเราเป็นรูป `sb_publishable_…` **ไม่ใช่ JWT** และรีโปนี้ไม่เคยมี JWT เลย
   GitGuardian จับได้ใน PR (ledger #96) ⇒ ตอนนี้มีด่านทั้งรีโปห้าม JWT ฝังในโค้ด
   · ใช้ **legacy anon (JWT role=anon)** เพราะ `verify_jwt=true` ตรวจ JWT แน่นอน ·
     🟡 `sb_publishable_…` ยังไม่ได้ทดสอบว่าผ่านด่านนั้นไหม
   · 🔑 **เจ้าของต้องตั้ง GitHub Secret `VITE_MARKETING_OS_ANON_KEY`** (+ `vars.VITE_MARKETING_OS_URL`)
     build step ใน `cloudflare-deploy.yml` ต่อให้แล้ว · ไม่ตั้ง = ฟีเจอร์ **เงียบสนิท** ไม่ใช่ล้มเงียบ
     (`envContract.test.ts` บังคับว่า env ทุกตัวที่โค้ดอ่านต้องอยู่ใน workflow — ledger #18)
2. **consent** — คำตอบอยู่ในโค้ดเราเองแล้ว ไม่ต้องตัดสินใหม่:
   `CookieConsent.tsx` เก็บ `ceo_ai_cookie_consent` = `'all'` (ปุ่มที่ **ปลด `GA_DISABLE`** = เปิด
   Analytics จริง) หรือ `'necessary'` (ปิด) ⇒ **`analytics_opt_in` ⇔ `'all'` เท่านั้น**
   ยังไม่เลือก · กด necessary · อ่าน storage ไม่ได้ = **ไม่ส่ง** (fail-closed)

**การปล่อยของ**: `MARKETING_OS.behaviorMode = 'test'` ก่อน
เพราะ allowlist ไม่มี localhost ⇒ **พิสูจน์ได้แต่บน production** · เห็นแถว `mode='test'`
เข้า `marketing_behavior_events` แล้วค่อยเปลี่ยนเป็น `'live'` — 🔒 เทสต์ล็อกค่านี้ไว้

### 🟢 เกิดขึ้นจริงแล้ว — 21 พ.ย. 2569

| ขั้น | หลักฐาน (วัดเอง ไม่ใช่เดา) |
|---|---|
| ค่าตั้งต้นก่อนทดสอบ | `marketing_behavior_events` = **1** แถว (ของเขาเอง 14 พ.ย.) · `batches` = 1 |
| หลังผู้ใช้จริงเข้าเว็บ + กด "ยอมรับทั้งหมด" | events = **5** · batches = **4** ⇒ **ของเรา 4 event** |
| แถวที่ได้ (session `405a828b`) | `view/start` 09:33:42 → `engaged/money` 09:34:08 → `action/money` 09:34:25 → `action/money` 09:34:27 |
| ค่า env เข้าบันเดิลจริง | บันเดิล production เปลี่ยน `index-DZNcFvxW.js` → `index-C4KGkxLr.js` · เจอ `bjozpwdtqbpwcxnqguka` |
| คีย์ที่ขึ้น production | JWT 2 ตัว · `role=anon` ทั้งคู่ (ของเขา + ของเรา) · **ไม่มี `service_role`** |

⇒ เปลี่ยน `behaviorMode` เป็น `'live'` วันเดียวกัน · เทสต์ล็อกค่าใหม่ไว้แทน (ล็อกสองทาง)

⚠️ **สิ่งที่การพิสูจน์นี้ *ไม่ได้* พิสูจน์**: 4 event มาใน **3 batch** (1·1·2) ⇒ การรวมก้อน
แทบไม่ทำงานจริง · ยังไม่เป็นปัญหาที่คนหลักสิบ แต่จะกิน rate limit ของเขาเร็วเกินควรเมื่อคนเยอะ
🔴 และยังเป็น **ขา push ทางเดียว** — ADR-0006 (ขา pull) ยัง `blocked` ⇒ **ห้ามพูดว่า "เชื่อมสองระบบครบแล้ว"**
(เปลี่ยนเป็น live ต้องแก้เทสต์ด้วย = ตั้งใจ ไม่ใช่เผลอ)

**ที่แมปจริง** (เฉพาะที่ความหมายตรง · `BEHAVIOR_MAP` + `NEXTPROBLEM_TOPIC`)

| ของเรา | → name / topic / format |
|---|---|
| `landing_view` | view / business_validation / interactive |
| `landing_cta_click` · `quickcheck_signup_click` · `quickcheck_submitted` | action / business_validation / interactive |
| `quickcheck_started` | engaged / business_validation / interactive |
| `nextproblem_click` id=`customers` | action / **first_customer** / interactive |
| `nextproblem_click` id=`found` | action / **content_marketing** / interactive |
| `nextproblem_click` id=`system` | action / **business_systems** / interactive |

🔴 **ไม่แมป 4 หัวข้อ พร้อมเหตุผทุกข้อ** (`NEXTPROBLEM_UNMAPPED`): `capital` · `team` · `plan` · `risk`
⇒ อีก ~173 event ที่เหลือก็ไม่ส่ง · เทสต์บังคับว่าทุกหัวข้อใน `nextProblems` ต้องอยู่กองใดกองหนึ่ง **ห้ามเงียบ**

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

## 🔧 แก้ฝั่งเขาแล้ว 20 พ.ย. 2569 (เจ้าของสั่ง "แก้ได้เลย") — additive เท่านั้น

🔴 **ข้อบกพร่องที่เจอในโมเดลของเขาเอง ไม่ใช่ความเห็นเรา**
`marketing_message_pillars` ประกาศ **7 เสา** พร้อม `problem`/`promise` ของแต่ละเสา
แต่ `marketing_behavior_events.topic` มี CHECK แค่ **4 ค่า**

| pillar | topic เดิม |
|---|---|
| `validate` · `first-customer` · `marketing` · `systemize` | ✅ มีช่อง |
| `start` · `side-income` · `money` | 🔴 **วัดไม่ได้เลย** ทั้งที่เป็นกลยุทธ์ของระบบนี้ |

และ `money` ("ขายได้แต่ไม่เห็นกำไรจริง · เข้าใจราคา ต้นทุน กำไร และจุดคุ้มทุน") **ตรงกับ
เครื่องคำนวณของ CEO AI เป๊ะ** ⇒ ข้อมูลจริงถูกบังคับลง `business_validation` ซึ่งผิดความหมาย

**สิ่งที่แก้ (2 อย่าง · ไม่แตะแถวเดิม ไม่แตะ trigger/rpc/RLS)**

1. migration `widen_behavior_topic_to_all_message_pillars` — ขยาย CHECK 4 → 7
   ชื่อค่าที่เพิ่ม = `code` ของ pillar เขาตรง ๆ (`start` · `side_income` · `money`)
   🔑 **ไม่ตั้งชื่อใหม่เอง** เพราะการตั้งชื่อ taxonomy ของคนอื่นคือการตัดสินใจเชิงกลยุทธ์
   + `comment on column` ชี้ว่าแหล่งความจริงคือ `marketing_message_pillars.code`
2. edge function `marketing-behavior-ingest` **v3 → v4** — แก้ `z.enum` ของ `topic` ใน
   `contract.ts` เท่านั้น · `index.ts` เหมือนเดิมทุกบรรทัด · `verify_jwt` ยังเป็น `true`
   (อ่านกลับมา diff แล้ว — ต่างกันบรรทัดเดียว)

**สถาปัตยกรรมฝั่งเขาที่ตรวจแล้วและ "ไม่ต้องแก้"**
`ingest → rpc receive_marketing_behavior → marketing_behavior_batches`
`→ trigger expand_marketing_behavior → marketing_behavior_events` ⇒ ครบวงจรอยู่แล้ว
(rpc กั้น `workspaces.slug='ceo-ai-thailand'` · rate limit global 10,000/วัน + 60/คีย์ · เก็บสำเนาลง private bucket)

🟡 **ที่ยังพิสูจน์ไม่ได้ในเซสชันนี้**
- **UI ของ OS จัดการ topic ค่าใหม่ยังไง** — โค้ดอยู่ที่ `D:\CEOAITHAILAND Marketing-P1.0.2-baseline`
  ซึ่งเซสชันคลาวด์เข้าไม่ถึง ⇒ ถ้า UI มี switch 4 ทาง ค่าใหม่อาจแสดงเป็น "ไม่รู้จัก"
  (ไม่ควรพัง เพราะเป็นการ**เพิ่ม**ค่า ไม่ได้เปลี่ยนหรือลบ — แต่ผม **ยังไม่ได้เห็นโค้ดนั้น**)
- **ยิงทดสอบจริง** — ตัวจัดการสิทธิ์ของเซสชันปฏิเสธการ POST ไป endpoint ของอีกระบบจากเชลล์
  ⇒ หลักฐานจริงจะมาจาก batch แรกที่เว็บ production ยิง (mode `test`)

**ย้อนกลับ**: `drop constraint` แล้วสร้างใหม่ด้วย ARRAY 4 ค่าเดิม + deploy function v3
(ทำได้ตราบที่ยังไม่มีแถวที่ใช้ค่าใหม่)

## กลไก

`src/lib/__tests__/behaviorOs.test.ts` (38 เทสต์) + `ownershipBoundary.test.ts` (18)

- ปลายทางแต่ละตัวมี **ไฟล์เจ้าของไฟล์เดียว** · รหัส project ของเขาโผล่ได้แค่ 2 ไฟล์ที่มีเหตุผล
  (`behaviorOs` และ `brandSync` ตามข้อยกเว้นอ่านอย่างเดียว 15 พ.ย.)
- ห้ามมี `service_role` ในโค้ดฝั่งเบราว์เซอร์ทั้งรีโป
- ยืนยันแดงจริง 6 ท่า: ยอมรับ `necessary` เป็นการยินยอม · เดาหมวดให้ event ที่แมปไม่ได้ ·
  ถอดด่าน consent · **เรียก consent แต่ไม่ใช้ผล** · ไม่จับคีย์เกิน · เปลี่ยนเป็น `live`
- ⚠️ เทสต์ consent เวอร์ชันแรกของผม **ผ่านฟรี** เพราะหา `analyticsOptIn(` แล้วไปเจอตัวนิยาม
  ฟังก์ชันในไฟล์เดียวกัน ⇒ แก้เป็นจับ **รูปประโยคของด่าน** `if (!analyticsOptIn(` (ledger #95)
