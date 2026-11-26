-- 0070 — ตารางชุดหน้าแรกของแอป Marketing OS ใน schema marketing_os
--
-- 🔴 ไฟล์นี้เป็น "บันทึกย้อนหลัง" ไม่ใช่ของใหม่
--    SQL ก้อนนี้ถูก apply ลง production `waigsnxhrlwtiotspaim` แล้วเมื่อ
--    **26 พ.ย. 2569 08:14:17 UTC** โดยเซสชัน Claude Code ที่รันบนเครื่องเจ้าของ
--    (version `20261126081417` ใน `supabase_migrations.schema_migrations`)
--    แต่ไฟล์ไม่ได้ถูกเขียนลงรีโป ⇒ production เหลื่อมกับรีโปทันที
--    ⇒ ไฟล์นี้คัดลอก statement จริงจาก production มา **โดยไม่แก้แม้ตัวอักษรเดียว**
--      เพื่อให้ `supabase db diff` และคนรุ่นถัดไปเห็นของเดียวกัน (ledger #108)
--
-- ที่มาของโครงสร้าง: อ่านจาก project เดิมของแอป OS (`bjozpwdtqbpwcxnqguka`) ซึ่งเป็นแหล่งจริง
-- 🔴 FK ไป `auth.users` ถูกตัดออกโดยเจตนา — ผู้ใช้ของเขา 11 คนไม่มีตัวตนใน `auth.users` ของเรา
--    (ADR-0011 · ADR-0013) ⇒ คอลัมน์ยังเป็น uuid แต่ไม่ผูกกับตารางผู้ใช้ของเรา
-- 🔒 สิทธิ์: RLS เปิด · ไม่มี policy · revoke `anon`/`authenticated` · grant เฉพาะ `service_role` (ADR-0013)

create table if not exists marketing_os.marketing_offers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  brand_id uuid not null,
  code text not null,
  name text not null,
  description text,
  offer_type text,
  destination_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (brand_id, code),
  unique (id, workspace_id),
  foreign key (brand_id, workspace_id)
    references marketing_os.marketing_brands(id, workspace_id) on delete cascade
);

create table if not exists marketing_os.marketing_ctas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  brand_id uuid not null,
  code text not null,
  label text not null,
  action_type text not null,
  destination_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (brand_id, code),
  unique (id, workspace_id),
  foreign key (brand_id, workspace_id)
    references marketing_os.marketing_brands(id, workspace_id) on delete cascade
);

create table if not exists marketing_os.marketing_action_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  action_type text not null,
  title text not null,
  description text,
  priority integer not null default 0,
  entity_type text,
  entity_id uuid,
  action_href text,
  status text not null default 'open' check (status in ('open','done','dismissed')),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, workspace_id)
);

create index if not exists marketing_action_items_open_idx
  on marketing_os.marketing_action_items (workspace_id, priority desc) where status = 'open';

alter table marketing_os.marketing_offers enable row level security;
alter table marketing_os.marketing_ctas enable row level security;
alter table marketing_os.marketing_action_items enable row level security;

revoke all on marketing_os.marketing_offers, marketing_os.marketing_ctas, marketing_os.marketing_action_items
  from anon, authenticated;

grant select, insert, update, delete
  on marketing_os.marketing_offers, marketing_os.marketing_ctas, marketing_os.marketing_action_items
  to service_role;
