-- =====================================================
-- CJ Planner — RPC จัดการสมาชิกทีม (ใช้กับหน้า "ทีม / สมาชิก")
-- รันต่อจาก 0002_workspaces.sql
-- =====================================================

-- รายชื่อสมาชิกในเวิร์กสเปซ พร้อมอีเมล (อ่าน auth.users ผ่าน SECURITY DEFINER)
create or replace function public.list_members(p_workspace uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz)
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_member(p_workspace) then
    raise exception 'forbidden';
  end if;
  return query
    select m.user_id, u.email::text, m.role, m.created_at
    from public.workspace_members m
    join auth.users u on u.id = m.user_id
    where m.workspace_id = p_workspace
    order by m.created_at;
end;
$$;

-- เปลี่ยนบทบาทสมาชิก (เฉพาะเจ้าของเวิร์กสเปซ; เปลี่ยนบทบาทเจ้าของไม่ได้)
create or replace function public.set_member_role(p_workspace uuid, p_user uuid, p_role text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.workspaces w where w.id = p_workspace and w.owner_id = auth.uid()) then
    return 'forbidden';
  end if;
  if p_role not in ('admin','member') then return 'bad_role'; end if;
  if exists (select 1 from public.workspaces w where w.id = p_workspace and w.owner_id = p_user) then
    return 'cannot_change_owner';
  end if;
  update public.workspace_members set role = p_role where workspace_id = p_workspace and user_id = p_user;
  return 'ok';
end;
$$;

-- ลบสมาชิกออกจากเวิร์กสเปซ (เฉพาะเจ้าของ; ลบเจ้าของไม่ได้)
create or replace function public.remove_member(p_workspace uuid, p_user uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.workspaces w where w.id = p_workspace and w.owner_id = auth.uid()) then
    return 'forbidden';
  end if;
  if exists (select 1 from public.workspaces w where w.id = p_workspace and w.owner_id = p_user) then
    return 'cannot_remove_owner';
  end if;
  delete from public.workspace_members where workspace_id = p_workspace and user_id = p_user;
  return 'ok';
end;
$$;

grant execute on function public.list_members(uuid)              to authenticated;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_member(uuid, uuid)       to authenticated;
