// Supabase Edge Function: privacy-notice
// รับข้อมูลธุรกิจ → ให้ AI ร่าง "ประกาศความเป็นส่วนตัว (PDPA)" หรือ "SOP" ฉบับปรับตามบริบท
// งานภาษาไทยล้วน = tier 'thai' → ใช้ Typhoon/open-source เมื่อตั้ง MODELS_THAI, ไม่งั้น fallback Claude
//
// Deploy:  supabase functions deploy privacy-notice
// Secret:  ANTHROPIC_API_KEY (จำเป็น) · (ทางเลือก) FIREWORKS_API_KEY + MODELS_THAI เพื่อใช้ Typhoon

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { pickModels } from "../_shared/modelRouter.ts";
import { chatWithFallback } from "../_shared/llm.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body { system?: string; prompt?: string; lang?: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!ANTHROPIC_API_KEY) return json({ error: "missing_api_key" }, 500);

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  if (!body?.prompt) return json({ error: "missing_prompt" }, 400);

  const system = body.system ||
    "คุณคือที่ปรึกษาด้าน PDPA และมาตรฐานของไทย ร่างเอกสารภาษาไทยที่ถูกต้อง ชัดเจน เป็นมืออาชีพ ตอบเป็น Markdown เท่านั้น";

  // งานภาษาไทย → tier 'thai' (ดัน Typhoon ขึ้นก่อนถ้าตั้งไว้) · fallback Claude เสมอ
  const models = pickModels("thai", body.prompt);
  try {
    const res = await chatWithFallback(models, {
      system, user: body.prompt, maxTokens: 2000, cacheSystem: true,
    });
    return json({ draft: res.text, model: res.model, provider: res.provider }, 200);
  } catch (e) {
    return json({ error: "llm_error", detail: String(e) }, 502);
  }
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });
}
