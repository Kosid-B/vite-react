-- 0024_reconcile_prod_rpc_grants.sql
-- ---------------------------------------------------------------------------
-- บริบท (R19 — ดู docs/isms/environment-map.md v3.0):
-- production จริง (waigsnxhrlwtiotspaim) เคยถูก REVOKE EXECUTE ... FROM PUBLIC แบบเหมารวม
-- แต่ migration ที่ GRANT ... TO authenticated (0002/0003/0005/0007/0020/0022) ไม่ได้ถูก apply
-- ผลคือ role `authenticated` เรียก RPC ของแอปไม่ได้เลย → แอปพังหลัง login
-- (สร้าง workspace ไม่ได้, หน้าทีม/แอดมินพัง, RLS ที่เรียก is_member() error)
--
-- migration นี้ยืนยันสถานะสิทธิ์ที่ถูกต้อง (idempotent):
--   • grant EXECUTE เฉพาะ `authenticated` บนฟังก์ชันที่ผู้ใช้ต้องเรียกจริง
--   • คง `anon`/`public` ล็อกออกจาก sensitive RPC (defense in depth)
--   • lead_count เปิด anon โดยตั้งใจ (social proof หน้าร้านสาธารณะ — คืนแค่ตัวเลข)
-- ทุกฟังก์ชันเป็น SECURITY DEFINER + มี owner/member guard ภายใน จึงปลอดภัยที่จะเปิดให้ authenticated
--
-- ✅ verified บน production 2026-07-07 ด้วย has_function_privilege
--    (auth_can_exec=true บนฟังก์ชันจำเป็น, anon_can_exec=false บน sensitive RPC)
-- ---------------------------------------------------------------------------

-- 0) นิยามฟังก์ชันที่ prod มีอยู่จริงแต่ไม่มี migration ไหนสร้าง (พบ 2026-07-07 ตอน apply ลง dev)
--    เพิ่มไว้เพื่อให้ repo reproduce prod ได้ + ให้บรรทัด grant/revoke ด้านล่างไม่ error ตอน rebuild
--    update_updated_at: สร้างเฉพาะถ้ายังไม่มี (กันทับ def จริงบน prod) · delete_workspace: def ตรงกับ prod
do $$
begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = 'update_updated_at') then
    create function public.update_updated_at()
    returns trigger language plpgsql as $fn$
    begin new.updated_at = now(); return new; end;
    $fn$;
  end if;
end $$;

create or replace function public.delete_workspace(p_workspace uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode = '42501'; end if;
  if not exists (select 1 from public.workspaces w where w.id = p_workspace and w.owner_id = auth.uid()) then
    return 'forbidden';
  end if;
  delete from public.workspaces where id = p_workspace;  -- FK cascade: members, state
  return 'ok';
end;
$$;

-- 1) ฟังก์ชันที่ authenticated ต้องเรียกได้
grant execute on function public.create_workspace(text)            to authenticated;
grant execute on function public.ensure_default_workspace()        to authenticated;
grant execute on function public.invite_member(uuid, text)         to authenticated;
grant execute on function public.list_members(uuid)                to authenticated;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_member(uuid, uuid)         to authenticated;
grant execute on function public.admin_list_workspaces()           to authenticated;
grant execute on function public.admin_skill_adoption()            to authenticated;
grant execute on function public.is_app_admin()                    to authenticated;
grant execute on function public.is_member(uuid)                   to authenticated;

-- 2) lead_count: เปิด anon โดยตั้งใจ (หน้าร้านสาธารณะเรียกแบบไม่ login)
grant execute on function public.lead_count(text) to anon, authenticated;

-- 3) คง anon/public ล็อกออกจาก sensitive RPC (idempotent — ไม่กระทบ grant ของ authenticated
--    เพราะ authenticated มี direct grant แล้ว บทเรียนจาก R13: ต้อง revoke จาก anon ตรงๆ ไม่ใช่แค่ public)
revoke execute on function public.create_workspace(text)            from anon, public;
revoke execute on function public.ensure_default_workspace()        from anon, public;
revoke execute on function public.invite_member(uuid, text)         from anon, public;
revoke execute on function public.list_members(uuid)                from anon, public;
revoke execute on function public.set_member_role(uuid, uuid, text) from anon, public;
revoke execute on function public.remove_member(uuid, uuid)         from anon, public;
revoke execute on function public.admin_list_workspaces()           from anon, public;
revoke execute on function public.admin_skill_adoption()            from anon, public;
revoke execute on function public.is_app_admin()                    from anon, public;
revoke execute on function public.is_member(uuid)                   from anon, public;

-- 4) delete_workspace(uuid): เปิดให้ authenticated (ปลอดภัย — มี owner-guard ภายใน:
--    เช็ก auth.uid() + owner_id = auth.uid() ไม่ใช่เจ้าของ return 'forbidden')
--    หมายเหตุ: ปัจจุบันแอป**ไม่ได้เรียก RPC นี้** (deleteWorkspace() ใน src/lib/workspaces.ts
--    ใช้ direct DELETE + RLS policy ws_delete owner-only) — เปิดไว้เผื่ออนาคต, ล็อก anon
grant  execute on function public.delete_workspace(uuid) to authenticated;
revoke execute on function public.delete_workspace(uuid) from anon, public;

-- 5) update_updated_at(): เป็น trigger function — ไม่ควรเรียกตรงจาก client
--    trigger ยังทำงานได้ปกติแม้ revoke EXECUTE (รันในบริบท trigger ด้วยสิทธิ์ table owner)
revoke execute on function public.update_updated_at() from anon, authenticated, public;
