-- 0055 Checkup leads — เก็บผู้ที่ทำ "ตรวจสุขภาพระบบบริหาร" บนหน้า /checkup แล้วขอรายงานเต็ม
-- ต่างจาก landing_funnel: อันนี้เก็บ PII (อีเมล) โดยผู้ใช้ยินยอมส่งเอง เพื่อรับรายงานที่ขอ
-- ฐานทางกฎหมาย: ผู้ใช้กรอกอีเมลเองเพื่อขอรับรายงาน (สัญญา/ความยินยอมชัดเจน)
-- ห้ามใช้อีเมลนี้ทำอย่างอื่นนอกจากส่งรายงานและติดตามผลที่เกี่ยวข้อง
--
-- เขียนผ่าน RPC (anon) เท่านั้น · อ่านผ่าน RPC ที่ guard is_app_admin() เอง (แบบเดียวกับ 0051)

create table if not exists public.checkup_leads (
  id         uuid primary key default gen_random_uuid(),
  email      text        not null,
  company    text,
  pct        smallint    not null default 0,   -- 0..100 คะแนนความพร้อม
  band       text,                              -- critical/weak/developing/ready
  answers    jsonb       not null default '{}'::jsonb, -- คำตอบ 12 ข้อ (ไม่มี PII)
  source     text,                              -- utm_source ที่พามา (ถ้ามี)
  created_at timestamptz not null default now()
);
create index if not exists idx_checkup_leads_created on public.checkup_leads (created_at desc);
create index if not exists idx_checkup_leads_email on public.checkup_leads (lower(email));

alter table public.checkup_leads enable row level security;
-- ไม่มี policy สำหรับ anon/authenticated โดยตั้งใจ → เข้าได้เฉพาะผ่าน RPC security definer
-- (กันคนดึงรายชื่ออีเมลออกไป ซึ่งเป็นความเสี่ยงจริงถ้าเปิด select ให้ anon)

-- ── write RPC (anon) ────────────────────────────────────────────────────────
create or replace function public.submit_checkup_lead(
  p_email   text,
  p_company text default null,
  p_pct     int  default 0,
  p_band    text default null,
  p_answers jsonb default '{}'::jsonb,
  p_source  text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_recent int;
begin
  -- ตรวจรูปแบบอีเมลอย่างหลวม ๆ (ไม่เข้มเกินจนตัดอีเมลจริงทิ้ง)
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email';
  end if;

  -- กันยิงซ้ำ: อีเมลเดิมส่งได้ไม่เกิน 3 ครั้งใน 1 ชั่วโมง
  select count(*) into v_recent
  from public.checkup_leads
  where lower(email) = v_email and created_at > now() - interval '1 hour';
  if v_recent >= 3 then return; end if;

  insert into public.checkup_leads (email, company, pct, band, answers, source)
  values (
    left(v_email, 254),
    nullif(left(btrim(coalesce(p_company, '')), 120), ''),
    greatest(0, least(100, coalesce(p_pct, 0))),
    nullif(left(coalesce(p_band, ''), 16), ''),
    coalesce(p_answers, '{}'::jsonb),
    nullif(left(coalesce(p_source, ''), 32), '')
  );
end;
$$;
revoke all on function public.submit_checkup_lead(text, text, int, text, jsonb, text) from public;
grant execute on function public.submit_checkup_lead(text, text, int, text, jsonb, text) to anon, authenticated;

-- ── read RPC (admin เท่านั้น) ───────────────────────────────────────────────
create or replace function public.checkup_leads_list(p_limit int default 200)
returns table (
  id uuid, email text, company text, pct smallint, band text, source text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'forbidden';
  end if;
  return query
    select l.id, l.email, l.company, l.pct, l.band, l.source, l.created_at
    from public.checkup_leads l
    order by l.created_at desc
    limit greatest(1, least(1000, coalesce(p_limit, 200)));
end;
$$;
revoke all on function public.checkup_leads_list(int) from public;
grant execute on function public.checkup_leads_list(int) to authenticated;

-- ── 0056 (ต่อท้าย): สถานะการส่งอีเมล ─────────────────────────────────────────
-- ส่งรายงานแบบ cron ไม่ใช่ส่งทันทีตอนกรอก — ถ้าส่งใน request เดียวกัน ผู้ใช้ต้องรอ Resend
-- และถ้า Resend ล่ม ผู้ใช้จะเห็น error ทั้งที่เขาทำส่วนของเขาครบแล้ว
alter table public.checkup_leads add column if not exists sent_at timestamptz;
create index if not exists idx_checkup_leads_unsent on public.checkup_leads (created_at) where sent_at is null;

drop function if exists public.checkup_leads_list(int);
create function public.checkup_leads_list(p_limit int default 200)
returns table (
  id uuid, email text, company text, pct smallint, band text, source text,
  created_at timestamptz, sent_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'forbidden';
  end if;
  return query
    select l.id, l.email, l.company, l.pct, l.band, l.source, l.created_at, l.sent_at
    from public.checkup_leads l
    order by l.created_at desc
    limit greatest(1, least(1000, coalesce(p_limit, 200)));
end;
$$;
revoke all on function public.checkup_leads_list(int) from public;
grant execute on function public.checkup_leads_list(int) to authenticated;
