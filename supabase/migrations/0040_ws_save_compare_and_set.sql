-- =====================================================
-- 0040 — wsSave compare-and-set (กัน 2 อุปกรณ์แก้พร้อมกัน last-write ทับของใหม่)
-- เดิม wsSave = upsert ตรง ๆ → อุปกรณ์ที่เซฟทีหลังทับเสมอ แม้ข้อมูลเก่ากว่า (rev ต่ำกว่า)
-- แก้: RPC เขียนเฉพาะเมื่อ rev ที่ส่งมา >= rev ที่เก็บไว้ (server-authoritative)
--     rev = ตัวนับใน AppData (เพิ่มทุกครั้งที่แก้ ฝั่ง client)
-- =====================================================

create or replace function public.ws_save_state(p_workspace_id uuid, p_data jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_written boolean;
begin
  -- เฉพาะสมาชิก workspace (ใช้ helper เดิมจาก 0002 · เลี่ยง RLS recursion)
  if not public.is_member(p_workspace_id) then
    return 'denied';
  end if;

  insert into public.workspace_state (workspace_id, data, updated_at)
  values (p_workspace_id, p_data, now())
  on conflict (workspace_id) do update
    set data = excluded.data, updated_at = now()
    where coalesce((workspace_state.data ->> 'rev')::bigint, 0)
       <= coalesce((excluded.data ->> 'rev')::bigint, 0)
  returning true into v_written;

  -- v_written NULL = มี row อยู่แล้ว + rev ที่ส่งมาเก่ากว่าที่เก็บ → ไม่เขียนทับ (กันข้อมูลใหม่หาย)
  if v_written is null then
    return 'stale';
  end if;
  return 'written';
end;
$$;

grant execute on function public.ws_save_state(uuid, jsonb) to authenticated;
