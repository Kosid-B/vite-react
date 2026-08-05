-- =====================================================
-- CEO AI Thailand — Platform Leads (First-party data: ดักเก็บคนสนใจบน landing ที่ยังไม่พร้อมสมัคร)
-- แนวคิดจาก Dark AI Marketing บทเรียน 3+19: First-party data = สินทรัพย์ · ไม่พึ่งแพลตฟอร์มเดียว
-- PDPA: เก็บเมื่อ "ยินยอม" เท่านั้น (consent=true) · เก็บ utm เพื่อรู้ว่ามาจากช่องไหน
-- =====================================================

create table if not exists public.platform_leads (
  id uuid primary key default gen_random_uuid(),
  contact  text not null,                 -- อีเมล / LINE / เบอร์
  name     text not null default '',
  interest text not null default '',       -- อยากทำธุรกิจอะไร (ไม่บังคับ)
  source   text not null default '',       -- utm_source
  medium   text not null default '',       -- utm_medium (fb/tiktok/youtube)
  campaign text not null default '',       -- utm_campaign
  consent  boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists pl_created_idx on public.platform_leads (created_at desc);

alter table public.platform_leads enable row level security;

-- ฟอร์มสาธารณะบน landing (ไม่ล็อกอิน) ส่ง lead ได้ — ต้องยินยอม (PDPA) + contact ยาวพอ (กันสแปมเปล่า)
drop policy if exists pl_public_insert on public.platform_leads;
create policy pl_public_insert on public.platform_leads for insert
  with check (consent = true and char_length(contact) between 5 and 200 and char_length(coalesce(name,'')) <= 120);

-- อ่านได้เฉพาะแอดมิน (ข้อมูลติดต่อ = ข้อมูลส่วนบุคคล)
drop policy if exists pl_admin_select on public.platform_leads;
create policy pl_admin_select on public.platform_leads for select
  to authenticated using (public.is_app_admin());
