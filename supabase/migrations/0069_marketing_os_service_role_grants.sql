-- 0069 — เปิดทางอ่าน `marketing_os` ให้ **`service_role` เท่านั้น** (ADR-0013 · เจ้าของสั่ง 26 พ.ย. 2569: "B1")
--
-- 🔴 ทำไมต้องมี: ตอนย้ายฐาน (0066) เรา `revoke` จาก `anon`/`authenticated` แล้วก็จบ
--    **แต่ไม่เคย grant ให้ใครเลย** ⇒ นับสด 26 พ.ย.: `service_role` มีสิทธิ์บนตารางใน schema นี้ = **0**
--    `rolbypassrls = true` ข้ามได้แค่ **RLS** ไม่ได้ให้ **สิทธิ์บนตาราง** ⇒ แอป OS อ่านไม่ได้แม้ใช้ service key
--    (ที่ท่อ ingest ทำงานได้เพราะ rpc เป็น `security definer` — รันในสิทธิ์เจ้าของฟังก์ชัน ไม่ใช่สิทธิ์ผู้เรียก)
--
-- 🔴 **ทำไมไม่เปิดให้ `anon`/`authenticated` — วัดแล้ว ไม่ใช่ความระแวง** (26 พ.ย. 2569):
--    `marketing_os.workspace_members` มี **11 คน** · ที่มีตัวตนใน `auth.users` ของเรา = **0 คน**
--    ⇒ policy ที่อิง `auth.uid()` แมตช์ศูนย์แถวเสมอ (เปิดไปก็ไม่ได้ผล)
--    ⇒ และถ้าเปิดกว้างแทน = ลูกค้าของเรา (4 บัญชี) อ่านข้อมูลการตลาดของอีกระบบได้ทันที
--    ⇒ **ต้องตัดสินเรื่อง identity ก่อน** ห้ามเปิดดักไว้ล่วงหน้า
--
-- ⚠️ **ยังไม่พอสำหรับ `supabase-js`**: PostgREST จะยอมเรียก schema นี้ก็ต่อเมื่อ `marketing_os`
--    ถูกเพิ่มใน **Exposed schemas** (Dashboard → Project Settings → API) ซึ่งเป็น config ของแพลตฟอร์ม
--    ⇒ ไฟล์นี้ปิดชั้นที่ 1 (สิทธิ์) เท่านั้น · ต่อผ่าน Postgres connection string ตรง = ใช้ได้เลย
--
-- 🔒 RLS ยังเปิดครบทั้ง 11 ตาราง และยังไม่มี policy สักข้อ — ของที่ไม่ใช่ service_role ยังอ่านไม่ได้

grant usage on schema marketing_os to service_role;

grant select, insert, update, delete on all tables in schema marketing_os to service_role;

-- ตารางที่สร้างทีหลังต้องได้สิทธิ์เดียวกัน ไม่งั้นจะพังแบบเงียบ ๆ เหมือนรอบนี้
alter default privileges in schema marketing_os
  grant select, insert, update, delete on tables to service_role;
