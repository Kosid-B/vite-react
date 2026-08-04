-- =====================================================
-- CEO AI Thailand — Platform Testimonials (รีวิวแพลตฟอร์มจากสมาชิกจริง → โชว์บน Landing)
-- ต่างจาก storefront_reviews (0031 = รีวิวสินค้าในร้าน) — อันนี้คือรีวิว "ตัวระบบ CEO AI Thailand"
-- ซื่อสัตย์: เขียนได้เฉพาะสมาชิกที่ล็อกอิน (ผูก workspace จริง) → แอดมินอนุมัติก่อน → อ่านสาธารณะเฉพาะ approved
--   (ไม่มีรีวิว anonymous / ไม่มี auto-publish — กันรีวิวปลอม/สแปม สอดคล้องนโยบาย trust ของหน้า landing)
-- =====================================================

create table if not exists public.platform_testimonials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,  -- ผูกสมาชิกจริง
  author_name  text not null default '',          -- ชื่อที่แสดง (เจ้าของธุรกิจ)
  company_name text not null default '',           -- ชื่อบริษัท/ร้าน (ไม่บังคับ)
  role         text not null default '',           -- ตำแหน่ง/ประเภทธุรกิจ (ไม่บังคับ)
  rating       smallint not null check (rating between 1 and 5),
  body         text not null check (char_length(body) between 1 and 1000),
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  featured     boolean not null default false,     -- แอดมินปักหมุดขึ้นก่อน (โชว์เด่นบน landing)
  note         text not null default '',           -- หมายเหตุแอดมิน (เช่น เหตุผลปฏิเสธ)
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references auth.users(id)
);

create index if not exists pt_ws_idx      on public.platform_testimonials (workspace_id);
create index if not exists pt_pending_idx on public.platform_testimonials (status) where status = 'pending';
-- อ่านสาธารณะบน landing: ดึงเฉพาะ approved เรียง featured→ล่าสุด
create index if not exists pt_approved_idx on public.platform_testimonials (status, featured, created_at desc) where status = 'approved';

alter table public.platform_testimonials enable row level security;

-- สมาชิก workspace: เขียนรีวิวของตัวเอง (บังคับ status=pending — เปิดเองไม่ได้)
drop policy if exists pt_member_insert on public.platform_testimonials;
create policy pt_member_insert on public.platform_testimonials for insert
  to authenticated
  with check (public.is_member(workspace_id) and status = 'pending');

-- อ่านสาธารณะ: ใครก็ได้ (รวม anon) เห็นเฉพาะ approved → โชว์บน landing โดยไม่ต้องล็อกอิน
drop policy if exists pt_public_select on public.platform_testimonials;
create policy pt_public_select on public.platform_testimonials for select
  using (status = 'approved');

-- อ่านเพิ่ม (authenticated): สมาชิกเห็นรีวิวของตัวเอง (เช็คสถานะ pending) · แอดมินเห็นหมด (คิวอนุมัติ)
drop policy if exists pt_member_admin_select on public.platform_testimonials;
create policy pt_member_admin_select on public.platform_testimonials for select
  to authenticated
  using (public.is_member(workspace_id) or public.is_app_admin());

-- แอดมินเท่านั้น: อนุมัติ/ปฏิเสธ/ปักหมุด (แก้ status/featured/note)
drop policy if exists pt_admin_update on public.platform_testimonials;
create policy pt_admin_update on public.platform_testimonials for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());
