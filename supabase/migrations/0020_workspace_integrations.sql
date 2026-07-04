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
create policy wi_select on public.workspace_integrations
  for select using (public.is_member(workspace_id));
create policy wi_insert on public.workspace_integrations
  for insert with check (public.is_member(workspace_id));
create policy wi_update on public.workspace_integrations
  for update using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy wi_delete on public.workspace_integrations
  for delete using (public.is_member(workspace_id));
