-- 0066 — รวม DB ของ Marketing OS เข้ามาอยู่ project เดียวกับ CEO (เจ้าของสั่ง 22 พ.ย. 2569)
--
-- ⚠️ ไฟล์นี้เป็น **บันทึกของสิ่งที่ apply ไปแล้ว** บน production `waigsnxhrlwtiotspaim`
--    (apply ผ่าน MCP เมื่อ 22 พ.ย. 2569 · Supabase บันทึกชื่อไว้ว่า `0059_marketing_os_consolidation_schema`)
--    เลขไฟล์ในรีโปเดินตามลำดับของรีโป (ล่าสุดคือ 0065) ⇒ **เลขสองฝั่งไม่ตรงกันโดยเจตนา**
--    เหตุผลที่ต้องมีไฟล์: production ถูกเปลี่ยน schema มาแล้วหลายครั้งโดยไม่มีร่องรอยในรีโป
--    ⇒ ครั้งนี้ต้องมีร่องรอย ไม่งั้นรอบหน้าไม่มีใครรู้ว่าตารางพวกนี้มาจากไหน
--
-- 🔴 ทำไมเป็น schema แยก ไม่ใช่ `public`: 4 ตารางชื่อซ้ำกับของเราแต่ข้อมูลไม่เท่ากัน
--    (brands 1/1 · audience_segments 6/5 · message_pillars 7/7 · brand_rules 7/10)
--    ⇒ ยัดลง `public` = ต้องเลือกว่าข้อมูลฝั่งไหนตาย · schema แยก = ไม่มีใครตาย
--    และตรงกับผังที่เจ้าของให้มา (Core Schema / Marketing Schema แยกชั้นกัน)
-- ⚠️ ชื่อตารางคงเดิมทุกตัว ⇒ แอป OS เปลี่ยนแค่ schema ที่เรียก ไม่ต้องแก้ 11 ที่
-- ⚠️ ไม่มี FK ไป auth.users: ผู้ใช้ของเขาไม่มีใน auth ของเรา (การรวม identity = ขั้นถัดไป)
-- 🔒 RLS เปิดแต่ไม่มี policy + revoke anon/authenticated = ปิดสนิท (fail-closed)
create schema if not exists marketing_os;
comment on schema marketing_os is
  'Marketing OS (เดิมอยู่ project bjozpwdtqbpwcxnqguka) ย้ายเข้ามา 22 พ.ย. 2569 — ดู ADR-0011';

create table if not exists marketing_os.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'บริษัทของฉัน',
  owner_id uuid not null,
  created_at timestamptz not null default now(),
  slug text not null,
  constraint workspaces_slug_format_check check (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$')
);

create table if not exists marketing_os.workspace_members (
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'viewer'
    check (role = any (array['owner','admin','editor','reviewer','viewer'])),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists marketing_os.workspace_state (
  workspace_id uuid primary key references marketing_os.workspaces(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists marketing_os.marketing_brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  name text not null,
  website_url text,
  description text,
  positioning text,
  voice jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create table if not exists marketing_os.marketing_brand_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  brand_id uuid not null,
  rule_type text not null,
  severity text not null default 'warning'
    check (severity = any (array['info','warning','blocking'])),
  pattern text,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (brand_id, workspace_id)
    references marketing_os.marketing_brands(id, workspace_id) on delete cascade
);

create table if not exists marketing_os.marketing_message_pillars (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  brand_id uuid not null,
  code text not null,
  name text not null,
  problem text,
  promise text,
  proof text,
  priority integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (brand_id, code),
  foreign key (brand_id, workspace_id)
    references marketing_os.marketing_brands(id, workspace_id) on delete cascade
);

create table if not exists marketing_os.marketing_audience_segments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  brand_id uuid not null,
  code text not null,
  name text not null,
  description text,
  jobs_to_be_done jsonb not null default '[]'::jsonb,
  pains jsonb not null default '[]'::jsonb,
  anxieties jsonb not null default '[]'::jsonb,
  desired_outcomes jsonb not null default '[]'::jsonb,
  buying_triggers jsonb not null default '[]'::jsonb,
  objections jsonb not null default '[]'::jsonb,
  search_intents jsonb not null default '[]'::jsonb,
  evidence_status text not null default 'hypothesis'
    check (evidence_status = any (array['hypothesis','research','observed','validated'])),
  evidence jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  unique (brand_id, code),
  foreign key (brand_id, workspace_id)
    references marketing_os.marketing_brands(id, workspace_id) on delete cascade
);

create table if not exists marketing_os.marketing_behavior_batches (
  id uuid primary key,
  workspace_id uuid not null references marketing_os.workspaces(id),
  payload_hash text not null,
  payload jsonb not null,
  archive_path text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists marketing_os.marketing_behavior_events (
  id uuid primary key,
  workspace_id uuid not null references marketing_os.workspaces(id),
  batch_id uuid not null references marketing_os.marketing_behavior_batches(id) on delete cascade,
  session_id uuid not null,
  occurred_at timestamptz not null,
  source text not null check (source = any (array['website','saas'])),
  name text not null check (name = any (array['view','engaged','action'])),
  -- 🔴 7 ค่า (ขยายจาก 4 เมื่อ 20 พ.ย. 2569) — ถ้าเหลือ 4 แถวที่เป็น money จะถูกปฏิเสธ
  topic text not null check (topic = any (array[
    'business_validation','first_customer','content_marketing','business_systems',
    'start','side_income','money'])),
  format text not null check (format = any (array['article','short_video','checklist','interactive'])),
  mode text not null check (mode = any (array['live','test']))
);

create table if not exists marketing_os.marketing_behavior_limits (
  key text primary key,
  count integer not null,
  expires_at timestamptz not null
);

create table if not exists marketing_os.marketing_behavior_config (
  key text primary key,
  value text not null
);

do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'marketing_os'
  loop
    execute format('alter table marketing_os.%I enable row level security', t);
    execute format('revoke all on marketing_os.%I from anon, authenticated', t);
  end loop;
end $$;

revoke all on schema marketing_os from anon, authenticated;
