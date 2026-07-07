-- =====================================================
-- CEO AI Thailand — R14: ปิด public listing ของ shop-images bucket
-- ISO/IEC 27001:2022 control 8.3 (การจำกัดการเข้าถึงข้อมูล) / ISO 27040 (object storage)
--
-- พบจาก Supabase security advisor (public_bucket_allows_listing) บน production:
-- policy "shop images read" ให้ SELECT แก่ anon+authenticated แบบกว้าง (แค่เช็ค bucket_id)
-- ทำให้เรียก storage.from('shop-images').list() enumerate ไฟล์/โฟลเดอร์ทั้งหมดได้ (เห็น workspace UUID
-- ที่ใช้เป็นชื่อโฟลเดอร์ + รายชื่อไฟล์ทั้งหมด) — เกินความจำเป็นเพราะ bucket นี้ public=true อยู่แล้ว
-- (การโชว์รูปหน้าร้านสาธารณะใช้ getPublicUrl() ตรง ไม่พึ่ง RLS นี้เลย — ยืนยันจาก grep frontend
-- พบใช้แค่ getPublicUrl() ไม่มี .list() ที่ไหนเลย จึงไม่กระทบฟีเจอร์ใดๆ)
--
-- แก้ให้ตรงรูปแบบเดียวกับ policy upload/delete ที่มีอยู่แล้ว (จำกัดด้วย is_member ของโฟลเดอร์ตัวเอง)
-- ไฟล์นี้ idempotent (drop + create ซ้ำได้ปลอดภัย)
-- =====================================================

drop policy if exists "shop images read" on storage.objects;
create policy "shop images read" on storage.objects for select
  to authenticated
  using (bucket_id = 'shop-images' and is_member(((storage.foldername(name))[1])::uuid));

-- หมายเหตุ: ผู้เยี่ยมชมสาธารณะ (anon) ยังเห็นรูปหน้าร้านได้ปกติ — bucket เป็น public=true
-- จึงเสิร์ฟไฟล์ผ่าน public URL ตรง (getPublicUrl) โดยไม่ต้องพึ่ง RLS select นี้เลย
