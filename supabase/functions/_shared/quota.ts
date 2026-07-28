// _shared/quota.ts — บังคับ AI usage quota ฝั่ง server (เรียกก่อนยิง Claude ในทุก paid function)
//
// หลักการออกแบบ (สำคัญมาก — ห้ามพัง production):
//   • FAIL-OPEN: RPC error / เชื่อมต่อไม่ได้ / env ไม่ครบ → อนุญาต (return null) เสมอ + log
//     บั๊กการนับต้องไม่ทำให้ AI ทั้งระบบล่ม
//   • FLAG-GATED: ทำงานเฉพาะเมื่อ ENFORCE_AI_QUOTA=true — default ปิด (ship dark)
//     เปิดหลังทดสอบ: supabase secrets set ENFORCE_AI_QUOTA=true && redeploy 3 functions
//   • ตัดสินจากตัวนับ atomic ใน DB (rpc bump_ai_usage) — นับ "ต่อ workspace/เดือน" + guest cap
//
// การใช้: ในแต่ละ edge function ต้นๆ ของ handler (หลัง parse body):
//   const blocked = await enforceAiQuota(req, body?.clientId);
//   if (blocked) return blocked;   // 429 พร้อมข้อความไทย

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** คืน Response(429) ถ้าเกินโควตา · คืน null ถ้าอนุญาต (รวมกรณี fail-open/ปิดใช้งาน) */
export async function enforceAiQuota(req: Request, clientId?: string): Promise<Response | null> {
  // ปิดโดย default — เปิดด้วย secret หลังทดสอบ
  if (Deno.env.get("ENFORCE_AI_QUOTA") !== "true") return null;

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anon) return null; // env ไม่ครบ → fail-open

    // สร้าง client ด้วย JWT ของผู้เรียก → auth.uid() ใน RPC = user จริง (หรือ null ถ้าเป็น guest/anon)
    const authHeader = req.headers.get("Authorization") ?? "";
    const supa = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });

    // guest bucket key: ใช้ clientId ที่ client ส่งมา (ถ้ามี) → ไม่งั้น fallback เป็น IP (x-forwarded-for)
    // → guest ถูกจำกัดต่อ IP โดยไม่ต้องแก้ client (RPC ใช้ค่านี้เฉพาะ guest; user จริงดูจาก auth.uid())
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    const guestKey = clientId || ip || null;

    const { data, error } = await supa.rpc("bump_ai_usage", { p_client_id: guestKey });
    if (error) {
      console.error("[quota] bump_ai_usage error (fail-open):", error.message);
      return null; // fail-open
    }
    if (data && data.allowed === false) {
      const isGuest = data.plan === "guest";
      return new Response(
        JSON.stringify({
          error: "quota_exceeded",
          plan: data.plan,
          used: data.used,
          quota: data.quota,
          message: isGuest
            ? "คุณใช้ AI ครบโควตาสำหรับผู้เยี่ยมชมแล้ว — สมัคร/เข้าสู่ระบบเพื่อใช้ต่อ"
            : "ใช้ AI ครบโควตาเดือนนี้แล้ว — อัปเกรดแพ็ก หรือรอรอบเดือนถัดไป",
        }),
        { status: 429, headers: { ...cors, "content-type": "application/json" } },
      );
    }
    return null; // allowed
  } catch (e) {
    console.error("[quota] enforceAiQuota threw (fail-open):", String(e));
    return null; // fail-open เสมอ
  }
}
