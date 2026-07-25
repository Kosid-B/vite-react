// _shared/llm.ts — Provider-agnostic LLM helper (Fireworks Playbook · Phase 3)
// "หัวใจกลยุทธ์ Fireworks": ไม่ผูกกับโมเดลปิดเจ้าเดียว — รันโมเดล open-source ไทย (Typhoon) ผ่าน
// provider ราคาถูก (Fireworks / Together / OpenTyphoon) ได้ โดยสลับด้วย env ไม่ต้องแก้โค้ดเรียก
//
// เลือก provider จาก "ชื่อโมเดล" ที่ router คืนมา:
//   - ขึ้นต้น "claude"                      → Anthropic (ค่าเริ่มต้น — พฤติกรรมเดิม 100%)
//   - "typhoon..." / "accounts/..." (Fireworks) / มี "/" (Together)  → OpenAI-compatible
//   - หรือบังคับด้วย env LLM_PROVIDER = 'anthropic' | 'openai' (override)
//
// OpenAI-compatible endpoint (ตั้ง secret ตัวใดตัวหนึ่ง — ฝั่ง server เท่านั้น):
//   FIREWORKS_API_KEY  + (ออปชัน) LLM_BASE_URL=https://api.fireworks.ai/inference/v1
//   TOGETHER_API_KEY   + LLM_BASE_URL=https://api.together.xyz/v1
//   TYPHOON_API_KEY    + LLM_BASE_URL=https://api.opentyphoon.ai/v1
//   LLM_API_KEY        (generic) + LLM_BASE_URL
//
// ค่า default: ไม่ตั้ง env ใด ๆ → ทุกอย่างวิ่ง Anthropic เหมือนเดิม (ไม่มี provider ใหม่เปิดเอง)

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

export type Provider = "anthropic" | "openai";

export interface ChatOptions {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  /** เปิด prompt caching ของ Anthropic กับ system prompt (มีผลจริงเมื่อ system ยาว ≥ ~1k tokens) */
  cacheSystem?: boolean;
}

export interface ChatResult {
  text: string;
  provider: Provider;
  model: string;
  /** token usage (normalize ข้าม provider) — null ถ้า provider ไม่คืนมา */
  usage: { inputTokens: number; outputTokens: number } | null;
}

/** เดา provider จากชื่อโมเดล + override ด้วย env LLM_PROVIDER */
export function providerFor(model: string): Provider {
  const forced = (Deno.env.get("LLM_PROVIDER") ?? "").toLowerCase();
  if (forced === "anthropic" || forced === "openai") return forced;
  const m = (model || "").toLowerCase();
  if (m.startsWith("claude") || m.startsWith("anthropic")) return "anthropic";
  // typhoon / llama / qwen / fireworks (accounts/…) / together (org/model) = OpenAI-compatible
  if (m.includes("typhoon") || m.includes("llama") || m.includes("qwen") ||
      m.startsWith("accounts/") || m.includes("/")) return "openai";
  return "anthropic";
}

function openAiConfig(): { baseUrl: string; apiKey: string } {
  const apiKey =
    Deno.env.get("FIREWORKS_API_KEY") ||
    Deno.env.get("TOGETHER_API_KEY") ||
    Deno.env.get("TYPHOON_API_KEY") ||
    Deno.env.get("LLM_API_KEY") ||
    "";
  const baseUrl =
    Deno.env.get("LLM_BASE_URL") ||
    (Deno.env.get("FIREWORKS_API_KEY") ? "https://api.fireworks.ai/inference/v1" : "") ||
    (Deno.env.get("TOGETHER_API_KEY") ? "https://api.together.xyz/v1" : "") ||
    (Deno.env.get("TYPHOON_API_KEY") ? "https://api.opentyphoon.ai/v1" : "") ||
    "";
  return { baseUrl, apiKey };
}

/** เรียก LLM แบบ provider-agnostic — คืน text + usage (normalize). โยน error เมื่อ provider ตอบไม่ ok */
export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const provider = providerFor(opts.model);
  const maxTokens = opts.maxTokens ?? 1200;

  if (provider === "openai") {
    const { baseUrl, apiKey } = openAiConfig();
    if (!apiKey || !baseUrl) {
      throw new Error("openai_provider_unconfigured"); // กัน fallback เงียบ ๆ ไปโมเดลผิด
    }
    const r = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "authorization": `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      }),
    });
    if (!r.ok) throw new Error(`openai_error:${r.status}:${await r.text()}`);
    const data = await r.json();
    const text = (data?.choices?.[0]?.message?.content ?? "").trim();
    const u = data?.usage;
    return {
      text, provider, model: opts.model,
      usage: u ? { inputTokens: u.prompt_tokens ?? 0, outputTokens: u.completion_tokens ?? 0 } : null,
    };
  }

  // Anthropic (default) — เทียบเท่า fetch เดิมทุกประการ + prompt caching (ออปชัน)
  // หมายเหตุ: caching มีผลจริงเมื่อ system ≥ ~1k tokens · ถ้าสั้นกว่า Anthropic จะ "ไม่แคช" ให้เฉย ๆ (ไม่ error)
  const system = opts.cacheSystem
    ? [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }]
    : opts.system;
  const headers: Record<string, string> = {
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  };
  // ส่ง beta header เมื่อเปิด caching (ยอมรับได้แม้ feature GA แล้ว — belt-and-suspenders กับ API version เก่า)
  if (opts.cacheSystem) headers["anthropic-beta"] = "prompt-caching-2024-07-31";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: opts.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: opts.user }],
    }),
  });
  if (!r.ok) throw new Error(`anthropic_error:${r.status}:${await r.text()}`);
  const data = await r.json();
  const text = (data?.content?.[0]?.text ?? "").trim();
  const u = data?.usage;
  return {
    text, provider, model: opts.model,
    usage: u ? {
      inputTokens: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
      outputTokens: u.output_tokens ?? 0,
    } : null,
  };
}

/**
 * เรียกโมเดลตาม "รายการเรียงลำดับ" (จาก pickModels) — ลองตัวแรกก่อน · ถ้า error → ตัวถัดไป
 * ใช้ทำ multi-model + auto-fallback: เชื่อม open-source หลายตัว ระบบเลือก/สลับเองเมื่อจำเป็น
 * โยน error เฉพาะเมื่อ "ทุกตัวล้มเหลว" · ถ้า models ว่าง = ใช้ default ภายใน chat() ตามปกติ
 */
export async function chatWithFallback(
  models: string[],
  opts: Omit<ChatOptions, "model">,
): Promise<ChatResult> {
  // ถ้า models ว่าง → ใช้ Anthropic default (กันเรียกด้วย model="" แล้ว API พัง)
  const list = models.length ? models : [Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6"];
  let lastErr: unknown = null;
  for (const model of list) {
    try {
      return await chat({ ...opts, model });
    } catch (e) {
      lastErr = e; // provider ล่ม/ไม่ตั้ง key/โมเดลผิด → ลองตัวถัดไป
    }
  }
  throw new Error(`all_models_failed:${String(lastErr)}`);
}
