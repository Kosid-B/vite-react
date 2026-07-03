-- =====================================================
-- CEO AI Thailand — Marketplace: หมวดสินค้า/บริการ + โฆษณาร้านค้า
-- kind          : ประเภทร้าน (product/service/both) — ใช้กรองบนสารบัญตลาด /b
-- promo         : ข้อความโฆษณา/โปรโมชันของร้าน (ร้านแก้เอง แสดงเด่นบนตลาด)
-- featured_until: ตำแหน่ง "ร้านแนะนำ" ปักหมุดบนสุดของ /b — admin ตั้ง
--                 (คู่กับแพ็กเกจประมูลตำแหน่งแนะนำใน /shop)
-- =====================================================

alter table public.storefronts
  add column if not exists kind text not null default 'both'
    check (kind in ('product','service','both')),
  add column if not exists promo text not null default '',
  add column if not exists featured_until timestamptz;

create index if not exists storefronts_featured_idx
  on public.storefronts (featured_until desc) where featured_until is not null;

-- admin ระบบจัดการทุกร้านได้ (ตั้ง/ถอดตำแหน่งร้านแนะนำ) — เดิมมีเฉพาะ member ของ workspace
drop policy if exists sf_admin_all on public.storefronts;
create policy sf_admin_all on public.storefronts for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());
