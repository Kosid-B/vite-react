-- security_checks.sql — ชุดทดสอบความมั่นคงที่รันซ้ำได้ (ISO/IEC 27001:2022 control 8.29)
-- ------------------------------------------------------------------------------
-- วิธีใช้: รันบน production (waigsnxhrlwtiotspaim) แบบ read-only ก่อนทุก release
--   หรือเมื่อสงสัยว่ามีการเปลี่ยนสิทธิ์ (บทเรียน R2/R13/R19/R20)
-- กติกา: แต่ละ CHECK คืน "แถว" = FAIL (ต้องแก้) · คืน "ว่าง" = ผ่าน
-- ------------------------------------------------------------------------------

-- CHECK 1 — ไม่มี sensitive RPC ที่ anon เรียกได้ (ยกเว้น lead_count = ตั้งใจ public, update_updated_at = trigger)
select p.proname as check1_fail_anon_can_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and has_function_privilege('anon', p.oid, 'EXECUTE')
  and p.proname not in ('lead_count', 'update_updated_at');

-- CHECK 2 — ทุกตารางใน schema public ต้องเปิด RLS
select tablename as check2_fail_rls_disabled
from pg_tables
where schemaname = 'public' and rowsecurity = false;

-- CHECK 3 — RPC จำเป็นต้องให้ authenticated เรียกได้ (ถ้าคืนแถว = สิทธิ์หาย เหมือน incident R13)
select req.proname as check3_fail_authenticated_cannot_execute
from (values
  ('create_workspace'), ('ensure_default_workspace'), ('invite_member'),
  ('list_members'), ('set_member_role'), ('remove_member'), ('is_member'),
  ('is_app_admin')
) as req(proname)
where not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = req.proname
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')
);

-- CHECK 4 — storage bucket 'shop-images' ต้องไม่มี broad SELECT policy ที่เปิด public/anon list ทั้ง bucket
select policyname as check4_fail_broad_shop_images_read
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and cmd = 'SELECT'
  and qual ilike '%shop-images%'
  and qual not ilike '%is_member%';

-- CHECK 5 — lead_count ต้องเปิด anon จริง (social proof หน้าร้านสาธารณะ — ถ้าคืนแถว = ฟีเจอร์พัง)
select 'lead_count anon revoked' as check5_fail_public_function_broken
where not has_function_privilege('anon', 'public.lead_count(text)'::regprocedure, 'EXECUTE');
