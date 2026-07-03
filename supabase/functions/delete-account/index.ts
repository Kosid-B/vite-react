// delete-account — ลบบัญชีผู้ใช้ (auth.users) ถาวรด้วย service role
// verify_jwt = true: ผู้ใช้ลบได้เฉพาะบัญชีตัวเอง (อ่าน user จาก JWT เท่านั้น)
// ขั้นตอน: ลบ workspaces ที่เป็น owner (FK cascade เก็บกวาดข้อมูลลูก) → ลบ auth.users
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  // ระบุตัวตนจาก JWT ของผู้เรียกเท่านั้น — ห้ามรับ user id จาก body
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const uid = userData.user.id;

  // 1) ลบ workspaces ที่ user เป็นเจ้าของ — cascade ลบ state/members/storefront/rfqs/orders
  const { error: wsErr } = await admin.from("workspaces").delete().eq("owner_id", uid);
  if (wsErr) return json({ error: "workspace_delete_failed: " + wsErr.message }, 500);

  // 2) ลบ membership ที่เหลือ (workspace ของคนอื่น)
  await admin.from("workspace_members").delete().eq("user_id", uid);

  // 3) ลบข้อมูล legacy per-user
  await admin.from("app_state").delete().eq("user_id", uid);

  // 4) ลบบัญชี auth.users
  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) return json({ error: "account_delete_failed: " + delErr.message }, 500);

  return json({ ok: true });
});
