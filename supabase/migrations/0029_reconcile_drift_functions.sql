-- 0029_reconcile_drift_functions.sql
-- ---------------------------------------------------------------------------
-- NC-03 (config drift) — ปิดช่องว่างระหว่าง production กับ migration history
--
-- ที่มา: production (waigsnxhrlwtiotspaim) มีฟังก์ชัน 2 ตัวที่ถูกสร้าง "out-of-band"
-- (delete_workspace, update_updated_at) โดยไม่มี migration ไหนใน repo สร้างเลย
-- ทำให้ 0027_reconcile_prod_rpc_grants อ้างถึงฟังก์ชันที่ไม่มีต้นทาง → DB ที่ build
-- จาก repo ล้วน ๆ ต้องพึ่ง guard (to_regprocedure) ใน 0027 เพื่อไม่ให้ล้ม
--
-- migration นี้ "reverse-engineer" นิยามจริงจาก production (ตรวจสด 2026-07-10 ผ่าน MCP
-- has_function_privilege + pg_get_functiondef) มาไว้ใน repo เพื่อให้ repo = prod:
--   • repo/dev/CI ที่ build ใหม่ → มีฟังก์ชันจริง (ไม่ต้องพึ่ง guard อีก แต่ guard คงไว้ได้ ปลอดภัย)
--   • production → CREATE OR REPLACE ด้วย body เดิม = idempotent no-op (ไม่เปลี่ยนพฤติกรรม)
--
-- ยืนยัน grant บน prod แล้ว (ตรงกับ 0027): delete_workspace anon=false/auth=true ·
-- update_updated_at anon=false/auth=false (trigger function ล็อกจาก client)
-- หมายเหตุ: trigger ที่ "เรียกใช้" update_updated_at (เช่น cj_*, storage.objects) เป็น
-- ของนอก repo — ไม่สร้างที่นี่ (นอกขอบเขต schema ของแอปนี้)
-- ---------------------------------------------------------------------------

-- 1) delete_workspace(uuid) — owner-guard ภายใน (auth.uid() + owner_id), SECURITY INVOKER
--    (แอปปัจจุบันใช้ direct DELETE + RLS ที่ src/lib/workspaces.ts แต่คง RPC ไว้เผื่ออนาคต)
create or replace function public.delete_workspace(p_workspace uuid)
returns text
language plpgsql
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  -- เฉพาะเจ้าของเวิร์กสเปซเท่านั้น
  if not exists (
    select 1 from public.workspaces w
    where w.id = p_workspace and w.owner_id = auth.uid()
  ) then
    return 'forbidden';
  end if;

  -- ลบเวิร์กสเปซ → cascade: workspace_members, workspace_state
  delete from public.workspaces where id = p_workspace;
  return 'ok';
end;
$function$;

-- 2) update_updated_at() — trigger function ตั้ง updated_at = now() ก่อน UPDATE
create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path to 'pg_catalog'
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- 3) grants (ตรงกับ 0027 · idempotent) — ตอนนี้ฟังก์ชันมีจริงแล้ว จึงไม่ต้อง guard
grant  execute on function public.delete_workspace(uuid) to authenticated;
revoke execute on function public.delete_workspace(uuid) from anon, public;
revoke execute on function public.update_updated_at()    from anon, authenticated, public;
