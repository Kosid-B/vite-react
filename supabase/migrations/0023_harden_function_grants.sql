-- =====================================================
-- CJ Planner / CEO AI Thailand — Hardening: ปิดสิทธิ์ EXECUTE ของ anon
-- รันต่อจาก 0001–0005
--
-- ปัญหา: Postgres ให้ EXECUTE แก่ PUBLIC เป็น default ตอน CREATE FUNCTION
-- migration 0002/0003/0005 grant ให้ authenticated แต่ "ไม่เคย revoke จาก public"
-- → anon (ซึ่ง inherit จาก PUBLIC) จึงยังเรียกฟังก์ชันเหล่านี้ได้ (Supabase advisor เตือน)
--
-- สำคัญ: ต้อง REVOKE ... FROM public (ไม่ใช่ FROM anon)
--        สิทธิ์นี้ anon ได้ผ่าน PUBLIC ไม่ใช่ grant ตรง — revoke from anon จะเป็น no-op
-- ไฟล์นี้ idempotent (revoke/grant + create or replace รันซ้ำได้)
-- =====================================================

-- ===== 1) Defense in depth: ใส่ guard ใน create_workspace =====
-- เป็นฟังก์ชัน write เพียงตัวเดียวที่ไม่มี auth check ในตัว (ตัวอื่นมี owner_id = auth.uid())
-- เดิม: anon เรียกแล้ว auth.uid() = NULL → ชน NOT NULL constraint ของ owner_id (error ไม่สวย)
-- ใหม่: คืน error 'unauthorized' ชัดเจน และทนต่อการแก้ schema ในอนาคต (เช่นถ้า owner_id เป็น nullable)
create or replace function public.create_workspace(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  insert into public.workspaces (name, owner_id) values (coalesce(nullif(p_name,''),'บริษัทของฉัน'), auth.uid())
    returning id into new_id;
  insert into public.workspace_members (workspace_id, user_id, role) values (new_id, auth.uid(), 'owner');
  insert into public.workspace_state (workspace_id, data) values (new_id, '{}'::jsonb)
    on conflict (workspace_id) do nothing;
  return new_id;
end;
$$;

-- ===== 2) ปิด PUBLIC execute ของ RPC ที่ client เรียกตรง แล้ว grant เฉพาะ authenticated =====
revoke execute on function public.create_workspace(text)            from public;
revoke execute on function public.ensure_default_workspace()        from public;
revoke execute on function public.invite_member(uuid, text)         from public;
revoke execute on function public.list_members(uuid)                from public;
revoke execute on function public.set_member_role(uuid, uuid, text) from public;
revoke execute on function public.remove_member(uuid, uuid)         from public;
revoke execute on function public.admin_list_workspaces()           from public;

grant execute on function public.create_workspace(text)            to authenticated;
grant execute on function public.ensure_default_workspace()        to authenticated;
grant execute on function public.invite_member(uuid, text)         to authenticated;
grant execute on function public.list_members(uuid)                to authenticated;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_member(uuid, uuid)         to authenticated;
grant execute on function public.admin_list_workspaces()           to authenticated;

-- ===== 3) จงใจ "ไม่" revoke สองตัวนี้ =====
-- is_member() และ is_app_admin() ถูกเรียกภายใน RLS policy (0002/0005)
-- เวลา anon/ผู้ใช้ query ตาราง policy จะ evaluate ฟังก์ชันนี้ ถ้าไม่มีสิทธิ์ execute
-- จะกลายเป็น "permission denied for function" แทนที่จะคืน 0 แถว
-- ทั้งคู่เป็น boolean read-only อิง auth.uid() (anon → false เสมอ) ไม่รั่วข้อมูล จึงเปิด PUBLIC ไว้ได้อย่างปลอดภัย
--   public.is_member(uuid)   — เปิดไว้ (ใช้ใน policy ws_select / wm_select / wst_all)
--   public.is_app_admin()    — เปิดไว้ (ใช้ใน policy ที่ขยายสิทธิ์แอดมิน)

-- หมายเหตุ (PR governance): ไฟล์นี้ harden เฉพาะ RPC ชุดเดิม (0002/0003/0005)
-- ควรทบทวน grant ของ function ใหม่บน main ด้วย (เช่น delete_workspace #52, marketplace RPCs)
-- ให้ revoke จาก public เช่นกัน หากไม่ได้ตั้งใจเปิดให้ anon
