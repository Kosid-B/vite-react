-- 0063 — 🔴 บั๊กที่ทำให้ "ไม่มีใครใช้ระบบได้เลย" (พบและพิสูจน์บน production 19 ส.ค. 2569)
--
-- อาการ: คนสมัครสมาชิกได้ ล็อกอินได้ แต่ **ไม่มีเวิร์กสเปซ** และงานทุกอย่างไม่ถูกบันทึกขึ้นเซิร์ฟเวอร์
--
-- สาเหตุ: ตาราง public.workspaces เปิด RLS ไว้ แต่ **ไม่มี policy สำหรับ INSERT เลย**
--   (มีแค่ SELECT / UPDATE / DELETE) · RLS ปฏิเสธโดยปริยายเมื่อไม่มี policy ที่ตรง
--   และ public.create_workspace() เป็น SECURITY INVOKER = รันด้วยสิทธิ์ผู้ใช้
--   ⇒ INSERT ถูกปฏิเสธ → ฟังก์ชัน throw → ensureDefaultWorkspace() ได้ error
--     → `console.warn` แล้ว `return null` → **แอปเดินต่อเงียบ ๆ เหมือนไม่มีอะไรเกิดขึ้น**
--
-- พิสูจน์แล้วบน production (จำลอง role authenticated + rollback):
--   DENIED 42501 :: new row violates row-level security policy for table "workspaces"
--
-- ผลจริงที่วัดได้: ผู้ใช้ภายนอก 2 คนสมัครเมื่อ 24 ก.ค. และ 28 ก.ค.
--   ทั้งคู่ล็อกอินได้ (คนหนึ่งกลับมาต่อเนื่อง 24 วัน) แต่ workspaces มีแค่ 1 แถวซึ่งเป็นของเจ้าของระบบ
--   ⇒ ทั้งสองคนไม่เคยมีที่เก็บงานบนเซิร์ฟเวอร์เลยแม้แต่วันเดียว
--
-- แก้: เพิ่ม policy INSERT ที่ยอมให้ "สร้างเวิร์กสเปซที่ตัวเองเป็นเจ้าของ" เท่านั้น
--   (แคบที่สุดเท่าที่ยังทำงานได้ · ไม่เปลี่ยน create_workspace เป็น SECURITY DEFINER
--    เพราะ definer จะข้าม RLS ทั้งก้อนซึ่งกว้างเกินจำเป็น)

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspaces' and policyname = 'ws_insert'
  ) then
    create policy ws_insert on public.workspaces
      for insert to authenticated
      with check (owner_id = (select auth.uid()));
  end if;
end $$;

comment on table public.workspaces is
  'เวิร์กสเปซของผู้ใช้ · ⚠️ ต้องมี policy INSERT เสมอ (ws_insert) — ถ้าหายไป คนสมัครใหม่จะสร้างเวิร์กสเปซไม่ได้และแอปจะเงียบ ไม่ฟ้อง (บั๊ก 19 ส.ค. 2569 · migration 0063)';
