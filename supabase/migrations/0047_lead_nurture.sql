-- =====================================================
-- CEO AI Thailand — Lead Nurture (Dark AI Marketing #3+19+20+22)
-- "อย่าทิ้ง lead": คนที่ทิ้งอีเมลไว้แต่ยังไม่สมัคร → ส่งอีเมล welcome + value + final อัตโนมัติ
-- เพื่อดึงกลับมา activate (first-party data → conversion) · ส่งเมื่อ contact เป็นอีเมลเท่านั้น
-- =====================================================

-- 1) คอลัมน์ติดตามลำดับอีเมล + seg (กลุ่มที่คนนี้เข้ามา → personalize เนื้อหา)
alter table public.platform_leads
  add column if not exists seg            text not null default '',
  add column if not exists nurture_stage  int  not null default 0,   -- อีเมลที่ส่งไปแล้ว (0..3)
  add column if not exists nurture_last_at timestamptz;

-- index ช่วย cron หา lead ที่ยังส่งไม่ครบ (stage < 3) เร็วขึ้น
create index if not exists pl_nurture_idx on public.platform_leads (nurture_stage) where nurture_stage < 3;

-- หมายเหตุ: การเขียน nurture_stage/last_at ทำโดย edge function ผ่าน service-role (bypass RLS)
-- policy insert สาธารณะเดิม (0046) ยังคุม consent + ความยาว contact เหมือนเดิม (seg ใช้ default '')

-- =====================================================
-- 2) ตั้งเวลา cron เรียก edge function lead-nurture รายวัน (mirror 0004 billing-cron)
--    ต้อง deploy ฟังก์ชันก่อน:  supabase functions deploy lead-nurture --no-verify-jwt
--    และตั้ง secret:            supabase secrets set CRON_SECRET=...  (ใช้ค่าเดียวกับ billing-cron ได้)
--    แก้ <PROJECT_REF> + <CRON_SECRET> ให้ตรงโปรเจกต์ก่อนรัน
-- =====================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('lead-nurture-daily')
  where exists (select 1 from cron.job where jobname = 'lead-nurture-daily');

select cron.schedule(
  'lead-nurture-daily',
  '30 3 * * *',  -- ทุกวัน 03:30 UTC (~10:30 ไทย) — เยื้องจาก billing-cron (02:00) กันชนกัน
  $$
    select net.http_post(
      url     := 'https://<PROJECT_REF>.functions.supabase.co/lead-nurture',
      headers := jsonb_build_object('content-type','application/json','x-cron-secret','<CRON_SECRET>'),
      body    := '{}'::jsonb
    );
  $$
);

-- ตรวจงานที่ตั้งไว้:  select * from cron.job;
