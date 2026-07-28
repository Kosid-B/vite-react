-- 0035_ai_usage.sql — server-side AI usage quota (ปิดรูรั่ว "ยิง AI ไม่จำกัด")
-- ปัญหา: edge functions (ai-assist/ai-plan/agent-run) ไม่เช็ค identity/quota เลย +
--   guest (anon-key JWT, ไม่มี user) ยิงได้ + trackAiCall นับใน localStorage (รีเซ็ตได้)
-- แก้: ตัวนับฝั่ง server ต่อ (workspace เดือน) + guest bucket เพดานต่ำ · เพิ่ม/เช็คแบบ atomic
-- โมเดลบังคับใช้: edge function เรียก rpc bump_ai_usage() ก่อนเรียก Claude — allowed=false → 429
-- ⚠️ quota อ่าน plan จาก workspace_state JSON (ตรงกับ client) — user แก้ JSON เป็น scale เองได้
--   = ยังกัน whale-spoof ไม่ได้ (งาน hardening แยก) แต่กัน guest/free/runaway ได้เต็ม (ตัวรั่วใหญ่สุด)

-- ── ตัวนับ (ปิด RLS ทั้งหมด → เข้าได้เฉพาะ SECURITY DEFINER RPC / service role) ──
create table if not exists public.ai_usage (
  bucket     text not null,                 -- 'ws:'||workspace_id | 'user:'||uid | 'guest:'||client_id
  month      text not null,                 -- YYYY-MM (UTC) — reset รายเดือนตรงกับ usage.ts
  count      int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (bucket, month)
);
alter table public.ai_usage enable row level security;
-- ไม่มี policy โดยตั้งใจ = ตารางนี้เข้าถึงได้เฉพาะผ่าน RPC (security definer) เท่านั้น

-- โควตาต่อแพ็ก — ต้องตรงกับ src/lib/usage.ts PLAN_AI_CALLS
create or replace function public.ai_quota_for(p_plan text)
returns int language sql immutable as $$
  select case p_plan
    when 'scale'   then 5000
    when 'growth'  then 1000
    when 'starter' then 300
    else 200                                 -- free/trial
  end;
$$;

-- เพิ่มตัวนับ +1 ถ้ายังไม่เกินโควตา (atomic) → คืนสถานะให้ edge function ตัดสิน
--   p_client_id: id ไม่ระบุตัวตนจากฝั่ง client (experiments.uid) ใช้เฉพาะ guest bucket
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
    -- guest: anon-key JWT ผ่าน gateway แต่ไม่มี user → เพดานต่ำ กัน abuse จากคนทั่วไป
    v_plan   := 'guest';
    v_quota  := 25;
    v_bucket := 'guest:' || left(coalesce(nullif(p_client_id, ''), 'anon'), 80);
  else
    -- หา workspace แรกของ user แล้วอ่าน plan จาก AppData JSON
    select w.id into v_ws
    from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id
    where m.user_id = v_uid
    order by w.created_at asc
    limit 1;

    if v_ws is null then
      v_bucket := 'user:' || v_uid::text;
    else
      v_bucket := 'ws:' || v_ws::text;
      select coalesce(ws.data -> 'subscription' ->> 'plan', 'free')
        into v_plan
        from public.workspace_state ws
        where ws.workspace_id = v_ws;
      v_plan := coalesce(v_plan, 'free');
    end if;
    v_quota := public.ai_quota_for(v_plan);
  end if;

  -- lock แถวเดือนนี้ (สร้างถ้ายังไม่มี) เพื่อ increment แบบ atomic
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

-- อ่านสถานะ (ไม่ increment) — ให้ client โชว์มิเตอร์จาก server แทน localStorage ได้
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
begin
  if v_uid is null then
    return jsonb_build_object('used', 0, 'quota', 25, 'plan', 'guest');
  end if;
  select w.id into v_ws
    from public.workspaces w
    join public.workspace_members m on m.workspace_id = w.id
    where m.user_id = v_uid order by w.created_at asc limit 1;
  if v_ws is null then
    v_bucket := 'user:' || v_uid::text;
  else
    v_bucket := 'ws:' || v_ws::text;
    select coalesce(ws.data -> 'subscription' ->> 'plan', 'free') into v_plan
      from public.workspace_state ws where ws.workspace_id = v_ws;
  end if;
  select count into v_count from public.ai_usage where bucket = v_bucket and month = v_month;
  return jsonb_build_object('used', coalesce(v_count, 0), 'quota', public.ai_quota_for(coalesce(v_plan,'free')), 'plan', coalesce(v_plan,'free'));
end;
$$;

grant execute on function public.bump_ai_usage(text) to anon, authenticated;
grant execute on function public.get_ai_usage() to anon, authenticated;
grant execute on function public.ai_quota_for(text) to anon, authenticated;
