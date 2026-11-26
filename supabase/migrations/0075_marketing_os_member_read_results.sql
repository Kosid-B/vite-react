-- 0075 — ให้สมาชิก workspace อ่าน "ผลที่ไหลข้ามระบบ" ได้ในแอป OS (อ่านอย่างเดียว · เจ้าของสั่ง "ติดอะไรแก้ไขด้วย" 26 พ.ย. 2569)
--
-- ⚠️ ไฟล์นี้เป็น **บันทึกของสิ่งที่ apply ไปแล้ว** บน production `waigsnxhrlwtiotspaim`
--    (apply ผ่าน MCP 26 พ.ย. 2569 · ชื่อใน production = `0075_marketing_os_member_read_results` — เลขตรงกันสองฝั่ง)
--
-- 🔴 ทำไมต้องมี — ADR-0016 ข้อ 6 ปิด 2 ตารางนี้ไว้เพราะ **"แอปไม่ได้ query"** (เปิดเท่าที่ใช้จริง)
--    เงื่อนไขนั้นเปลี่ยนแล้ว: แอป OS มีหน้า "กฎแบรนด์" และ "ผลลัพธ์" ที่ query จริง
--    ⇒ ล็อกอินด้วยบัญชีเจ้าของแล้ว ข้อมูลที่ไหลจาก SaaS เข้ามา (behavior events · ผล landing) มองไม่เห็นในแอปเลย
--    ⇒ สองระบบ "เชื่อมที่ฐาน" แต่ "ไม่เชื่อมที่หน้าจอ" — ไฟล์นี้ปิดช่องนั้นโดยใช้หลักเดียวกับ ADR-0016
--
-- 🔒 ขอบเขต (แคบที่สุดที่หน้าจอใช้):
--    • SELECT เท่านั้น — ไม่มี insert/update/delete ทั้งสองตาราง (ท่อ ingest ยังเป็นคนเขียนคนเดียว)
--    • behavior_events: grant **ระดับคอลัมน์** — ไม่รวม `session_id` (ผูกกับเครื่อง = ระบุตัวได้ · ledger #105)
--      และไม่รวม `batch_id` (ของภายในท่อ)
--    • policy อิงการเป็นสมาชิก (`marketing_os.is_workspace_member` จาก 0072) — ลูกค้า SaaS คนอื่นได้ 0 แถว
--    • ผล landing: ไม่เปิด rpc ตัวเดิม (0073 · service_role) ให้ใคร — สร้างตัวห่อที่ **ตรวจสมาชิกก่อนคืนค่า**
--      ⇒ คนที่ล็อกอินได้แต่ไม่ใช่สมาชิก OS (ลูกค้า SaaS 3 บัญชี) เรียกแล้วได้ 42501
--    • anon ไม่ได้อะไรเลย · ระบุชื่อตารางทีละตัว ไม่เหวี่ยงทั้ง schema · ไม่ตั้งสิทธิ์ล่วงหน้าให้ตารางอนาคต (B1)
--
-- ↩️ ย้อนกลับ: drop policy ×2 · revoke select … from authenticated ×2 · drop function public.os_member_funnel_summary

-- ① กฎแบรนด์ — อ่านได้เฉพาะสมาชิกของ workspace นั้น
grant select on marketing_os.marketing_brand_rules to authenticated;
create policy marketing_brand_rules_member_read on marketing_os.marketing_brand_rules
  for select to authenticated
  using (marketing_os.is_workspace_member(workspace_id));

-- ② behavior events — อ่านได้เฉพาะคอลัมน์ที่หน้าจอใช้ (ไม่มี session_id / batch_id)
grant select (id, workspace_id, occurred_at, source, name, topic, format, mode)
  on marketing_os.marketing_behavior_events to authenticated;
create policy marketing_behavior_events_member_read on marketing_os.marketing_behavior_events
  for select to authenticated
  using (marketing_os.is_workspace_member(workspace_id));

-- ③ ผล landing ของ SaaS — ตัวห่อที่ตรวจสมาชิกก่อน แล้วค่อยเรียกตัวจริง (0073)
create or replace function public.os_member_funnel_summary(
  p_workspace uuid,
  p_since timestamptz default now() - interval '30 days'
)
returns table (
  seg text, os_code text, utm_source text, utm_campaign text,
  sessions bigint, reached_cta bigint, reached_signup bigint, leads bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not marketing_os.is_workspace_member(p_workspace) then
    raise exception 'not a member of this workspace' using errcode = '42501';
  end if;
  return query select * from public.marketing_os_funnel_summary(p_since);
end;
$$;

comment on function public.os_member_funnel_summary(uuid, timestamptz) is
  'Member-checked wrapper over marketing_os_funnel_summary (0073). Aggregates only, no PII. authenticated members only.';

revoke all on function public.os_member_funnel_summary(uuid, timestamptz) from public, anon;
grant execute on function public.os_member_funnel_summary(uuid, timestamptz) to authenticated, service_role;
