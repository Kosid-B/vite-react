/* ══════════════════════════════════════════════════════════════════════════
 * reportAiFailure — ทำให้ "AI ล้มฝั่ง Edge Function" มองเห็นได้
 *
 * 🔴 ปัญหาที่แก้ (20 พ.ย. 2569 · ledger #82): กล่อง "ลอง AI" ฝั่ง Worker พังอยู่บน
 *    production นานโดยไม่มีใครรู้ เพราะไม่มี log — พอใส่ท่อแล้วรู้สาเหตุใน 1 นาที
 *    (`Anthropic 401 invalid x-api-key` จากคีย์ที่ถูก wrangler ล้างทุก deploy)
 *    ฝั่ง Edge Function ยังตาบอดแบบเดียวกัน: `console.error` มีบางจุด แต่
 *    **Supabase function logs เก็บย้อนหลังได้จำกัด** ⇒ ตอบไม่ได้ว่าเมื่อวานพังเพราะอะไร
 *
 * ใช้ท่อเดิมที่มีอยู่แล้ว ไม่สร้างใหม่: rpc `track_client_error` (migration 0058)
 *    ⇒ อ่านย้อนได้จากแผงแอดมิน (ClientErrorsPanel) และจาก SQL โดยตรง
 *
 * 🔒 กฎความปลอดภัยของท่อนี้ (มีเทสต์บังคับ · เหมือนฝั่ง Worker):
 *    ❌ ห้ามส่งคีย์ลงไป   ❌ ห้ามส่งข้อความที่ผู้ใช้พิมพ์ลงไป   ✅ ตัดความยาวเสมอ
 * ══════════════════════════════════════════════════════════════════════════ */

/** ความยาวสูงสุดของข้อความ error ที่ยอมให้บันทึก (กันข้อมูลล้น/หลุด) */
const MAX_LEN = 300;

/**
 * @param where ชื่อจุดที่ล้ม เช่น "ai-assist" / "ai-assist:stream" / "ai-plan"
 * @param err   error ที่จับได้ — จะถูกแปลงเป็นสตริงและตัดความยาว
 */
export async function reportAiFailure(where: string, err: unknown): Promise<void> {
  const message = `[edge] ${where}: ${String(err).slice(0, MAX_LEN)}`;
  console.error(message);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return; // ตรวจไม่ได้ ก็ไม่ทำให้คำขอหลักล้ม

  try {
    await fetch(`${url}/rest/v1/rpc/track_client_error`, {
      method: "POST",
      headers: { apikey: anon, Authorization: `Bearer ${anon}`, "content-type": "application/json" },
      body: JSON.stringify({
        p_message: message,
        p_source: `edge.${where.split(":")[0]}`,
        p_path: `/functions/v1/${where.split(":")[0]}`,
        p_stack: null,
        p_ua: null,
      }),
    });
  } catch {
    /* รายงานล้มก็ต้องไม่ทำให้คำขอหลักล้ม */
  }
}
