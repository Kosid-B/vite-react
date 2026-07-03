-- =====================================================
-- CEO AI Thailand — รูปภาพสินค้าบนหน้าร้าน/ตลาด
-- Gap จากผลประเมิน segment แม่ค้า: ขายของไทยโดยไม่มีรูปแทบเป็นไปไม่ได้
-- =====================================================

-- URL รูปสินค้า (สูงสุด 6 รูป — บังคับที่ frontend)
alter table public.storefronts
  add column if not exists images text[] not null default '{}';

-- Storage bucket สาธารณะสำหรับรูปสินค้า (จำกัด 2MB/ไฟล์ เฉพาะไฟล์รูป)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-images', 'shop-images', true, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- อัปโหลด/จัดการได้เฉพาะผู้ใช้ล็อกอิน ในโฟลเดอร์ workspace ตัวเอง (path = <ws_id>/ไฟล์)
drop policy if exists "shop images upload" on storage.objects;
create policy "shop images upload" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'shop-images'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "shop images delete" on storage.objects;
create policy "shop images delete" on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'shop-images'
    and public.is_member(((storage.foldername(name))[1])::uuid)
  );

-- อ่านสาธารณะ (bucket public อยู่แล้ว — policy select สำหรับ REST list)
drop policy if exists "shop images read" on storage.objects;
create policy "shop images read" on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'shop-images');
