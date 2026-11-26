-- 0073 — ส่ง "ผลบน SaaS" กลับให้ Marketing OS เห็น (ข้อ ข · เจ้าของเลือก 26 พ.ย. 2569)
--
-- ⚠️ ไฟล์นี้เป็น **บันทึกของสิ่งที่ apply ไปแล้ว** บน production `waigsnxhrlwtiotspaim`
--    (apply ผ่าน MCP 26 พ.ย. 2569 จากเซสชันบนเครื่องเจ้าของ · Supabase บันทึกชื่อไว้ว่า `0071_marketing_os_funnel_summary_rpc`)
--    🔴 **เลขชนกัน**: เซสชันคลาวด์ apply `0071_marketing_os_content_tables` ก่อนหน้า 35 นาที (PR #462)
--       ⇒ ในรีโปเลื่อนเป็น 0073 · ใน production ชื่อยังเป็น 0071 (เลขสองฝั่งไม่ตรงกันโดยเจตนา — แบบเดียวกับ 0066)
--
-- 🔴 ทำไมต้องมี: Marketing OS ปล่อยแคมเปญ (ลิงก์ ?seg= + UTM) เข้าหน้าเว็บของ SaaS
--    แต่ผล (คนเข้า → ถึง CTA → ถึงหน้าสมัคร → ทิ้ง lead) อยู่ใน public.landing_funnel / public.platform_leads
--    ซึ่งแอป OS มองไม่เห็น ⇒ ปล่อยแคมเปญไปแล้ววัดไม่ได้ว่าได้ผลไหม
--
-- 🔒 กติกาเดียวกับ 0067/0068 (ADR-0012 — ข้าม schema ผ่าน rpc ใน public เท่านั้น):
--    • security definer · search_path = '' · revoke จาก public/anon/authenticated · grant execute ให้ service_role
--    • คืน **ตัวเลขรวมเท่านั้น** — ไม่มี session id / อีเมล / เบอร์ / ชื่อ ออกจาก public เลย
--    • อ่านอย่างเดียว (stable) — ไม่เขียนอะไรทั้งสอง schema
--
-- 🔀 os_code: แปลงรหัสกลุ่มของ SaaS กลับเป็นรหัสของ Marketing OS (ทิศกลับของ alias ใน heroVariant.ts)
--    owner → growth · sidebiz → employee · ที่เหลือใช้คำเดียวกัน · default = ไม่ได้มาจากลิงก์เฉพาะกลุ่ม

create or replace function public.marketing_os_funnel_summary(p_since timestamptz default now() - interval '30 days')
returns table (
  seg text,
  os_code text,
  utm_source text,
  utm_campaign text,
  sessions bigint,
  reached_cta bigint,
  reached_signup bigint,
  leads bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with f as (
    select coalesce(nullif(lf.seg, ''), 'default')           as seg,
           coalesce(nullif(lf.utm_source, ''), '(none)')     as utm_source,
           coalesce(nullif(lf.utm_campaign, ''), '(none)')   as utm_campaign,
           count(*)                                          as sessions,
           count(*) filter (where lf.reached_cta)            as reached_cta,
           count(*) filter (where lf.reached_signup)         as reached_signup
      from public.landing_funnel lf
     where lf.created_at >= p_since
     group by 1, 2, 3
  ),
  l as (
    select coalesce(nullif(pl.seg, ''), 'default')           as seg,
           coalesce(nullif(pl.source, ''), '(none)')         as utm_source,
           coalesce(nullif(pl.campaign, ''), '(none)')       as utm_campaign,
           count(*)                                          as leads
      from public.platform_leads pl
     where pl.created_at >= p_since
     group by 1, 2, 3
  )
  select coalesce(f.seg, l.seg)                              as seg,
         case coalesce(f.seg, l.seg)
           when 'owner'   then 'growth'
           when 'sidebiz' then 'employee'
           else coalesce(f.seg, l.seg)
         end                                                 as os_code,
         coalesce(f.utm_source, l.utm_source)                as utm_source,
         coalesce(f.utm_campaign, l.utm_campaign)            as utm_campaign,
         coalesce(f.sessions, 0)                             as sessions,
         coalesce(f.reached_cta, 0)                          as reached_cta,
         coalesce(f.reached_signup, 0)                       as reached_signup,
         coalesce(l.leads, 0)                                as leads
    from f
    full join l
      on l.seg = f.seg and l.utm_source = f.utm_source and l.utm_campaign = f.utm_campaign
   order by 5 desc;
$$;

comment on function public.marketing_os_funnel_summary(timestamptz) is
  'ADR-0012 bridge: aggregated SaaS landing results per segment/UTM for Marketing OS. Counts only, no PII. service_role only.';

revoke all on function public.marketing_os_funnel_summary(timestamptz) from public, anon, authenticated;
grant execute on function public.marketing_os_funnel_summary(timestamptz) to service_role;
