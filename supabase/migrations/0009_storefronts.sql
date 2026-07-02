-- =====================================================
-- CEO AI Thailand — Public Storefront (Marketplace M1)
-- หน้าร้านสาธารณะต่อบริษัท: ceoaithailand.org/b/<slug>
-- อ่านได้สาธารณะ (รวม anon) · แก้ไขได้เฉพาะสมาชิก workspace
-- =====================================================

create table if not exists public.storefronts (
  slug text primary key
    check (char_length(slug) between 3 and 60 and slug !~ '[\s/]'),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  name text not null,
  dbd text not null default '',          -- หมวดผลิตภัณฑ์/บริการตาม DBD (TSIC)
  description text not null default '',
  services text[] not null default '{}', -- สินค้า/บริการเด่น
  phone text not null default '',
  line_id text not null default '',
  email text not null default '',
  website text not null default '',
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists storefronts_dbd_idx on public.storefronts (dbd);

alter table public.storefronts enable row level security;

-- สาธารณะ: ทุกคน (รวมไม่ล็อกอิน) เห็นหน้าร้านที่เผยแพร่ · สมาชิกเห็นของตัวเองเสมอ
drop policy if exists sf_select on public.storefronts;
create policy sf_select on public.storefronts for select
  using (published or public.is_member(workspace_id));

-- เขียนได้เฉพาะสมาชิกของ workspace นั้น
drop policy if exists sf_insert on public.storefronts;
create policy sf_insert on public.storefronts for insert
  to authenticated
  with check (public.is_member(workspace_id));

drop policy if exists sf_update on public.storefronts;
create policy sf_update on public.storefronts for update
  to authenticated
  using (public.is_member(workspace_id))
  with check (public.is_member(workspace_id));

drop policy if exists sf_delete on public.storefronts;
create policy sf_delete on public.storefronts for delete
  to authenticated
  using (public.is_member(workspace_id));
