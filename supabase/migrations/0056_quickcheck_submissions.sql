-- 0056 Quick-check submissions — เก็บสิ่งที่ผู้เยี่ยมชมกรอกใน "ตรวจสินค้าเร็ว" บนหน้า Landing
--
-- ทำไมต้องมี: ตอนนี้ข้อมูลนี้ไปอยู่ใน GA4 อย่างเดียว ซึ่งอ่านย้อนหลังแบบตัดขวางไม่ได้
--   และเราตอบคำถามที่สำคัญที่สุดไม่ได้ — "เจ้าของธุรกิจแบบไหน กังวลเรื่องอะไร"
--   นี่คือข้อมูล first-party ชิ้นแรกที่บอกเราได้ว่ากลุ่มเป้าหมายจริงคือใคร (แทนการเดาจากสัดส่วนประชากร)
--
-- ── PDPA: เก็บอะไร / ไม่เก็บอะไร (ตัดสินใจแล้ว ห้ามเพิ่มโดยไม่ทบทวน) ──
--   ✅ เก็บ: ประเภทธุรกิจ (dropdown) · ราคา/ต้นทุน/ยอดขาย/ค่าใช้จ่ายคงที่ (ตัวเลขล้วน)
--           หัวข้อที่กด · ผลสรุป (verdict) · session นิรนาม
--   ❌ ไม่เก็บ: ชื่อสินค้าที่ผู้ใช้พิมพ์เอง — เป็น free text ที่อาจมีชื่อร้าน/ชื่อคน
--             (อยู่ใน localStorage ของเครื่องเขาเท่านั้น เพื่อยกเข้าแอปตอนสมัคร)
--   ตัวเลขต้นทุน/ราคาของธุรกิจนิรนาม ไม่ใช่ข้อมูลส่วนบุคคล — แต่ชื่อร้านอาจเป็น
--
-- เขียนผ่าน RPC (anon) · อ่านผ่าน RPC ที่ guard is_app_admin() เท่านั้น (แพตเทิร์นเดียวกับ 0051)

create table if not exists public.quickcheck_submissions (
  session      uuid primary key,                 -- id นิรนามเดียวกับ landing_funnel (join ได้)
  biz          text,                             -- ประเภทธุรกิจจาก dropdown (food/retail/service/…)
  price        numeric(12,2),
  cost         numeric(12,2),
  units        integer,                          -- ยอดขายต่อเดือน (หน่วย)
  fixed_cost   numeric(14,2),
  verdict      text,                             -- loss / netLoss / thin / ok / unknown
  topics       text[]      not null default '{}',-- หัวข้อที่กดดูลึก = สิ่งที่เขากังวลจริง
  reached_cta  boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_quickcheck_created on public.quickcheck_submissions (created_at);

alter table public.quickcheck_submissions enable row level security;
-- ไม่มี policy โดยตั้งใจ → เข้าถึงผ่าน RPC (security definer) เท่านั้น

-- ── write RPC (anon) — upsert ต่อ session (กรอกซ้ำ/เพิ่มหัวข้อ = อัปเดตแถวเดิม) ──
create or replace function public.track_quickcheck(
  p_session uuid,
  p_biz     text    default null,
  p_price   numeric default null,
  p_cost    numeric default null,
  p_units   int     default null,
  p_fixed   numeric default null,
  p_verdict text    default null,
  p_topics  text[]  default '{}',
  p_cta     boolean default false
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session is null then return; end if;
  insert into public.quickcheck_submissions as q
    (session, biz, price, cost, units, fixed_cost, verdict, topics, reached_cta)
  values
    (p_session,
     nullif(left(coalesce(p_biz, ''), 24), ''),
     -- คุมช่วงกันค่าขยะ/ค่าที่ใส่มาป่วน (ราคาสินค้าจริงไม่เกินหลักสิบล้านต่อหน่วย)
     case when p_price between 0 and 100000000 then p_price end,
     case when p_cost  between 0 and 100000000 then p_cost  end,
     case when p_units between 0 and 100000000 then p_units end,
     case when p_fixed between 0 and 1000000000 then p_fixed end,
     nullif(left(coalesce(p_verdict, ''), 16), ''),
     coalesce(p_topics[1:8], '{}'),   -- จำกัด 8 หัวข้อ (จริงมี 4) กันยัดข้อมูล
     coalesce(p_cta, false))
  on conflict (session) do update set
    biz         = coalesce(excluded.biz, q.biz),
    price       = coalesce(excluded.price, q.price),
    cost        = coalesce(excluded.cost, q.cost),
    units       = coalesce(excluded.units, q.units),
    fixed_cost  = coalesce(excluded.fixed_cost, q.fixed_cost),
    verdict     = coalesce(excluded.verdict, q.verdict),
    -- หัวข้อสะสม (กดเพิ่มทีหลังไม่ทับของเดิม) — ต้องรู้ว่าเขาสนใจอะไรบ้างทั้งหมด
    topics      = (select coalesce(array_agg(distinct t), '{}')
                   from unnest(q.topics || excluded.topics) as t),
    reached_cta = q.reached_cta or excluded.reached_cta,
    updated_at  = now();
end;
$$;
revoke all on function public.track_quickcheck(uuid, text, numeric, numeric, int, numeric, text, text[], boolean) from public;
grant execute on function public.track_quickcheck(uuid, text, numeric, numeric, int, numeric, text, text[], boolean) to anon, authenticated;

-- ── read RPC (admin เท่านั้น) — สรุปว่า "ใครกรอก · เจอปัญหาแบบไหน · กังวลเรื่องอะไร" ──
create or replace function public.quickcheck_agg(p_days int default 30)
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
    'with_topic', count(*) filter (where cardinality(topics) > 0),
    'cta',        count(*) filter (where reached_cta),
    -- ค่ากลาง (median) ไม่ใช่ค่าเฉลี่ย — กันเคสสุดโต่งลากค่าจนอ่านผิด
    'median_price',  coalesce(percentile_cont(0.5) within group (order by price)::numeric(12,2), 0),
    'median_cost',   coalesce(percentile_cont(0.5) within group (order by cost)::numeric(12,2), 0),
    'median_margin_pct', coalesce(round(percentile_cont(0.5) within group (
        order by case when price > 0 then (price - cost) / price * 100 end))::int, 0),
    'by_biz', coalesce((
      select jsonb_object_agg(b, c) from (
        select coalesce(biz, '(ไม่ระบุ)') as b, count(*) as c
        from public.quickcheck_submissions where created_at >= v_since group by 1
      ) s), '{}'::jsonb),
    'by_verdict', coalesce((
      select jsonb_object_agg(vd, c) from (
        select coalesce(verdict, '(ไม่ระบุ)') as vd, count(*) as c
        from public.quickcheck_submissions where created_at >= v_since group by 1
      ) s), '{}'::jsonb),
    -- หัวใจของตารางนี้: หัวข้อไหนถูกกดมากที่สุด = เจ้าของธุรกิจกังวลเรื่องอะไรจริง ๆ
    'by_topic', coalesce((
      select jsonb_object_agg(t, c) from (
        select t, count(*) as c
        from public.quickcheck_submissions, unnest(topics) as t
        where created_at >= v_since group by 1
      ) s), '{}'::jsonb)
  ) into v
  from public.quickcheck_submissions where created_at >= v_since;
  return coalesce(v, '{}'::jsonb);
end;
$$;
revoke all on function public.quickcheck_agg(int) from public;
grant execute on function public.quickcheck_agg(int) to authenticated;

-- ── ป้องกันเชิงลึก: ตัด GRANT ระดับตารางที่ Supabase ให้มาโดย default ──
-- RLS เปิด + ไม่มี policy = anon อ่านไม่ได้อยู่แล้ว แต่ถ้าวันหน้ามีคนเผลอเพิ่ม policy ข้อมูลจะรั่วทันที
-- ตัด grant ทิ้งเพื่อให้ต้องพลาดสองชั้นถึงจะรั่ว (ตรวจแล้วว่าไม่มีโค้ดไหนเข้าถึงตารางตรง)
revoke all on table public.quickcheck_submissions from anon, authenticated;
revoke all on table public.landing_funnel from anon, authenticated;   -- 0051 ก็มีปัญหาเดียวกัน
