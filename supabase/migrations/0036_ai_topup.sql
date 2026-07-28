-- 0036_ai_topup.sql — Top-up packs: ซื้อ AI calls เพิ่มเมื่อเกินโควตาเดือน
-- เปลี่ยน "ต้นทุน whale ที่เกินโควตา" → รายได้ · credits เพิ่มเข้าโควตาเดือนนั้น (ไม่ทบเดือนถัดไป)
-- grant โดย admin (หลังยืนยันจ่ายเงิน) หรือ service_role (auto-grant ในอนาคต) — user/guest เรียกเองไม่ได้

create table if not exists public.ai_topup (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  month        text not null,               -- YYYY-MM (UTC) — credits ใช้ได้เฉพาะเดือนนั้น
  credits      int  not null default 0 check (credits >= 0),
  updated_at   timestamptz not null default now(),
  primary key (workspace_id, month)
);
alter table public.ai_topup enable row level security;
-- สมาชิกดู credit ตัวเองได้ · เขียนไม่ได้ (เฉพาะ RPC/service-role)
drop policy if exists topup_member_select on public.ai_topup;
create policy topup_member_select on public.ai_topup for select using (public.is_member(workspace_id));

-- เพิ่ม credit ให้ workspace (เดือนปัจจุบัน) — เฉพาะ admin หรือ service_role
create or replace function public.grant_ai_topup(p_workspace uuid, p_credits int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce((current_setting('request.jwt.claims', true))::jsonb ->> 'role', '');
  v_month text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_total int;
begin
  if not (public.is_app_admin() or v_role = 'service_role') then
    raise exception 'not_authorized';
  end if;
  if p_credits is null or p_credits <= 0 then
    raise exception 'invalid_credits';
  end if;
  insert into public.ai_topup (workspace_id, month, credits)
    values (p_workspace, v_month, p_credits)
    on conflict (workspace_id, month) do update
      set credits = public.ai_topup.credits + excluded.credits, updated_at = now()
    returning credits into v_total;
  return jsonb_build_object('ok', true, 'workspace_id', p_workspace, 'month', v_month, 'credits_total', v_total, 'added', p_credits);
end;
$$;

-- credit ของ workspace เดือนนี้ (helper ภายใน)
create or replace function public.ai_topup_credits(p_ws uuid)
returns int language sql stable set search_path = public as $$
  select coalesce((select credits from public.ai_topup
    where workspace_id = p_ws and month = to_char(now() at time zone 'utc', 'YYYY-MM')), 0);
$$;

-- ── อัปเดต bump_ai_usage: quota = plan quota + top-up credits เดือนนี้ ──
create or replace function public.bump_ai_usage(p_client_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_ws    uuid;
  v_plan  text := 'free';
  v_quota int;
  v_bucket text;
  v_month text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_count int;
begin
  if v_uid is null then
    v_plan   := 'guest';
    v_quota  := 25;
    v_bucket := 'guest:' || left(coalesce(nullif(p_client_id, ''), 'anon'), 80);
  else
    select w.id into v_ws
    from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id
    where m.user_id = v_uid
    order by w.created_at asc
    limit 1;

    if v_ws is null then
      v_bucket := 'user:' || v_uid::text;
      v_quota  := 200;
    else
      v_bucket := 'ws:' || v_ws::text;
      select wp.plan into v_plan
        from public.workspace_plan wp
        where wp.workspace_id = v_ws;
      v_plan := coalesce(v_plan, 'free');
      v_quota := public.ai_quota_for(v_plan) + public.ai_topup_credits(v_ws);  -- + top-up
    end if;
  end if;

  insert into public.ai_usage (bucket, month, count)
    values (v_bucket, v_month, 0)
    on conflict (bucket, month) do nothing;
  select count into v_count
    from public.ai_usage
    where bucket = v_bucket and month = v_month
    for update;

  if v_count >= v_quota then
    return jsonb_build_object('allowed', false, 'used', v_count, 'quota', v_quota, 'plan', v_plan);
  end if;

  update public.ai_usage
    set count = count + 1, updated_at = now()
    where bucket = v_bucket and month = v_month;

  return jsonb_build_object('allowed', true, 'used', v_count + 1, 'quota', v_quota, 'plan', v_plan);
end;
$$;

-- ── อัปเดต get_ai_usage: รวม top-up credits ใน quota ที่โชว์ ──
create or replace function public.get_ai_usage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ws uuid;
  v_plan text := 'free';
  v_month text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_count int := 0;
  v_bucket text;
  v_quota int;
begin
  if v_uid is null then
    return jsonb_build_object('used', 0, 'quota', 25, 'plan', 'guest');
  end if;
  select w.id into v_ws
    from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id
    where m.user_id = v_uid order by w.created_at asc limit 1;
  if v_ws is null then
    return jsonb_build_object('used', 0, 'quota', 200, 'plan', 'free');
  end if;
  v_bucket := 'ws:' || v_ws::text;
  select wp.plan into v_plan from public.workspace_plan wp where wp.workspace_id = v_ws;
  v_plan := coalesce(v_plan, 'free');
  v_quota := public.ai_quota_for(v_plan) + public.ai_topup_credits(v_ws);
  select count into v_count from public.ai_usage where bucket = v_bucket and month = v_month;
  return jsonb_build_object('used', coalesce(v_count, 0), 'quota', v_quota, 'plan', v_plan,
    'topup', public.ai_topup_credits(v_ws));
end;
$$;

grant execute on function public.grant_ai_topup(uuid, int) to authenticated;
grant execute on function public.ai_topup_credits(uuid) to authenticated;
