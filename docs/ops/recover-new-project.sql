-- ============================================================
-- RECOVER: Core schema สำหรับ project ใหม่ waigsnxhrlwtiotspaim
-- รวม migrations 0001–0015, 0019, 0020 (ข้าม 0004/0008 cron และ 0016–0018 TIS)
-- ✅ IDEMPOTENT: รันซ้ำได้ปลอดภัย (ใส่ drop policy if exists ก่อนทุก create policy)
-- วิธีใช้: Supabase Dashboard (project ใหม่) → SQL Editor → วางทั้งไฟล์ → Run
-- ก่อนรัน: Database → Extensions เปิด pgcrypto, uuid-ossp
-- ============================================================


-- ==================== 0001_init.sql ====================
-- =====================================================
-- CJ Planner — Supabase schema (multi-tenant ผ่าน RLS)
-- รันใน Supabase: SQL Editor → วางทั้งไฟล์ → Run
-- =====================================================

-- ตารางเก็บสถานะแอปทั้งหมดของผู้ใช้ (1 แถวต่อ 1 ผู้ใช้)
-- เก็บเป็น JSONB ทั้งก้อน (AppData) เพื่อให้ตรงกับโครงสร้างฝั่ง frontend
create table if not exists public.app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- เปิด Row Level Security: ผู้ใช้เห็น/แก้ได้เฉพาะข้อมูลของตัวเอง (กันข้ามผู้เช่า)
alter table public.app_state enable row level security;

drop policy if exists "own rows - select" on public.app_state;
drop policy if exists "own rows - select" on public.app_state;
create policy "own rows - select" on public.app_state
  for select using (auth.uid() = user_id);

drop policy if exists "own rows - insert" on public.app_state;
drop policy if exists "own rows - insert" on public.app_state;
create policy "own rows - insert" on public.app_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "own rows - update" on public.app_state;
drop policy if exists "own rows - update" on public.app_state;
create policy "own rows - update" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows - delete" on public.app_state;
drop policy if exists "own rows - delete" on public.app_state;
create policy "own rows - delete" on public.app_state
  for delete using (auth.uid() = user_id);

-- =====================================================
-- ส่วนขยายในอนาคต (ยังไม่บังคับใช้):
-- ถ้าต้องการแชร์เวิร์กสเปซแบบทีม/หลายบริษัท ให้เพิ่มตาราง
--   workspaces (id, name, owner)  และ  workspace_members (workspace_id, user_id, role)
-- แล้วเปลี่ยน RLS ของ app_state ให้อิงสมาชิกเวิร์กสเปซแทน user_id
-- =====================================================


-- ==================== 0002_workspaces.sql ====================
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
drop policy if exists ws_select on public.workspaces;
create policy ws_select on public.workspaces for select using (public.is_member(id) or owner_id = auth.uid());
drop policy if exists ws_update on public.workspaces;
drop policy if exists ws_update on public.workspaces;
create policy ws_update on public.workspaces for update using (owner_id = auth.uid());
drop policy if exists ws_delete on public.workspaces;
drop policy if exists ws_delete on public.workspaces;
create policy ws_delete on public.workspaces for delete using (owner_id = auth.uid());

-- members: สมาชิกเห็นรายชื่อในเวิร์กสเปซตัวเอง; เจ้าของเวิร์กสเปซเพิ่ม/ลบสมาชิกได้
drop policy if exists wm_select on public.workspace_members;
drop policy if exists wm_select on public.workspace_members;
create policy wm_select on public.workspace_members for select using (public.is_member(workspace_id));
drop policy if exists wm_modify on public.workspace_members;
drop policy if exists wm_modify on public.workspace_members;
create policy wm_modify on public.workspace_members for all
  using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()));

-- state: สมาชิกอ่าน/เขียนได้
drop policy if exists wst_all on public.workspace_state;
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


-- ==================== 0003_members.sql ====================
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


-- ==================== 0005_admin.sql ====================
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
drop policy if exists ws_select on public.workspaces;
create policy ws_select on public.workspaces for select
  using (public.is_member(id) or owner_id = auth.uid() or public.is_app_admin());

drop policy if exists wm_select on public.workspace_members;
drop policy if exists wm_select on public.workspace_members;
create policy wm_select on public.workspace_members for select
  using (public.is_member(workspace_id) or public.is_app_admin());

drop policy if exists wst_all on public.workspace_state;
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


-- ==================== 0006_marketplace_skills.sql ====================
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
drop policy if exists mks_select on public.marketplace_skills;
create policy mks_select on public.marketplace_skills for select
  to authenticated
  using (active or public.is_app_admin());

-- เพิ่ม/แก้ไข/ลบ ได้เฉพาะแอดมินระบบ
drop policy if exists mks_insert on public.marketplace_skills;
drop policy if exists mks_insert on public.marketplace_skills;
create policy mks_insert on public.marketplace_skills for insert
  to authenticated
  with check (public.is_app_admin());

drop policy if exists mks_update on public.marketplace_skills;
drop policy if exists mks_update on public.marketplace_skills;
create policy mks_update on public.marketplace_skills for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists mks_delete on public.marketplace_skills;
drop policy if exists mks_delete on public.marketplace_skills;
create policy mks_delete on public.marketplace_skills for delete
  to authenticated
  using (public.is_app_admin());


-- ==================== 0007_skill_stats.sql ====================
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
drop policy if exists sp_insert on public.skill_purchases;
create policy sp_insert on public.skill_purchases for insert
  to authenticated
  with check (user_id = auth.uid());

-- อ่านสถิติได้เฉพาะแอดมินระบบ (ข้อมูลการตลาด)
drop policy if exists sp_select on public.skill_purchases;
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


-- ==================== 0009_storefronts.sql ====================
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
drop policy if exists sf_select on public.storefronts;
create policy sf_select on public.storefronts for select
  using (published or public.is_member(workspace_id));

-- เขียนได้เฉพาะสมาชิกของ workspace นั้น
drop policy if exists sf_insert on public.storefronts;
drop policy if exists sf_insert on public.storefronts;
create policy sf_insert on public.storefronts for insert
  to authenticated
  with check (public.is_member(workspace_id));

drop policy if exists sf_update on public.storefronts;
drop policy if exists sf_update on public.storefronts;
create policy sf_update on public.storefronts for update
  to authenticated
  using (public.is_member(workspace_id))
  with check (public.is_member(workspace_id));

drop policy if exists sf_delete on public.storefronts;
drop policy if exists sf_delete on public.storefronts;
create policy sf_delete on public.storefronts for delete
  to authenticated
  using (public.is_member(workspace_id));


-- ==================== 0010_rfq_orders.sql ====================
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
drop policy if exists rfq_buyer_all on public.rfqs;
create policy rfq_buyer_all on public.rfqs for all
  to authenticated
  using (public.is_member(buyer_ws))
  with check (public.is_member(buyer_ws));

-- ผู้ขาย (สมาชิก workspace เจ้าของหน้าร้าน): เห็น + ตอบใบเสนอราคา
drop policy if exists rfq_seller_select on public.rfqs;
drop policy if exists rfq_seller_select on public.rfqs;
create policy rfq_seller_select on public.rfqs for select
  to authenticated
  using (exists (select 1 from public.storefronts s
                 where s.slug = seller_slug and public.is_member(s.workspace_id)));

drop policy if exists rfq_seller_update on public.rfqs;
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
drop policy if exists ord_select on public.orders;
create policy ord_select on public.orders for select
  to authenticated
  using (public.is_member(buyer_ws) or public.is_member(seller_ws));

drop policy if exists ord_insert on public.orders;
drop policy if exists ord_insert on public.orders;
create policy ord_insert on public.orders for insert
  to authenticated
  with check (public.is_member(buyer_ws));

drop policy if exists ord_update on public.orders;
drop policy if exists ord_update on public.orders;
create policy ord_update on public.orders for update
  to authenticated
  using (public.is_member(buyer_ws) or public.is_member(seller_ws))
  with check (public.is_member(buyer_ws) or public.is_member(seller_ws));


-- ==================== 0011_open_rfq_vp.sql ====================
-- =====================================================
-- CEO AI Thailand — First Revenue Engine
-- 1) Open RFQ (ประกาศงานกลาง): RFQ ไม่ระบุผู้ขาย เปิดให้ธุรกิจในหมวด DBD
--    เดียวกันเสนอราคา — กลไกช่วยธุรกิจใหม่ "ปิดดีลแรก" (แก้ churn)
-- 2) storefronts.vp: Value Proposition (AI Agent ช่วยเขียน) โชว์บนหน้าร้าน
-- =====================================================

-- ── Open RFQ: seller_slug เป็น null ได้ + หมวด DBD ของงาน ──
alter table public.rfqs alter column seller_slug drop not null;
alter table public.rfqs add column if not exists sector text not null default '';

create index if not exists rfqs_open_idx on public.rfqs (sector) where seller_slug is null;

-- สมาชิกทุกคนเห็นประกาศงานกลางที่ยังเปิดอยู่
drop policy if exists rfq_open_select on public.rfqs;
drop policy if exists rfq_open_select on public.rfqs;
create policy rfq_open_select on public.rfqs for select
  to authenticated
  using (seller_slug is null);

-- ผู้ขายรับงานกลาง (claim): ตั้ง seller_slug เป็นหน้าร้านของตัวเอง + เสนอราคา
drop policy if exists rfq_open_claim on public.rfqs;
drop policy if exists rfq_open_claim on public.rfqs;
create policy rfq_open_claim on public.rfqs for update
  to authenticated
  using (seller_slug is null and status = 'open')
  with check (seller_slug is not null
              and exists (select 1 from public.storefronts s
                          where s.slug = seller_slug and public.is_member(s.workspace_id)));

-- ── Value Proposition บนหน้าร้าน ──
alter table public.storefronts add column if not exists vp text not null default '';


-- ==================== 0012_skill_auctions.sql ====================
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
drop policy if exists auc_select on public.skill_auctions;
create policy auc_select on public.skill_auctions for select
  to authenticated using (true);

drop policy if exists auc_admin_write on public.skill_auctions;
drop policy if exists auc_admin_write on public.skill_auctions;
create policy auc_admin_write on public.skill_auctions for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- บิด: เห็นกันหมด (English auction โปร่งใส) · ยื่นได้เฉพาะสมาชิก workspace ตัวเอง
--      และเฉพาะประมูลที่ยังเปิด+ยังไม่หมดเวลา
drop policy if exists bid_select on public.skill_bids;
drop policy if exists bid_select on public.skill_bids;
create policy bid_select on public.skill_bids for select
  to authenticated using (true);

drop policy if exists bid_insert on public.skill_bids;
drop policy if exists bid_insert on public.skill_bids;
create policy bid_insert on public.skill_bids for insert
  to authenticated
  with check (
    public.is_member(ws_id)
    and exists (select 1 from public.skill_auctions a
                where a.id = auction_id and a.status = 'open' and a.ends_at > now())
  );


-- ==================== 0013_shop_applications.sql ====================
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
drop policy if exists shop_app_insert on public.shop_applications;
create policy shop_app_insert on public.shop_applications for insert
  to anon, authenticated
  with check (status = 'new');

-- อ่าน/จัดการได้เฉพาะแอดมินระบบ (ข้อมูลติดต่อส่วนบุคคล)
drop policy if exists shop_app_admin_select on public.shop_applications;
drop policy if exists shop_app_admin_select on public.shop_applications;
create policy shop_app_admin_select on public.shop_applications for select
  to authenticated using (public.is_app_admin());

drop policy if exists shop_app_admin_update on public.shop_applications;
drop policy if exists shop_app_admin_update on public.shop_applications;
create policy shop_app_admin_update on public.shop_applications for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists shop_app_admin_delete on public.shop_applications;
drop policy if exists shop_app_admin_delete on public.shop_applications;
create policy shop_app_admin_delete on public.shop_applications for delete
  to authenticated using (public.is_app_admin());


-- ==================== 0014_storefront_ads.sql ====================
-- =====================================================
-- CEO AI Thailand — Marketplace: หมวดสินค้า/บริการ + โฆษณาร้านค้า
-- kind          : ประเภทร้าน (product/service/both) — ใช้กรองบนสารบัญตลาด /b
-- promo         : ข้อความโฆษณา/โปรโมชันของร้าน (ร้านแก้เอง แสดงเด่นบนตลาด)
-- featured_until: ตำแหน่ง "ร้านแนะนำ" ปักหมุดบนสุดของ /b — admin ตั้ง
--                 (คู่กับแพ็กเกจประมูลตำแหน่งแนะนำใน /shop)
-- =====================================================

alter table public.storefronts
  add column if not exists kind text not null default 'both'
    check (kind in ('product','service','both')),
  add column if not exists promo text not null default '',
  add column if not exists featured_until timestamptz;

create index if not exists storefronts_featured_idx
  on public.storefronts (featured_until desc) where featured_until is not null;

-- admin ระบบจัดการทุกร้านได้ (ตั้ง/ถอดตำแหน่งร้านแนะนำ) — เดิมมีเฉพาะ member ของ workspace
drop policy if exists sf_admin_all on public.storefronts;
drop policy if exists sf_admin_all on public.storefronts;
create policy sf_admin_all on public.storefronts for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());


-- ==================== 0015_storefront_leads.sql ====================
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
drop policy if exists lead_insert on public.storefront_leads;
create policy lead_insert on public.storefront_leads for insert
  to anon, authenticated
  with check (exists (select 1 from public.storefronts s
                      where s.slug = storefront_leads.slug and s.published));

-- เจ้าของร้าน (สมาชิก workspace) อ่าน leads ของร้านตัวเอง — ข้อมูลติดต่อลูกค้า
drop policy if exists lead_owner_select on public.storefront_leads;
drop policy if exists lead_owner_select on public.storefront_leads;
create policy lead_owner_select on public.storefront_leads for select
  to authenticated
  using (exists (select 1 from public.storefronts s
                 where s.slug = storefront_leads.slug
                   and public.is_member(s.workspace_id)));

-- admin ระบบจัดการได้ทั้งหมด
drop policy if exists lead_admin_all on public.storefront_leads;
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


-- ==================== 0019_storefront_images.sql ====================
-- =====================================================
-- CEO AI Thailand — รูปภาพสินค้าบนหน้าร้าน/ตลาด
-- Gap จากผลประเมิน segment แม่ค้า: ขายของไทยโดยไม่มีรูปแทบเป็นไปไม่ได้
-- =====================================================

-- URL รูปสินค้า (สูงสุด 6 รูป — บังคับที่ frontend)
alter table public.storefronts
  add column if not exists images text[] not null default '{}';

-- Storage bucket สาธารณะสำหรับรูปสินค้า (จำกัด 2MB/ไฟล์ เฉพาะไฟล์รูป)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-images', 'shop-images', true, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- อัปโหลด/จัดการได้เฉพาะผู้ใช้ล็อกอิน ในโฟลเดอร์ workspace ตัวเอง (path = <ws_id>/ไฟล์)
drop policy if exists "shop images upload" on storage.objects;
drop policy if exists "shop images upload" on storage.objects;
create policy "shop images upload" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'shop-images'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "shop images delete" on storage.objects;
drop policy if exists "shop images delete" on storage.objects;
create policy "shop images delete" on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'shop-images'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

-- อ่านสาธารณะ (bucket public อยู่แล้ว — policy select สำหรับ REST list)
drop policy if exists "shop images read" on storage.objects;
drop policy if exists "shop images read" on storage.objects;
create policy "shop images read" on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'shop-images');


-- ==================== 0020_workspace_integrations.sql ====================
-- 0020_workspace_integrations.sql
-- เก็บ credential ของ integration ที่ "User เชื่อมบัญชีตัวเอง" (LINE OA, Google Sheets)
-- ปลอดภัยแบบ per-workspace: RLS ให้เฉพาะสมาชิก workspace เข้าถึง (is_member)
-- ไม่เก็บใน workspace_state (JSON ที่ sync ไป client) — แก้ช่องโหว่ secret รั่ว
-- หมายเหตุ: การ "ส่ง/ซิงก์จริง" ทำใน Edge Function (service_role อ่าน credentials) — deploy แยก

create table if not exists public.workspace_integrations (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider     text not null check (provider in ('line','sheets')),
  credentials  jsonb not null default '{}'::jsonb,   -- payload ลับ (เช่น LINE channel access token)
  connected    boolean not null default false,
  updated_at   timestamptz not null default now(),
  primary key (workspace_id, provider)
);

alter table public.workspace_integrations enable row level security;
revoke all on public.workspace_integrations from anon;

-- เฉพาะสมาชิก workspace เท่านั้น (กันข้าม tenant) · Edge Function ใช้ service_role อ่าน (bypass RLS)
drop policy if exists wi_select on public.workspace_integrations;
create policy wi_select on public.workspace_integrations
  for select using (public.is_member(workspace_id));
drop policy if exists wi_insert on public.workspace_integrations;
create policy wi_insert on public.workspace_integrations
  for insert with check (public.is_member(workspace_id));
drop policy if exists wi_update on public.workspace_integrations;
create policy wi_update on public.workspace_integrations
  for update using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
drop policy if exists wi_delete on public.workspace_integrations;
create policy wi_delete on public.workspace_integrations
  for delete using (public.is_member(workspace_id));

