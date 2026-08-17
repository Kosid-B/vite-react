-- 0059 คืนคีย์ engaged + bounce ให้ landing_funnel_agg
--
-- ทำไม (บั๊กจริงจากผู้ใช้ 17 ส.ค. 2569):
--   0057 เขียนฟังก์ชันนี้ใหม่ทั้งก้อนเพื่อเพิ่ม sections/hero_ab/layout_ab
--   แต่ **ทำ 'engaged' กับ 'bounce' หายไป** โดยไม่มีใครรู้ เพราะฝั่ง client ใช้
--   `d.engaged ?? 0` → คีย์หายกลายเป็นเลข 0 ที่ดูเหมือนข้อมูลจริง
--   ผลคือแผงแอดมินโชว์ "สนใจจริง 0 คน · bounce 0" ทั้งที่ตัวเลขจริงไม่ใช่ 0
--   = ข้อมูลผิดที่เงียบกว่าจอพัง และอันตรายกว่า เพราะเอาไปตัดสินใจต่อได้
--
-- บทเรียนที่ผูกไว้กับกลไก: `landingAggContract.test.ts` อ่านไฟล์ migration ล่าสุด
-- แล้วบังคับว่าทุกคีย์ที่ LandingAgg ประกาศไว้ ต้องมีอยู่ใน SQL จริง ๆ

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
    -- engaged/bounce = 2 คีย์ที่ 0057 ทำหาย (นิยามเดิมจาก 0051 ห้ามเปลี่ยน ไม่งั้นเทียบข้ามเดือนไม่ได้)
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
