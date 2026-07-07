-- =====================================================
-- CEO AI Thailand — Backup อัตโนมัติรายวัน (Disaster Recovery)
-- บทเรียน ก.ค. 2569: ลบ project = ข้อมูลหายทั้งหมด → ต้องมี backup ออฟไซต์
-- Edge Function backup-export:
--   (1) ON-SITE : JSON snapshot ลง Storage bucket `backups` (เก็บ 14 วันล่าสุด)
--   (2) OFF-SITE: อีเมล JSON แนบไปหา admin ผ่าน Resend (รอดแม้ทั้ง project ถูกลบ)
-- =====================================================
-- ก่อนรัน migration นี้:
--   1) supabase functions deploy backup-export --project-ref <PROJECT_REF> --no-verify-jwt
--   2) supabase secrets set --project-ref <PROJECT_REF> CRON_SECRET=<ค่าลับ> RESEND_API_KEY=<re_...>
--   3) แก้ <PROJECT_REF> = waigsnxhrlwtiotspaim และ <CRON_SECRET> ด้านล่างให้ตรงกับ secret ข้อ 2
--
-- ⚠️ Supabase managed Postgres ไม่อนุญาต `alter database ... set` (ERROR 42501: permission denied)
--    จึง "ฝัง CRON_SECRET ตรงใน header" แทน current_setting('app.cron_secret')
--    (ค่าเก็บใน cron.job เห็นเฉพาะ service_role — ยอมรับได้สำหรับ cron secret ความเสี่ยงต่ำ)

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- bucket เก็บ backup (private — เข้าถึงเฉพาะ service_role ที่ edge function ใช้)
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

-- ยกเลิก cron เดิมถ้ามี (idempotent — รันซ้ำได้)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'daily-backup-export') then
    perform cron.unschedule('daily-backup-export');
  end if;
end $$;

-- รันทุกวัน 18:30 UTC (~01:30 ไทย, traffic ต่ำ) — เรียก edge function พร้อม x-cron-secret
select cron.schedule('daily-backup-export', '30 18 * * *', $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.functions.supabase.co/backup-export',
    headers := jsonb_build_object('content-type','application/json','x-cron-secret','<CRON_SECRET>'),
    body    := jsonb_build_object('date', to_char(now(),'YYYY-MM-DD'))
  );
$$);

-- ตรวจงานที่ตั้งไว้:  select * from cron.job;
-- ทดสอบเดี๋ยวนี้ (แทน <PROJECT_REF> + <CRON_SECRET>):
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.functions.supabase.co/backup-export',
--     headers := jsonb_build_object('content-type','application/json','x-cron-secret','<CRON_SECRET>'),
--     body := '{}'::jsonb);
-- สำเร็จ = ไฟล์ backup-YYYY-MM-DD.json ใน bucket `backups` + อีเมลถึง admin (มี JSON แนบ)
