-- =====================================================
-- CJ Planner — ตั้งเวลา automate billing ด้วย pg_cron + pg_net
-- เรียก Edge Function billing-cron ทุกวัน 02:00 (UTC)
-- =====================================================
-- ต้อง deploy ฟังก์ชันก่อน:  supabase functions deploy billing-cron --no-verify-jwt
-- และตั้ง secret:            supabase secrets set CRON_SECRET=...

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- แก้ค่าต่อไปนี้ให้ตรงโปรเจกต์ของคุณก่อนรัน:
--   <PROJECT_REF>  = ref ของโปรเจกต์ (เช่น abcdxyz)
--   <CRON_SECRET>  = ค่าเดียวกับที่ตั้งใน secrets

-- ลบ schedule เดิม (ถ้ามี) แล้วตั้งใหม่
select cron.unschedule('billing-cron-daily')
  where exists (select 1 from cron.job where jobname = 'billing-cron-daily');

select cron.schedule(
  'billing-cron-daily',
  '0 2 * * *',  -- ทุกวันเวลา 02:00 UTC (~09:00 ไทย)
  $$
    select net.http_post(
      url     := 'https://<PROJECT_REF>.functions.supabase.co/billing-cron',
      headers := jsonb_build_object('content-type','application/json','x-cron-secret','<CRON_SECRET>'),
      body    := '{}'::jsonb
    );
  $$
);

-- ตรวจงานที่ตั้งไว้:  select * from cron.job;
