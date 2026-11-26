-- 0071 — 9 ตารางที่เหลือของแอป Marketing OS ใน schema marketing_os (ADR-0011 ข้อ ①)
--
-- 🔴 ปัญหาที่ migration นี้ปิด (ledger #107): 0066 คัดลอกตาราง **ที่มีข้อมูล** (11 ตัว)
--    ไม่ได้คัดลอกตาราง **ที่แอปใช้** ⇒ แอป OS query 17 ตาราง แต่ฐานเรามี 5
--    0070 เติมไป 3 (offers · ctas · action_items) · ไฟล์นี้เติม 9 ตัวสุดท้าย ⇒ ครบ 17
--
-- ที่มาของโครงสร้าง: 🟢 อ่านสด 26 พ.ย. 2569 จาก project เดิมของแอป OS (`bjozpwdtqbpwcxnqguka`)
--    ด้วย `pg_attribute` + `format_type` + `pg_get_constraintdef` + `pg_indexes`
--    **ไม่ได้เดาโครงสร้าง** (ADR-0011 §ทางเลือกที่ไม่เลือก ห้ามเดายกชุด)
--    ทั้ง 9 ตารางมี **0 แถว** ในฐานเขา ⇒ ย้ายเฉพาะโครงสร้าง ไม่มีข้อมูลให้เสีย
--
-- 🔴 สิ่งที่ตัดออกโดยเจตนา — FK ไป `auth.users` ทั้ง 7 เส้น
--    (`created_by` ×5 · `requested_by` · `reviewed_by` · `resolved_by`)
--    ผู้ใช้ของเขา 11 คนมีตัวตนใน `auth.users` ของเรา **0 คน** (ADR-0013)
--    ⇒ คงชนิด uuid และ NOT NULL ไว้ตามเดิม แต่ไม่ผูกกับตารางผู้ใช้ของเรา
--    ⚠️ ผลที่ตามมา: ฐานไม่การันตีว่า `created_by` ชี้ไปที่คนที่มีจริง — เป็นหนี้ที่รอการตัดสินเรื่อง identity
--
-- 🔒 สิทธิ์ทุกตาราง: RLS เปิด · **ไม่มี policy** · revoke `anon`/`authenticated` · grant เฉพาะ `service_role`
--    (ADR-0013 · `ownershipBoundary.test.ts` ห้าม grant ให้ browser role)
--
-- ลำดับสร้างเรียงตามการอ้างอิง ห้ามสลับ: campaigns → hypotheses → content_items
--    → content_versions → ai_jobs → content_assets → approval_requests
--    → compliance_findings → tracking_links

-- ① campaigns ------------------------------------------------------------
create table if not exists marketing_os.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  brand_id uuid not null,
  name text not null,
  objective text not null check (objective in ('awareness','interest','first_customer','sales')),
  audience_segment_id uuid,
  message_pillar_id uuid,
  offer_id uuid,
  cta_id uuid,
  status text not null default 'draft'
    check (status in ('draft','ready','active','paused','completed','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (brand_id, workspace_id)
    references marketing_os.marketing_brands(id, workspace_id),
  foreign key (audience_segment_id, workspace_id)
    references marketing_os.marketing_audience_segments(id, workspace_id),
  foreign key (message_pillar_id, workspace_id)
    references marketing_os.marketing_message_pillars(id, workspace_id),
  foreign key (offer_id, workspace_id)
    references marketing_os.marketing_offers(id, workspace_id),
  foreign key (cta_id, workspace_id)
    references marketing_os.marketing_ctas(id, workspace_id)
);
create index if not exists marketing_campaigns_ws_status_idx
  on marketing_os.marketing_campaigns (workspace_id, status);

-- ② campaign hypotheses --------------------------------------------------
create table if not exists marketing_os.marketing_campaign_hypotheses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  campaign_id uuid not null,
  hypothesis text not null,
  expected_signal text,
  decision_rule text,
  evidence_status text not null default 'hypothesis'
    check (evidence_status in ('hypothesis','research','observed','validated')),
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (campaign_id, workspace_id)
    references marketing_os.marketing_campaigns(id, workspace_id) on delete cascade
);

-- ③ content items --------------------------------------------------------
create table if not exists marketing_os.marketing_content_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  brand_id uuid not null,
  campaign_id uuid,
  audience_segment_id uuid,
  message_pillar_id uuid,
  offer_id uuid,
  cta_id uuid,
  title text not null,
  content_type text not null check (content_type in
    ('short_video','long_video','image','carousel','post','article','email','ad')),
  funnel_stage text check (funnel_stage is null or funnel_stage in
    ('awareness','consideration','intent','conversion','retention')),
  primary_channel text,
  status text not null default 'draft'
    check (status in ('draft','generated','in_review','approved','ready','archived')),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (brand_id, workspace_id)
    references marketing_os.marketing_brands(id, workspace_id),
  foreign key (campaign_id, workspace_id)
    references marketing_os.marketing_campaigns(id, workspace_id) on delete set null,
  foreign key (audience_segment_id, workspace_id)
    references marketing_os.marketing_audience_segments(id, workspace_id) on delete set null,
  foreign key (message_pillar_id, workspace_id)
    references marketing_os.marketing_message_pillars(id, workspace_id) on delete set null,
  foreign key (offer_id, workspace_id)
    references marketing_os.marketing_offers(id, workspace_id) on delete set null,
  foreign key (cta_id, workspace_id)
    references marketing_os.marketing_ctas(id, workspace_id) on delete set null
);
create index if not exists marketing_content_ws_status_idx
  on marketing_os.marketing_content_items (workspace_id, status);

-- ④ content versions -----------------------------------------------------
create table if not exists marketing_os.marketing_content_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  content_item_id uuid not null,
  version_number integer not null check (version_number > 0),
  hook text,
  body text,
  caption text,
  script jsonb,
  creative_brief jsonb,
  prompt_version text,
  model_provider text,
  model_name text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (content_item_id, version_number),
  unique (id, workspace_id),
  foreign key (content_item_id, workspace_id)
    references marketing_os.marketing_content_items(id, workspace_id) on delete cascade
);

-- ⑤ ai jobs --------------------------------------------------------------
create table if not exists marketing_os.marketing_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  content_item_id uuid,
  job_type text not null check (job_type in ('text.generate','image.generate','compliance.check')),
  provider text not null,
  model_name text,
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','failed','cancelled')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  idempotency_key text not null,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  error_code text,
  error_message text,
  created_by uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (id, workspace_id),
  unique (workspace_id, idempotency_key),
  foreign key (content_item_id, workspace_id)
    references marketing_os.marketing_content_items(id, workspace_id) on delete cascade
);
create index if not exists marketing_ai_jobs_ws_status_idx
  on marketing_os.marketing_ai_jobs (workspace_id, status);

-- ⑥ content assets -------------------------------------------------------
create table if not exists marketing_os.marketing_content_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  content_item_id uuid not null,
  content_version_id uuid,
  generation_job_id uuid,
  asset_type text not null check (asset_type in
    ('image','thumbnail','carousel','video','audio','subtitle','document')),
  storage_bucket text not null default 'marketing-assets'::text,
  storage_path text not null,
  mime_type text,
  width integer,
  height integer,
  duration_ms integer,
  provider text,
  provider_asset_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, workspace_id),
  foreign key (content_item_id, workspace_id)
    references marketing_os.marketing_content_items(id, workspace_id) on delete cascade,
  foreign key (content_version_id, workspace_id)
    references marketing_os.marketing_content_versions(id, workspace_id) on delete set null,
  foreign key (generation_job_id, workspace_id)
    references marketing_os.marketing_ai_jobs(id, workspace_id) on delete set null
);

-- ⑦ approval requests ----------------------------------------------------
create table if not exists marketing_os.marketing_approval_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  content_item_id uuid not null,
  content_version_id uuid,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','changes_requested')),
  requested_by uuid not null,
  reviewed_by uuid,
  review_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (id, workspace_id),
  foreign key (content_item_id, workspace_id)
    references marketing_os.marketing_content_items(id, workspace_id) on delete cascade,
  foreign key (content_version_id, workspace_id)
    references marketing_os.marketing_content_versions(id, workspace_id) on delete set null
);
-- หนึ่งคำขออนุมัติต่อ "เวอร์ชันที่ระบุชัด" หนึ่งเวอร์ชัน (คำขอที่ไม่ระบุเวอร์ชันไม่ถูกจำกัด)
create unique index if not exists marketing_approval_requests_exact_version_unique
  on marketing_os.marketing_approval_requests (workspace_id, content_item_id, content_version_id)
  where content_version_id is not null;

-- ⑧ compliance findings --------------------------------------------------
create table if not exists marketing_os.marketing_compliance_findings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  content_item_id uuid not null,
  brand_rule_id uuid,
  severity text not null check (severity in ('info','warning','blocking')),
  finding text not null,
  suggested_fix text,
  resolved boolean not null default false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  content_version_id uuid,
  unique (id, workspace_id),
  foreign key (content_item_id, workspace_id)
    references marketing_os.marketing_content_items(id, workspace_id) on delete cascade,
  foreign key (brand_rule_id, workspace_id)
    references marketing_os.marketing_brand_rules(id, workspace_id) on delete set null,
  foreign key (content_version_id, workspace_id)
    references marketing_os.marketing_content_versions(id, workspace_id) on delete cascade
);

-- ⑨ tracking links -------------------------------------------------------
create table if not exists marketing_os.marketing_tracking_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references marketing_os.workspaces(id) on delete cascade,
  campaign_id uuid,
  content_item_id uuid,
  destination_url text not null,
  short_code text,
  utm_source text not null,
  utm_medium text not null,
  utm_campaign text not null,
  utm_content text,
  utm_term text,
  segment_code text not null,
  final_url text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  content_version_id uuid,
  audience_segment_id uuid,
  message_pillar_id uuid,
  offer_id uuid,
  cta_id uuid,
  unique (id, workspace_id),
  foreign key (campaign_id, workspace_id)
    references marketing_os.marketing_campaigns(id, workspace_id) on delete cascade,
  foreign key (content_item_id, workspace_id)
    references marketing_os.marketing_content_items(id, workspace_id) on delete cascade,
  foreign key (content_version_id, workspace_id)
    references marketing_os.marketing_content_versions(id, workspace_id) on delete cascade,
  foreign key (audience_segment_id, workspace_id)
    references marketing_os.marketing_audience_segments(id, workspace_id) on delete restrict,
  foreign key (message_pillar_id, workspace_id)
    references marketing_os.marketing_message_pillars(id, workspace_id) on delete restrict,
  foreign key (offer_id, workspace_id)
    references marketing_os.marketing_offers(id, workspace_id) on delete restrict,
  foreign key (cta_id, workspace_id)
    references marketing_os.marketing_ctas(id, workspace_id) on delete restrict
);
create unique index if not exists marketing_tracking_links_version_lineage_unique
  on marketing_os.marketing_tracking_links (workspace_id, content_item_id, content_version_id);

-- สิทธิ์ -----------------------------------------------------------------
alter table marketing_os.marketing_campaigns            enable row level security;
alter table marketing_os.marketing_campaign_hypotheses  enable row level security;
alter table marketing_os.marketing_content_items        enable row level security;
alter table marketing_os.marketing_content_versions     enable row level security;
alter table marketing_os.marketing_ai_jobs              enable row level security;
alter table marketing_os.marketing_content_assets       enable row level security;
alter table marketing_os.marketing_approval_requests    enable row level security;
alter table marketing_os.marketing_compliance_findings  enable row level security;
alter table marketing_os.marketing_tracking_links       enable row level security;

revoke all on
  marketing_os.marketing_campaigns, marketing_os.marketing_campaign_hypotheses,
  marketing_os.marketing_content_items, marketing_os.marketing_content_versions,
  marketing_os.marketing_ai_jobs, marketing_os.marketing_content_assets,
  marketing_os.marketing_approval_requests, marketing_os.marketing_compliance_findings,
  marketing_os.marketing_tracking_links
  from anon, authenticated;

grant select, insert, update, delete on
  marketing_os.marketing_campaigns, marketing_os.marketing_campaign_hypotheses,
  marketing_os.marketing_content_items, marketing_os.marketing_content_versions,
  marketing_os.marketing_ai_jobs, marketing_os.marketing_content_assets,
  marketing_os.marketing_approval_requests, marketing_os.marketing_compliance_findings,
  marketing_os.marketing_tracking_links
  to service_role;
