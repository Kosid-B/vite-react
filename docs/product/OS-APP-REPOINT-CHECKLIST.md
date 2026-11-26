# ย้ายแอป Marketing OS มาชี้ฐานเดียวกับ CEO — สเปกลงมือ (ข้อ ① ของ ADR-0011)

> **เขียนเพื่อใคร**: คนที่เปิดโฟลเดอร์ `D:\CEOAITHAILAND Marketing-P1.0.2-baseline` ได้
> (เจ้าของ หรือ Claude Code ที่รันบนเครื่องนั้น) — **เซสชันคลาวด์ทำข้อนี้ไม่ได้**
> **ทุกตัวเลขในหน้านี้วัดสดเมื่อ 26 พ.ย. 2569** ไม่ได้คัดลอกมาจากเอกสารเก่า

## 0. ทำไมเซสชันคลาวด์ทำเองไม่ได้ (ตรวจแล้ว 3 รอบในวันเดียว)

| ทาง | ผล |
|---|---|
| Remote Control → โฟลเดอร์บนเครื่อง | 🔴 `not_available` **ทั้ง 5 โฟลเดอร์** ของ `LAPTOP-3N94M8O0` ⇒ เป็นที่ตัวเครื่อง/เวอร์ชันแอป ไม่ใช่โฟลเดอร์นี้โดยเฉพาะ |
| Vercel (แก้ env แทน) | 🔴 **ไม่มี project `ceo-ai-marketing`** ในบัญชี — มีทีมเดียว (`kosid-btc's projects`) และมี 5 project: `vite-react` · `sck-saas` · `crm-sck` · `youtube-ai-automate-v-1` · `tis-automate` |
| GitHub | 🔴 โค้ดไม่มี repo (CLAUDE.md ระบุเอง) |

## 1. ปลายทางใหม่

```
URL     https://waigsnxhrlwtiotspaim.supabase.co
schema  marketing_os          ← ไม่ใช่ public
```
anon/publishable key เป็นค่าสาธารณะโดยดีไซน์ อยู่ใน `wrangler.jsonc` ของรีโปนี้แล้ว
🔴 **service key ห้ามอยู่ฝั่งเบราว์เซอร์เด็ดขาด** — ใช้ได้เฉพาะโค้ดฝั่งเซิร์ฟเวอร์

ถ้าแอปใช้ `supabase-js` ให้ตั้ง schema ที่ `createClient` ครั้งเดียว:
```ts
createClient(url, key, { db: { schema: 'marketing_os' } })
```
🟢 **ชื่อตารางไม่ต้องแก้สักตัว** — ตอนย้ายเราคงชื่อเดิมไว้ทั้งหมดโดยเจตนา (ADR-0011 ข้อ 1)

## 2. ฝั่งฐาน — พร้อมแค่ไหนจริง

> 🔴 **แก้ 26 พ.ย. 2569 (รอบสอง) — หัวข้อนี้เคยเขียนว่า "ไม่ต้องทำอะไรเพิ่ม" ซึ่งผิด**
> ตอนนั้นวัดจาก **จำนวนแถวที่คัดลอกมาได้** (48 แถว · 11 ตาราง · ตรงกันสองฝั่ง) ซึ่งเป็นความจริง
> **แต่ไม่ใช่คำถามที่ควรถาม** · คำถามที่ถูกคือ *"ตารางที่แอปเขา query จริง มีในฐานเราครบไหม"*
> ⇒ วัดแล้ววันเดียวกัน: **มีแค่ 5 จาก 17** · แหล่งความจริงที่ล็อกด้วยเทสต์ = `src/lib/osRepointReadiness.ts`

**สิ่งที่พร้อมจริง**

| | สถานะ 26 พ.ย. 2569 |
|---|---|
| `Exposed schemas` | 🟢 มี `marketing_os` แล้ว (เจ้าของติ๊กเอง · 3 of 4) — ⚠️ ค่าอยู่นอกรีโป เทสต์มองไม่เห็น |
| สิทธิ์ `service_role` | 🟢 44 grants (11 ตาราง × SELECT/INSERT/UPDATE/DELETE) |
| ตารางใหม่ในอนาคต | 🟢 `alter default privileges` ให้ `service_role` ไว้แล้ว (0069) |
| ข้อมูล 11 ตารางที่ย้ายมา | 🟢 ครบ 48 แถว — `brand_rules` 7 · `audience_segments` 6 · `workspace_members` 11 |

**สิ่งที่ยังไม่พร้อม — ตารางที่แอป query (17 ตัว) เทียบกับฐานเรา**

| สถานะ | จำนวน | ตาราง |
|---|---|---|
| 🟢 อยู่ใน `marketing_os` + มีแถว | **5** | `workspaces` · `workspace_members` · `marketing_brands` · `marketing_audience_segments` · `marketing_message_pillars` |
| 🟡 มีแค่ใน `public` และ **0 แถว** | **4** | `marketing_campaigns` · `marketing_content_items` · `marketing_content_versions` · `marketing_offers` |
| 🔴 **ไม่มีในฐานเราเลยทั้งสอง schema** | **8** | `marketing_action_items` · `marketing_ai_jobs` · `marketing_approval_requests` · `marketing_campaign_hypotheses` · `marketing_compliance_findings` · `marketing_content_assets` · `marketing_ctas` · `marketing_tracking_links` |

🟡 **รายชื่อ 17 ตัวยังไม่ถูกตรวจจากรีโปนี้** — มาจากรายงานของเซสชันที่รันบนเครื่องเจ้าของ
(อ่าน `apps/marketing-os/src/types/database.types.ts`) · เซสชันคลาวด์เปิดโฟลเดอร์ไม่ได้
🟢 **ส่วนที่ตรวจแล้วจริงคือสถานะในฐานเรา** — `information_schema.tables` + `count(*)` ผ่าน Supabase MCP

🔴 **8 ตัวที่ไม่มีเลย = migration 0066 คัดลอกตาราง "ที่มีข้อมูล" ไม่ได้คัดลอกตาราง "ที่แอปใช้"**
นั่นคือรากของทุกข้อที่ตามมา — ไม่ใช่เรื่องสิทธิ์ ไม่ใช่เรื่อง Exposed schemas

ตาราง 11 ตัวที่ย้ายมาจริง (บางตัวแอปไม่ได้ใช้):
```
marketing_audience_segments · marketing_behavior_batches · marketing_behavior_config
marketing_behavior_events   · marketing_behavior_limits  · marketing_brand_rules
marketing_brands            · marketing_message_pillars
workspaces · workspace_members · workspace_state          ← สามตัวนี้ไม่มีคำนำหน้า marketing_
```

## 3. 🔴 สามอย่างที่จะพังถ้าไม่รู้ล่วงหน้า

**① แอปอ่านจากเบราว์เซอร์ไม่ได้**
`anon`/`authenticated` มี **0 grants · ไม่มี USAGE บน schema · RLS policy 0** ⇒ ได้ `permission denied`
⇒ วันนี้อ่านได้ทางเดียวคือ **ฝั่งเซิร์ฟเวอร์ด้วย service key** (หรือ Postgres connection string)
⇒ จะเปิดให้เบราว์เซอร์ ต้องแก้เรื่อง identity ก่อน (ข้อ ③ · ดูข้อ 4)

**② ตารางที่ไม่มีข้อมูลยังไม่ถูกสร้าง — 🔴 วัดแล้ววันที่ 26 พ.ย. 69: นี่ไม่ใช่เชิงอรรถ นี่คืองานทั้งก้อน**
ฐานเดิมมี 44 ตาราง · ย้ายมาเฉพาะ **11 ตัวที่มีข้อมูลจริง**
⇒ จาก 17 ตารางที่แอป query: **8 ตัวไม่มีในฐานเราเลย** + 4 ตัวมีแค่ใน `public` และว่าง
⇒ ต่อให้แก้สิทธิ์และ identity ครบ หน้าเว็บก็จะล้มที่ `relation does not exist` อยู่ดี
⇒ เจอตัวไหนให้ **สร้างทีละตัวตามที่โค้ดใช้จริง** ห้ามเดาโครงสร้างยกชุด (ADR-0011 §ทางเลือกที่ไม่เลือก)
⚠️ และ 4 ตัวใน `public` **ห้ามย้าย/แก้/ลบ** — `public.marketing_*` ยังไม่ใช่ของเรา (เส้นแบ่งความเป็นเจ้าของ)

**③ ผู้ใช้คนละชุด**
`marketing_os.workspace_members` มี **11 คน** · มีตัวตนใน `auth.users` ของ production เรา **0 คน**
⇒ ล็อกอินเดิมใช้ไม่ได้ · policy ที่อิง `auth.uid()` แมตช์ศูนย์แถวเสมอ
⇒ FK ไป `auth.users` ถูกตัดออกตอนย้าย (ตั้งใจ)

## 4. ลำดับที่แนะนำ

1. เปิดโฟลเดอร์ แล้ว `grep` หา `createClient` · `SUPABASE_URL` · `DATABASE_URL` · `bjozpwdtqbpwcxnqguka`
   → ตอบให้ได้ก่อนว่า **แอปอ่านจากเบราว์เซอร์ หรือจากเซิร์ฟเวอร์**
2. เปลี่ยน URL + key + `db.schema` → รันในเครื่องก่อน **อย่าเพิ่ง deploy**
3. 🟢 **รายชื่อที่จะพังรู้แล้วล่วงหน้า ไม่ต้องไล่เอง** — 8 ตัวใน §2 (กอง 🔴) + 4 ตัวในกอง 🟡
   ⇒ ถ้าจะไปต่อ ต้องสร้าง 12 ตัวนั้นเป็น migration ในรีโปนี้ **ก่อน** จะเห็นหน้าเว็บทำงาน
4. ถ้าติดเรื่องล็อกอิน = ถึงข้อ ③ แล้ว **หยุด** แล้วตัดสินเรื่อง identity ก่อน ห้ามเปิด grant ให้ `authenticated` เพื่อให้มันผ่าน
   (กลไก `ownershipBoundary.test.ts` ในรีโปนี้กันไว้แล้ว)

## 5. ย้อนกลับ

ฐานเดิม `bjozpwdtqbpwcxnqguka` **ยังอยู่ครบทุกแถว ไม่ถูกแตะเลย** (การย้ายคือ *คัดลอก*)
นับสด 26 พ.ย. 2569: `marketing_behavior_events` 5 · `marketing_behavior_batches` 4 ·
`marketing_audience_segments` 6 · `marketing_brand_rules` 7 — **นิ่งตั้งแต่ 21 พ.ย. 09:34**
(ซึ่งคือการทดสอบของเราเอง ⇒ หลังวันนั้นไม่มีอะไรเขียนลงฐานเขาอีกเลย)
⇒ ชี้ URL กลับไปที่เดิม = กลับสู่สภาพก่อนย้ายทันที

## 6. ทำเสร็จแล้ววัดยังไง

> 🔴 **แก้ 26 พ.ย. 2569 — เกณฑ์เดิมของหน้านี้วัดไม่ได้**
> เดิมเขียนว่า *"แอปแสดง `marketing_brand_rules` 7 ข้อ"* แต่ `marketing_brand_rules`
> **ไม่อยู่ในรายการตารางที่แอป query เลย** (แอปไม่ query ตารางนี้) ⇒ ไม่มีหน้าไหนที่จะโชว์เลข 7 ได้
> เขียนเกณฑ์ที่สังเกตไม่ได้ = ด่านที่ผ่านได้ด้วยคำพูด ซึ่งเป็นความผิดชุดเดียวกับ `Acceptance #2`

🔴 **ห้ามถือว่าเสร็จเพราะ "แอปเปิดขึ้น"** — สัญญาณที่สังเกตได้จริงเหลือข้อเดียว:

**แอปแสดงกลุ่มเป้าหมาย `marketing_audience_segments` = 6 กลุ่ม**
(ของเขา 6 · **ของเรา 5**) ⇒ เห็น **5** แปลว่ากำลังอ่าน `public` ของเรา ไม่ใช่ `marketing_os`

⚠️ ส่วนต่างแค่ 1 แถวจึงเป็นเกณฑ์ที่อ่านพลาดง่าย — ให้ยืนยันซ้ำด้วย **ชื่อกลุ่ม**:
ฝั่งเขาใช้รหัส `growth`/`employee`/`graduate` · ฝั่งเราใช้ `owner`/`sidebiz`/`newbie`
⇒ **ถ้าเห็นรหัสของเรา = ยังไม่ได้ย้าย ไม่ว่าจะนับได้เท่าไร**

ถ้าจะใช้ `brand_rules` 7 เป็นเกณฑ์ ต้อง **เพิ่มโค้ดในแอปให้ query ตารางนั้นก่อน** — ไม่ใช่งานของการย้าย
