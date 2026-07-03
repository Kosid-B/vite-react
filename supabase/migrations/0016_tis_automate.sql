-- =====================================================================
-- TIS Automate — Supabase Database Schema
-- Scope: ระบบจัดการ Compliance มาตรฐาน TIS/ISO สำหรับ "ธุรกิจ" (SaaS)
-- Backend: Supabase (PostgreSQL + RLS)
-- Design rules: TIS-first, ใช้คำว่า "ธุรกิจ" (organizations), Kanban + JIT
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1) ENUM types
-- ---------------------------------------------------------------------
create type standard_type    as enum ('TIS', 'ISO');
create type member_role      as enum ('owner', 'admin', 'auditor', 'member');
create type project_status   as enum ('draft', 'in_progress', 'under_review', 'certified', 'archived');
create type compliance_state as enum ('not_started', 'in_progress', 'gap', 'compliant', 'not_applicable');
create type card_priority    as enum ('low', 'medium', 'high', 'urgent'); -- ใช้กับ JIT

-- =====================================================================
-- 2) IDENTITY & ORGANIZATION (ธุรกิจ)
-- =====================================================================

-- profiles: ต่อยอดจาก auth.users ของ Supabase
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- organizations = "ธุรกิจ" (ไม่ใช้คำว่าโรงงาน)
create table public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  business_type text,                              -- ประเภทธุรกิจ
  subdomain     text unique not null,              -- Transparency: subdomain ชัดเจน
  created_by    uuid not null references public.profiles (id),
  created_at    timestamptz not null default now()
);

create table public.organization_members (
  org_id     uuid not null references public.organizations (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Helper: ตรวจว่า user เป็นสมาชิกของธุรกิจนี้ไหม (ใช้ใน RLS)
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

-- =====================================================================
-- 3) STANDARDS CATALOG (ฐานข้อมูลมาตรฐาน ISO/TIS — ใช้ร่วมกันทุกธุรกิจ)
-- =====================================================================

create table public.standards (
  id             uuid primary key default gen_random_uuid(),
  code           text not null,                    -- เช่น 'TIS 50-2565', 'ISO 9001'
  title          text not null,
  type           standard_type not null,           -- TIS / ISO
  version        text not null,                     -- เช่น '2565', '2015'
  effective_date date,
  is_active      boolean not null default true,
  -- TIS-first: ใช้จัดลำดับความสำคัญ TIS ก่อน ISO
  priority_rank  int not null default 0,
  created_at     timestamptz not null default now(),
  unique (code, version)
);

-- ข้อกำหนดย่อยในมาตรฐาน แปลงเป็น Logic ได้ (Compliance Engineering)
create table public.standard_clauses (
  id               uuid primary key default gen_random_uuid(),
  standard_id      uuid not null references public.standards (id) on delete cascade,
  parent_clause_id uuid references public.standard_clauses (id) on delete cascade,
  clause_no        text not null,                   -- เช่น '7.1.5'
  requirement_text text not null,
  logic_rule       jsonb,                           -- เงื่อนไขเชิง Logic สำหรับ auto-check
  created_at       timestamptz not null default now()
);

-- ติดตามการอัปเดตมาตรฐาน (Accuracy: ต้องแจ้งผู้ใช้ก่อนออกแบบ)
create table public.standard_updates (
  id           uuid primary key default gen_random_uuid(),
  standard_id  uuid not null references public.standards (id) on delete cascade,
  old_version  text,
  new_version  text not null,
  summary      text,
  published_at timestamptz not null default now(),
  acknowledged boolean not null default false
);

-- =====================================================================
-- 4) COMPLIANCE PROJECTS (โครงการของแต่ละธุรกิจ)
-- =====================================================================

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  standard_id uuid not null references public.standards (id),
  name        text not null,
  status      project_status not null default 'draft',
  owner_id    uuid not null references public.profiles (id),
  subdomain   text,                                 -- Transparency
  created_at  timestamptz not null default now()
);

-- ผลการประเมินข้อกำหนดแต่ละข้อในโครงการ
create table public.project_requirements (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  clause_id   uuid not null references public.standard_clauses (id),
  state       compliance_state not null default 'not_started',
  evidence    text,
  notes       text,
  updated_at  timestamptz not null default now(),
  unique (project_id, clause_id)
);

-- =====================================================================
-- 5) KANBAN BOARD (Lean / JIT — 1 บอร์ดต่อ 1 โครงการ)
-- =====================================================================

create table public.kanban_columns (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name       text not null,                         -- To Do / Doing / Review / Done
  position   int  not null default 0,
  wip_limit  int                                    -- JIT: จำกัดงานค้าง
);

create table public.kanban_cards (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  column_id      uuid not null references public.kanban_columns (id) on delete cascade,
  requirement_id uuid references public.project_requirements (id) on delete set null,
  title          text not null,
  assignee_id    uuid references public.profiles (id),
  priority       card_priority not null default 'medium',
  due_date       date,
  position       int not null default 0,
  created_at     timestamptz not null default now()
);

-- =====================================================================
-- 6) EVIDENCE & VALIDATION (Audit trail)
-- =====================================================================

create table public.documents (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  requirement_id uuid references public.project_requirements (id) on delete set null,
  file_url       text not null,                     -- Supabase Storage path
  doc_type       text,
  uploaded_by    uuid not null references public.profiles (id),
  created_at     timestamptz not null default now()
);

create table public.validations (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects (id) on delete cascade,
  requirement_id     uuid not null references public.project_requirements (id) on delete cascade,
  validated_by       uuid not null references public.profiles (id),
  result             compliance_state not null,
  standard_version   text,                          -- อ้างอิงเวอร์ชันมาตรฐานที่ตรวจ
  validated_at       timestamptz not null default now()
);

-- =====================================================================
-- 7) MARKETING / CONVERSION (Strategic Marketing สำหรับ SaaS)
-- =====================================================================

create table public.marketing_events (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references public.organizations (id) on delete set null,
  event_type   text not null,                       -- signup, activate, upgrade ...
  funnel_stage text,                                -- awareness / consideration / conversion
  metadata     jsonb,
  occurred_at  timestamptz not null default now()
);

-- =====================================================================
-- 8) INDEXES (ประสิทธิภาพ query)
-- =====================================================================
create index idx_org_members_user      on public.organization_members (user_id);
create index idx_projects_org          on public.projects (org_id);
create index idx_clauses_standard      on public.standard_clauses (standard_id);
create index idx_req_project           on public.project_requirements (project_id);
create index idx_cards_project_column  on public.kanban_cards (project_id, column_id, position);
create index idx_standards_priority    on public.standards (type, priority_rank desc);

-- =====================================================================
-- 9) ROW LEVEL SECURITY
--    Standards catalog = อ่านได้ทุกคนที่ login | ข้อมูลธุรกิจ = เฉพาะสมาชิก
-- =====================================================================
alter table public.profiles              enable row level security;
alter table public.organizations         enable row level security;
alter table public.organization_members  enable row level security;
alter table public.projects              enable row level security;
alter table public.project_requirements  enable row level security;
alter table public.kanban_columns        enable row level security;
alter table public.kanban_cards          enable row level security;
alter table public.documents             enable row level security;
alter table public.validations           enable row level security;
alter table public.standards             enable row level security;
alter table public.standard_clauses      enable row level security;

-- profiles: เจ้าของแก้ของตัวเองได้
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- standards catalog: ผู้ใช้ที่ login แล้วอ่านได้ทั้งหมด (เขียนได้เฉพาะ service_role)
create policy "read standards" on public.standards
  for select using (auth.role() = 'authenticated');
create policy "read clauses" on public.standard_clauses
  for select using (auth.role() = 'authenticated');

-- organizations: เห็นเฉพาะธุรกิจที่ตัวเองเป็นสมาชิก
create policy "member reads org" on public.organizations
  for select using (public.is_org_member(id));

-- organization_members: เห็นสมาชิกในธุรกิจของตัวเอง
create policy "member reads members" on public.organization_members
  for select using (public.is_org_member(org_id));

-- projects + ตารางลูก: จำกัดด้วย org membership
create policy "org member on projects" on public.projects
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create policy "org member on requirements" on public.project_requirements
  for all using (exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_org_member(p.org_id)))
  with check (exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_org_member(p.org_id)));

create policy "org member on columns" on public.kanban_columns
  for all using (exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_org_member(p.org_id)));

create policy "org member on cards" on public.kanban_cards
  for all using (exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_org_member(p.org_id)));

create policy "org member on documents" on public.documents
  for all using (exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_org_member(p.org_id)));

create policy "org member on validations" on public.validations
  for all using (exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_org_member(p.org_id)));

-- =====================================================================
-- จบ schema — รันไฟล์นี้ใน Supabase SQL Editor ได้ทันที
-- =====================================================================
