-- 0042_founding_members — โปรฯ "Founding Member" (1,000 คนแรก) · บังคับเพดานฝั่ง server (atomic)
-- claim: คืน seq (1..1000) ถ้าได้ · full ถ้าเต็ม · seq เดิมถ้าเคยรับแล้ว (idempotent)
-- สิทธิ์จริง (ยก Starter→Growth) ตัดสินฝั่ง client ตาม seq (lib/founding.ts) — ตารางนี้แค่ "คุมจำนวน + ลำดับ"
--
-- Apply: supabase db push (หรือ MCP apply_migration บน project prod waigsnxhrlwtiotspaim)

create table if not exists public.founding_members (
  workspace_id uuid primary key,
  seq          int not null,
  claimed_at   timestamptz not null default now()
);
create unique index if not exists founding_members_seq_uidx on public.founding_members(seq);

alter table public.founding_members enable row level security;
-- ไม่มี policy = ปิดการเข้าถึงตรงทั้งหมด · เข้าผ่าน rpc (security definer) เท่านั้น

-- นับจำนวนที่ claim แล้ว (สำหรับตัวนับ "X/1000") — เปิดให้ทุกคนอ่าน
create or replace function public.get_founding_count()
returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.founding_members;
$$;

-- รับสิทธิ์แบบ atomic — กันแข่ง (advisory lock) ให้ seq เดินต่อเนื่องไม่ชน + ไม่เกิน cap
create or replace function public.claim_founding_member(p_workspace_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_seq   int;
  v_count int;
begin
  -- idempotent: เคยรับแล้ว → คืน seq เดิม
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

grant execute on function public.get_founding_count() to anon, authenticated;
grant execute on function public.claim_founding_member(uuid) to authenticated;
