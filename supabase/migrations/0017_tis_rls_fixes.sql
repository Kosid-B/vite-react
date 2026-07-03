-- =====================================================================
-- TIS Automate — แก้ตาม Supabase security advisors หลัง init
-- (applied บน project tis-automate: galtbbkcddugnsfkgyqm — ไม่ใช่ project หลัก)
-- 1) standard_updates / marketing_events ไม่ได้เปิด RLS (ERROR)
-- 2) is_org_member เรียกผ่าน RPC ได้จาก anon (WARN)
-- =====================================================================

-- standard_updates: ข้อมูลอัปเดตมาตรฐาน — อ่านได้เฉพาะผู้ใช้ที่ล็อกอิน (เขียน = service_role)
alter table public.standard_updates enable row level security;
create policy "read standard updates" on public.standard_updates
  for select using (auth.role() = 'authenticated');

-- marketing_events: event วิเคราะห์ funnel — แอปยิง insert ได้ (รวมก่อนสมัคร) อ่านเฉพาะ service_role
alter table public.marketing_events enable row level security;
create policy "insert marketing events" on public.marketing_events
  for insert to anon, authenticated with check (true);

-- is_org_member: ใช้ภายใน RLS policies เท่านั้น — ตัดสิทธิ์เรียกตรงจาก anon/public
revoke execute on function public.is_org_member(uuid) from public;
revoke execute on function public.is_org_member(uuid) from anon;
grant execute on function public.is_org_member(uuid) to authenticated;
