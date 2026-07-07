-- =====================================================
-- CEO AI Thailand — Backup อัตโนมัติรายวัน (Disaster Recovery)
-- บทเรียน ก.ค. 2569: ลบ project = ข้อมูลหายทั้งหมด → ต้องมี backup ออฟไซต์
-- เรียก Edge Function backup-export ทุกวัน 18:00 UTC (~01:00 ไทย, traffic ต่ำ)
--   (1) ON-SITE:  JSON snapshot ลง Storage bucket `backups` (เก็บ 14 วัน)
--   (2) OFF-SITE: อีเมล JSON แนบไปหา admin (รอดแม้ project ถูกลบ)
-- =====================================================
-- ต้อง deploy ฟังก์ชันก่อน:  supabase functions deploy backup-export --no-verify-jwt
-- ใช้ CRON_SECRET + RESEND_API_KEY เดียวกับ cron อื่น
-- ตั้ง secret (ถ้ายังไม่ได้ตั้ง):  alter database postgres set app.cron_secret = '<CRON_SECRET>';

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- bucket เก็บ backup (private — เข้าได้เฉพาะ service_role)
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

-- แก้ <PROJECT_REF> ให้ตรงโปรเจกต์ก่อนรัน (waigsnxhrlwtiotspaim)
select cron.unschedule('backup-export-daily')
  where exists (select 1 from cron.job where jobname = 'backup-export-daily');

select cron.schedule(
  'backup-export-daily',
  '0 18 * * *',  -- ทุกวัน 18:00 UTC (~01:00 ไทย)
  $$
    select net.http_post(
      url     := 'https://<PROJECT_REF>.functions.supabase.co/backup-export',
      headers := jsonb_build_object('content-type','application/json','x-cron-secret',current_setting('app.cron_secret', true)),
      body    := '{}'::jsonb
    );
  $$
);

-- ตรวจงานที่ตั้งไว้:  select * from cron.job;
-- รันเดี๋ยวนี้เพื่อทดสอบ (แทน <PROJECT_REF> + <CRON_SECRET>):
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.functions.supabase.co/backup-export',
--     headers := jsonb_build_object('content-type','application/json','x-cron-secret','<CRON_SECRET>'),
--     body := '{}'::jsonb);
