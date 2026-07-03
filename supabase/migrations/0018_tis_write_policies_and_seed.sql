-- =====================================================================
-- TIS Automate — write policies + seed มาตรฐาน (applied บน galtbbkcddugnsfkgyqm แล้ว)
-- ห้าม apply กับ project หลัก rsjbqmnvocvtveelselj
-- =====================================================================

-- ผู้ใช้ล็อกอินสร้าง "ธุรกิจ" ของตัวเองได้ + เพิ่มตัวเองเป็น owner ตอนสร้าง
create policy "create own org" on public.organizations
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "join own org as owner" on public.organization_members
  for insert to authenticated
  with check (user_id = auth.uid() and role = 'owner');

-- seed มาตรฐานตั้งต้น (TIS-first: priority_rank สูงกว่า ISO)
insert into public.standards (code, title, type, version, priority_rank, is_active)
values
  ('TIS 50-2565',  'มอก. 50-2565 เหล็กกล้าทรงแบนรีดร้อน',                    'TIS', '2565', 100, true),
  ('TIS 9001-2559','มอก. 9001-2559 ระบบบริหารงานคุณภาพ (เทียบเท่า ISO 9001)', 'TIS', '2559', 90,  true),
  ('ISO 9001',     'Quality Management Systems',                             'ISO', '2015', 50,  true),
  ('ISO 14001',    'Environmental Management Systems',                       'ISO', '2015', 40,  true),
  ('ISO 22301',    'Business Continuity Management Systems',                 'ISO', '2019', 30,  true)
on conflict (code, version) do nothing;
