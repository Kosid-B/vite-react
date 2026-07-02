-- =====================================================
-- CEO AI Thailand — Marketplace M2 (RFQ) + M3 (Orders)
-- M2: บริษัทในระบบขอใบเสนอราคาจากหน้าร้านกันเอง (B2B Matching)
-- M3: ออเดอร์ + ค่าดำเนินการ 3% (โครงพร้อม เปิดจับเงินจริงเมื่อ gateway มา)
-- =====================================================

-- ── RFQ: ขอใบเสนอราคา ──────────────────────────────────
create table if not exists public.rfqs (
  id uuid primary key default gen_random_uuid(),
  buyer_ws uuid not null references public.workspaces(id) on delete cascade,
  buyer_name text not null default '',
  seller_slug text not null references public.storefronts(slug) on delete cascade,
  title text not null,
  detail text not null default '',
  budget numeric not null default 0,
  contact text not null default '',      -- ช่องทางติดต่อกลับผู้ซื้อ
  status text not null default 'open'
    check (status in ('open','quoted','accepted','declined','closed')),
  quote_amount numeric not null default 0,
  quote_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rfqs_seller_idx on public.rfqs (seller_slug);
create index if not exists rfqs_buyer_idx on public.rfqs (buyer_ws);

alter table public.rfqs enable row level security;

-- ผู้ซื้อ: จัดการ RFQ ของตัวเองได้เต็มที่
drop policy if exists rfq_buyer_all on public.rfqs;
create policy rfq_buyer_all on public.rfqs for all
  to authenticated
  using (public.is_member(buyer_ws))
  with check (public.is_member(buyer_ws));

-- ผู้ขาย (สมาชิก workspace เจ้าของหน้าร้าน): เห็น + ตอบใบเสนอราคา
drop policy if exists rfq_seller_select on public.rfqs;
create policy rfq_seller_select on public.rfqs for select
  to authenticated
  using (exists (select 1 from public.storefronts s
                 where s.slug = seller_slug and public.is_member(s.workspace_id)));

drop policy if exists rfq_seller_update on public.rfqs;
create policy rfq_seller_update on public.rfqs for update
  to authenticated
  using (exists (select 1 from public.storefronts s
                 where s.slug = seller_slug and public.is_member(s.workspace_id)))
  with check (exists (select 1 from public.storefronts s
                      where s.slug = seller_slug and public.is_member(s.workspace_id)));

-- ── Orders: ออเดอร์หลังรับใบเสนอราคา (M3) ─────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid references public.rfqs(id) on delete set null,
  buyer_ws uuid not null references public.workspaces(id) on delete cascade,
  seller_ws uuid not null references public.workspaces(id) on delete cascade,
  title text not null default '',
  amount numeric not null check (amount >= 0),
  fee numeric not null default 0,        -- ค่าดำเนินการ platform 3%
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid','delivered','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_buyer_idx on public.orders (buyer_ws);
create index if not exists orders_seller_idx on public.orders (seller_ws);

alter table public.orders enable row level security;

drop policy if exists ord_select on public.orders;
create policy ord_select on public.orders for select
  to authenticated
  using (public.is_member(buyer_ws) or public.is_member(seller_ws));

drop policy if exists ord_insert on public.orders;
create policy ord_insert on public.orders for insert
  to authenticated
  with check (public.is_member(buyer_ws));

drop policy if exists ord_update on public.orders;
create policy ord_update on public.orders for update
  to authenticated
  using (public.is_member(buyer_ws) or public.is_member(seller_ws))
  with check (public.is_member(buyer_ws) or public.is_member(seller_ws));
