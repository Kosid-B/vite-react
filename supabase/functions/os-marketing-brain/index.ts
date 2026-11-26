// Supabase Edge Function: os-marketing-brain
// "สมองการตลาด" ของ Marketing OS — รับข้อมูลที่ไหลจาก ceoaithailand.org แล้ว
//   analyze    → วิเคราะห์ผลรายกลุ่ม (บอกตรง ๆ ว่า sample พอไหม) + เสนอการทดลองถัดไป
//   ads        → ร่างโฆษณา 3 แบบ + brief ภาพ ตาม Content DNA
//   compliance → ตรวจร่างกับกฎแบรนด์แบบผู้ตรวจอิสระ
// คืน "ร่าง" เท่านั้น — การบันทึก/อนุมัติ/เผยแพร่อยู่ที่แอป OS (คนกดอนุมัติ · กฎแบรนด์ห้าม AI เผยแพร่เอง)
//
// 🔒 ความปลอดภัย
//   • verify_jwt = true (config.toml) · เรียกในนามผู้ใช้ที่ล็อกอินเท่านั้น
//   • ตรวจการเป็นสมาชิก workspace ทุกครั้ง ผ่าน rpc os_member_funnel_summary (0075) — ไม่ใช่สมาชิก = 42501 → 403
//     และใช้ผลของ rpc เดียวกันเป็นตัวเลข funnel ที่ "ฝั่ง server อ่านเอง" (ไม่รับตัวเลขจาก client)
//   • ไม่แตะตาราง marketing_* ตรง (ADR-0012 · ownershipBoundary.test)
//   • ออกเน็ตได้เฉพาะ allowlist (guardedFetch) · คีย์ Claude อยู่ใน secret ANTHROPIC_API_KEY เท่านั้น
//
// Deploy:  supabase functions deploy os-marketing-brain

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@1.14.0";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { guardedFetch } from "../_shared/egressGuard.ts";
import { enforceAiQuota, enforceAiTokens, recordAiTokens } from "../_shared/quota.ts";
import { reportAiFailure, reportMissingKey } from "../_shared/aiFailure.ts";
import { BUDGET, parseInput, SCHEMAS, systemPrompt, userMessage, type FunnelRow } from "./prompts.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = "claude-opus-5-5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const client = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  // บังคับ allowlist ทุกคำขอที่ SDK ส่งออก (api.anthropic.com อยู่ในรายชื่อแล้ว)
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    guardedFetch(input instanceof Request ? input.url : String(input), init),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!ANTHROPIC_API_KEY) {
    await reportMissingKey("os-marketing-brain", "ANTHROPIC_API_KEY");
    return json({ error: "missing_api_key" }, 500);
  }

  let input;
  try {
    input = parseInput(await req.json());
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "invalid_input" }, 400);
  }

  // ① สมาชิกภาพ + ตัวเลข funnel (ฝั่ง server อ่านเอง)
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return json({ error: "server_env_missing" }, 500);
  const supa = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: funnel, error: rpcErr } = await supa.rpc("os_member_funnel_summary", {
    p_workspace: input.workspaceId,
    p_since: since,
  });
  if (rpcErr) {
    return rpcErr.code === "42501"
      ? json({ error: "not_a_member" }, 403)
      : json({ error: "funnel_unavailable", detail: rpcErr.message }, 502);
  }

  // ② โควตา AI เดิมของรีโป (flag-gated · fail-open)
  const blocked = (await enforceAiQuota(req)) ?? (await enforceAiTokens(req));
  if (blocked) return blocked;

  // ③ เรียก Claude — structured outputs บังคับรูป JSON · fallback อัตโนมัติถ้าถูกปฏิเสธ
  const budget = BUDGET[input.task];
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: budget.maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // system prompt คงที่ต่อ task (Content DNA ยาว) ⇒ cache ได้ข้ามคำขอ
      system: [{ type: "text", text: systemPrompt(input.task), cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessage(input, (funnel ?? []) as FunnelRow[]) }],
      output_config: {
        effort: budget.effort,
        format: { type: "json_schema", schema: SCHEMAS[input.task] },
      },
    });

    await recordAiTokens(req, response.usage.input_tokens, response.usage.output_tokens);

    if (response.stop_reason === "refusal") {
      return json({ error: "refused", category: response.stop_details?.category ?? null }, 422);
    }
    if (response.stop_reason === "max_tokens") {
      return json({ error: "output_truncated" }, 502);
    }
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "empty_output" }, 502);

    return json({
      task: input.task,
      model: response.model,
      result: JSON.parse(text.text),
      usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
    });
  } catch (err) {
    await reportAiFailure("os-marketing-brain", err);
    if (err instanceof Anthropic.RateLimitError) return json({ error: "rate_limited" }, 429);
    if (err instanceof Anthropic.AuthenticationError) return json({ error: "ai_auth_failed" }, 500);
    if (err instanceof Anthropic.APIError) return json({ error: "ai_error", status: err.status }, 502);
    return json({ error: "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
