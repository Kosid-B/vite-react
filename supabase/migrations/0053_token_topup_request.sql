-- 0053_token_topup_request.sql — ให้คิว top-up เดิม (0038/0039) รองรับ "แพ็ก token" (นอกจากแพ็ก call)
-- ผู้สมัครซื้อ token เพิ่ม → แจ้งโอน → admin เปิดให้ (grant_ai_topup_tokens) · ราคา/จำนวน token = server-side
-- ปลอดภัย: ไม่แตะ SlipOK/verify-topup-slip · จำนวน token มาจาก pack_id ฝั่ง server (ไม่เชื่อ client)

-- token requests เก็บจำนวน token (credits = null); call requests เดิมยังใช้ credits เหมือนเดิม
alter table public.ai_topup_request add column if not exists tokens bigint;
alter table public.ai_topup_request alter column credits drop not null;
alter table public.ai_topup_request drop constraint if exists ai_topup_request_credits_check;
alter table public.ai_topup_request
  add constraint ai_topup_request_credits_check check (credits is null or credits > 0);

-- จำนวน token ต่อ pack (source of truth ตรงกับ TOKEN_PACKS ใน tokenEconomics.ts)
create or replace function public.topup_tokens_for_pack(p_pack text)
returns bigint language sql immutable as $$
  select case p_pack
    when 'tok_1m'  then 1000000
    when 'tok_3m'  then 3000000
    when 'tok_10m' then 10000000
    else 0
  end;
$$;

-- อนุมัติคำขอ token top-up (admin) → เปิด token + ปิดคำขอ · จำนวน token derive จาก pack_id ฝั่ง server
create or replace function public.approve_token_topup_request(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.ai_topup_request; v_tokens bigint; g jsonb;
begin
  if not public.is_app_admin() then raise exception 'not_authorized'; end if;
  select * into r from public.ai_topup_request where id = p_id for update;
  if r.id is null then raise exception 'request_not_found'; end if;
  if r.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'not_pending', 'status', r.status);
  end if;
  v_tokens := public.topup_tokens_for_pack(r.pack_id);   -- ไม่เชื่อ client — อ่านจาก pack_id
  if v_tokens <= 0 then raise exception 'not_token_pack'; end if;
  g := public.grant_ai_topup_tokens(r.workspace_id, v_tokens);
  update public.ai_topup_request set status = 'approved', decided_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'granted', g);
end; $$;

grant execute on function public.topup_tokens_for_pack(text)       to authenticated;
grant execute on function public.approve_token_topup_request(uuid) to authenticated;
