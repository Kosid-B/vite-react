-- =====================================================
-- CEO AI Thailand — Storefront Reviews (Marketplace liquidity / SEO AggregateRating)
-- รีวิวร้านค้า → คำนวณ rating/review_count อัตโนมัติ → worker inject AggregateRating (rich snippet ดาว)
-- ซื่อสัตย์: รีวิวควรผูกกับ order จริง (order_id) · schema emit ดาวเฉพาะเมื่อมีรีวิวจริง
-- =====================================================

-- 1) คอลัมน์สรุปบน storefronts (worker อ่านตรง ๆ ไม่ต้อง join)
alter table public.storefronts
  add column if not exists rating numeric(2,1),
  add column if not exists review_count integer not null default 0;

-- 2) ตารางรีวิว
create table if not exists public.storefront_reviews (
  id uuid primary key default gen_random_uuid(),
  slug text not null references public.storefronts(slug) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,   -- ผูกออเดอร์จริง (nullable สำหรับดีล RFQ)
  rating smallint not null check (rating between 1 and 5),
  review_text text not null default '',
  reviewer_name text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists storefront_reviews_slug_idx on public.storefront_reviews (slug);

alter table public.storefront_reviews enable row level security;

-- อ่านได้สาธารณะ (marketplace public)
drop policy if exists sr_select on public.storefront_reviews;
create policy sr_select on public.storefront_reviews for select using (true);

-- เขียนได้เฉพาะผู้ล็อกอิน (กันสแปม anon) — ไม่ให้รีวิวร้านตัวเอง
drop policy if exists sr_insert on public.storefront_reviews;
create policy sr_insert on public.storefront_reviews for insert
  to authenticated
  with check (
    not exists (
      select 1 from public.storefronts s
      where s.slug = storefront_reviews.slug and public.is_member(s.workspace_id)
    )
  );

-- 3) recompute rating/review_count เมื่อรีวิวเปลี่ยน (insert/update/delete)
create or replace function public.recompute_storefront_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_slug text;
begin
  v_slug := coalesce(new.slug, old.slug);
  update public.storefronts s set
    review_count = (select count(*) from public.storefront_reviews r where r.slug = v_slug),
    rating       = (select round(avg(r.rating)::numeric, 1) from public.storefront_reviews r where r.slug = v_slug)
  where s.slug = v_slug;
  return null;
end;
$$;

drop trigger if exists trg_recompute_storefront_rating on public.storefront_reviews;
create trigger trg_recompute_storefront_rating
  after insert or update or delete on public.storefront_reviews
  for each row execute function public.recompute_storefront_rating();

-- ฟังก์ชัน trigger ไม่ต้องเรียกผ่าน RPC — revoke execute กัน anon/auth เรียกตรง (security advisor 0028/0029)
-- trigger ยังทำงานปกติ (รันในฐานะ table owner ไม่ผ่าน grant)
revoke execute on function public.recompute_storefront_rating() from public, anon, authenticated;
