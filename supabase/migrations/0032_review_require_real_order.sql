-- =====================================================
-- CEO AI Thailand — Review gating: รีวิวจากลูกค้า "จริง" เท่านั้น
-- อนุญาต insert รีวิวเฉพาะเมื่อมีออเดอร์ที่ปิดแล้ว (delivered/completed) ระหว่าง
-- ผู้รีวิว (buyer_ws ที่ตัวเองเป็นสมาชิก) กับร้านนั้น (seller_ws = storefronts.workspace_id)
-- และต้องผูก order_id จริง → กันรีวิวปลอม/รีวิวลอย (สอดคล้อง AggregateRating ที่ซื่อสัตย์)
-- =====================================================

drop policy if exists sr_insert on public.storefront_reviews;
create policy sr_insert on public.storefront_reviews for insert
  to authenticated
  with check (
    order_id is not null
    and exists (
      select 1
      from public.orders o
      join public.storefronts s on s.workspace_id = o.seller_ws
      where o.id = storefront_reviews.order_id
        and s.slug = storefront_reviews.slug
        and o.status in ('delivered','completed')
        and public.is_member(o.buyer_ws)
    )
  );
