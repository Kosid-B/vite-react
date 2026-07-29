-- 0039_topup_slip_verify.sql — auto-verify top-up ผ่าน SlipOK
-- เพิ่มฟิลด์สลิป + ราคา/credits อ้างอิงฝั่ง server (กัน client ยัด credits/price ปลอม)
-- ⚠️ apply บน prod แล้วผ่าน MCP (version 20260728110418) — ไฟล์นี้บันทึกประวัติให้ repo ตรงกับ DB
alter table public.ai_topup_request add column if not exists slip_path     text;
alter table public.ai_topup_request add column if not exists trans_ref     text;
alter table public.ai_topup_request add column if not exists verified_at   timestamptz;
alter table public.ai_topup_request add column if not exists verify_method text;
create unique index if not exists tur_trans_ref_uidx on public.ai_topup_request (trans_ref) where trans_ref is not null;

-- ค่าจริงของแพ็ก (server-side · ตรงกับ src/lib/topup.ts) — กัน client ยัด credits/price ปลอม
create or replace function public.topup_pack_credits(p_pack text)
returns int language sql immutable as $$
  select case p_pack when 'topup_500' then 500 when 'topup_1000' then 1000 when 'topup_3000' then 3000 else 0 end;
$$;
create or replace function public.topup_pack_price(p_pack text)
returns int language sql immutable as $$
  select case p_pack when 'topup_500' then 490 when 'topup_1000' then 990 when 'topup_3000' then 2900 else 0 end;
$$;

-- harden: approve_topup_request ใช้ credits จาก pack_id (server) ไม่เชื่อค่าที่ member ยัดมา
create or replace function public.approve_topup_request(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.ai_topup_request; v_credits int; g jsonb;
begin
  if not public.is_app_admin() then raise exception 'not_authorized'; end if;
  select * into r from public.ai_topup_request where id = p_id for update;
  if r.id is null then raise exception 'request_not_found'; end if;
  if r.status <> 'pending' then return jsonb_build_object('ok', false, 'reason', 'not_pending', 'status', r.status); end if;
  v_credits := public.topup_pack_credits(r.pack_id);
  if v_credits <= 0 then raise exception 'invalid_pack'; end if;
  g := public.grant_ai_topup(r.workspace_id, v_credits);
  update public.ai_topup_request set status = 'approved', decided_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'granted', g, 'credits', v_credits);
end; $$;

grant execute on function public.topup_pack_credits(text) to authenticated, anon;
grant execute on function public.topup_pack_price(text) to authenticated, anon;
