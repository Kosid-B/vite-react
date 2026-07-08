// handoff-import — รับ signed handoff token จาก theossphere → verify → คืนแผน (pre-fill)
// verify_jwt = false: ยืนยันด้วยลายเซ็น HMAC (THEOSSPHERE_HANDOFF_SECRET) แทน · ไม่ต้องล็อกอิน
//
// Deploy:  supabase functions deploy handoff-import --no-verify-jwt --project-ref waigsnxhrlwtiotspaim
// Secrets: supabase secrets set THEOSSPHERE_HANDOFF_SECRET=<shared secret กับ theossphere>
//
// Body:   { token }   Return: { ok, plan } | { ok:false, error }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { verifyHandoffToken } from "../_shared/handoff.ts";

const SECRET = Deno.env.get("THEOSSPHERE_HANDOFF_SECRET") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...cors } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  if (!SECRET) return json({ ok: false, error: "handoff_not_configured" }, 503);

  let body: { token?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }

  const token = String(body.token ?? "");
  const r = await verifyHandoffToken(token, SECRET, Date.now());
  if (!r.ok || !r.payload) return json({ ok: false, error: r.error ?? "invalid" }, 400);

  // NOTE: nonce dedup (กัน replay) ต้องมีตาราง handoff_nonces — follow-up (exp 10 นาทีจำกัด window อยู่แล้ว)
  return json({ ok: true, plan: r.payload.plan, member: r.payload.member ?? null });
});
