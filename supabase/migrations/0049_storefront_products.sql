-- 0049_storefront_products.sql — Product Catalog หลาย SKU ต่อหน้าร้าน
-- ปรัชญาราคา: ไม่จำกัดจำนวน SKU (Free/Starter ไม่อั้น → ถูกค้นเจอเยอะ)
--   เก็บเงินจาก transaction 3% + หลายบริษัท (multi-company) ไม่ใช่ cap SKU
-- หลัง apply: ตั้ง CATALOG.live = true ใน src/config.ts แล้ว deploy

alter table public.storefronts
  add column if not exists products jsonb not null default '[]'::jsonb;

comment on column public.storefronts.products is
  'CatalogItem[] {id,name,price,unit,desc} — สินค้า/บริการรายชิ้น (SKU) · ไม่จำกัดจำนวนตามดีไซน์ราคา';
