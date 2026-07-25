#!/usr/bin/env node
// fireworks-smoke.mjs — พิสูจน์ว่าท่อ Fireworks (OpenAI-compatible) เชื่อมได้จริง
// ใช้ตรรกะ config/เรียก "ตรงกับ supabase/functions/_shared/llm.ts" (openai branch) → ผ่าน = edge fn ใช้ได้แน่
//
// วิธีรัน (เลือกอย่างใดอย่างหนึ่ง):
//   FIREWORKS_API_KEY=fw_... node scripts/fireworks-smoke.mjs
//   TYPHOON_API_KEY=... node scripts/fireworks-smoke.mjs          # OpenTyphoon
//   LLM_API_KEY=... LLM_BASE_URL=https://api.together.xyz/v1 node scripts/fireworks-smoke.mjs   # Together
//
// เลือกโมเดล: FIREWORKS_MODEL=accounts/fireworks/models/llama-v3p1-70b-instruct (default = 8b เร็ว+ถูก)

// ─── resolve provider config — ก๊อปตรรกะจาก _shared/llm.ts openAiConfig() ───
const apiKey =
  process.env.FIREWORKS_API_KEY ||
  process.env.TOGETHER_API_KEY ||
  process.env.TYPHOON_API_KEY ||
  process.env.LLM_API_KEY || "";
const baseUrl =
  process.env.LLM_BASE_URL ||
  (process.env.FIREWORKS_API_KEY ? "https://api.fireworks.ai/inference/v1" : "") ||
  (process.env.TOGETHER_API_KEY ? "https://api.together.xyz/v1" : "") ||
  (process.env.TYPHOON_API_KEY ? "https://api.opentyphoon.ai/v1" : "") || "";

const MODEL = process.env.FIREWORKS_MODEL ||
  (process.env.TYPHOON_API_KEY ? "typhoon-v2.1-12b-instruct"
    : "accounts/fireworks/models/llama-v3p1-8b-instruct");

if (!apiKey || !baseUrl) {
  console.error("❌ ต้องตั้ง provider key ก่อน เช่น FIREWORKS_API_KEY=fw_... (หรือ TYPHOON_API_KEY / LLM_API_KEY+LLM_BASE_URL)");
  process.exit(1);
}

// ราคาโดยประมาณ USD/1M tokens (ปรับได้) + อัตราแลกเปลี่ยน
const PRICE = { in: 0.2, out: 0.2 }; // llama-8b class · 70b ~0.9
const USD_THB = 36;

// ─── เรียกแบบ OpenAI chat/completions (เหมือน llm.ts openai branch) ───
async function chat(system, user, maxTokens = 600) {
  const t0 = Date.now();
  const r = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL, max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  const ms = Date.now() - t0;
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  const text = (d?.choices?.[0]?.message?.content ?? "").trim();
  const u = d?.usage ?? {};
  return { text, ms, inTok: u.prompt_tokens ?? 0, outTok: u.completion_tokens ?? 0 };
}

const isThai = (s) => /[฀-๿]/.test(s);
const costThb = (i, o) => ((i * PRICE.in) + (o * PRICE.out)) / 1e6 * USD_THB;

// ─── 2 เคสทดสอบ: (ก) ai-assist ทั่วไป (ข) พรีวิว use case ตรวจ compliance ───
const CASES = [
  { name: "ai-assist (คำแนะนำไทย)",
    system: "คุณคือที่ปรึกษาธุรกิจ SME ไทย ตอบภาษาไทย กระชับ ลงมือทำได้จริง",
    user: "ร้านกาแฟเปิดใหม่ อยากได้ 3 ไอเดียการตลาดงบน้อย" },
  { name: "compliance preview (เทียบ ISO)",
    system: "คุณคือผู้ช่วยตรวจประเมินระบบคุณภาพ ISO 9001 ตอบภาษาไทยเป็นข้อ ๆ",
    user: "องค์กรมี: นโยบายคุณภาพ, คู่มือคุณภาพ แต่ยังไม่มี internal audit — ยังขาดข้อกำหนดสำคัญอะไรบ้าง" },
];

async function main() {
  console.log(`🔌 Fireworks smoke test`);
  console.log(`   endpoint : ${baseUrl}`);
  console.log(`   model    : ${MODEL}\n`);

  let ok = 0, totalMs = 0, totalCost = 0;
  for (const c of CASES) {
    try {
      const r = await chat(c.system, c.user);
      const thai = isThai(r.text);
      const cost = costThb(r.inTok, r.outTok);
      totalMs += r.ms; totalCost += cost;
      const pass = r.text.length > 20 && thai;
      if (pass) ok++;
      console.log(`${pass ? "✅" : "⚠️"} ${c.name}`);
      console.log(`   ${r.ms}ms · in ${r.inTok}/out ${r.outTok} tok · ~฿${cost.toFixed(4)} · ไทย=${thai ? "ใช่" : "ไม่"}`);
      console.log(`   ตัวอย่างคำตอบ: ${r.text.slice(0, 120).replace(/\n/g, " ")}…\n`);
    } catch (e) {
      console.log(`❌ ${c.name} — ${String(e).slice(0, 200)}\n`);
    }
  }

  console.log(`════════ สรุป ════════`);
  console.log(`ผ่าน ${ok}/${CASES.length} เคส · latency เฉลี่ย ${Math.round(totalMs / CASES.length)}ms · ต้นทุนรวม ~฿${totalCost.toFixed(4)}`);
  if (ok === CASES.length) {
    console.log(`\n✅ ท่อ Fireworks ใช้ได้ — edge function จะเชื่อมได้ทันทีเมื่อตั้ง:`);
    console.log(`   supabase secrets set FIREWORKS_API_KEY=... MODEL_THAI=${MODEL} --project-ref waigsnxhrlwtiotspaim`);
    console.log(`   (แล้ว route งานไทย/งานเบา ไป tier ที่ต้องการ + redeploy)`);
  } else {
    console.log(`\n⚠️ ยังไม่ผ่านครบ — เช็ค: model id ถูกไหม · key ใช้ได้ไหม · โมเดลตอบไทยได้ไหม (ลองเปลี่ยน FIREWORKS_MODEL)`);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
