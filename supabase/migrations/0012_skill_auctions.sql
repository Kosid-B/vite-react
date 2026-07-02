-- =====================================================
-- CEO AI Thailand — ประมูล Skill จากบริษัท (English Auction)
-- Admin ระบบเปิดประมูล → ทุกบริษัทบิดแข่งกันแบบโปร่งใส →
-- Admin ปิดประมูล บิดสูงสุดชนะ → ผู้ชนะชำระเงินรับ skill
-- =====================================================

create table if not exists public.skill_auctions (
  id uuid primary key default gen_random_uuid(),
  skill_id text not null,
  skill_name text not null,
  skill_desc text not null default '',
  icon text not null default '🎯',
  start_price numeric not null check (start_price >= 0),
  min_increment numeric not null default 100 check (min_increment > 0),
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open','closed','cancelled')),
  winner_ws uuid references public.workspaces(id) on delete set null,
  winning_bid numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skill_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.skill_auctions(id) on delete cascade,
  ws_id uuid not null references public.workspaces(id) on delete cascade,
  bidder_name text not null default '',
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists bids_auction_idx on public.skill_bids (auction_id, amount desc);

alter table public.skill_auctions enable row level security;
alter table public.skill_bids enable row level security;

-- ประมูล: ทุกคนที่ล็อกอินเห็น · เขียนได้เฉพาะแอดมินระบบ
drop policy if exists auc_select on public.skill_auctions;
create policy auc_select on public.skill_auctions for select
  to authenticated using (true);

drop policy if exists auc_admin_write on public.skill_auctions;
create policy auc_admin_write on public.skill_auctions for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- บิด: เห็นกันหมด (English auction โปร่งใส) · ยื่นได้เฉพาะสมาชิก workspace ตัวเอง
--      และเฉพาะประมูลที่ยังเปิด+ยังไม่หมดเวลา
drop policy if exists bid_select on public.skill_bids;
create policy bid_select on public.skill_bids for select
  to authenticated using (true);

drop policy if exists bid_insert on public.skill_bids;
create policy bid_insert on public.skill_bids for insert
  to authenticated
  with check (
    public.is_member(ws_id)
    and exists (select 1 from public.skill_auctions a
                where a.id = auction_id and a.status = 'open' and a.ends_at > now())
  );
