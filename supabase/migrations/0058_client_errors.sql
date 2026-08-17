-- 0058 Client errors — เก็บ error ที่ผู้ใช้เจอจริงบนเบราว์เซอร์ ให้ค้นย้อนหลังได้
--
-- ทำไมต้องมี (บทเรียน 17 ส.ค. 2569):
--   GA4 บอกได้แค่ "มี error กี่ครั้ง" แต่บอกไม่ได้ว่า "พังเพราะอะไร" — ตัวข้อความอยู่ใน
--   Cloudflare Workers Logs ซึ่งเก็บย้อนหลังได้ไม่กี่วันและ query ข้ามช่วงเวลาไม่ได้
--   ตอนอ่านรายงาน GA เดือน ก.ค.–ส.ค. เจอ react.ErrorBoundary = 35 เซสชัน (~16%)
--   แล้ว "ตอบไม่ได้ว่าพังตรงไหน" เพราะหลักฐานหมดอายุไปแล้ว → ต้องมีที่เก็บถาวรของเราเอง
--
-- ── PDPA: เก็บอะไร / ไม่เก็บอะไร (ตัดสินใจแล้ว ห้ามเพิ่มโดยไม่ทบทวน) ──
--   ✅ เก็บ: ข้อความ error · stack (ย่อ) · path ของหน้า · user-agent (ย่อ) · เวลา
--   ❌ ไม่เก็บ: IP · user id · workspace id · เนื้อหาที่ผู้ใช้กรอก
--      เหตุผล: เราต้องการ "ซ่อมบั๊ก" ไม่ใช่ "ตามรอยคน" — ถ้าเก็บ user id จะกลายเป็น
--      log พฤติกรรมรายคนทันที ซึ่งเกินความจำเป็นตามหลัก data minimisation
--   user-agent เก็บเพราะบั๊กจำนวนมากขึ้นกับเบราว์เซอร์/เวอร์ชัน — ตัดเหลือ 200 ตัวอักษร
--
-- เขียนผ่าน RPC (anon · เรียกจาก Cloudflare Worker) · อ่านผ่าน RPC ที่ guard is_app_admin()
-- แพตเทิร์นเดียวกับ 0051 landing_funnel / 0056 quickcheck_submissions

create table if not exists public.client_errors (
  id          bigserial primary key,
  -- fingerprint = source + ต้นข้อความ → ใช้จัดกลุ่ม "บั๊กเดียวกันที่เกิดซ้ำ"
  -- (คำนวณฝั่ง DB เพื่อให้กลุ่มเหมือนกันเสมอ ไม่ขึ้นกับว่าใครเป็นคนส่งเข้ามา)
  fingerprint text        not null,
  message     text        not null,
  source      text        not null,          -- react.ErrorBoundary / window.error / unhandledrejection
  path        text,                          -- location.pathname ตอนพัง
  stack       text,
  ua          text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_client_errors_created on public.client_errors (created_at desc);
create index if not exists idx_client_errors_fp      on public.client_errors (fingerprint, created_at desc);

alter table public.client_errors enable row level security;
-- ไม่มี policy โดยตั้งใจ → เข้าถึงผ่าน RPC (security definer) เท่านั้น

-- ── write RPC (anon) ──
-- ⚠️ endpoint นี้เปิดให้ anon เขียนได้ (Worker เรียกด้วย publishable key) = มีคนยิงถล่มได้
--    ฝั่ง client มี throttle อยู่แล้ว (errorReport.ts: 25 ครั้ง/เซสชัน + dedupe) แต่คนยิงตรงข้ามได้
--    จึงกันชั้นที่สองที่นี่: ถ้าชั่วโมงที่ผ่านมามีเกิน 500 แถว = หยุดรับ (ยอมเสียข้อมูลดีกว่าตารางบวม)
create or replace function public.track_client_error(
  p_message text,
  p_source  text,
  p_path    text default null,
  p_stack   text default null,
  p_ua      text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg    text := nullif(left(coalesce(p_message, ''), 300), '');
  v_source text := nullif(left(coalesce(p_source, ''), 48), '');
begin
  if v_msg is null or v_source is null then return; end if;
  if (select count(*) from public.client_errors where created_at >= now() - interval '1 hour') >= 500 then
    return;
  end if;

  insert into public.client_errors (fingerprint, message, source, path, stack, ua)
  values (
    v_source || ':' || left(v_msg, 80),
    v_msg,
    v_source,
    nullif(left(coalesce(p_path, ''), 120), ''),
    nullif(left(coalesce(p_stack, ''), 2000), ''),
    nullif(left(coalesce(p_ua, ''), 200), '')
  );
end;
$$;
revoke all on function public.track_client_error(text, text, text, text, text) from public;
grant execute on function public.track_client_error(text, text, text, text, text) to anon, authenticated;

-- ── read RPC (admin เท่านั้น) ──
-- ตอบคำถามเดียวที่สำคัญ: "บั๊กไหนกระทบคนมากที่สุด และยังเกิดอยู่ไหม"
-- จึงจัดกลุ่มตาม fingerprint แล้วเรียงตามจำนวน — ไม่ใช่ dump แถวดิบให้ไล่อ่านเอง
create or replace function public.client_errors_agg(p_days int default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v       jsonb;
  v_days  int := greatest(1, least(365, coalesce(p_days, 7)));
  v_since timestamptz := now() - (v_days || ' days')::interval;
begin
  if not public.is_app_admin() then
    raise exception 'not authorized';
  end if;
  select jsonb_build_object(
    'days',  v_days,
    'total', count(*),
    'by_source', coalesce((
      select jsonb_object_agg(s, c) from (
        select source as s, count(*) as c
        from public.client_errors where created_at >= v_since group by 1
      ) t), '{}'::jsonb),
    'by_path', coalesce((
      select jsonb_object_agg(p, c) from (
        select coalesce(path, '(ไม่ระบุ)') as p, count(*) as c
        from public.client_errors where created_at >= v_since group by 1
        order by c desc limit 20
      ) t), '{}'::jsonb),
    -- รายการบั๊กจัดกลุ่มแล้ว: เอา stack ของครั้งล่าสุดมาด้วย 1 อัน (พอสำหรับไล่หาโค้ด)
    'groups', coalesce((
      select jsonb_agg(g order by (g->>'count')::int desc) from (
        select jsonb_build_object(
          'fingerprint', fingerprint,
          'message',     (array_agg(message      order by created_at desc))[1],
          'source',      (array_agg(source       order by created_at desc))[1],
          'path',        (array_agg(path         order by created_at desc))[1],
          'stack',       (array_agg(stack        order by created_at desc))[1],
          'ua',          (array_agg(ua           order by created_at desc))[1],
          'count',       count(*)::int,
          'first_seen',  min(created_at),
          'last_seen',   max(created_at)
        ) as g
        from public.client_errors where created_at >= v_since
        group by fingerprint
        order by count(*) desc limit 25
      ) s), '[]'::jsonb)
  ) into v
  from public.client_errors where created_at >= v_since;
  return coalesce(v, '{}'::jsonb);
end;
$$;
revoke all on function public.client_errors_agg(int) from public;
grant execute on function public.client_errors_agg(int) to authenticated;

-- ป้องกันเชิงลึก: ตัด GRANT ระดับตารางที่ Supabase ให้มาโดย default
-- (RLS เปิด + ไม่มี policy = เข้าไม่ได้อยู่แล้ว แต่ถ้าวันหน้ามีคนเผลอเพิ่ม policy ต้องยังไม่รั่ว)
revoke all on table public.client_errors from anon, authenticated;
