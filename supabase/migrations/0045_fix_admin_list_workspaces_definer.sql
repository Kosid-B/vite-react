-- =====================================================
-- CEO AI Thailand — Fix: admin_list_workspaces ล้มด้วย "permission denied for table users"
-- อาการ: หน้าผู้ดูแลระบบ (🏢 เวิร์กสเปซ) ขึ้น "ยังไม่มีเวิร์กสเปซในระบบ" และ Activation Funnel ไม่แสดง
-- สาเหตุ: ฟังก์ชันเดิมเป็น SECURITY INVOKER + join auth.users → role `authenticated` อ่าน auth.users ไม่ได้
--         → RPC error → client (adminListWorkspaces) catch แล้วคืน [] → loadOps เห็น 0 ws เลย bail
-- แก้: ตั้ง SECURITY DEFINER (รันในสิทธิ์เจ้าของฟังก์ชัน ซึ่งอ่าน auth.users ได้)
--      ยังคง guard is_app_admin() ไว้ + search_path ปักแน่น (กัน privilege escalation ของ definer)
-- =====================================================

create or replace function public.admin_list_workspaces()
returns table(id uuid, name text, owner_email text, member_count bigint, created_at timestamptz)
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
begin
  if not public.is_app_admin() then raise exception 'forbidden'; end if;
  return query
    select w.id, w.name, u.email::text,
           (select count(*) from public.workspace_members m where m.workspace_id = w.id),
           w.created_at
    from public.workspaces w
    join auth.users u on u.id = w.owner_id
    order by w.created_at desc;
end;
$function$;

-- definer function: ให้เฉพาะ authenticated เรียก (guard is_app_admin ภายในอีกชั้น) · ปิด anon/public
revoke execute on function public.admin_list_workspaces() from public, anon;
grant execute on function public.admin_list_workspaces() to authenticated;
