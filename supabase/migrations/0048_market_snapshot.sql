-- =====================================================
-- CEO AI Thailand — Market Snapshot (Demand/Supply Board · first-party จริง)
-- demand = RFQ (ธุรกิจโพสต์หา) · supply = หน้าร้าน (storefronts) · จัดกลุ่มตาม offerKind
-- โชว์บน Landing: "หมวดนี้มีคนหา X · มีร้าน Y" = หลักฐานว่ามีดีมานด์รออยู่จริง (แก้ pain รอ walk-in)
-- จริยธรรม: ข้อมูลจริงในระบบเท่านั้น · snapshot ทุกวันที่ 1 → ตัวเลขนิ่งทั้งเดือน
-- =====================================================

create table if not exists public.market_snapshot (
  month       text not null,                 -- 'YYYY-MM'
  kind        text not null,                  -- offerKind (food/retail/material/…)
  label       text not null default '',
  demand      int  not null default 0,        -- จำนวน RFQ ในหมวด
  supply      int  not null default 0,        -- จำนวนหน้าร้านในหมวด
  snapshot_at timestamptz not null default now(),
  primary key (month, kind)
);

alter table public.market_snapshot enable row level security;

-- อ่านสาธารณะได้ (aggregate ล้วน ไม่มี PII) — โชว์บน landing โดยไม่ต้องล็อกอิน
drop policy if exists ms_public_read on public.market_snapshot;
create policy ms_public_read on public.market_snapshot for select using (true);
-- เขียนโดย service-role (edge function market-snapshot) เท่านั้น — ไม่มี policy insert/update สำหรับ anon/auth

-- =====================================================
-- cron: เรียก edge function market-snapshot วันที่ 1 ของเดือน (mirror 0004/0047)
--   ต้อง deploy ก่อน:  supabase functions deploy market-snapshot --no-verify-jwt
--   ใช้ CRON_SECRET เดิม · แก้ <PROJECT_REF>/<CRON_SECRET> ให้ตรงโปรเจกต์
-- =====================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('market-snapshot-monthly')
  where exists (select 1 from cron.job where jobname = 'market-snapshot-monthly');

select cron.schedule(
  'market-snapshot-monthly',
  '0 4 1 * *',  -- วันที่ 1 ของเดือน 04:00 UTC (~11:00 ไทย)
  $$
    select net.http_post(
      url     := 'https://<PROJECT_REF>.functions.supabase.co/market-snapshot',
      headers := jsonb_build_object('content-type','application/json','x-cron-secret','<CRON_SECRET>'),
      body    := '{}'::jsonb
    );
  $$
);
