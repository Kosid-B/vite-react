-- 0043_referrals — Safe Promo ชั้นที่ 2: ชวนเพื่อน → ทั้งคู่ได้เครดิต AI (คนละ 200 calls/เดือนที่สมัคร)
-- "ไม่เจ็บตัว": รางวัลให้ก็ต่อเมื่อ referee เป็นแพ็กจ่ายเงินจริง (มีรายได้เข้า) · ครั้งเดียวต่อ referee · ห้าม self
-- referee = workspace ของผู้เรียก (auth.uid) — client spoof ไม่ได้ · reuse ai_topup เป็นช่องให้เครดิต
--
-- Apply: supabase db push (หรือ MCP apply_migration บน project prod waigsnxhrlwtiotspaim)

create table if not exists public.referrals (
  referee_ws  uuid primary key references public.workspaces(id) on delete cascade,
  referrer_ws uuid not null references public.workspaces(id) on delete cascade,
  rewarded_at timestamptz not null default now()
);
alter table public.referrals enable row level security;
-- ไม่มี policy = เข้าผ่าน rpc (security definer) เท่านั้น

create or replace function public.claim_referral(p_referrer uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_referee uuid;
  v_plan    text;
  v_reward  int  := 200;
  v_month   text := to_char(now() at time zone 'utc', 'YYYY-MM');
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'unauth'); end if;

  -- referee = workspace ของผู้เรียก
  select w.id into v_referee
    from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id
    where m.user_id = v_uid order by w.created_at asc limit 1;
  if v_referee is null then return jsonb_build_object('ok', false, 'reason', 'no_ws'); end if;
  if p_referrer = v_referee then return jsonb_build_object('ok', false, 'reason', 'self'); end if;

  if not exists (select 1 from public.workspaces where id = p_referrer) then
    return jsonb_build_object('ok', false, 'reason', 'bad_referrer');
  end if;

  -- referee ต้องเป็นลูกค้าจ่ายเงินจริง (กัน farm เครดิตด้วยบัญชีฟรี)
  select plan into v_plan from public.workspace_plan where workspace_id = v_referee;
  if coalesce(v_plan, 'free') not in ('starter', 'growth', 'scale') then
    return jsonb_build_object('ok', false, 'reason', 'needs_paid');
  end if;

  -- ครั้งเดียวต่อ referee (idempotent)
  insert into public.referrals (referee_ws, referrer_ws) values (v_referee, p_referrer)
    on conflict (referee_ws) do nothing;
  if not found then return jsonb_build_object('ok', false, 'reason', 'already'); end if;

  -- ให้เครดิตทั้งคู่ (เดือนนี้) — reuse ai_topup
  insert into public.ai_topup (workspace_id, month, credits) values (p_referrer, v_month, v_reward)
    on conflict (workspace_id, month) do update
      set credits = public.ai_topup.credits + excluded.credits, updated_at = now();
  insert into public.ai_topup (workspace_id, month, credits) values (v_referee, v_month, v_reward)
    on conflict (workspace_id, month) do update
      set credits = public.ai_topup.credits + excluded.credits, updated_at = now();

  return jsonb_build_object('ok', true, 'reward', v_reward);
end;
$$;

grant execute on function public.claim_referral(uuid) to authenticated;
