-- 0072 — identity ทาง (ข): แมปบัญชีเดียว + RLS อิงการเป็นสมาชิก (ADR-0016 แทน ADR-0015)
--
-- 🟢 ทำไม (ข) ถูกกว่าที่ประเมินไว้ตลอด: วัดสด 26 พ.ย. 2569 พบว่า "ผู้ใช้ 11 คน" คือ
--    **ผู้ใช้จริง 1 คน + fixture ของเทสต์ RLS 10 คน** (ledger #109) และคนจริงคนนั้นคือ
--    `support@b-tctraining.com` ซึ่ง **มีบัญชีในฐานเราอยู่แล้ว** (สร้าง 27 มิ.ย. 2569)
--    ⇒ ไม่ต้องสร้างบัญชีใหม่เลย · เหลือแค่แมป 1 แถว + เขียน policy
--
-- 🔴 เส้นแบ่งที่ตั้งใจเลือก
--    · `anon` **ไม่ได้รับอะไรเลย ตลอดกาล** (ไม่มี usage · ไม่มี grant · ไม่มี policy)
--    · `authenticated` ได้เฉพาะ **17 ตารางที่แอป OS query จริง** — ห้าม `all tables in schema`
--      และห้าม `alter default privileges` (บทเรียน 0069: ตารางที่สร้างทีหลังจะได้สิทธิ์ติดมาเงียบ ๆ)
--    · อีก 6 ตาราง (`marketing_behavior_*` 4 · `marketing_brand_rules` · `workspace_state`)
--      ยังเป็น **service_role เท่านั้น** — ท่อ ingest ของเราไม่ควรเปิดให้เบราว์เซอร์
--    · `workspaces` + `workspace_members` ให้ **SELECT เท่านั้น**
--      🔴 ถ้าให้ INSERT บน `workspace_members` ได้ = สมาชิกเพิ่มคนอื่นเข้า workspace ตัวเองได้
--         ซึ่งแอป single-tenant ไม่ต้องใช้ ⇒ ปิดไว้
--
-- 🔒 เส้นแบ่ง workspace ถูกบังคับโดย **Postgres** ไม่ใช่โค้ดแอป (นี่คือเหตุผลที่เลือก (ข) แทน (ก))

insert into marketing_os.workspace_members (workspace_id, user_id, role)
values ('e82e7d93-b88e-48ff-9364-b54bcff5278d', 'd9c45d9c-9276-4a3d-ae90-e323ccbbeeda', 'owner')
on conflict (workspace_id, user_id) do nothing;

-- ตัวตรวจสมาชิก — `security definer` เพื่อไม่ให้ policy ของ workspace_members เรียกตัวเองวนซ้ำ
create or replace function marketing_os.is_workspace_member(p_ws uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from marketing_os.workspace_members m
    where m.workspace_id = p_ws and m.user_id = auth.uid()
  );
$$;
revoke all on function marketing_os.is_workspace_member(uuid) from public, anon;
grant execute on function marketing_os.is_workspace_member(uuid) to authenticated, service_role;

grant usage on schema marketing_os to authenticated;

grant select, insert, update, delete on marketing_os.marketing_action_items to authenticated;
create policy marketing_action_items_member_rw on marketing_os.marketing_action_items for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));

grant select, insert, update, delete on marketing_os.marketing_ai_jobs to authenticated;
create policy marketing_ai_jobs_member_rw on marketing_os.marketing_ai_jobs for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));

grant select, insert, update, delete on marketing_os.marketing_approval_requests to authenticated;
create policy marketing_approval_requests_member_rw on marketing_os.marketing_approval_requests for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));

grant select, insert, update, delete on marketing_os.marketing_audience_segments to authenticated;
create policy marketing_audience_segments_member_rw on marketing_os.marketing_audience_segments for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));

grant select, insert, update, delete on marketing_os.marketing_brands to authenticated;
create policy marketing_brands_member_rw on marketing_os.marketing_brands for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));

grant select, insert, update, delete on marketing_os.marketing_campaign_hypotheses to authenticated;
create policy marketing_campaign_hypotheses_member_rw on marketing_os.marketing_campaign_hypotheses for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));

grant select, insert, update, delete on marketing_os.marketing_campaigns to authenticated;
create policy marketing_campaigns_member_rw on marketing_os.marketing_campaigns for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));

grant select, insert, update, delete on marketing_os.marketing_compliance_findings to authenticated;
create policy marketing_compliance_findings_member_rw on marketing_os.marketing_compliance_findings for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));

grant select, insert, update, delete on marketing_os.marketing_content_assets to authenticated;
create policy marketing_content_assets_member_rw on marketing_os.marketing_content_assets for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));

grant select, insert, update, delete on marketing_os.marketing_content_items to authenticated;
create policy marketing_content_items_member_rw on marketing_os.marketing_content_items for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));

grant select, insert, update, delete on marketing_os.marketing_content_versions to authenticated;
create policy marketing_content_versions_member_rw on marketing_os.marketing_content_versions for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));

grant select, insert, update, delete on marketing_os.marketing_ctas to authenticated;
create policy marketing_ctas_member_rw on marketing_os.marketing_ctas for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));

grant select, insert, update, delete on marketing_os.marketing_message_pillars to authenticated;
create policy marketing_message_pillars_member_rw on marketing_os.marketing_message_pillars for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));

grant select, insert, update, delete on marketing_os.marketing_offers to authenticated;
create policy marketing_offers_member_rw on marketing_os.marketing_offers for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));

grant select, insert, update, delete on marketing_os.marketing_tracking_links to authenticated;
create policy marketing_tracking_links_member_rw on marketing_os.marketing_tracking_links for all to authenticated
  using (marketing_os.is_workspace_member(workspace_id))
  with check (marketing_os.is_workspace_member(workspace_id));
-- สองตารางนี้อ่านได้เท่านั้น (กันการเพิ่มสมาชิก/สร้าง workspace จากเบราว์เซอร์)
grant select on marketing_os.workspaces to authenticated;
create policy workspaces_member_read on marketing_os.workspaces for select to authenticated
  using (marketing_os.is_workspace_member(id));

grant select on marketing_os.workspace_members to authenticated;
create policy workspace_members_member_read on marketing_os.workspace_members for select to authenticated
  using (marketing_os.is_workspace_member(workspace_id));
