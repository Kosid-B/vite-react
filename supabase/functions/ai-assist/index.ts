// Supabase Edge Function: ai-assist
// AI Agent ช่วยงานในทุกหน้า/ทุกขั้นตอน — รับบริบทของหน้าปัจจุบัน + คำสั่งผู้ใช้
// → เรียก Claude ให้คำแนะนำ/สร้างเนื้อหาที่ใช้ได้จริง (ภาษาไทย)
//
// Deploy:  supabase functions deploy ai-assist
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body { page?: string; pageLabel?: string; instruction?: string; context?: string; stream?: boolean }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!ANTHROPIC_API_KEY) return json({ error: "missing_api_key" }, 500);

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  if (!body?.instruction) return json({ error: "missing_instruction" }, 400);

  // (ข) ถ้าขอ stream → คืน SSE ให้ข้อความทยอยขึ้น
  if (body.stream) return streamAssist(body);

  const system =
    "คุณคือทีม AI Agent ผู้ช่วยภายในแพลตฟอร์ม CEO AI Thailand (สร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย) " +
    "ทำหน้าที่เป็นที่ปรึกษากลยุทธ์/การตลาด/ปฏิบัติการตามหน้าที่ผู้ใช้กำลังทำงานอยู่ " +
    "ให้คำแนะนำที่ลงมือทำได้จริง กระชับ เป็นภาษาไทย และตอบเป็น JSON เท่านั้น";

  const userMsg =
    `หน้า/ขั้นตอนที่ผู้ใช้กำลังทำงาน: ${body.pageLabel ?? body.page ?? "-"}\n` +
    `บริบทข้อมูลปัจจุบัน:\n${body.context ?? "(ไม่มี)"}\n\n` +
    `คำสั่งจากผู้ใช้: ${body.instruction}\n\n` +
    `ตอบกลับเป็น JSON: {"summary":"สรุปคำแนะนำสั้น ๆ 1-2 ประโยค",` +
    `"suggestions":["ข้อเสนอแนะที่ลงมือทำได้ 3-6 ข้อ"]}`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  if (!r.ok) return json({ error: "anthropic_error", detail: await r.text() }, 502);

  const data = await r.json();
  const text = (data?.content?.[0]?.text ?? "").trim();
  const parsed = extractJson(text);
  if (!parsed) return json({ summary: text, suggestions: [] }, 200);
  return json({ summary: parsed.summary ?? "", suggestions: parsed.suggestions ?? [] }, 200);
});


// (ข) streaming ผ่าน Anthropic stream API → รีเลย์เป็น SSE ให้ client
async function streamAssist(body: Body): Promise<Response> {
  const system =
    "คุณคือทีม AI Agent ผู้ช่วยภายในแพลตฟอร์ม CEO AI Thailand (สร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย) " +
    "ให้คำแนะนำที่ลงมือทำได้จริง กระชับ เป็นภาษาไทย " +
    "รูปแบบ: สรุป 1-2 ประโยคก่อน แล้วตามด้วยข้อเสนอแนะเป็น bullet ขึ้นต้นด้วย '- ' 3-6 ข้อ (ห้ามตอบเป็น JSON)";
  const userMsg =
    `หน้า/ขั้นตอน: ${body.pageLabel ?? body.page ?? "-"}\n` +
    `บริบท:\n${body.context ?? "(ไม่มี)"}\n\n` +
    `คำสั่งจากผู้ใช้: ${body.instruction}`;

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      stream: true,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    return json({ error: "anthropic_error", detail: await upstream.text() }, 502);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const dec = new TextDecoder();
      const reader = upstream.body!.getReader();
      let buf = "";
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const p = t.slice(5).trim();
            if (!p || p === "[DONE]") continue;
            try {
              const ev = JSON.parse(p);
              if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) {
                controller.enqueue(enc.encode(`data: ${JSON.stringify({ text: ev.delta.text })}\n\n`));
              }
            } catch { /* ignore keepalive */ }
          }
        }
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
      } catch (e) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...cors, "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" },
  });
}

function extractJson(text: string): any | null {
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s === -1 || e === -1) return null;
  try { return JSON.parse(text.slice(s, e + 1)); } catch { return null; }
}
function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });
}
