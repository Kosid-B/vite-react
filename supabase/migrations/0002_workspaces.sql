-- =====================================================
-- CJ Planner — Team Workspaces (แชร์เวิร์กสเปซ/หลายบริษัท)
-- รันต่อจาก 0001_init.sql ใน SQL Editor
-- =====================================================

create extension if not exists "pgcrypto"; -- สำหรับ gen_random_uuid()

-- เวิร์กสเปซ = 1 บริษัท AI (มีหลายสมาชิกได้)
create table if not exists public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'บริษัทของฉัน',
  owner_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- สมาชิกของเวิร์กสเปซ + บทบาท
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner','admin','member')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- สถานะแอป (AppData) ผูกกับเวิร์กสเปซ แทนการผูกกับผู้ใช้
create table if not exists public.workspace_state (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  data         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

-- ฟังก์ชันตรวจสมาชิก (SECURITY DEFINER เพื่อเลี่ยง RLS recursion)
create or replace function public.is_member(ws uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

alter table public.workspaces       enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_state   enable row level security;

-- workspaces: สมาชิกเห็นได้, เจ้าของแก้/ลบได้
drop policy if exists ws_select on public.workspaces;
create policy ws_select on public.workspaces for select using (public.is_member(id) or owner_id = auth.uid());
drop policy if exists ws_update on public.workspaces;
create policy ws_update on public.workspaces for update using (owner_id = auth.uid());
drop policy if exists ws_delete on public.workspaces;
create policy ws_delete on public.workspaces for delete using (owner_id = auth.uid());

-- members: สมาชิกเห็นรายชื่อในเวิร์กสเปซตัวเอง; เจ้าของเวิร์กสเปซเพิ่ม/ลบสมาชิกได้
drop policy if exists wm_select on public.workspace_members;
create policy wm_select on public.workspace_members for select using (public.is_member(workspace_id));
drop policy if exists wm_modify on public.workspace_members;
create policy wm_modify on public.workspace_members for all
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

-- state: สมาชิกอ่าน/เขียนได้
drop policy if exists wst_all on public.workspace_state;
create policy wst_all on public.workspace_state for all
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));

-- สร้างเวิร์กสเปซใหม่ + ตั้งผู้สร้างเป็น owner (เลี่ยง chicken-egg ของ RLS)
create or replace function public.create_workspace(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into public.workspaces (name, owner_id) values (coalesce(nullif(p_name,''),'บริษัทของฉัน'), auth.uid())
    returning id into new_id;
  insert into public.workspace_members (workspace_id, user_id, role) values (new_id, auth.uid(), 'owner');
  insert into public.workspace_state (workspace_id, data) values (new_id, '{}'::jsonb)
    on conflict (workspace_id) do nothing;
  return new_id;
end;
$$;

-- คืนเวิร์กสเปซเริ่มต้นของผู้ใช้ — ถ้ายังไม่มี ให้สร้าง "ส่วนตัว"
create or replace function public.ensure_default_workspace()
returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  select workspace_id into ws from public.workspace_members where user_id = auth.uid() order by created_at limit 1;
  if ws is null then ws := public.create_workspace('ส่วนตัว'); end if;
  return ws;
end;
$$;

-- เชิญสมาชิกด้วยอีเมล (ต้องเป็นผู้ใช้ที่ลงทะเบียนแล้ว) — เรียกโดยเจ้าของเวิร์กสเปซ
create or replace function public.invite_member(p_workspace uuid, p_email text)
returns text language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not exists (select 1 from public.workspaces w where w.id = p_workspace and w.owner_id = auth.uid()) then
    return 'forbidden';
  end if;
  select id into uid from auth.users where email = lower(p_email);
  if uid is null then return 'not_found'; end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (p_workspace, uid, 'member')
    on conflict do nothing;
  return 'ok';
end;
$$;

grant execute on function public.create_workspace(text)        to authenticated;
grant execute on function public.ensure_default_workspace()    to authenticated;
grant execute on function public.invite_member(uuid, text)     to authenticated;
