-- =====================================================
-- CJ Planner / CEO AI Thailand — ผู้ดูแลระบบ (System Admin)
-- ให้ support@b-tctraining.com เข้าถึง/ดูแลทุกเวิร์กสเปซได้
-- รันต่อจาก 0001–0004
-- =====================================================

-- รายชื่ออีเมลผู้ดูแลระบบ
create table if not exists public.app_admins (
  email text primary key
);
insert into public.app_admins (email) values ('support@b-tctraining.com')
  on conflict (email) do nothing;

alter table public.app_admins enable row level security;
-- อ่านรายชื่อแอดมินได้เฉพาะแอดมินเอง (กันคนทั่วไปเห็น)
drop policy if exists admins_select on public.app_admins;
create policy admins_select on public.app_admins for select
  using (lower(coalesce(auth.jwt() ->> 'email','')) = email);

-- ผู้ใช้ปัจจุบันเป็นแอดมินระบบหรือไม่ (อิงอีเมลใน JWT)
create or replace function public.is_app_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.app_admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email',''))
  );
$$;

-- ===== ขยาย RLS เดิมให้แอดมินเข้าถึงทุกเวิร์กสเปซ =====
drop policy if exists ws_select on public.workspaces;
create policy ws_select on public.workspaces for select
  using (public.is_member(id) or owner_id = auth.uid() or public.is_app_admin());

drop policy if exists wm_select on public.workspace_members;
create policy wm_select on public.workspace_members for select
  using (public.is_member(workspace_id) or public.is_app_admin());

drop policy if exists wst_all on public.workspace_state;
create policy wst_all on public.workspace_state for all
  using (public.is_member(workspace_id) or public.is_app_admin())
  with check (public.is_member(workspace_id) or public.is_app_admin());

-- ===== RPC สำหรับหน้า Admin: ดูทุกเวิร์กสเปซ + จำนวนสมาชิก =====
create or replace function public.admin_list_workspaces()
returns table (id uuid, name text, owner_email text, member_count bigint, created_at timestamptz)
language plpgsql security definer set search_path = public, auth as $$
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
$$;

grant execute on function public.is_app_admin()          to authenticated;
grant execute on function public.admin_list_workspaces() to authenticated;
