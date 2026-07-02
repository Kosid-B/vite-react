-- =====================================================
-- CEO AI Thailand — สถิติการเลือกใช้ Skill (Marketing Analytics)
-- เก็บ event ตอน user ซื้อ/เลือกใช้ Skill → Admin ดูสถิติหลังบ้าน
-- รันต่อจาก 0001–0006
-- =====================================================

create table if not exists public.skill_purchases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  user_id uuid not null default auth.uid(),
  user_email text,
  skill_id text not null,
  skill_name text not null,
  category text,
  tier int,
  price numeric not null default 0,
  pay_method text,
  created_at timestamptz not null default now()
);

create index if not exists skill_purchases_skill_idx on public.skill_purchases (skill_id);
create index if not exists skill_purchases_created_idx on public.skill_purchases (created_at desc);

alter table public.skill_purchases enable row level security;

-- ผู้ใช้ล็อกอินบันทึก event ของตัวเองได้เท่านั้น
drop policy if exists sp_insert on public.skill_purchases;
create policy sp_insert on public.skill_purchases for insert
  to authenticated
  with check (user_id = auth.uid());

-- อ่านสถิติได้เฉพาะแอดมินระบบ (ข้อมูลการตลาด)
drop policy if exists sp_select on public.skill_purchases;
create policy sp_select on public.skill_purchases for select
  to authenticated
  using (public.is_app_admin());

-- ===== RPC: การใช้งาน Skill ปัจจุบันรวมทุกบริษัท (จาก workspace_state) =====
-- ครอบคลุม Skill ที่ซื้อก่อนเริ่มเก็บ event ด้วย
create or replace function public.admin_skill_adoption()
returns table (skill_id text, companies bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'forbidden'; end if;
  return query
    select s.value::text, count(distinct ws.workspace_id)
    from public.workspace_state ws,
         jsonb_array_elements_text(
           coalesce(ws.data->'aiCompany'->'purchasedSkills', '[]'::jsonb)
         ) as s(value)
    group by s.value
    order by count(distinct ws.workspace_id) desc;
end;
$$;

grant execute on function public.admin_skill_adoption() to authenticated;
