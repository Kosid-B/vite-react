-- 0060 ปิดช่องโหว่ที่พบจากการตรวจทั้งระบบ (17 ส.ค. 2569)
--
-- หลักการเดิมของโปรเจกต์ (LESSONS-LEDGER ข้อ 5): "ต้องพลาดสองชั้นถึงจะรั่ว"
-- ฟังก์ชันมีการ์ดข้างในแล้วยังไม่พอ — ต้องตัดสิทธิ์เรียกของ role ที่ไม่ควรเรียกด้วย
--
-- ── ① ช่องโหว่จริง: claim_founding_member เรียกได้โดยไม่ต้องล็อกอิน ──
--   ตรวจพบว่า: SECURITY DEFINER · ไม่มีการ์ดใด ๆ · anon เรียกได้ · founding_members
--   **ไม่มี FK ไป workspaces** → ใครก็ยัด uuid มั่ว 1,000 ครั้งเผาโควตา Founding Member ได้
--   โดยไม่ต้องมีบัญชี ไม่ต้องมีเวิร์กสเปซ (ตรวจ ณ วันแก้: claimed = 0 → ยังไม่มีความเสียหาย)
--
-- ── ② ตัดสิทธิ์ anon ออกจากฟังก์ชันที่ต้องล็อกอิน/เป็นแอดมินอยู่แล้ว ──
--   ทั้งหมดมีการ์ดข้างในครบ (ตรวจแล้วทีละตัว) แต่เปิดให้ anon ยิงได้ = เสี่ยงฟรี ๆ
--   ⚠️ ไม่แตะฟังก์ชันที่ anon ต้องใช้จริง: track_landing / track_quickcheck /
--      track_client_error / submit_checkup_lead / get_founding_count / lead_count
--   ⚠️ กลุ่ม ai_usage/ai_tokens แยกเป็น 2 พวกตามหลักฐาน (ดูหมายเหตุท้ายไฟล์)
--
-- ── ③ ตั้ง search_path ให้ฟังก์ชันคำนวณล้วน 5 ตัว (Supabase advisor: function_search_path_mutable) ──

-- ① ---------------------------------------------------------------------------
-- FK: workspace ต้องมีอยู่จริง (ตาราง 0 แถว ตอน apply → เพิ่มได้ปลอดภัย)
alter table public.founding_members
  drop constraint if exists founding_members_workspace_fk;
alter table public.founding_members
  add constraint founding_members_workspace_fk
  foreign key (workspace_id) references public.workspaces(id) on delete cascade;

create or replace function public.claim_founding_member(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq   int;
  v_count int;
begin
  -- การ์ดที่เคยไม่มี: ต้องเป็นสมาชิกของเวิร์กสเปซนั้นจริง (helper เดิมจาก 0002)
  -- anon → auth.uid() เป็น null → is_member = false → ปฏิเสธ
  if not public.is_member(p_workspace_id) then
    return jsonb_build_object('ok', false, 'error', 'not_member');
  end if;

  select seq into v_seq from public.founding_members where workspace_id = p_workspace_id;
  if v_seq is not null then
    return jsonb_build_object('ok', true, 'seq', v_seq, 'already', true);
  end if;

  perform pg_advisory_xact_lock(hashtext('founding_members_claim'));

  select count(*) into v_count from public.founding_members;
  if v_count >= 1000 then
    return jsonb_build_object('ok', false, 'full', true, 'claimed', v_count);
  end if;

  v_seq := v_count + 1;
  insert into public.founding_members(workspace_id, seq) values (p_workspace_id, v_seq);
  return jsonb_build_object('ok', true, 'seq', v_seq, 'already', false);
end;
$$;
-- ⚠️ ต้องมี `public` ในรายการ revoke ไม่ใช่แค่ `anon` (ดูกับดักในหัวข้อ ② ด้านล่าง)
revoke all on function public.claim_founding_member(uuid) from public, anon;
grant execute on function public.claim_founding_member(uuid) to authenticated;

-- ② ---------------------------------------------------------------------------
-- 🔴 กับดักที่เกือบพลาด (จับได้ตอนตรวจผลหลัง apply — ห้ามลืม):
--    `revoke execute ... from anon` **ไม่มีผลอะไรเลย** ถ้า EXECUTE ยังถูกให้กับ PUBLIC
--    ซึ่ง Postgres ให้กับทุกฟังก์ชันเป็นค่าเริ่มต้น → anon ได้สิทธิ์ผ่าน PUBLIC อยู่ดี
--    ต้อง `revoke all ... from public, anon` แล้ว **grant คืนให้ authenticated ชัด ๆ**
--    (เพราะ revoke จาก PUBLIC ตัดสิทธิ์ของ authenticated ไปด้วย)
--    ⇒ ตรวจผลด้วย has_function_privilege() ทุกครั้ง อย่าเชื่อว่าคำสั่ง revoke ผ่าน = สิทธิ์หายจริง
do $$
declare
  f text;
  -- ทั้งหมดมีการ์ด is_app_admin()/is_member()/auth.uid() ข้างในแล้ว — นี่คือชั้นที่สอง
  authed_only text[] := array[
    'grant_ai_topup(uuid, integer)',
    'grant_ai_topup_tokens(uuid, bigint)',
    'approve_topup_request(uuid)',
    'approve_token_topup_request(uuid)',
    'admin_list_workspaces()',
    'checkup_leads_list(integer)',
    'landing_funnel_agg(integer)',
    'quickcheck_agg(integer)',
    'client_errors_agg(integer)',
    'ws_save_state(uuid, jsonb)',
    'claim_referral(uuid)',
    -- มิเตอร์ที่หน้าเว็บอ่าน (src/lib/usage.ts) = โควตา "ของผู้ใช้ที่ล็อกอินอยู่"
    -- คนไม่ล็อกอินไม่มีโควตาให้อ่าน → anon ไม่มีเหตุต้องเรียก
    'get_ai_usage()',
    'get_ai_tokens()'
  ];
begin
  foreach f in array authed_only loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- trigger function — ไม่ควรถูกเรียกผ่าน REST เลย (เรียกตรงก็พังเพราะไม่มี NEW
  -- แต่ไม่ควรเปิดให้ยิงได้ตั้งแต่ต้น)
  execute 'revoke all on function public.sync_workspace_plan() from public, anon, authenticated';
end $$;

-- ③ ---------------------------------------------------------------------------
-- ฟังก์ชันคำนวณล้วน (ไม่แตะตาราง) — ตั้ง search_path กัน search_path injection
alter function public.ai_quota_for(text)          set search_path = public;
alter function public.ai_token_quota_for(text)    set search_path = public;
alter function public.topup_pack_credits(text)    set search_path = public;
alter function public.topup_pack_price(text)      set search_path = public;
alter function public.topup_tokens_for_pack(text) set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────────
-- ตั้งใจ "ไม่" ตัด anon ออกจาก 3 ตัวนี้ — และนี่คือเหตุผลที่ตรวจมาแล้ว ไม่ใช่การเลี่ยง:
--   bump_ai_usage(text) · check_ai_tokens(text) · record_ai_tokens(int,int,text)
--
--   `supabase/functions/_shared/quota.ts` สร้าง client ด้วย **anon key + forward
--   Authorization ของผู้เรียก** → role ที่ไปถึง RPC = role ในโทเคนของผู้เรียก
--   ทั้ง 3 ฟังก์ชันรับพารามิเตอร์ `p_client_id` (guestKeyFor) = ออกแบบมาให้มีเส้นทาง guest
--   ถ้าตัด anon ทิ้ง ฟังก์ชันเหล่านี้จะ error แล้วโค้ดเป็น **fail-open** (ปล่อยให้เรียก AI ต่อ)
--   ⇒ ผลคือ "เพดานการใช้ของ guest หายไปเงียบ ๆ" ซึ่งแย่กว่าปล่อย execute ไว้
--   จะตัดได้เมื่อยืนยันว่าไม่มีเส้นทาง guest ที่ใช้ anon key จริง (งานรอบถัดไป)
