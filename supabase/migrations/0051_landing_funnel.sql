-- 0051 Landing funnel — first-party, PDPA-safe visitor funnel บนหน้า Landing สาธารณะ
-- ตอบคำถาม "คนเข้า Landing กี่คน → เลื่อนผ่าน hero → หยุดดูนานไหม → กด CTA → ตั้งใจสมัคร"
-- ที่ GA4 ตอบให้เห็นในแอปไม่ได้ (คนดู Landing ยังไม่ล็อกอิน) — วัด scroll depth + dwell ตาม Dark AI
-- Marketing โดย "ไม่เก็บ PII / ไม่บันทึก cursor path" — 1 แถว/เซสชัน (upsert monotonic)
-- เขียนผ่าน RPC เท่านั้น (anon) · อ่านผ่าน RPC ที่ guard is_app_admin() เอง

create table if not exists public.landing_funnel (
  session        uuid primary key,               -- id นิรนามสุ่มฝั่ง client (localStorage) ไม่ผูกตัวตน
  seg            text,                            -- hero segment (default/seller/food/palm/…)
  ref_kind       text,                            -- direct/social/search/other (จำแนกฝั่ง client — ไม่เก็บ URL)
  max_scroll     smallint    not null default 0,  -- 0..100 = เลื่อนลึกสุดกี่ % (ระยะการเลื่อนดู)
  max_dwell      smallint    not null default 0,  -- วินาที = หยุดดูนานสุดเท่าไร (ระยะเวลาหยุดดู)
  reached_cta    boolean     not null default false, -- กดปุ่ม CTA หลัก
  reached_signup boolean     not null default false, -- กดสมัคร/เข้าสู่ระบบ (ตั้งใจสมัคร)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_landing_funnel_created on public.landing_funnel (created_at);

alter table public.landing_funnel enable row level security;
-- ไม่มี policy สำหรับ anon/authenticated โดยตั้งใจ → เข้าถึงได้เฉพาะผ่าน RPC (security definer) เท่านั้น
-- (กันสแปมอ่าน/เขียนตรง · admin อ่านผ่าน landing_funnel_agg() ที่เช็คสิทธิ์เอง)

-- ── write RPC (anon) — upsert แบบ monotonic: scroll/dwell = มากสุด, ธง = OR, seg/ref = เก็บค่าแรก ──
create or replace function public.track_landing(
  p_session uuid,
  p_seg     text    default null,
  p_ref     text    default null,
  p_scroll  int     default 0,
  p_cta     boolean default false,
  p_signup  boolean default false,
  p_dwell   int     default 0
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session is null then return; end if;
  insert into public.landing_funnel as f
    (session, seg, ref_kind, max_scroll, reached_cta, reached_signup, max_dwell)
  values
    (p_session,
     nullif(left(coalesce(p_seg, ''), 24), ''),
     nullif(left(coalesce(p_ref, ''), 12), ''),
     greatest(0, least(100, coalesce(p_scroll, 0))),
     coalesce(p_cta, false),
     coalesce(p_signup, false),
     greatest(0, least(3600, coalesce(p_dwell, 0))))
  on conflict (session) do update set
    max_scroll     = greatest(f.max_scroll, excluded.max_scroll),
    max_dwell      = greatest(f.max_dwell, excluded.max_dwell),
    reached_cta    = f.reached_cta or excluded.reached_cta,
    reached_signup = f.reached_signup or excluded.reached_signup,
    seg            = coalesce(f.seg, excluded.seg),
    ref_kind       = coalesce(f.ref_kind, excluded.ref_kind),
    updated_at     = now();
end;
$$;
revoke all on function public.track_landing(uuid, text, text, int, boolean, boolean, int) from public;
grant execute on function public.track_landing(uuid, text, text, int, boolean, boolean, int) to anon, authenticated;

-- ── read RPC (admin เท่านั้น) — คืน json สรุป funnel + dwell + แยกตาม seg/ref ในช่วง N วัน ──
create or replace function public.landing_funnel_agg(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v       jsonb;
  v_since timestamptz := now() - (greatest(1, least(365, coalesce(p_days, 30))) || ' days')::interval;
begin
  if not public.is_app_admin() then
    raise exception 'not authorized';
  end if;
  select jsonb_build_object(
    'total',      count(*),
    'engaged',    count(*) filter (where max_scroll >= 50),
    'cta',        count(*) filter (where reached_cta),
    'signup',     count(*) filter (where reached_signup),
    'avg_scroll', coalesce(round(avg(max_scroll))::int, 0),
    'avg_dwell',  coalesce(round(avg(max_dwell))::int, 0),
    'bounce',     count(*) filter (where max_dwell < 10 and max_scroll < 25),
    'by_seg', coalesce((
      select jsonb_object_agg(seg, c) from (
        select coalesce(seg, 'default') as seg, count(*) as c
        from public.landing_funnel where created_at >= v_since group by 1
      ) s), '{}'::jsonb),
    'by_ref', coalesce((
      select jsonb_object_agg(ref_kind, c) from (
        select coalesce(ref_kind, 'other') as ref_kind, count(*) as c
        from public.landing_funnel where created_at >= v_since group by 1
      ) r), '{}'::jsonb)
  ) into v
  from public.landing_funnel where created_at >= v_since;
  return coalesce(v, '{}'::jsonb);
end;
$$;
revoke all on function public.landing_funnel_agg(int) from public;
grant execute on function public.landing_funnel_agg(int) to authenticated;
