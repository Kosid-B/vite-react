-- 0037_storefront_logo_svg.sql — โลโก้แบรนด์ (SVG) ต่อหน้าร้าน
-- จาก CEO เสนอชื่อ+โลโก้ (aiCompany.logoSvg) · worker เสิร์ฟที่ /b/<slug>/logo.svg
-- + ใส่ JSON-LD LocalBusiness.logo (Google ใช้)
-- ⚠️ apply บน prod แล้วผ่าน MCP (version 20260728101311) — ไฟล์นี้บันทึกประวัติให้ repo ตรงกับ DB
alter table public.storefronts add column if not exists logo_svg text;
