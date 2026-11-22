-- 0067 — ย้าย "ท่อ" ตามข้อมูล: rpc + trigger ของ behavior-ingest มาอยู่ project เดียวกับ CEO
--
-- ⚠️ บันทึกของสิ่งที่ apply ไปแล้วบน production `waigsnxhrlwtiotspaim` (22 พ.ย. 2569)
--    Supabase บันทึกชื่อไว้ว่า `0060_marketing_os_behavior_ingest_rpc` — เลขไม่ตรงกับรีโปโดยเจตนา
--
-- พอร์ตจากของจริงบน project เดิม (อ่าน `pg_get_functiondef` มา ไม่ได้เขียนใหม่จากความจำ)
-- 🔴 เปลี่ยนแค่ schema ปลายทาง public.* -> marketing_os.* · เกณฑ์ทุกข้อคงเดิมเป๊ะ:
--    16,000 ไบต์ · batch 1–20 · โควตารวม 10,000/วัน · ต่อคีย์ 60 · ตรวจ slug ของ workspace
create or replace function public.receive_marketing_behavior(
  p_id uuid, p_workspace uuid, p_hash text, p_payload jsonb, p_path text, p_rate_key text
) returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare n integer; old_hash text; k text;
begin
  delete from marketing_os.marketing_behavior_limits
   where key in (select key from marketing_os.marketing_behavior_limits where expires_at < now() limit 100);
  if not exists(select 1 from marketing_os.workspaces where id = p_workspace and slug = 'ceo-ai-thailand')
    then raise exception 'workspace_mismatch'; end if;
  if octet_length(p_payload::text) > 16000
     or jsonb_typeof(p_payload->'events') <> 'array'
     or jsonb_array_length(p_payload->'events') not between 1 and 20
    then raise exception 'invalid_batch'; end if;
  -- ลำดับล็อกคงที่ + โควตารายวันรวม กันทั้งการถล่มและค่าเก็บของบาน
  foreach k in array array['global:' || to_char(now() at time zone 'UTC','YYYYMMDD'), p_rate_key] loop
    insert into marketing_os.marketing_behavior_limits(key, count, expires_at)
      values (k, 1, now() + interval '2 days')
      on conflict(key) do update set count = marketing_os.marketing_behavior_limits.count + 1
      returning count into n;
    if n > (case when k like 'global:%' then 10000 else 60 end) then return 'rate_limited'; end if;
  end loop;
  insert into marketing_os.marketing_behavior_batches(id, workspace_id, payload_hash, payload, archive_path)
    values (p_id, p_workspace, p_hash, p_payload, p_path) on conflict(id) do nothing;
  select payload_hash into old_hash from marketing_os.marketing_behavior_batches where id = p_id;
  if old_hash <> p_hash then return 'conflict'; end if;
  return 'accepted';
end; $function$;

-- 🔒 เรียกได้เฉพาะ service_role (edge function) — anon/authenticated ห้ามแตะ
revoke all on function public.receive_marketing_behavior(uuid,uuid,text,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.receive_marketing_behavior(uuid,uuid,text,jsonb,text,text) to service_role;

-- กาง event ออกจาก payload ของ batch (ของเดิมเป็น trigger ไม่ใช่งานฝั่งแอป)
create or replace function marketing_os.expand_marketing_behavior_batch()
returns trigger language plpgsql set search_path to '' as $function$
begin
  insert into marketing_os.marketing_behavior_events(
    id, workspace_id, batch_id, session_id, occurred_at, source, name, topic, format, mode)
  select (e->>'id')::uuid, new.workspace_id, new.id, (e->>'session')::uuid, (e->>'at')::timestamptz,
         e->>'source', e->>'name', e->>'topic', e->>'format', new.payload->>'mode'
    from jsonb_array_elements(new.payload->'events') e
   on conflict(id) do nothing;
  return new;
end; $function$;

drop trigger if exists expand_marketing_behavior_batch on marketing_os.marketing_behavior_batches;
create trigger expand_marketing_behavior_batch
  after insert on marketing_os.marketing_behavior_batches
  for each row execute function marketing_os.expand_marketing_behavior_batch();
