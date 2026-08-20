-- 0065 เก็บ utm_medium ลง landing_funnel — ตอบให้ได้ว่า "คอมเมนต์ปักหมุด ชนะ ไบโอ จริงไหม"
--
-- ทำไมต้องมี (ตรวจ 20 ส.ค. 2569):
--   0062 เก็บ utm_source / campaign / content แล้ว แต่ **ไม่ได้เก็บ medium**
--   ซึ่งเป็นตัวเดียวที่แยก "ช่องทางภายในแพลตฟอร์มเดียวกัน" ออกจากกัน:
--     tiktok/bio  vs  tiktok/comment      ← คำถามที่เรากำลังจะทดลอง
--     youtube/shorts vs youtube/comment vs youtube/video
--     facebook/social vs facebook/comment
--   ⇒ เปลี่ยนลิงก์ทั้งหมดไปใช้คอมเมนต์ปักหมุดแล้ว แต่ในระบบเราเองยังอ่านไม่ออกว่าอันไหนดีกว่า
--   = ทำการทดลองที่วัดผลไม่ได้ (skill experiment-reality-check: หยุดการทดลองที่วัดไม่ได้ ก่อนจะรัน)
--
-- หลักฐานที่ทำให้ต้องทดลอง: 15,900 วิว → เข้าโปรไฟล์ 13 คน (วัดซ้ำได้ 2 ครั้ง 11 และ 13)
--   ไบโอจึงมีเพดานที่ ~13 คน/คลิป ไม่ว่าคลิปจะดังแค่ไหน
--
-- PDPA: utm = แท็กที่ "เราเขียนเอง" ไม่ใช่ข้อมูลผู้ใช้ · ไม่มี PII · sanitize เหมือน 0062

alter table public.landing_funnel add column if not exists utm_medium text;

-- ⚠️ ต้อง DROP ตัวเก่าก่อน — `create or replace` ที่จำนวนพารามิเตอร์ต่างกันจะสร้าง overload ใหม่
--    ไม่ใช่แทนที่ → PostgREST เลือกไม่ถูก ("Could not choose the best candidate function")
--    = tracking ตายทั้งระบบเงียบ ๆ (บทเรียนเดียวกับที่เขียนไว้ใน 0062)
drop function if exists public.track_landing(uuid, text, text, int, boolean, boolean, int, text, text, text, jsonb, text, text, text);

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
  p_sections  jsonb   default '{}'::jsonb,
  p_utm_source   text default null,
  p_utm_campaign text default null,
  p_utm_content  text default null,
  p_utm_medium   text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session is null then return; end if;
  insert into public.landing_funnel as f
    (session, seg, ref_kind, max_scroll, reached_cta, reached_signup, max_dwell,
     ab, hero_ab, layout_ab, sections, utm_source, utm_campaign, utm_content, utm_medium)
  values
    (p_session,
     nullif(left(coalesce(p_seg, ''), 24), ''),
     nullif(left(coalesce(p_ref, ''), 12), ''),
     greatest(0, least(100, coalesce(p_scroll, 0))),
     coalesce(p_cta, false),
     coalesce(p_signup, false),
     greatest(0, least(3600, coalesce(p_dwell, 0))),
     nullif(left(coalesce(p_ab, ''), 24), ''),
     nullif(left(coalesce(p_hero_ab, ''), 24), ''),
     nullif(left(coalesce(p_layout_ab, ''), 24), ''),
     public.clean_landing_sections(coalesce(p_sections, '{}'::jsonb)),
     nullif(left(coalesce(p_utm_source, ''), 32), ''),
     nullif(left(coalesce(p_utm_campaign, ''), 32), ''),
     nullif(left(coalesce(p_utm_content, ''), 32), ''),
     nullif(left(coalesce(p_utm_medium, ''), 32), ''))
  on conflict (session) do update set
    max_scroll     = greatest(f.max_scroll, excluded.max_scroll),
    max_dwell      = greatest(f.max_dwell, excluded.max_dwell),
    reached_cta    = f.reached_cta or excluded.reached_cta,
    reached_signup = f.reached_signup or excluded.reached_signup,
    -- ที่มาเก็บ "ค่าแรก" เสมอ (first-touch) — คนกลับมาซ้ำต้องไม่ทับเครดิตของคอนเทนต์ที่พาเขามาครั้งแรก
    seg            = coalesce(f.seg, excluded.seg),
    ref_kind       = coalesce(f.ref_kind, excluded.ref_kind),
    ab             = coalesce(f.ab, excluded.ab),
    hero_ab        = coalesce(f.hero_ab, excluded.hero_ab),
    layout_ab      = coalesce(f.layout_ab, excluded.layout_ab),
    utm_source     = coalesce(f.utm_source, excluded.utm_source),
    utm_campaign   = coalesce(f.utm_campaign, excluded.utm_campaign),
    utm_content    = coalesce(f.utm_content, excluded.utm_content),
    utm_medium     = coalesce(f.utm_medium, excluded.utm_medium),
    sections       = (
      select coalesce(jsonb_object_agg(k, greatest(
               coalesce((f.sections ->> k)::numeric, 0),
               coalesce((excluded.sections ->> k)::numeric, 0))), '{}'::jsonb)
      from (select jsonb_object_keys(f.sections || excluded.sections) as k) s
    ),
    updated_at     = now();
end;
$$;
revoke all on function public.track_landing(uuid, text, text, int, boolean, boolean, int, text, text, text, jsonb, text, text, text, text) from public;
grant execute on function public.track_landing(uuid, text, text, int, boolean, boolean, int, text, text, text, jsonb, text, text, text, text) to anon, authenticated;

-- ── read RPC: เพิ่ม by_medium (คีย์เดิมทั้งหมดต้องอยู่ครบ — rpcContract.test.ts เฝ้าอยู่) ──
create or replace function public.landing_funnel_agg(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v       jsonb;
  v_days  int := greatest(1, least(365, coalesce(p_days, 30)));
  v_since timestamptz := now() - (v_days || ' days')::interval;
begin
  if not public.is_app_admin() then
    raise exception 'not authorized';
  end if;

  with f as (
    select * from public.landing_funnel where created_at >= v_since
  ),
  sec as (
    select
      key                                              as section,
      count(*)                                         as viewers,
      sum(greatest(0, (value #>> '{}')::numeric))::int as total_seconds,
      count(*) filter (where f.reached_signup)         as signups
    from f, jsonb_each(f.sections)
    where jsonb_typeof(value) = 'number'
    group by key
  )
  select jsonb_build_object(
    'days',    v_days,
    'total',   (select count(*) from f),
    'engaged', (select count(*) from f where max_scroll >= 50),
    'bounce',  (select count(*) from f where max_dwell < 10 and max_scroll < 25),
    'cta',     (select count(*) from f where reached_cta),
    'signup',  (select count(*) from f where reached_signup),
    'avg_scroll', (select coalesce(round(avg(max_scroll))::int, 0) from f),
    'avg_dwell',  (select coalesce(round(avg(max_dwell))::int, 0) from f),
    'by_seg', (
      select coalesce(jsonb_object_agg(seg_k, o), '{}'::jsonb) from (
        select coalesce(seg, 'unknown') as seg_k,
               jsonb_build_object('total', count(*), 'cta', count(*) filter (where reached_cta),
                                  'signup', count(*) filter (where reached_signup)) as o
        from f group by 1
      ) s
    ),
    'by_ref', (
      select coalesce(jsonb_object_agg(ref_k, o), '{}'::jsonb) from (
        select coalesce(ref_kind, 'unknown') as ref_k,
               jsonb_build_object('total', count(*), 'cta', count(*) filter (where reached_cta),
                                  'signup', count(*) filter (where reached_signup)) as o
        from f group by 1
      ) s
    ),
    'by_ab', (
      select coalesce(jsonb_object_agg(ab_k, o), '{}'::jsonb) from (
        select coalesce(ab, 'unknown') as ab_k,
               jsonb_build_object('total', count(*), 'cta', count(*) filter (where reached_cta),
                                  'signup', count(*) filter (where reached_signup)) as o
        from f group by 1
      ) s
    ),
    'by_hero_ab', (
      select coalesce(jsonb_object_agg(k, o), '{}'::jsonb) from (
        select coalesce(hero_ab, 'unknown') as k,
               jsonb_build_object('total', count(*), 'cta', count(*) filter (where reached_cta),
                                  'signup', count(*) filter (where reached_signup)) as o
        from f group by 1
      ) s
    ),
    'by_layout_ab', (
      select coalesce(jsonb_object_agg(k, o), '{}'::jsonb) from (
        select coalesce(layout_ab, 'unknown') as k,
               jsonb_build_object('total', count(*), 'cta', count(*) filter (where reached_cta),
                                  'signup', count(*) filter (where reached_signup)) as o
        from f group by 1
      ) s
    ),
    'by_utm_source', (
      select coalesce(jsonb_object_agg(k, o), '{}'::jsonb) from (
        select coalesce(utm_source, '(ไม่ระบุ)') as k,
               jsonb_build_object('total', count(*), 'cta', count(*) filter (where reached_cta),
                                  'signup', count(*) filter (where reached_signup)) as o
        from f group by 1
      ) s
    ),
    -- ⭐ by_medium = คำตอบของ "คอมเมนต์ปักหมุด vs ไบโอ" (tiktok/comment vs tiktok/bio)
    --    คีย์เป็น "source/medium" เพราะ medium เปล่า ๆ (comment) ไม่มีความหมายถ้าไม่รู้ว่าแพลตฟอร์มไหน
    'by_medium', (
      select coalesce(jsonb_object_agg(k, o), '{}'::jsonb) from (
        select coalesce(utm_source, '(ไม่ระบุ)') || '/' || coalesce(utm_medium, '(ไม่ระบุ)') as k,
               jsonb_build_object('total', count(*), 'cta', count(*) filter (where reached_cta),
                                  'signup', count(*) filter (where reached_signup)) as o
        from f group by 1
      ) s
    ),
    'by_campaign', (
      select coalesce(jsonb_object_agg(k, o), '{}'::jsonb) from (
        select coalesce(utm_campaign, '(ไม่ระบุ)') as k,
               jsonb_build_object('total', count(*), 'cta', count(*) filter (where reached_cta),
                                  'signup', count(*) filter (where reached_signup)) as o
        from f group by 1
      ) s
    ),
    'by_content', (
      select coalesce(jsonb_object_agg(k, o), '{}'::jsonb) from (
        select coalesce(utm_content, '(ไม่ระบุ)') as k,
               jsonb_build_object('total', count(*), 'cta', count(*) filter (where reached_cta),
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

  return coalesce(v, '{}'::jsonb);
end;
$$;
revoke all on function public.landing_funnel_agg(int) from public;
grant execute on function public.landing_funnel_agg(int) to authenticated;
