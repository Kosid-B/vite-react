-- 0041_growth_quota_700 — ปรับโควตา AI ของแพ็ก Growth 1000 → 700 calls/เดือน
-- เหตุผล: ยกมาร์จิน worst-case ของ Growth (~38% → ~48%) โดยไม่ขึ้นราคา — usage จริงต่ำกว่าเพดานมาก
-- ต้องตรงกับ src/lib/usage.ts PLAN_AI_CALLS (growth: 700)
-- หมายเหตุ: ENFORCE_AI_QUOTA ยัง default off (fail-open) — migration นี้ทำให้ค่าฝั่ง server พร้อมเมื่อเปิด enforce
--
-- Apply:  supabase db push  (หรือรันผ่าน MCP apply_migration บน project prod waigsnxhrlwtiotspaim)

create or replace function public.ai_quota_for(p_plan text)
returns int language sql immutable as $$
  select case p_plan
    when 'scale'   then 5000
    when 'growth'  then 700
    when 'starter' then 300
    else 200                                 -- free/trial
  end;
$$;
