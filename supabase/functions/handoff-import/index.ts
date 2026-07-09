// handoff-import — รับ signed handoff token จาก theossphere → verify → คืนแผน (pre-fill)
// verify_jwt = false: ยืนยันด้วยลายเซ็น HMAC (THEOSSPHERE_HANDOFF_SECRET) แทน · ไม่ต้องล็อกอิน
//
// Deploy:  supabase functions deploy handoff-import --no-verify-jwt --project-ref waigsnxhrlwtiotspaim
// Secrets: supabase secrets set THEOSSPHERE_HANDOFF_SECRET=<shared secret กับ theossphere>
// DB:      apply migration 0028_handoff_nonces.sql ก่อน go-live (nonce dedup กัน replay)
//
// Body:   { token }   Return: { ok, plan } | { ok:false, error }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyHandoffToken, claimNonce, type NonceStore } from "../_shared/handoff.ts";

const SECRET = Deno.env.get("THEOSSPHERE_HANDOFF_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...cors } });

// nonce store จริง — atomic ผ่าน RPC consume_handoff_nonce (กัน replay + race)
function dbNonceStore(): NonceStore {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  return {
    async tryConsume(nonce: string, expMs: number): Promise<boolean> {
      const { data, error } = await admin.rpc("consume_handoff_nonce", {
        p_nonce: nonce,
        p_exp: new Date(expMs).toISOString(),
      });
      if (error) throw error;
      return data === true; // true = ใช้ครั้งแรก, false = replay
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  if (!SECRET) return json({ ok: false, error: "handoff_not_configured" }, 503);

  let body: { token?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }

  const token = String(body.token ?? "");
  const r = await verifyHandoffToken(token, SECRET, Date.now());
  if (!r.ok || !r.payload) return json({ ok: false, error: r.error ?? "invalid" }, 400);

  // nonce dedup (กัน replay) — เปิดเมื่อมี service role + DB · ถ้า store ล่ม = fail-closed (ปลอดภัยไว้ก่อน)
  if (SUPABASE_URL && SERVICE_ROLE) {
    let claim;
    try { claim = await claimNonce(r.payload, dbNonceStore()); }
    catch { return json({ ok: false, error: "nonce_store_error" }, 503); }
    if (!claim.ok) return json({ ok: false, error: claim.error }, claim.error === "replay" ? 409 : 400);
  }

  return json({ ok: true, plan: r.payload.plan, member: r.payload.member ?? null });
});
