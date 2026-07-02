-- =====================================================
-- CEO AI Thailand — สมัครร้านตลาดฝากขายสินค้า (Marketplace Shop)
-- ฟอร์มสาธารณะบน landing (/shop) — สมัครด้วยเบอร์โทร + LINE ไม่ต้องล็อกอิน
-- แพ็กเกจ: free / daily(฿19) / weekly(฿99) / monthly(฿290) / yearly(฿2,900)
-- + auction (ประมูลตำแหน่งร้านแนะนำ — English Auction)
-- =====================================================

create table if not exists public.shop_applications (
  id uuid primary key default gen_random_uuid(),
  shop_name text not null check (char_length(shop_name) between 2 and 120),
  category text not null default '',
  products text not null default '',   -- สินค้าที่จะฝากขาย
  phone text not null check (phone ~ '^[0-9+\- ]{9,15}$'),
  line_id text not null default '',
  package text not null default 'free'
    check (package in ('free','daily','weekly','monthly','yearly','auction')),
  status text not null default 'new'
    check (status in ('new','contacted','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists shop_apps_status_idx on public.shop_applications (status, created_at desc);

alter table public.shop_applications enable row level security;

-- ฟอร์มสาธารณะ: ใครก็ยื่นใบสมัครได้ (รวม anon — สมัครด้วยเบอร์+LINE ไม่ต้องมีบัญชี)
drop policy if exists shop_app_insert on public.shop_applications;
create policy shop_app_insert on public.shop_applications for insert
  to anon, authenticated
  with check (status = 'new');

-- อ่าน/จัดการได้เฉพาะแอดมินระบบ (ข้อมูลติดต่อส่วนบุคคล)
drop policy if exists shop_app_admin_select on public.shop_applications;
create policy shop_app_admin_select on public.shop_applications for select
  to authenticated using (public.is_app_admin());

drop policy if exists shop_app_admin_update on public.shop_applications;
create policy shop_app_admin_update on public.shop_applications for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists shop_app_admin_delete on public.shop_applications;
create policy shop_app_admin_delete on public.shop_applications for delete
  to authenticated using (public.is_app_admin());
