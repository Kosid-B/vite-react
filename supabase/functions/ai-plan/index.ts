// Supabase Edge Function: ai-plan
// CEO (AI) รับ Mission + รายชื่อเอเจนต์ → เรียก Claude API วางแผนและแตกงานจริง
// Deploy:  supabase functions deploy ai-plan
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// เรียกจาก frontend:  supabase.functions.invoke('ai-plan', { body: { goal, industry, agents } })

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { pickModels } from "../_shared/modelRouter.ts";
import { chatWithFallback } from "../_shared/llm.ts";
import { enforceAiQuota, enforceAiTokens, recordAiTokens } from "../_shared/quota.ts";
import { AI_GUARDRAILS } from "../_shared/aiGuardrails.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
// ai-plan = วางแผน/แตกงานเชิงกลยุทธ์ = งาน 'complex' → คงโมเดลแรง (default = โมเดลเดิม)
// multi-model: ตั้ง MODELS_COMPLEX="llama-70b,..." เพื่อลองหลายตัว + fallback Claude · input ไทยดัน Typhoon ขึ้นก่อน

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AgentIn { role: string; mandate?: string }
interface Body { goal: string; industry?: string; agents?: AgentIn[]; clientId?: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!ANTHROPIC_API_KEY) return json({ error: "missing_api_key" }, 500);

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  if (!body?.goal) return json({ error: "missing_goal" }, 400);

  const blocked = await enforceAiQuota(req, body.clientId); // flag-gated + fail-open
  if (blocked) return blocked;
  const tokBlocked = await enforceAiTokens(req, body.clientId);
  if (tokBlocked) return tokBlocked;

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
    "ตอบเป็นภาษาไทย กระชับ ลงมือทำได้จริง และคืนค่าเป็น JSON เท่านั้น" + AI_GUARDRAILS;

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

  // maxTokens สูงพอสำหรับ output ภาษาไทย (Thai token-dense) — กัน JSON ถูกตัดกลางคัน = parse_failed
  // ภาษาไทยกินโทเคนมากต่อคำ · tasks 3-6 + detail + approvals ที่ 1500 เดิม → ล้นบ่อย → JSON ไม่ครบ
  // สะสม token จริงข้ามความพยายามทุกครั้ง (call แรก + retry) → บันทึกทีเดียวตอนจบ
  let usedIn = 0, usedOut = 0;
  async function callPlan(user: string, maxTokens: number): Promise<string> {
    const res = await chatWithFallback(models, { system, user, maxTokens, cacheSystem: true });
    if (res.usage) { usedIn += res.usage.inputTokens; usedOut += res.usage.outputTokens; }
    return res.text;
  }

  let text: string;
  try {
    text = await callPlan(userMsg, 3000);
  } catch (e) {
    console.error("[ai-plan] llm_error:", String(e));
    return json({ error: "llm_error", detail: String(e) }, 502);
  }

  let parsed = extractJson(text);

  // retry ครั้งเดียวถ้า parse ไม่ผ่าน (มัก = โมเดลใส่ prose หรือ output ยาวเกิน) — ขอ JSON ล้วน กระชับ
  if (!parsed) {
    console.error("[ai-plan] parse_failed on first try; retrying. raw head:", text.slice(0, 300));
    try {
      const retryMsg = userMsg +
        `\n\nสำคัญ: ตอบกลับเป็น JSON ที่สมบูรณ์และ valid เท่านั้น ห้ามมีข้อความอื่นนอก JSON ` +
        `ห้ามใช้ code fence · detail สั้นกระชับ (ไม่เกิน 1 ประโยค) เพื่อให้ JSON ครบไม่ถูกตัด`;
      text = await callPlan(retryMsg, 4000);
      parsed = extractJson(text);
    } catch (e) {
      console.error("[ai-plan] llm_error on retry:", String(e));
    }
  }

  // บันทึก token จริง (flag-gated) — นับแม้ parse_failed เพราะ token ถูกใช้ไปแล้ว
  await recordAiTokens(req, usedIn, usedOut, body.clientId);

  if (!parsed) {
    console.error("[ai-plan] parse_failed after retry. raw:", text);
    return json({ error: "parse_failed", raw: text }, 502);
  }

  return json({ tasks: parsed.tasks ?? [], approvals: parsed.approvals ?? [] }, 200);
});

/** พยายาม parse JSON จาก output ของโมเดล — ทนต่อ code fence + JSON ที่ถูกตัดกลางคัน (truncated) */
function extractJson(text: string): any | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  const body = text.slice(start);

  // 1) ปกติ: จาก { แรก ถึง } สุดท้าย
  const end = body.lastIndexOf("}");
  if (end !== -1) {
    const direct = tryParse(body.slice(0, end + 1));
    if (direct) return direct;
  }

  // 2) truncated: ตัดที่ element สุดท้ายที่ "สมบูรณ์" ในอาร์เรย์ แล้วปิดโครงสร้างให้ครบ (กู้ JSON ที่ชนเพดานโทเคน)
  const cut = tryParse(balanceClose(cutAtLastArrayElement(body)));
  if (cut) return cut;

  // 3) สุดท้าย: บาลานซ์ทั้งก้อน (ปิด string + วงเล็บที่ค้าง) เผื่อ truncate กลาง object เดียว
  return tryParse(balanceClose(body));
}

function tryParse(s: string): any | null {
  try { return JSON.parse(s); } catch { return null; }
}

/** ตัด string ให้จบที่ ]/} ตัวสุดท้ายที่ "ปิด element ของอาร์เรย์" (parent เป็น [) — ทิ้ง element ครึ่ง ๆ ท้าย */
function cutAtLastArrayElement(s: string): string {
  const stack: string[] = [];
  let inStr = false, esc = false, lastComplete = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") {
      stack.pop();
      if (stack[stack.length - 1] === "[") lastComplete = i; // เพิ่งปิด element ของอาร์เรย์
    }
  }
  return lastComplete > 0 ? s.slice(0, lastComplete + 1) : s;
}

/** ปิดโครงสร้าง JSON ที่ค้าง: ปิด string ที่ยังเปิด + ตัด comma ท้าย + ปิด ] } ตาม stack */
function balanceClose(s: string): string {
  const st: string[] = [];
  let inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") st.push(ch);
    else if (ch === "}" || ch === "]") st.pop();
  }
  let out = s;
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "");
  while (st.length) out += st.pop() === "{" ? "}" : "]";
  return out;
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });
}
