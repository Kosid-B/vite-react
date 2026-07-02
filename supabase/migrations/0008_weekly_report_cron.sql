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
