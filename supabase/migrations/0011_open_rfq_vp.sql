-- =====================================================
-- CEO AI Thailand — First Revenue Engine
-- 1) Open RFQ (ประกาศงานกลาง): RFQ ไม่ระบุผู้ขาย เปิดให้ธุรกิจในหมวด DBD
--    เดียวกันเสนอราคา — กลไกช่วยธุรกิจใหม่ "ปิดดีลแรก" (แก้ churn)
-- 2) storefronts.vp: Value Proposition (AI Agent ช่วยเขียน) โชว์บนหน้าร้าน
-- =====================================================

-- ── Open RFQ: seller_slug เป็น null ได้ + หมวด DBD ของงาน ──
alter table public.rfqs alter column seller_slug drop not null;
alter table public.rfqs add column if not exists sector text not null default '';

create index if not exists rfqs_open_idx on public.rfqs (sector) where seller_slug is null;

-- สมาชิกทุกคนเห็นประกาศงานกลางที่ยังเปิดอยู่
drop policy if exists rfq_open_select on public.rfqs;
create policy rfq_open_select on public.rfqs for select
  to authenticated
  using (seller_slug is null);

-- ผู้ขายรับงานกลาง (claim): ตั้ง seller_slug เป็นหน้าร้านของตัวเอง + เสนอราคา
drop policy if exists rfq_open_claim on public.rfqs;
create policy rfq_open_claim on public.rfqs for update
  to authenticated
  using (seller_slug is null and status = 'open')
  with check (seller_slug is not null
              and exists (select 1 from public.storefronts s
                          where s.slug = seller_slug and public.is_member(s.workspace_id)));

-- ── Value Proposition บนหน้าร้าน ──
alter table public.storefronts add column if not exists vp text not null default '';
