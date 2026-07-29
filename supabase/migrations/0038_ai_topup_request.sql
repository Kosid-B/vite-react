-- 0038_ai_topup_request.sql — คิวคำขอ top-up ในแอป
-- user แจ้งโอน → admin กดเปิด credits ทีเดียว (เร็ว + ตรวจย้อนได้)
-- ปลอดภัย: ไม่แตะ SlipOK/verify-slip · เปิด credits ผ่าน grant_ai_topup (admin-gated) เท่านั้น
-- ⚠️ apply บน prod แล้วผ่าน MCP (version 20260728103708) — ไฟล์นี้บันทึกประวัติให้ repo ตรงกับ DB
create table if not exists public.ai_topup_request (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  pack_id      text not null,
  credits      int  not null check (credits > 0),
  price        int  not null check (price >= 0),
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  note         text,
  created_at   timestamptz not null default now(),
  decided_at   timestamptz
);
create index if not exists tur_pending_idx on public.ai_topup_request (status) where status = 'pending';
alter table public.ai_topup_request enable row level security;

-- member: สร้างคำขอของ workspace ตัวเอง (pending เท่านั้น) + ดูของตัวเอง
drop policy if exists tur_member_insert on public.ai_topup_request;
create policy tur_member_insert on public.ai_topup_request for insert
  with check (public.is_member(workspace_id) and status = 'pending');
drop policy if exists tur_member_select on public.ai_topup_request;
create policy tur_member_select on public.ai_topup_request for select
  using (public.is_member(workspace_id) or public.is_app_admin());
-- admin: อัปเดตสถานะ (ผ่าน RPC เป็นหลัก แต่เผื่อ reject ตรง ๆ)
drop policy if exists tur_admin_update on public.ai_topup_request;
create policy tur_admin_update on public.ai_topup_request for update
  using (public.is_app_admin()) with check (public.is_app_admin());

-- อนุมัติคำขอ (admin) → เปิด credits + ปิดคำขอ แบบ atomic
-- หมายเหตุ: นิยามนี้ถูก harden ต่อใน 0039 (ใช้ credits จาก pack_id ฝั่ง server)
create or replace function public.approve_topup_request(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.ai_topup_request; g jsonb;
begin
  if not public.is_app_admin() then raise exception 'not_authorized'; end if;
  select * into r from public.ai_topup_request where id = p_id for update;
  if r.id is null then raise exception 'request_not_found'; end if;
  if r.status <> 'pending' then return jsonb_build_object('ok', false, 'reason', 'not_pending', 'status', r.status); end if;
  g := public.grant_ai_topup(r.workspace_id, r.credits);
  update public.ai_topup_request set status = 'approved', decided_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'granted', g);
end; $$;

grant execute on function public.approve_topup_request(uuid) to authenticated;
