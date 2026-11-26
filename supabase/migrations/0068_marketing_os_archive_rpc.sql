-- 0068 — ปิดขั้นสุดท้ายของท่อ behavior ให้ไม่ต้องพึ่ง "Exposed schemas" ของ PostgREST
--
-- 🔴 บั๊กจริงบน production (พบ 26 พ.ย. 2569 · ledger #105):
--    batch ที่เข้ามาจริง 2 ก้อน (23 + 25 พ.ย. · mode='live') มี archived_at = NULL ทั้งคู่
--    ไล่ทีละขั้นแล้วพบว่า ①rpc เขียนแถว ✅ ②สร้าง bucket ✅ ③อัปไฟล์ ✅ (2 ไฟล์ตรงกับ 2 batch)
--    ❌ เหลือขั้นเดียวที่ไม่ผ่าน = `db.schema('marketing_os').from(...).update(...)`
--    ⇒ PostgREST ยอมรับ schema ที่อยู่ใน "Exposed schemas" เท่านั้น (ค่าเริ่มต้น public, graphql_public)
--      ซึ่งเป็น **config ของแพลตฟอร์ม ไม่ได้อยู่ในฐานข้อมูล** ⇒ รีโปตรวจเองไม่ได้ และบังคับไม่ได้
--
-- ⇒ กติกาใหม่: ท่อเข้า `marketing_os` **ผ่าน rpc ใน `public` เท่านั้น** (ADR-0012)
--   ของที่พึ่งค่าที่เราตรวจไม่ได้ = ของที่พังเงียบแล้วไม่มีใครรู้ว่าทำไม
--
-- 🔒 ความปลอดภัยเท่าเดิมทุกข้อ: security definer + search_path ว่าง + grant ให้ service_role เท่านั้น
--    `marketing_os` ยังไม่ถูกเปิดให้ PostgREST มองเห็น และยังไม่มี policy/grant ให้ anon/authenticated

create or replace function public.mark_marketing_behavior_archived(
  p_id uuid,
  p_hash text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  update marketing_os.marketing_behavior_batches
     set archived_at = now()
   where id = p_id
     and payload_hash = p_hash
     and archived_at is null;
  get diagnostics n = row_count;
  if n > 0 then
    return 'archived';
  end if;

  -- แยก "เก็บคลังไปแล้ว" ออกจาก "ไม่มีแถวนี้" — สองอย่างนี้คนละปัญหา
  -- (ลองซ้ำหลังสำเร็จ = ปกติ · ไม่เจอแถว = hash ไม่ตรง หรือ batch ไม่เคยถูกบันทึก)
  if exists (
    select 1 from marketing_os.marketing_behavior_batches
     where id = p_id and payload_hash = p_hash
  ) then
    return 'already_archived';
  end if;

  return 'not_found';
end;
$$;

revoke all on function public.mark_marketing_behavior_archived(uuid, text) from public, anon, authenticated;
grant execute on function public.mark_marketing_behavior_archived(uuid, text) to service_role;
