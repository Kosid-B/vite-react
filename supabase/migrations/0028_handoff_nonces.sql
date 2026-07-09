-- 0028_handoff_nonces.sql
-- ---------------------------------------------------------------------------
-- Replay protection สำหรับ Context Handoff (theossphere → CEO AI)
-- token มี exp ≤10 นาที + consent อยู่แล้ว แต่ภายใน window นั้น token เดิม replay ซ้ำได้
-- (CAPA จาก docs/integrations/theossphere-handoff.md) — ปิดช่องด้วยการจด nonce ที่ใช้แล้ว
--
-- เขียนโดย edge function `handoff-import` (service_role) เท่านั้น · anon/authenticated ล็อกออก
-- apply ตอน go-live: supabase db push / apply migration ก่อน flip INTEGRATIONS.theossphereLive
-- ---------------------------------------------------------------------------

create table if not exists public.handoff_nonces (
  nonce      text primary key,
  source     text not null default 'theossphere',
  exp_at     timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists handoff_nonces_exp_idx on public.handoff_nonces (exp_at);

alter table public.handoff_nonces enable row level security;
-- ไม่มี policy → anon/authenticated เข้าไม่ได้เลย · edge ใช้ service_role (bypass RLS)
revoke all on public.handoff_nonces from anon, authenticated;

comment on table public.handoff_nonces is
  'Replay guard สำหรับ theossphere Context Handoff — 1 แถวต่อ nonce ที่ถูกใช้ จนกว่าจะหมดอายุ (เขียนโดย handoff-import service role)';

-- จอง nonce แบบ atomic: คืน true = ใช้ครั้งแรก (จองสำเร็จ), false = เคยใช้แล้ว (replay)
-- purge แถวหมดอายุก่อน (hygiene ราคาถูก — window 10 นาที ทำให้ตารางเล็กเสมอ)
create or replace function public.consume_handoff_nonce(p_nonce text, p_exp timestamptz)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  delete from public.handoff_nonces where exp_at < now();
  insert into public.handoff_nonces (nonce, exp_at)
  values (p_nonce, p_exp)
  on conflict (nonce) do nothing;
  get diagnostics n = row_count;
  return n > 0;
end
$$;

-- defense in depth: ฟังก์ชัน default grant EXECUTE ให้ PUBLIC → ล็อกออก เปิดเฉพาะ service_role
revoke all on function public.consume_handoff_nonce(text, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_handoff_nonce(text, timestamptz) to service_role;
