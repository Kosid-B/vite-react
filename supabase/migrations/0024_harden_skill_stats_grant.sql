-- =====================================================
-- CEO AI Thailand — Hardening เพิ่มเติม: admin_skill_adoption()
-- พบระหว่างตรวจสอบ migration ทั้งหมดบน main (0001–0019) หา anon-grant gap
-- เพิ่มเติมจาก 0020 ซึ่งครอบเฉพาะฟังก์ชันใน 0002/0003/0005
--
-- ปัญหา: 0007_skill_stats.sql grant execute ให้ authenticated แต่ไม่เคย revoke จาก public
-- ผลกระทบจริง: ต่ำ — ฟังก์ชันมี guard ภายใน (is_app_admin() ก่อน) anon เรียกได้แค่ raise 'forbidden'
-- แต่ยังผิดหลัก least-privilege (8.2/8.3) — ควรปิดที่ระดับ grant ไม่ใช่พึ่ง runtime check อย่างเดียว
--
-- หมายเหตุ: ตรวจ lead_count() (0015_storefront_leads.sql) แล้ว — grant anon เป็นการออกแบบที่ตั้งใจ
-- (แสดง social-proop บนหน้าร้านสาธารณะ, คืนแค่ count, ตาราง RLS ล็อกอยู่แล้ว) ไม่ต้องแก้
-- =====================================================

revoke execute on function public.admin_skill_adoption() from public;
grant  execute on function public.admin_skill_adoption() to authenticated;
