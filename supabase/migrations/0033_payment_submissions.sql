-- =====================================================
-- CEO AI Thailand — อัปสลิปในแอป + คิวแอดมินยืนยัน (แทนการส่งสลิปทาง LINE/อีเมล)
-- ผู้ใช้อัปสลิปการโอน/PromptPay → แถว payment_submissions (pending) → แอดมินตรวจ+อนุมัติ
-- อนุมัติแล้ว client ของผู้ใช้เอง (เจ้าของ workspace) เปิดใช้งานแพ็กให้ (ไม่มีการเขียนข้าม workspace)
-- =====================================================

-- ── Storage bucket (private) สำหรับสลิป — มีข้อมูลการเงิน จึงไม่เปิด public ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-slips', 'payment-slips', false, 5242880,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- อัปโหลด: สมาชิก workspace อัปเข้า path ของ workspace ตัวเอง (prefix = <workspace_id>/...)
drop policy if exists "slip upload" on storage.objects;
create policy "slip upload" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'payment-slips'
    and public.is_member((storage.foldername(name))[1]::uuid)
  );

-- อ่าน: เจ้าของ workspace อ่านของตัวเอง · แอดมินอ่านได้หมด (ยืนยันสลิป)
drop policy if exists "slip read" on storage.objects;
create policy "slip read" on storage.objects for select
  to authenticated
  using (
    bucket_id = 'payment-slips'
    and (public.is_member((storage.foldername(name))[1]::uuid) or public.is_app_admin())
  );

-- ── ตาราง payment_submissions ──
create table if not exists public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan text not null check (plan in ('starter','growth','scale')),
  cycle text not null default 'monthly' check (cycle in ('monthly','yearly')),
  amount numeric not null check (amount >= 0),
  slip_path text not null default '',            -- path ในบัคเก็ต payment-slips (อ่านผ่าน signed url)
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  note text not null default '',                 -- หมายเหตุจากแอดมิน (เช่น เหตุผลปฏิเสธ)
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create index if not exists ps_ws_idx on public.payment_submissions (workspace_id);
create index if not exists ps_status_idx on public.payment_submissions (status) where status = 'pending';

alter table public.payment_submissions enable row level security;

-- สมาชิก workspace: สร้างคำขอ + อ่านของตัวเอง (ไม่แก้สถานะเอง)
drop policy if exists ps_member_insert on public.payment_submissions;
create policy ps_member_insert on public.payment_submissions for insert
  to authenticated
  with check (public.is_member(workspace_id) and status = 'pending');

drop policy if exists ps_member_select on public.payment_submissions;
create policy ps_member_select on public.payment_submissions for select
  to authenticated
  using (public.is_member(workspace_id) or public.is_app_admin());

-- แอดมินเท่านั้น: อนุมัติ/ปฏิเสธ (แก้ status/note)
drop policy if exists ps_admin_update on public.payment_submissions;
create policy ps_admin_update on public.payment_submissions for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());
