-- 0052_ai_token_quota.sql — โมเดลโควตา AI แบบ "token" (คุมต้นทุน/มาร์จินให้แม่นตรงบิลผู้ให้บริการ)
--
-- ทำไม: ระบบเดิมนับ "จำนวน call" (0035/0036) — 1 call กินได้ 1.1k–2.5k tokens → ต้นทุนเหวี่ยง
--   เปลี่ยนมานับ token จริง (input+output) ทำให้บังคับ "กำไร ≥ 30% ของรายได้" ได้จริง
-- เพดาน/ราคา = source of truth ที่ src/lib/tokenEconomics.ts (margin ≥30% ทุกแพ็ก/ท็อปอัป)
--
-- ship dark: บังคับใช้เมื่อ secret ENFORCE_AI_TOKENS=true เท่านั้น (คู่ขนาน ENFORCE_AI_QUOTA เดิม)
--   ระบบ call-based เดิมยังอยู่ครบ ไม่ถูกแตะ — สลับมาใช้ token เมื่อพร้อม (ตั้ง flag + redeploy)
--
-- ขอบเขต: RPC เหล่านี้บังคับใช้กับ "ผู้ใช้ที่ล็อกอิน" (edge function verify_jwt=true) แบบ "รายเดือน"
--   ส่วน guest daily-free token = จัดการใน Cloudflare DO (CeoAiAgent) แยกต่างหาก (ต่อ IP/วัน)

-- ── คอลัมน์ token สะสม (คู่ขนานตัวนับ call เดิม ไม่ทับ) ──
alter table public.ai_usage add column if not exists tokens bigint not null default 0;
alter table public.ai_topup add column if not exists tokens bigint not null default 0;

-- ── เพดาน token/เดือน ต่อแพ็ก (ตรงกับ PLAN_MONTHLY_TOKENS ใน tokenEconomics.ts) ──
create or replace function public.ai_token_quota_for(p_plan text)
returns bigint language sql immutable as $$
  select case p_plan
    when 'scale'   then 12000000
    when 'growth'  then 3000000
    when 'starter' then 1500000
    else 400000                    -- free/trial (≈ TRIAL_TOKENS 15 วัน)
  end;
$$;

-- ── token top-up เดือนนี้ของ workspace ──
create or replace function public.ai_topup_tokens(p_ws uuid)
returns bigint language sql stable set search_path = public as $$
  select coalesce((select tokens from public.ai_topup
    where workspace_id = p_ws and month = to_char(now() at time zone 'utc', 'YYYY-MM')), 0);
$$;

-- ── ตรวจก่อนเรียก Claude: allowed=false ถ้า token ที่ใช้ไปแล้ว >= เพดาน(+topup) ──
create or replace function public.check_ai_tokens(p_client_id text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ws uuid; v_plan text := 'free'; v_quota bigint; v_bucket text; v_used bigint := 0;
  v_month text := to_char(now() at time zone 'utc', 'YYYY-MM');
begin
  if v_uid is null then
    -- guest ผ่าน edge (ปกติไม่ถึงเพราะ verify_jwt) — เพดานต่ำเชิงรับ (รายวัน)
    v_bucket := 'guest:' || left(coalesce(nullif(p_client_id, ''), 'anon'), 80);
    v_quota  := 20000;
    v_month  := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  else
    select w.id into v_ws from public.workspaces w
      join public.workspace_members m on m.workspace_id = w.id
      where m.user_id = v_uid order by w.created_at asc limit 1;
    if v_ws is null then
      v_bucket := 'user:' || v_uid::text;
      v_quota  := public.ai_token_quota_for('free');
    else
      v_bucket := 'ws:' || v_ws::text;
      select wp.plan into v_plan from public.workspace_plan wp where wp.workspace_id = v_ws;
      v_plan  := coalesce(v_plan, 'free');
      v_quota := public.ai_token_quota_for(v_plan) + public.ai_topup_tokens(v_ws);
    end if;
  end if;
  select tokens into v_used from public.ai_usage where bucket = v_bucket and month = v_month;
  v_used := coalesce(v_used, 0);
  return jsonb_build_object('allowed', v_used < v_quota, 'used', v_used, 'quota', v_quota, 'plan', v_plan);
end;
$$;

-- ── บันทึก token จริงหลังเรียก Claude (in+out) — atomic upsert ──
create or replace function public.record_ai_tokens(p_in int, p_out int, p_client_id text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ws uuid; v_bucket text; v_total bigint;
  v_month text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_add bigint := greatest(0, coalesce(p_in, 0)) + greatest(0, coalesce(p_out, 0));
begin
  if v_uid is null then
    v_bucket := 'guest:' || left(coalesce(nullif(p_client_id, ''), 'anon'), 80);
    v_month  := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  else
    select w.id into v_ws from public.workspaces w
      join public.workspace_members m on m.workspace_id = w.id
      where m.user_id = v_uid order by w.created_at asc limit 1;
    v_bucket := case when v_ws is null then 'user:' || v_uid::text else 'ws:' || v_ws::text end;
  end if;
  insert into public.ai_usage (bucket, month, tokens) values (v_bucket, v_month, v_add)
    on conflict (bucket, month) do update
      set tokens = public.ai_usage.tokens + v_add, updated_at = now()
    returning tokens into v_total;
  return jsonb_build_object('ok', true, 'tokens', v_total, 'added', v_add);
end;
$$;

-- ── อ่านสถานะ token (UI meter) ──
create or replace function public.get_ai_tokens()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ws uuid; v_plan text := 'free'; v_quota bigint; v_used bigint := 0; v_topup bigint := 0;
  v_month text := to_char(now() at time zone 'utc', 'YYYY-MM');
begin
  if v_uid is null then
    return jsonb_build_object('used', 0, 'quota', 20000, 'plan', 'guest', 'topup', 0);
  end if;
  select w.id into v_ws from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id
    where m.user_id = v_uid order by w.created_at asc limit 1;
  if v_ws is null then
    return jsonb_build_object('used', 0, 'quota', public.ai_token_quota_for('free'), 'plan', 'free', 'topup', 0);
  end if;
  select wp.plan into v_plan from public.workspace_plan wp where wp.workspace_id = v_ws;
  v_plan  := coalesce(v_plan, 'free');
  v_topup := public.ai_topup_tokens(v_ws);
  v_quota := public.ai_token_quota_for(v_plan) + v_topup;
  select tokens into v_used from public.ai_usage where bucket = 'ws:' || v_ws::text and month = v_month;
  return jsonb_build_object('used', coalesce(v_used, 0), 'quota', v_quota, 'plan', v_plan, 'topup', v_topup);
end;
$$;

-- ── grant token top-up (admin/service เท่านั้น — user/guest เรียกเองไม่ได้) ──
create or replace function public.grant_ai_topup_tokens(p_workspace uuid, p_tokens bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_role  text := coalesce((current_setting('request.jwt.claims', true))::jsonb ->> 'role', '');
  v_month text := to_char(now() at time zone 'utc', 'YYYY-MM'); v_total bigint;
begin
  if not (public.is_app_admin() or v_role = 'service_role') then raise exception 'not_authorized'; end if;
  if p_tokens is null or p_tokens <= 0 then raise exception 'invalid_tokens'; end if;
  insert into public.ai_topup (workspace_id, month, tokens) values (p_workspace, v_month, p_tokens)
    on conflict (workspace_id, month) do update
      set tokens = public.ai_topup.tokens + excluded.tokens, updated_at = now()
    returning tokens into v_total;
  return jsonb_build_object('ok', true, 'workspace_id', p_workspace, 'month', v_month, 'tokens_total', v_total, 'added', p_tokens);
end;
$$;

grant execute on function public.ai_token_quota_for(text)          to anon, authenticated;
grant execute on function public.ai_topup_tokens(uuid)             to authenticated;
grant execute on function public.check_ai_tokens(text)             to anon, authenticated;
grant execute on function public.record_ai_tokens(int, int, text)  to anon, authenticated;
grant execute on function public.get_ai_tokens()                   to anon, authenticated;
grant execute on function public.grant_ai_topup_tokens(uuid, bigint) to authenticated;
