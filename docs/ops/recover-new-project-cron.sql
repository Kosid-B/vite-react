-- ============================================================
-- RECOVER (ทำทีหลัง): pg_cron jobs — billing / weekly / daily CEO report
-- ⚠️ รันหลังจาก: (1) Database→Extensions เปิด pg_cron, pg_net
--                (2) deploy edge functions (billing-cron, weekly-report, daily-ceo-report)
--                (3) supabase secrets set CRON_SECRET=... RESEND_API_KEY=...
-- ============================================================

-- ==================== 0004_billing_cron.sql ====================
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


-- ==================== 0008_weekly_report_cron.sql ====================
-- =====================================================
-- CEO AI Thailand — Weekly Agent Report (PLG Retention)
-- เรียก Edge Function weekly-report ทุกวันศุกร์ 02:00 UTC (~09:00 ไทย)
-- =====================================================
-- ต้อง deploy ฟังก์ชันก่อน:  supabase functions deploy weekly-report --no-verify-jwt
-- ใช้ CRON_SECRET + RESEND_API_KEY เดียวกับ billing-cron

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- แก้ <PROJECT_REF> ให้ตรงโปรเจกต์ก่อนรัน
-- secret อ่านจาก database setting เดียวกับ billing-cron:
--   alter database postgres set app.cron_secret = '<ค่าเดียวกับ CRON_SECRET>';

select cron.unschedule('weekly-report-friday')
  where exists (select 1 from cron.job where jobname = 'weekly-report-friday');

select cron.schedule(
  'weekly-report-friday',
  '0 2 * * 5',  -- ทุกวันศุกร์ 02:00 UTC (~09:00 ไทย)
  $$
    select net.http_post(
      url     := 'https://<PROJECT_REF>.functions.supabase.co/weekly-report',
      headers := jsonb_build_object('content-type','application/json','x-cron-secret',current_setting('app.cron_secret', true)),
      body    := '{}'::jsonb
    );
  $$
);

-- ตรวจงานที่ตั้งไว้:  select * from cron.job;


-- ==================== 0021_daily_ceo_report_cron.sql ====================
-- =====================================================
-- CEO AI Thailand — Daily CEO Board Report
-- เรียก Edge Function daily-ceo-report ทุกวัน 02:00 UTC (~09:00 ไทย)
-- CEO สรุปรายงานประจำวัน + เสนอ Issue ให้บอร์ด (ในระบบ + อีเมล Resend)
-- =====================================================
-- ต้อง deploy ฟังก์ชันก่อน:  supabase functions deploy daily-ceo-report --no-verify-jwt
-- ใช้ CRON_SECRET + RESEND_API_KEY เดียวกับ weekly-report/billing-cron

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- แก้ <PROJECT_REF> ให้ตรงโปรเจกต์ก่อนรัน (rsjbqmnvocvtveelselj)
-- secret อ่านจาก database setting เดียวกับ billing-cron/weekly-report:
--   alter database postgres set app.cron_secret = '<ค่าเดียวกับ CRON_SECRET>';

select cron.unschedule('daily-ceo-report-9am')
  where exists (select 1 from cron.job where jobname = 'daily-ceo-report-9am');

select cron.schedule(
  'daily-ceo-report-9am',
  '0 2 * * *',  -- ทุกวัน 02:00 UTC (~09:00 ไทย)
  $$
    select net.http_post(
      url     := 'https://<PROJECT_REF>.functions.supabase.co/daily-ceo-report',
      headers := jsonb_build_object('content-type','application/json','x-cron-secret',current_setting('app.cron_secret', true)),
      body    := '{}'::jsonb
    );
  $$
);

-- ตรวจงานที่ตั้งไว้:  select * from cron.job;

