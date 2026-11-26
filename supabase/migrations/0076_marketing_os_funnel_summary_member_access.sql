-- 0076 — เปิด `marketing_os_funnel_summary` ให้บัญชีผู้ใช้ที่เป็นสมาชิกเรียกได้ (เจ้าของเลือก "ก" · 26 พ.ย. 2569)
--
-- ⚠️ **ชื่อในรีโปกับใน production ไม่ตรงกันโดยเจตนา** (เหมือน 0073/0074 ของ PR #463)
--    ใน production ชื่อว่า `0075_marketing_os_funnel_summary_member_access` (apply 26 พ.ย. 2569)
--    🔴 **เลข migration ชนกันเป็นครั้งที่ 3 ของวัน** — เซสชันบนเครื่องเจ้าของ apply
--       `0075_marketing_os_member_read_results` ที่ 09:30:11 ⇒ มี `0075` สองตัวในฐาน
--
-- 🔴 **และเซสชันนั้นทำเรื่องเดียวกัน แต่รัดกุมกว่า** (ledger #111):
--    เขาสร้าง wrapper `public.os_member_funnel_summary(p_workspace, p_since)` ที่ตรวจ
--    `is_workspace_member(p_workspace)` ก่อนเรียกตัวใน ⇒ **ผู้เรียกต้องระบุ workspace**
--    ⇒ ระบุผิด workspace = ปฏิเสธ · รัดกุมกว่าไฟล์นี้ที่อ่าน `auth.uid()` เอาเอง
--    ⇒ **ทางที่แอป OS ควรใช้คือ wrapper ของเขา** ไม่ใช่ตัวในนี้
--
-- 🟡 **ไฟล์นี้จึงเหลือบทบาทเป็นชั้นป้องกันซ้ำ (defense in depth)** ไม่ใช่ประตูหลัก
--    ⚠️ **ยังไม่ revoke `authenticated` ออกจากตัวใน** เพราะโค้ดแอปของเขาอยู่บนเครื่องเจ้าของ
--       ⇒ มองไม่เห็นว่าเรียกตัวไหน · narrow สิทธิ์ตอนนี้ = เสี่ยงพังของที่ตรวจเองไม่ได้
--       ⇒ **ยกให้เจ้าของตัดสิน** (ledger #111)
--
-- 🔴 ปัญหาเดิมที่ปิด (ledger #110): ฟังก์ชันนี้ถูกสร้างตอนแผน identity ยังเป็น **(ก) service key ในแอป OS**
--    พอเจ้าของเปลี่ยนเป็น **(ข)** (ADR-0016) แอป OS ใช้ anon key + session = role `authenticated`
--    ⇒ `has_function_privilege('authenticated', …, 'execute')` = **false** ⇒ **ไม่มีใครเรียกได้เลย**
--    ฟังก์ชันอยู่บน production มาตั้งแต่ 08:54 แต่เป็นของตายทั้งวัน
--
-- 🔑 ทำไมไม่ใช่แค่ `grant execute … to authenticated` เปล่า ๆ:
--    ลูกค้าของเราทุกคนเป็น `authenticated` (วันนี้ 4 บัญชี) ⇒ grant เปล่า = **ลูกค้าเราเห็นผลแคมเปญของเราเอง**
--    ⇒ ต้องมีด่านตรวจ "เป็นสมาชิก Marketing OS workspace หรือไม่" **อยู่ในตัวฟังก์ชัน**
--    (หลักเดียวกับ RLS policy ของ 0072 — เส้นแบ่งบังคับโดยฐาน ไม่ใช่โดยโค้ดแอป)
--
-- 🔒 กฎที่ยังอยู่ครบ:
--    · `anon` **ยังไม่ได้อะไรเลย** — revoke ไว้ชัด ๆ (ใครก็ได้บนอินเทอร์เน็ต ⇒ ห้ามตลอดกาล)
--    · คืน **ตัวเลขรวมเท่านั้น** — ไม่มี session id / อีเมล / เบอร์ / ชื่อ ออกจาก `public` เลย
--    · `security definer` · `search_path = ''` · อ่านอย่างเดียว (`stable`)
--    · ตัว body ของ query **ไม่เปลี่ยนแม้บรรทัดเดียว** จาก 0073 — ที่เพิ่มคือด่านตรวจสมาชิกข้างหน้า
--
-- 🔑 เงื่อนไขด่าน: `auth.uid() is not null` **และ** ไม่ใช่สมาชิก ⇒ ปฏิเสธ `42501`
--    ⇒ ผู้เรียกฝั่งเซิร์ฟเวอร์ (`service_role` / ต่อ Postgres ตรง) ไม่มี `auth.uid()` ⇒ ผ่าน
--    ⇒ ปลอดภัยเพราะ `anon` ไม่มีสิทธิ์ execute ตั้งแต่แรก ⇒ คนที่ `auth.uid()` ว่างและเรียกได้ = ฝั่งเซิร์ฟเวอร์เท่านั้น

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
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and not exists (
       select 1 from marketing_os.workspace_members m where m.user_id = auth.uid()
     )
  then
    raise exception 'ไม่ใช่สมาชิก Marketing OS workspace' using errcode = '42501';
  end if;

  return query
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
end;
$$;

comment on function public.marketing_os_funnel_summary(timestamptz) is
  'ADR-0012 bridge: aggregated SaaS landing results per segment/UTM for Marketing OS. Counts only, no PII. Members of a marketing_os workspace, or server-side callers, only.';

revoke all on function public.marketing_os_funnel_summary(timestamptz) from public, anon;
grant execute on function public.marketing_os_funnel_summary(timestamptz) to authenticated, service_role;
