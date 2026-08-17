-- 0061 ตัด anon ออกจาก quota RPC 3 ตัวที่ 0060 ตั้งใจเว้นไว้ (ปิดหนี้ท้ายไฟล์ 0060)
--
-- 0060 ไม่กล้าตัดเพราะยังไม่มีหลักฐานว่าเส้นทาง guest ใช้ anon หรือไม่ —
-- ตรวจครบแล้ว (17 ส.ค. 2569) ทั้ง 3 เส้นทางที่เป็นไปได้:
--
--   ① guest ลอง AI บน Landing → `/api/guest-ask` → Cloudflare DO → Anthropic ตรง
--      เพดานอยู่ใน DO (FREE_DAILY_TOKENS ต่อ IP/วัน) — grep ยืนยัน: server.ts + CeoAiAgent
--      ไม่เรียก bump_ai_usage/check_ai_tokens/record_ai_tokens เลย
--   ② guest เรียก edge functions (ai-assist/ai-plan/agent-run) → เป็นไปไม่ได้:
--      config.toml ตั้ง verify_jwt=true ทั้ง 3 ตัว และ client ใช้ sb_publishable_…
--      ซึ่งไม่ใช่ JWT → gateway ปฏิเสธ (401) ก่อนโค้ด quota.ts จะได้รันด้วยซ้ำ
--      (จุดเรียกใน UI ทั้งหมดก็อยู่หลัง login อยู่แล้ว)
--   ③ ยิง PostgREST ตรงด้วย publishable key = role anon → จำลองใน DB แล้ว "ยังเรียกได้จริง"
--      ({"allowed":true,"quota":20000}) — นี่คือทางของผู้โจมตี ไม่ใช่ทางของผลิตภัณฑ์
--
-- สรุป: ผู้ใช้ jwt จริงเท่านั้นที่ควรถึง RPC เหล่านี้ (edge fn forward JWT → role = authenticated)
-- สาขา guest (p_client_id) ในฟังก์ชันกลายเป็น dead code ที่ไม่มีใครเข้าถึง — ปล่อยไว้ไม่อันตราย
-- ถ้าวันหน้าจะเปิด guest ผ่าน edge functions จริง ค่อย grant anon กลับพร้อมเหตุผลใน migration ใหม่
--
-- ⚠️ จำกฎจาก 0060: ต้อง revoke จาก public ด้วย ไม่ใช่แค่ anon (EXECUTE ติดมากับ PUBLIC
--    เป็นค่าเริ่มต้น) · แล้ว grant คืนให้ role ที่ต้องใช้ · ตรวจผลด้วย has_function_privilege()

revoke all on function public.bump_ai_usage(text) from public, anon;
revoke all on function public.check_ai_tokens(text) from public, anon;
revoke all on function public.record_ai_tokens(integer, integer, text) from public, anon;
grant execute on function public.bump_ai_usage(text) to authenticated, service_role;
grant execute on function public.check_ai_tokens(text) to authenticated, service_role;
grant execute on function public.record_ai_tokens(integer, integer, text) to authenticated, service_role;

-- ตรวจแล้วหลัง apply (prod): anon=false / authenticated=true / service_role=true ทั้ง 3 ตัว
-- ถ้าพลาด: โค้ด quota.ts เป็น fail-open — AI ไม่ล่ม แค่ไม่นับ → เห็นได้จาก log "[quota] ... error"
