// Supabase Edge Function: ai-plan
// CEO (AI) รับ Mission + รายชื่อเอเจนต์ → เรียก Claude API วางแผนและแตกงานจริง
// Deploy:  supabase functions deploy ai-plan
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// เรียกจาก frontend:  supabase.functions.invoke('ai-plan', { body: { goal, industry, agents } })

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { pickModels } from "../_shared/modelRouter.ts";
import { chatWithFallback } from "../_shared/llm.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
// ai-plan = วางแผน/แตกงานเชิงกลยุทธ์ = งาน 'complex' → คงโมเดลแรง (default = โมเดลเดิม)
// multi-model: ตั้ง MODELS_COMPLEX="llama-70b,..." เพื่อลองหลายตัว + fallback Claude · input ไทยดัน Typhoon ขึ้นก่อน

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AgentIn { role: string; mandate?: string }
interface Body { goal: string; industry?: string; agents?: AgentIn[] }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!ANTHROPIC_API_KEY) return json({ error: "missing_api_key" }, 500);

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  if (!body?.goal) return json({ error: "missing_goal" }, 400);

  const roles = (body.agents ?? []).map((a) => `- ${a.role}: ${a.mandate ?? ""}`).join("\n") || "- CEO\n- CTO\n- CMO";

  // System prompt: Autonomous AI Company (Zero-Human Company / Paperclip framework)
  const system =
    "Act as the CEO Agent of an autonomous AI company built on the Zero-Human Company framework, " +
    "operating a SaaS business for the Thai market 24/7. The human user is the Board of Directors " +
    "who sets the high-level mission, oversees budget, and approves critical hires.\n" +
    "หลักการ:\n" +
    "1) วิเคราะห์ Mission แล้วแตกเป็นแผนกลยุทธ์ที่ลงมือทำได้\n" +
    "2) เอเจนต์แต่ละตัวคือ 'พนักงาน' ที่มีบทบาทเฉพาะ (CEO/CTO/CMO/Engineer) — มอบหมายงานให้ตรงกับ" +
    "บทบาทและขอบเขตหน้าที่ (mandate) ของแต่ละคน อย่าทำเองทุกอย่าง บริหารเหมือนแผนผังองค์กรจริง\n" +
    "3) จัดงานแบบ Kanban: สถานะ queued(Todo)/in_progress(Doing)/review(Review)/blocked(ติดสิทธิ์-เครื่องมือ)/done\n" +
    "4) งานที่ต้องใช้เครื่องมือภายนอกให้ระบุ: Brave Search (ค้นข้อมูล), Resend (ส่งอีเมล/รายงาน)\n" +
    "5) เรื่องที่กระทบงบประมาณหรือการจ้างเอเจนต์ใหม่ ให้เสนอเป็น approvals เพื่อรอบอร์ดอนุมัติ\n" +
    "ตอบเป็นภาษาไทย กระชับ ลงมือทำได้จริง และคืนค่าเป็น JSON เท่านั้น";

  const userMsg =
    `เป้าหมายหลัก (Mission): ${body.goal}\n` +
    `อุตสาหกรรม: ${body.industry ?? "-"}\n` +
    `ทีมเอเจนต์ที่มี:\n${roles}\n\n` +
    `คืน JSON รูปแบบ:\n` +
    `{"tasks":[{"agentRole":"CMO","title":"...","detail":"...","status":"queued"}],` +
    `"approvals":[{"agentRole":"CMO","title":"...","detail":"...","impact":"งบ ฿..."}]}\n` +
    `ใส่ tasks 3-6 รายการ และ approvals 0-2 รายการ. status เป็นหนึ่งใน queued|in_progress|review.`;

  // multi-model + auto-fallback: เลือกโมเดลตาม tier 'complex' + ภาษาของ mission (ไทย→ดันโมเดลไทยขึ้นก่อน)
  // ลองตามลำดับ ล่ม→ตัวถัดไป สุดท้าย fallback Claude เสมอ (default = โมเดลเดิม ถ้าไม่ตั้ง env)
  const models = pickModels("complex", `${body.goal} ${body.industry ?? ""}`);
  let text: string;
  try {
    const res = await chatWithFallback(models, { system, user: userMsg, maxTokens: 1500, cacheSystem: true });
    text = res.text;
  } catch (e) {
    return json({ error: "llm_error", detail: String(e) }, 502);
  }

  const parsed = extractJson(text);
  if (!parsed) return json({ error: "parse_failed", raw: text }, 502);

  return json({ tasks: parsed.tasks ?? [], approvals: parsed.approvals ?? [] }, 200);
});

function extractJson(text: string): any | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });
}
