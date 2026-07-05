-- =====================================================
-- CEO AI Thailand — Audit trail: production incident 2026-07-05 (R13)
-- ISO/IEC 27001:2022 control 7.5 (documented information), 8.9 (configuration management)
--
-- บริบท: ระหว่างยืนยัน production Supabase project ตัวจริง (แก้ R11 —
-- ดู docs/isms/environment-map.md) พบว่า production มีสิทธิ์ RPC ผิดปกติ 2 แบบ:
--
-- 1) ensure_default_workspace / invite_member / list_members / set_member_role
--    ถูก revoke จาก public แต่ "ไม่เคย" grant คืนให้ authenticated → ผู้ใช้จริงเรียกไม่ได้เลย
--    (หน้าทีม/สมาชิก + post-login bootstrap พังจริง) — 0020_harden_function_grants.sql
--    มีบรรทัด grant ถูกต้องอยู่แล้ว แต่ยังไม่เคยถูก apply บนโปรเจกต์นี้จริง (แก้ด่วนตรงผ่าน SQL แทน)
--
-- 2) remove_member มี "grant execute ... to anon" แบบตรงเจาะจง (ไม่ใช่ผ่าน PUBLIC)
--    → คำสั่ง "revoke ... from public" ใน 0020 (แม้ apply แล้ว) จะ "ไม่ลบสิทธิ์นี้" เพราะเป็นคนละ ACL entry
--    ต้อง revoke จาก anon ตรงๆ — เป็นช่องโหว่แฝงที่ 0020 เดิมไม่ครอบคลุม
--
-- ไฟล์นี้ = การแก้ที่ทำจริงบน production เมื่อ 2026-07-05 (ผ่าน execute_sql โดยตรง หลังยืนยันกับเจ้าของระบบ)
-- บันทึกเป็น migration ทางการเพื่อกัน config drift ถ้ามีการ restore/recreate DB จาก migration history
-- ไฟล์นี้ idempotent (revoke/grant รันซ้ำได้ปลอดภัย) — ควร apply ต่อจาก 0020/0021 เสมอ (ให้ authenticated
-- ได้สิทธิ์ก่อน ไฟล์นี้ค่อยจัดการกรณีพิเศษของ remove_member)
-- =====================================================

-- ===== 1) คืนสิทธิ์ authenticated ที่หายไปจริงบน production (ผลจากการ revoke public ที่ไม่ครบวงจร) =====
grant execute on function public.ensure_default_workspace()        to authenticated;
grant execute on function public.invite_member(uuid, text)         to authenticated;
grant execute on function public.list_members(uuid)                to authenticated;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;

-- ===== 2) ปิดช่องโหว่แฝงของ remove_member — revoke จาก anon โดยตรง (ไม่ใช่แค่ public) =====
revoke execute on function public.remove_member(uuid, uuid) from anon;
revoke execute on function public.remove_member(uuid, uuid) from public;
grant  execute on function public.remove_member(uuid, uuid) to authenticated;

-- ===== Verify (รันแยกเพื่อตรวจ ไม่ใช่ส่วนหนึ่งของ migration) =====
-- select p.proname, has_function_privilege('anon', p.oid, 'EXECUTE') anon_ok,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') auth_ok
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.proname in
--   ('ensure_default_workspace','invite_member','list_members','set_member_role','remove_member');
-- คาดหวัง: ทุกแถว anon_ok=false, auth_ok=true
