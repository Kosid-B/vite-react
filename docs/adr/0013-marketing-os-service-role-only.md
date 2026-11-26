# ADR-0013 — เปิด `marketing_os` ให้ `service_role` เท่านั้น ยังไม่เปิดให้ browser role

- **สถานะ**: `accepted`
- **วันที่**: 26 พ.ย. 2569
- **ผู้ตัดสิน**: เจ้าของ (*"merge B1"* — เลือกจาก 3 ทางที่เสนอ)

## บริบท

งานที่เหลือของการรวมฐาน (ADR-0011) ข้อ ② คือ *"เปิดทางอ่านให้แอป OS"* · ตอนย้ายฐาน (0066) เรา
`revoke` จาก `anon`/`authenticated` แล้วจบ — **แต่ไม่เคย grant ให้ใครเลยสักราย**

นับสด 26 พ.ย. 2569 ก่อนตัดสิน:

| วัด | ค่า |
|---|---|
| grant ของ `service_role` บนตารางใน `marketing_os` | **0** |
| `rolbypassrls` ของ `service_role` | `true` |
| RLS policy ใน `marketing_os` | **0** |
| `marketing_os.workspace_members` | **11 คน** |
| ในจำนวนนั้น ที่มีตัวตนใน `auth.users` **ของเรา** | **0 คน** |
| ผู้ใช้ทั้งหมดใน `auth.users` ของเรา | 4 บัญชี |

🔴 **สองข้อที่ตัวเลขนี้บอก**
1. `bypassrls` ข้ามได้แค่ **RLS** ไม่ได้ให้ **สิทธิ์บนตาราง** ⇒ แอป OS อ่านไม่ได้แม้ถือ service key
   (ท่อ ingest ทำงานได้เพราะ rpc เป็น `security definer` — รันในสิทธิ์เจ้าของฟังก์ชัน ไม่ใช่ผู้เรียก)
2. policy ที่อิง `auth.uid()` จะ **แมตช์ศูนย์แถวเสมอ** สำหรับผู้ใช้ของเขา ⇒ "เปิดให้ `authenticated`"
   ไม่ได้ช่วยเขาเลย แต่**เปิดให้ลูกค้าของเราอ่านข้อมูลการตลาดของอีกระบบได้ทันที**

## การตัดสินใจ

**grant ให้ `service_role` อย่างเดียว · ไม่แตะ `anon`/`authenticated` · ไม่เขียน policy**

```sql
grant usage on schema marketing_os to service_role;
grant select, insert, update, delete on all tables in schema marketing_os to service_role;
alter default privileges in schema marketing_os
  grant select, insert, update, delete on tables to service_role;
```

⚠️ **ไม่พอสำหรับ `supabase-js`** — PostgREST ยอมเรียก schema นี้ก็ต่อเมื่อ `marketing_os` อยู่ใน
**Exposed schemas** (Dashboard → Project Settings → API) ซึ่งเป็น config ของแพลตฟอร์มที่รีโปแตะไม่ได้
⇒ ADR นี้ปิด **ชั้นที่ 1 (สิทธิ์)** เท่านั้น · ต่อฐานตรงด้วย **Postgres connection string** = ใช้ได้ทันที

🔴 **เงื่อนไขก่อนจะเปิดให้ browser role ในอนาคต**: ต้องมีคำตอบเรื่อง **identity** ก่อน
(ผู้ใช้ของเขาอยู่คนละ `auth.users`) — ห้ามเปิดดักไว้ล่วงหน้าเพราะ "เดี๋ยวก็ต้องใช้"

## กลไก

| กลไก | กันอะไร |
|---|---|
| `ownershipBoundary.test.ts` — migration ห้ามมี `grant`/`alter default privileges` ที่แตะ `marketing_os` แล้วลงท้ายด้วย `to … anon\|authenticated` | กันเปิดให้เบราว์เซอร์โดยไม่ได้ตั้งใจ หรือเปิดดักไว้ก่อนมีคำตอบเรื่อง identity |
| เทสต์สังเคราะห์ 4 เคส (`to authenticated` · `to anon` · `to service_role` · `revoke … from anon`) | กันด่านที่จับผิดทุกอย่างหรือไม่จับอะไรเลย — `revoke` ต้องไม่ถูกนับเป็นการเปิด |
| `alter default privileges` ใน migration เดียวกัน | ตารางที่สร้างทีหลังได้สิทธิ์เดียวกัน — ไม่งั้นจะพังเงียบแบบเดียวกับ ledger #105 |

**ยืนยันแดงจริง**: เติม `grant select on all tables in schema marketing_os to authenticated;`
ท้ายไฟล์ 0069 = แดงทันที · ลบออกแล้วเขียวครบ 24

**ยืนยันผลจริงหลัง apply** (26 พ.ย. 2569): `service_role` = **44 grants** (11 ตาราง × 4 สิทธิ์) ·
`anon`/`authenticated` ไม่ปรากฏในรายการสิทธิ์เลย · RLS policy ยังเป็น **0**

## ผลที่ตามมา

- 🟢 แอป OS ที่อ่านจาก **ฝั่งเซิร์ฟเวอร์** ด้วย service key ทำงานได้ทันที (ถ้าต่อ Postgres ตรง)
- 🟢 เบราว์เซอร์ยังปิดสนิทเหมือนเดิมทุกประการ — ไม่มีอะไรที่ `anon` เห็นเพิ่มขึ้นเลย
- 🔴 **ยังไม่ได้ทดสอบว่าแอป OS อ่านได้จริง** — โฟลเดอร์ `CEOAITHAILAND Marketing-P1.0.2-baseline`
  ขึ้น `not_available` จากเซสชันคลาวด์ ⇒ ยังไม่รู้ด้วยซ้ำว่าแอปเขาต่อแบบไหน
- 🔴 **service key = กุญแจผีของทั้งฐาน** — การที่แอป OS ถือมันอยู่แล้วคือความเสี่ยงที่รับไว้ ไม่ใช่
  ความเสี่ยงที่ ADR นี้สร้างขึ้นใหม่ · แต่ถ้าวันหน้าจะให้เขาอ่านจากเบราว์เซอร์ ต้องเลิกใช้ทางนี้
- ⚠️ ข้อ ② ของลำดับงานรวมฐาน **ยังไม่ปิด** — ปิดได้แค่ครึ่งเดียว (สิทธิ์) อีกครึ่งคือ Exposed schemas
  หรือ rpc อ่าน ซึ่งต้องรู้ก่อนว่าแอปเขา query อะไร = วนกลับไปข้อ ①

## ทางเลือกที่ไม่เลือก

| ทางเลือก | ทำไมไม่เลือก |
|---|---|
| เปิด Exposed schemas + grant + เขียน policy (B2) | 🔴 ติด identity ที่วัดแล้วว่า 0/11 ⇒ policy แมตช์ศูนย์แถว · และต้องเข้า Dashboard เอง |
| ทำ rpc อ่านเฉพาะที่เขาต้องใช้ (B3) | ต้องรู้ก่อนว่าแอปเขา query อะไรบ้าง ⇒ ต้องเปิดโฟลเดอร์ซึ่งวันนี้เข้าไม่ได้ · เก็บไว้เป็นทางเลือกเมื่อถึงเวลา |
| ไม่ทำอะไร รอข้อ ① ก่อน | สิทธิ์ที่หายไปเป็น **บั๊กที่เกิดจากการย้ายของเราเอง** (0066 revoke แล้วไม่ grant) ⇒ ไม่ใช่ของใหม่ที่ต้องรอ |
| grant ให้ `authenticated` เผื่อไว้ | เปิดให้ลูกค้าเรา 4 บัญชีอ่านข้อมูลการตลาดของอีกระบบ โดยไม่ช่วยผู้ใช้ของเขาแม้แต่คนเดียว |
