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
