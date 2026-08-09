-- 0050_storefront_geo.sql — ปักหมุดพิกัดร้านบนหน้าร้าน (Marketplace)
-- เพิ่มคอลัมน์ lat/lng ให้ตาราง storefronts เพื่อ:
--   1) แสดงลิงก์ "เปิดใน Google Maps" บนหน้าร้านสาธารณะ (/b/<slug>)
--   2) emit GeoCoordinates ลง LocalBusiness JSON-LD → local SEO (Google เข้าใจตำแหน่งร้าน)
-- พิกัดเป็นข้อมูลสาธารณะของหน้าร้าน (เจ้าของร้านเลือกปักเอง) — อ่านได้ตาม RLS เดิมของ storefronts

alter table public.storefronts
  add column if not exists lat double precision,
  add column if not exists lng double precision;

comment on column public.storefronts.lat is 'ละติจูดปักหมุดร้าน (−90..90) — GeoCoordinates สำหรับ local SEO';
comment on column public.storefronts.lng is 'ลองจิจูดปักหมุดร้าน (−180..180)';
