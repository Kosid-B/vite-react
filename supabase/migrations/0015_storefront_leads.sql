-- =====================================================
-- CEO AI Thailand — พิสูจน์ไอเดียก่อนสร้าง (Pre-order Validation)
-- ปัญหา: คนส่วนใหญ่สร้างสินค้า/บริการโดยไม่รู้ว่ามีลูกค้าจริงพร้อมจ่ายหรือเปล่า
-- ทางแก้: หน้าร้านสาธารณะรับ "สั่งจองล่วงหน้า/สนใจ" จากลูกค้าจริง (ไม่ต้องล็อกอิน)
--         → เจ้าของร้านเห็นจำนวน+รายชื่อ = หลักฐานความต้องการจ่ายจริง ก่อนลงทุนสร้าง
-- =====================================================

create table if not exists public.storefront_leads (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.storefronts(slug) on delete cascade,
  kind text not null default 'interest' check (kind in ('preorder','interest')),
  name text not null default '',
  contact text not null check (char_length(contact) between 5 and 120), -- เบอร์/LINE/อีเมล
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists leads_slug_idx on public.storefront_leads (slug, created_at desc);

alter table public.storefront_leads enable row level security;

-- ลูกค้าสาธารณะ (รวม anon) ทิ้งความสนใจ/สั่งจองได้ — เฉพาะร้านที่เผยแพร่อยู่
drop policy if exists lead_insert on public.storefront_leads;
create policy lead_insert on public.storefront_leads for insert
  to anon, authenticated
  with check (exists (select 1 from public.storefronts s
                      where s.slug = storefront_leads.slug and s.published));

-- เจ้าของร้าน (สมาชิก workspace) อ่าน leads ของร้านตัวเอง — ข้อมูลติดต่อลูกค้า
drop policy if exists lead_owner_select on public.storefront_leads;
create policy lead_owner_select on public.storefront_leads for select
  to authenticated
  using (exists (select 1 from public.storefronts s
                 where s.slug = storefront_leads.slug
                   and public.is_member(s.workspace_id)));

-- admin ระบบจัดการได้ทั้งหมด
drop policy if exists lead_admin_all on public.storefront_leads;
create policy lead_admin_all on public.storefront_leads for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- นับจำนวนผู้สนใจแบบสาธารณะ (social proof บนหน้าร้าน) โดยไม่เปิดเผยข้อมูลติดต่อ
create or replace function public.lead_count(p_slug text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.storefront_leads where slug = p_slug;
$$;

grant execute on function public.lead_count(text) to anon, authenticated;
