-- =====================================================
-- CEO AI Thailand — Skill Marketplace (Admin-managed)
-- Admin ระบบเพิ่ม Skill ใหม่ → แสดงใน Marketplace ของทุกบริษัท
-- รันต่อจาก 0001–0005
-- =====================================================

create table if not exists public.marketplace_skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null default 'strategy'
    check (category in ('strategy','sales','marketing','analytics','technology','hr','impact')),
  tier int not null default 1 check (tier in (1, 2, 3)),
  price numeric not null default 0 check (price >= 0),
  icon text not null default '✨',
  tags text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.marketplace_skills enable row level security;

-- ผู้ใช้ที่ล็อกอินเห็นเฉพาะ skill ที่ active · แอดมินเห็นทั้งหมด
drop policy if exists mks_select on public.marketplace_skills;
create policy mks_select on public.marketplace_skills for select
  to authenticated
  using (active or public.is_app_admin());

-- เพิ่ม/แก้ไข/ลบ ได้เฉพาะแอดมินระบบ
drop policy if exists mks_insert on public.marketplace_skills;
create policy mks_insert on public.marketplace_skills for insert
  to authenticated
  with check (public.is_app_admin());

drop policy if exists mks_update on public.marketplace_skills;
create policy mks_update on public.marketplace_skills for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists mks_delete on public.marketplace_skills;
create policy mks_delete on public.marketplace_skills for delete
  to authenticated
  using (public.is_app_admin());
