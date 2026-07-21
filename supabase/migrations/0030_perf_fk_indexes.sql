-- 0030_perf_fk_indexes.sql
-- ---------------------------------------------------------------------------
-- Performance: เพิ่ม covering index ให้ foreign key ที่ query บ่อย (จาก get_advisors
-- performance บน prod 2026-07-11) — FK ที่ไม่มี index ทำให้ join/RLS membership check
-- ช้าลงเมื่อข้อมูลโต · ตอนนี้ตารางยังเล็ก (pre-launch) สร้างได้ทันที lock แทบไม่มี
--
-- ขอบเขต: เฉพาะตารางของแอปนี้ (workspaces/members/storefront_leads) — ไม่แตะ cj_* / gz_*
-- ซึ่งเป็นของแอปอื่นในโปรเจกต์ Supabase เดียวกัน (นอกขอบเขต repo นี้)
-- ---------------------------------------------------------------------------

-- workspace_members.user_id — ใช้ทุกครั้งที่เช็คสมาชิก (is_member) + list workspace ของ user
create index if not exists idx_workspace_members_user_id on public.workspace_members (user_id);

-- workspaces.owner_id — owner-guard (delete_workspace, RLS ws_delete) + list ร้านของ owner
create index if not exists idx_workspaces_owner_id on public.workspaces (owner_id);

-- storefront_leads.slug (FK → storefronts.slug) — lead_count() + ดึง lead ต่อร้าน
create index if not exists idx_storefront_leads_slug on public.storefront_leads (slug);
