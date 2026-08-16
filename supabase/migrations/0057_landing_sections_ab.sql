-- 0057_landing_sections_ab.sql — เก็บ "ความสนใจรายส่วน" ของหน้า Landing + ผูก A/B ทุกตัวเข้าฐานข้อมูลเรา
--
-- ปัญหาที่แก้ (ยืนยันโดยเจ้าของ 16 ส.ค. 2569):
--   1) รู้แค่ว่าเลื่อนลึกกี่ % แต่ไม่รู้ว่า "หยุดดูส่วนไหน" → ปรับปรุงหน้าเว็บได้แค่เดา
--   2) A/B พาดหัว (hero) กับลำดับบล็อก (layout) assign ฝั่ง client แล้วส่งเข้า GA เท่านั้น
--      → แอดมินในระบบเราอ่านผลไม่ได้เลย ต้องออกไปเปิด GA ซึ่งไม่มีใครทำจริง
--
-- PDPA: ไม่มี PII ทั้งตาราง — session = uuid สุ่มฝั่ง client, ไม่เก็บ URL/ตัวตน/ข้อความที่ผู้ใช้พิมพ์
--       sections เก็บได้แค่ "คีย์ส่วนที่เรากำหนดเอง → จำนวนวินาที" เท่านั้น
--
-- ต่อยอด 0051 + 0054 โดยไม่แตะพฤติกรรมเดิม (พารามิเตอร์ใหม่ default null = client เดิมยังเรียกได้)

alter table public.landing_funnel add column if not exists hero_ab   text;
alter table public.landing_funnel add column if not exists layout_ab text;
-- {"hero": 12, "pricing": 40, ...} = วินาทีที่ส่วนนั้นอยู่ในจอ (สะสมสูงสุด ไม่ใช่ผลรวมซ้ำ)
alter table public.landing_funnel add column if not exists sections  jsonb not null default '{}'::jsonb;

-- ── ตัวกรอง sections ฝั่งเซิร์ฟเวอร์ ────────────────────────────────────────
-- anon เรียก rpc นี้ได้ จึงต้องกันไม่ให้ถูกใช้เป็นที่เก็บข้อมูลอิสระ:
-- จำกัดจำนวนคีย์ · ความยาวคีย์ · ช่วงค่า · และทิ้งค่าที่ไม่ใช่ตัวเลข
create or replace function public.clean_landing_sections(p jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select coalesce(
    jsonb_object_agg(k, v),
    '{}'::jsonb
  )
  from (
    select
      left(key, 32) as k,
      greatest(0, least(3600, floor(coalesce((value #>> '{}')::numeric, 0))::int)) as v
    from jsonb_each(coalesce(p, '{}'::jsonb))
    where jsonb_typeof(value) = 'number'
      and key <> ''
    order by key
    limit 40
  ) s;
$$;

-- ── track_landing: เพิ่ม hero_ab / layout_ab / sections ─────────────────────
drop function if exists public.track_landing(uuid, text, text, int, boolean, boolean, int, text);
create or replace function public.track_landing(
  p_session   uuid,
  p_seg       text    default null,
  p_ref       text    default null,
  p_scroll    int     default 0,
  p_cta       boolean default false,
  p_signup    boolean default false,
  p_dwell     int     default 0,
  p_ab        text    default null,
  p_hero_ab   text    default null,
  p_layout_ab text    default null,
  p_sections  jsonb   default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sections jsonb := public.clean_landing_sections(p_sections);
begin
  if p_session is null then return; end if;
  insert into public.landing_funnel as f
    (session, seg, ref_kind, max_scroll, reached_cta, reached_signup, max_dwell,
     ab, hero_ab, layout_ab, sections)
  values
    (p_session,
     nullif(left(coalesce(p_seg, ''), 24), ''),
     nullif(left(coalesce(p_ref, ''), 12), ''),
     greatest(0, least(100, coalesce(p_scroll, 0))),
     coalesce(p_cta, false),
     coalesce(p_signup, false),
     greatest(0, least(3600, coalesce(p_dwell, 0))),
     nullif(left(coalesce(p_ab, ''), 16), ''),
     nullif(left(coalesce(p_hero_ab, ''), 16), ''),
     nullif(left(coalesce(p_layout_ab, ''), 16), ''),
     v_sections)
  on conflict (session) do update set
    max_scroll     = greatest(f.max_scroll, excluded.max_scroll),
    max_dwell      = greatest(f.max_dwell, excluded.max_dwell),
    reached_cta    = f.reached_cta or excluded.reached_cta,
    reached_signup = f.reached_signup or excluded.reached_signup,
    seg            = coalesce(f.seg, excluded.seg),
    ref_kind       = coalesce(f.ref_kind, excluded.ref_kind),
    ab             = coalesce(f.ab, excluded.ab),          -- ล็อก variant ครั้งแรก
    hero_ab        = coalesce(f.hero_ab, excluded.hero_ab),
    layout_ab      = coalesce(f.layout_ab, excluded.layout_ab),
    -- รวมรายส่วนแบบ "เอาค่าสูงสุดต่อคีย์" — กันการนับซ้ำเมื่อ client ส่งซ้ำหลายรอบ
    sections       = (
      select coalesce(jsonb_object_agg(k, mx), '{}'::jsonb)
      from (
        select key as k, max(val) as mx
        from (
          select key, greatest(0, least(3600, floor((value #>> '{}')::numeric)::int)) as val
          from jsonb_each(f.sections) where jsonb_typeof(value) = 'number'
          union all
          select key, greatest(0, least(3600, floor((value #>> '{}')::numeric)::int))
          from jsonb_each(excluded.sections) where jsonb_typeof(value) = 'number'
        ) u
        group by key
      ) m
    ),
    updated_at     = now();
end;
$$;
revoke all on function public.track_landing(uuid, text, text, int, boolean, boolean, int, text, text, text, jsonb) from public;
grant execute on function public.track_landing(uuid, text, text, int, boolean, boolean, int, text, text, text, jsonb) to anon, authenticated;

-- ── landing_funnel_agg: เพิ่ม by_hero_ab / by_layout_ab / sections ─────────
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
  -- อ่านได้เฉพาะแอดมินระบบ (ผู้ใช้ทั่วไปเห็นข้อมูลรวมของคนอื่นไม่ได้)
  if not public.is_app_admin() then
    raise exception 'forbidden';
  end if;

  with f as (
    select * from public.landing_funnel where created_at >= v_since
  ),
  -- แตก sections ออกเป็นแถว เพื่อรวมว่าส่วนไหนถูกดูนานสุด/บ่อยสุด
  sec as (
    select
      key                                                   as section,
      count(*)                                              as viewers,
      sum(greatest(0, (value #>> '{}')::numeric))::int      as total_seconds,
      count(*) filter (where f.reached_signup)              as signups
    from f, jsonb_each(f.sections)
    where jsonb_typeof(value) = 'number'
    group by key
  )
  select jsonb_build_object(
    'days',    greatest(1, least(365, coalesce(p_days, 30))),
    'total',   (select count(*) from f),
    'cta',     (select count(*) from f where reached_cta),
    'signup',  (select count(*) from f where reached_signup),
    'avg_scroll', (select coalesce(round(avg(max_scroll))::int, 0) from f),
    'avg_dwell',  (select coalesce(round(avg(max_dwell))::int, 0) from f),
    'by_seg', (
      select coalesce(jsonb_object_agg(seg_k, o), '{}'::jsonb) from (
        select coalesce(seg, 'unknown') as seg_k,
               jsonb_build_object('total', count(*),
                                  'cta', count(*) filter (where reached_cta),
                                  'signup', count(*) filter (where reached_signup)) as o
        from f group by 1
      ) s
    ),
    'by_ref', (
      select coalesce(jsonb_object_agg(ref_k, o), '{}'::jsonb) from (
        select coalesce(ref_kind, 'unknown') as ref_k,
               jsonb_build_object('total', count(*),
                                  'cta', count(*) filter (where reached_cta),
                                  'signup', count(*) filter (where reached_signup)) as o
        from f group by 1
      ) s
    ),
    'by_ab', (
      select coalesce(jsonb_object_agg(ab_k, o), '{}'::jsonb) from (
        select coalesce(ab, 'unknown') as ab_k,
               jsonb_build_object('total', count(*),
                                  'cta', count(*) filter (where reached_cta),
                                  'signup', count(*) filter (where reached_signup)) as o
        from f group by 1
      ) s
    ),
    'by_hero_ab', (
      select coalesce(jsonb_object_agg(k, o), '{}'::jsonb) from (
        select coalesce(hero_ab, 'unknown') as k,
               jsonb_build_object('total', count(*),
                                  'cta', count(*) filter (where reached_cta),
                                  'signup', count(*) filter (where reached_signup)) as o
        from f group by 1
      ) s
    ),
    'by_layout_ab', (
      select coalesce(jsonb_object_agg(k, o), '{}'::jsonb) from (
        select coalesce(layout_ab, 'unknown') as k,
               jsonb_build_object('total', count(*),
                                  'cta', count(*) filter (where reached_cta),
                                  'signup', count(*) filter (where reached_signup)) as o
        from f group by 1
      ) s
    ),
    'sections', (
      select coalesce(jsonb_object_agg(section, jsonb_build_object(
        'viewers', viewers, 'seconds', total_seconds, 'signups', signups
      )), '{}'::jsonb) from sec
    )
  ) into v;

  return v;
end;
$$;
revoke all on function public.landing_funnel_agg(int) from public;
grant execute on function public.landing_funnel_agg(int) to authenticated;
