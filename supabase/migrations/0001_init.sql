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
create policy "own rows - select" on public.app_state
  for select using (auth.uid() = user_id);

drop policy if exists "own rows - insert" on public.app_state;
create policy "own rows - insert" on public.app_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "own rows - update" on public.app_state;
create policy "own rows - update" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows - delete" on public.app_state;
create policy "own rows - delete" on public.app_state
  for delete using (auth.uid() = user_id);

-- =====================================================
-- ส่วนขยายในอนาคต (ยังไม่บังคับใช้):
-- ถ้าต้องการแชร์เวิร์กสเปซแบบทีม/หลายบริษัท ให้เพิ่มตาราง
--   workspaces (id, name, owner)  และ  workspace_members (workspace_id, user_id, role)
-- แล้วเปลี่ยน RLS ของ app_state ให้อิงสมาชิกเวิร์กสเปซแทน user_id
-- =====================================================
