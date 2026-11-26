-- 0074 — ข้อ ② ของลำดับรวมฐาน: ให้ brandSync อ่านแหล่งจริงจาก `marketing_os` (เจ้าของเลือก "ทาง 2" · 26 พ.ย. 2569)
--
-- ⚠️ ไฟล์นี้เป็น **บันทึกของสิ่งที่ apply ไปแล้ว** บน production `waigsnxhrlwtiotspaim`
--    (apply ผ่าน MCP 26 พ.ย. 2569 · Supabase บันทึกชื่อไว้ว่า `0072_marketing_os_brand_sync_rpc`)
--    🔴 **เลขชนกัน**: เซสชันคลาวด์ apply `0072_marketing_os_member_rls` ก่อนหน้า 10 นาที
--       ⇒ ในรีโปเลื่อนเป็น 0074 · ใน production ชื่อยังเป็น 0072 (เลขสองฝั่งไม่ตรงกันโดยเจตนา)
--
-- 🔴 ทำไมต้องมี: `scripts/brand-sync-check.mjs` ยังยิงไป project เดิม `bjozpwdtqbpwcxnqguka`
--    ซึ่ง **นิ่งตั้งแต่ 21 พ.ย. 09:34** และเจ้าของสั่งเลิกใช้แล้ว ⇒ ผลเทียบ = เทียบกับของที่ไม่มีใครแก้อีก
--    ⇒ drift ที่เกิดใน Marketing OS หลังวันนั้นจะไม่มีวันถูกจับ
--
-- 🔑 ทำไมเป็น rpc ไม่ใช่ REST `.schema('marketing_os')` (ADR-0012):
--    ค่า "Exposed schemas" อยู่นอกรีโป เทสต์มองไม่เห็น · ท่อ ingest พังเงียบเพราะค่านี้มาแล้ว (ledger #105)
--    ⇒ ทุกทางเข้า `marketing_os` เดินผ่าน rpc ใน `public` เท่านั้น
--
-- 🔑 ทำไม service_role ไม่ใช่ anon (เจ้าของเลือก "ทาง 2" แทน "ทาง 1"):
--    anon = ใครบนอินเทอร์เน็ตก็เรียกได้ ⇒ ข้อมูลกลยุทธ์ (กลุ่มเป้าหมาย/สถานะหลักฐาน) หลุดเป็นสาธารณะ
--    ⇒ grant ให้ service_role เท่านั้น · คีย์มาจาก env ตอนรันสคริปต์ (ห้ามฝังในรีโป — ledger #96)
--
-- 🔒 อ่านอย่างเดียว (stable) · คืนเฉพาะ 4 คอลัมน์ที่ `compareSegments()` ใช้จริง · ไม่มี id/workspace_id
--    ขอบเขตเท่าเดิมกับข้อยกเว้น 15 พ.ย. (อ่าน `marketing_audience_segments` — 1 ใน 3 ตารางที่อนุญาต)

create or replace function public.os_brand_sync_segments()
returns table (code text, name text, evidence_status text, active boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.code, s.name, s.evidence_status, s.active
    from marketing_os.marketing_audience_segments s
   order by s.created_at;
$$;

comment on function public.os_brand_sync_segments() is
  'ADR-0012 bridge for scripts/brand-sync-check.mjs: read-only segment codes from marketing_os. service_role only.';

revoke all on function public.os_brand_sync_segments() from public, anon, authenticated;
grant execute on function public.os_brand_sync_segments() to service_role;
