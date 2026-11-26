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

## 2. สิ่งที่พร้อมแล้วฝั่งฐาน (ไม่ต้องทำอะไรเพิ่ม)

| | สถานะ 26 พ.ย. 2569 |
|---|---|
| 11 ตารางที่มีข้อมูล | 🟢 ย้ายครบ 48 แถว นับยืนยันสองฝั่งตรงกัน |
| `Exposed schemas` | 🟢 มี `marketing_os` แล้ว (เจ้าของติ๊กเอง · 3 of 4) |
| สิทธิ์ `service_role` | 🟢 44 grants (11 ตาราง × SELECT/INSERT/UPDATE/DELETE) |
| ตารางใหม่ในอนาคต | 🟢 `alter default privileges` ให้ `service_role` ไว้แล้ว (0069) |

ตาราง 11 ตัวที่มีจริง:
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

**② ตารางที่ไม่มีข้อมูลยังไม่ถูกสร้าง**
ฐานเดิมมี 44 ตาราง · ย้ายมาเฉพาะ **11 ตัวที่มีข้อมูลจริง** ⇒ ถ้าโค้ดแตะอีก 33 ตัวจะได้ `relation does not exist`
⇒ เจอตัวไหนให้ **สร้างทีละตัวตามที่โค้ดใช้จริง** ห้ามเดาโครงสร้างยกชุด (ADR-0011 §ทางเลือกที่ไม่เลือก)

**③ ผู้ใช้คนละชุด**
`marketing_os.workspace_members` มี **11 คน** · มีตัวตนใน `auth.users` ของ production เรา **0 คน**
⇒ ล็อกอินเดิมใช้ไม่ได้ · policy ที่อิง `auth.uid()` แมตช์ศูนย์แถวเสมอ
⇒ FK ไป `auth.users` ถูกตัดออกตอนย้าย (ตั้งใจ)

## 4. ลำดับที่แนะนำ

1. เปิดโฟลเดอร์ แล้ว `grep` หา `createClient` · `SUPABASE_URL` · `DATABASE_URL` · `bjozpwdtqbpwcxnqguka`
   → ตอบให้ได้ก่อนว่า **แอปอ่านจากเบราว์เซอร์ หรือจากเซิร์ฟเวอร์**
2. เปลี่ยน URL + key + `db.schema` → รันในเครื่องก่อน **อย่าเพิ่ง deploy**
3. ไล่ดูว่ามี error `relation does not exist` ตัวไหนบ้าง → จดรายชื่อ → กลับมาสร้างในรีโปนี้เป็น migration
4. ถ้าติดเรื่องล็อกอิน = ถึงข้อ ③ แล้ว **หยุด** แล้วตัดสินเรื่อง identity ก่อน ห้ามเปิด grant ให้ `authenticated` เพื่อให้มันผ่าน
   (กลไก `ownershipBoundary.test.ts` ในรีโปนี้กันไว้แล้ว)

## 5. ย้อนกลับ

ฐานเดิม `bjozpwdtqbpwcxnqguka` **ยังอยู่ครบทุกแถว ไม่ถูกแตะเลย** (การย้ายคือ *คัดลอก*)
นับสด 26 พ.ย. 2569: `marketing_behavior_events` 5 · `marketing_behavior_batches` 4 ·
`marketing_audience_segments` 6 · `marketing_brand_rules` 7 — **นิ่งตั้งแต่ 21 พ.ย. 09:34**
(ซึ่งคือการทดสอบของเราเอง ⇒ หลังวันนั้นไม่มีอะไรเขียนลงฐานเขาอีกเลย)
⇒ ชี้ URL กลับไปที่เดิม = กลับสู่สภาพก่อนย้ายทันที

## 6. ทำเสร็จแล้ววัดยังไง

🔴 **ห้ามถือว่าเสร็จเพราะ "แอปเปิดขึ้น"** — ต้องเห็นอย่างน้อยหนึ่งข้อ:
- แอปแสดง `marketing_brand_rules` **7 ข้อ** และ `marketing_audience_segments` **6 กลุ่ม** (ตัวเลขของฝั่งเขา ไม่ใช่ของเรา — ของเรามี 10 และ 5)
- หรือเขียนอะไรลงไปแล้วนับแถวเพิ่มใน `waigsnxhrlwtiotspaim` ได้จริง

⚠️ ตัวเลข 7/6 นี้แหละคือเหตุผลที่ต้องใช้ schema แยก — ถ้าเห็น **10/5** แปลว่าแอปกำลังอ่าน `public` ของเรา **ไม่ใช่ `marketing_os`** ⇒ ตั้ง schema ไม่ติด
