-- 0054_landing_ab.sql — A/B holdout บนหน้า Landing: วัดว่า "2 ส่วนใหม่ (ลอง AI จริง + จัดการความกลัว AI)"
--   ช่วย conversion (สมัคร) จริงไหม — เทียบ signup rate ระหว่างกลุ่ม show (เห็นทั้ง 2 ส่วน) vs control (ไม่เห็น)
-- variant assign แบบ deterministic ฝั่ง client จาก session id (นิรนามเหมือนเดิม) → บันทึกลง ab
-- ต่อยอด 0051 (track_landing / landing_funnel_agg) โดยไม่แตะพฤติกรรมเดิม (p_ab default null = ค่าเดิม)

alter table public.landing_funnel add column if not exists ab text;

-- เพิ่ม p_ab (default null) — drop 7-arg เดิมแล้วสร้าง 8-arg (named RPC + default = เข้ากันได้กับ client เดิม)
drop function if exists public.track_landing(uuid, text, text, int, boolean, boolean, int);
create or replace function public.track_landing(
  p_session uuid,
  p_seg     text    default null,
  p_ref     text    default null,
  p_scroll  int     default 0,
  p_cta     boolean default false,
  p_signup  boolean default false,
  p_dwell   int     default 0,
  p_ab      text    default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session is null then return; end if;
  insert into public.landing_funnel as f
    (session, seg, ref_kind, max_scroll, reached_cta, reached_signup, max_dwell, ab)
  values
    (p_session,
     nullif(left(coalesce(p_seg, ''), 24), ''),
     nullif(left(coalesce(p_ref, ''), 12), ''),
     greatest(0, least(100, coalesce(p_scroll, 0))),
     coalesce(p_cta, false),
     coalesce(p_signup, false),
     greatest(0, least(3600, coalesce(p_dwell, 0))),
     nullif(left(coalesce(p_ab, ''), 16), ''))
  on conflict (session) do update set
    max_scroll     = greatest(f.max_scroll, excluded.max_scroll),
    max_dwell      = greatest(f.max_dwell, excluded.max_dwell),
    reached_cta    = f.reached_cta or excluded.reached_cta,
    reached_signup = f.reached_signup or excluded.reached_signup,
    seg            = coalesce(f.seg, excluded.seg),
    ref_kind       = coalesce(f.ref_kind, excluded.ref_kind),
    ab             = coalesce(f.ab, excluded.ab),   -- ล็อก variant ครั้งแรก
    updated_at     = now();
end;
$$;
revoke all on function public.track_landing(uuid, text, text, int, boolean, boolean, int, text) from public;
grant execute on function public.track_landing(uuid, text, text, int, boolean, boolean, int, text) to anon, authenticated;

-- เพิ่ม by_ab ใน agg: ต่อ variant คืน {total, signup, cta} → คำนวณ signup rate เทียบกลุ่มได้
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
      ) r), '{}'::jsonb),
    'by_ab', coalesce((
      select jsonb_object_agg(ab, obj) from (
        select coalesce(ab, 'unset') as ab,
          jsonb_build_object(
            'total',  count(*),
            'signup', count(*) filter (where reached_signup),
            'cta',    count(*) filter (where reached_cta)
          ) as obj
        from public.landing_funnel where created_at >= v_since group by 1
      ) a), '{}'::jsonb)
  ) into v
  from public.landing_funnel where created_at >= v_since;
  return coalesce(v, '{}'::jsonb);
end;
$$;
revoke all on function public.landing_funnel_agg(int) from public;
grant execute on function public.landing_funnel_agg(int) to authenticated;
