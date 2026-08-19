-- 0064 — 🔴 บั๊กที่ 2 ซ้อนอยู่ใต้ 0063 (พบและพิสูจน์บน production 19 ส.ค. 2569)
--
-- อาการ: ผู้ใช้ทั่วไปล็อกอินแล้วแอปอ่านเวิร์กสเปซของตัวเองไม่ได้เลย
--   error จริง: 54001 stack depth limit exceeded
--
-- สาเหตุ: policy `wm_select` ของ public.workspace_members คือ
--     USING (is_member(workspace_id) OR is_app_admin())
--   แต่ is_member() เป็น **SECURITY INVOKER** และตัวมันเอง select จาก workspace_members
--   ⇒ select workspace_members → policy เรียก is_member → select workspace_members → วนไม่รู้จบ
--
-- ⚠️ ทำไมบั๊กนี้ซ่อนตัวได้นาน: บัญชีแอดมิน (support@b-tctraining.com) ไม่เจอปัญหา
--   เพราะ is_app_admin() คืน true และ planner ลัดวงจร OR ออกไปก่อนถึง is_member()
--   ⇒ **เจ้าของระบบทดสอบเองแล้วผ่านทุกครั้ง ส่วนผู้ใช้จริงพังทุกคน**
--   นี่คือเหตุผลว่าทำไมต้องทดสอบด้วยบัญชีที่ "ไม่ใช่แอดมิน" เสมอ
--
-- แก้ตามแนวทางมาตรฐานของ Supabase: helper ที่ถูกใช้ใน policy ต้องเป็น SECURITY DEFINER
--   ปลอดภัย เพราะคืนค่าเป็น boolean เกี่ยวกับ "ผู้เรียกเอง" (auth.uid()) เท่านั้น
--   ไม่คืนข้อมูลของใครออกไป · และ revoke จาก anon ไว้ด้วย

create or replace function public.is_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.app_admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email',''))
  );
$$;

revoke all on function public.is_member(uuid) from public, anon;
revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_member(uuid) to authenticated, service_role;
grant execute on function public.is_app_admin() to authenticated, service_role;
