#!/usr/bin/env node
// typhoon-eval.mjs — A/B คุณภาพข้าม provider: Claude (control) vs Fireworks/Typhoon (variant)
// ก่อนเปิดโมเดล open-source กับงานไทยจริง (tier 'thai') → พิสูจน์ว่าคุณภาพไม่ตกก่อน
//
// ต้องมี 2 keys:
//   ANTHROPIC_API_KEY  = Claude (control + กรรมการ judge)
//   FIREWORKS_API_KEY  = Fireworks (variant)  [หรือ TYPHOON_API_KEY / LLM_API_KEY+LLM_BASE_URL]
//
// วิธีรัน:
//   ANTHROPIC_API_KEY=sk-ant-... FIREWORKS_API_KEY=fw_... \
//     MODEL_VARIANT=accounts/fireworks/models/llama-v3p3-70b-instruct node scripts/typhoon-eval.mjs
//
// เกณฑ์ GO (ตั้งก่อนรัน): variant mean ≥ 0.90 × Claude · 0 critical · variant loss-rate < 25%
//   (เกณฑ์ผ่อนกว่า Haiku-eval เล็กน้อย เพราะ open-source + ประหยัดมากกว่า — ยอมแลกได้บ้าง)

const ANTHROPIC = "https://api.anthropic.com/v1/messages";
const AKEY = process.env.ANTHROPIC_API_KEY;
const CONTROL = process.env.MODEL_CONTROL || "claude-sonnet-4-6";
const JUDGE = process.env.MODEL_JUDGE || CONTROL;
const VARIANT = process.env.MODEL_VARIANT || "accounts/fireworks/models/llama-v3p3-70b-instruct";

// resolve OpenAI-compatible provider (เหมือน _shared/llm.ts)
const OKEY = process.env.FIREWORKS_API_KEY || process.env.TOGETHER_API_KEY || process.env.TYPHOON_API_KEY || process.env.LLM_API_KEY || "";
const OBASE = process.env.LLM_BASE_URL ||
  (process.env.FIREWORKS_API_KEY ? "https://api.fireworks.ai/inference/v1" : "") ||
  (process.env.TOGETHER_API_KEY ? "https://api.together.xyz/v1" : "") ||
  (process.env.TYPHOON_API_KEY ? "https://api.opentyphoon.ai/v1" : "") || "";

if (!AKEY) { console.error("❌ ต้องตั้ง ANTHROPIC_API_KEY (control + judge)"); process.exit(1); }
if (!OKEY || !OBASE) { console.error("❌ ต้องตั้ง FIREWORKS_API_KEY (หรือ TYPHOON_API_KEY / LLM_API_KEY+LLM_BASE_URL)"); process.exit(1); }

// system prompt = งานไทยตัวแทน (คำแนะนำ/ร่าง) ให้ตรงจิตวิญญาณ tier 'thai'
const SYSTEM = "คุณคือที่ปรึกษาธุรกิจ/มาตรฐาน/กฎหมายของไทย ตอบภาษาไทยที่ถูกต้อง ชัดเจน เป็นมืออาชีพ ลงมือทำได้จริง";

const GOLDEN = [
  "ร่างย่อหน้า 'สิทธิของเจ้าของข้อมูล' ในประกาศความเป็นส่วนตัวตาม PDPA",
  "องค์กรมีนโยบายคุณภาพแต่ยังไม่มี internal audit — ขาดข้อกำหนด ISO 9001 อะไร และต้องทำอะไรต่อ",
  "ช่วยแตกงานการตลาดให้ร้านกาแฟใหม่ งบ 15,000/เดือน เป็นข้อ ๆ",
  "อธิบาย 'ปฏิบัติการแก้ไข (corrective action)' ที่ดีตามหลัก ISO 9001 ต้องมีอะไรบ้าง",
  "เขียนคำโปรยขายร้านรับทำป้ายไวนิล จุดเด่นส่งไว 24 ชม. ในกรุงเทพ",
  "SME ผลิตอาหารอยากขอ อย. และ มอก. ต้องเตรียมเอกสาร/ขั้นตอนอะไรบ้าง",
  "churn ลูกค้า SaaS เดือนนี้ 8% แนะนำ 3 มาตรการเร่งด่วนเรียงตามผลกระทบ",
  "ร่างอีเมลตอบลูกค้าที่ขอใช้สิทธิลบข้อมูลส่วนบุคคล (PDPA) อย่างสุภาพและถูกกฎหมาย",
];

async function callClaude(model, user, maxTokens = 1000) {
  const r = await fetch(ANTHROPIC, {
    method: "POST",
    headers: { "x-api-key": AKEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: SYSTEM, messages: [{ role: "user", content: user }] }),
  });
  if (!r.ok) throw new Error(`claude ${r.status}: ${(await r.text()).slice(0, 150)}`);
  const d = await r.json();
  return (d?.content?.[0]?.text ?? "").trim();
}

async function callVariant(user, maxTokens = 1000) {
  const r = await fetch(`${OBASE.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${OKEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: VARIANT, max_tokens: maxTokens, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }] }),
  });
  if (!r.ok) throw new Error(`variant ${r.status}: ${(await r.text()).slice(0, 150)}`);
  const d = await r.json();
  return (d?.choices?.[0]?.message?.content ?? "").trim();
}

const JUDGE_SYS = "คุณคือกรรมการประเมินคุณภาพคำตอบภาษาไทยสำหรับธุรกิจ/มาตรฐาน/กฎหมายไทย ให้คะแนนเข้มงวดยุติธรรม โดยไม่รู้ว่าคำตอบมาจากโมเดลใด ตอบ JSON เท่านั้น";
function judgeUser(task, A, B) {
  return `โจทย์: ${task}\n\n=== คำตอบ A ===\n${A}\n\n=== คำตอบ B ===\n${B}\n\n` +
    `ให้คะแนน 1-5 ต่อ 4 ด้าน (accuracy=ถูกต้อง/ตรงกฎหมาย-มาตรฐาน, usefulness=นำไปใช้ได้จริง, thai=ภาษาไทยธรรมชาติ/มืออาชีพ, complete=ครบถ้วน) ` +
    `และ critical=true ถ้าผิดร้ายแรง/หลุดภาษาไทย/ให้ข้อมูลกฎหมายผิด\n` +
    `ตอบ JSON: {"A":{"accuracy":n,"usefulness":n,"thai":n,"complete":n,"critical":bool},"B":{...},"reason":"สั้นๆ"}`;
}

const extract = (t) => { const s = t.indexOf("{"), e = t.lastIndexOf("}"); try { return JSON.parse(t.slice(s, e + 1)); } catch { return null; } };
const sum4 = (o) => o.accuracy + o.usefulness + o.thai + o.complete;
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);

async function main() {
  console.log(`🔬 A/B ไทย: ${CONTROL} (control) vs ${VARIANT} (variant) · judge=${JUDGE}`);
  console.log(`   provider variant: ${OBASE} · ชุดทอง ${GOLDEN.length} เคส\n`);
  const rows = [];
  for (let i = 0; i < GOLDEN.length; i++) {
    const t = GOLDEN[i];
    try {
      const [c, v] = await Promise.all([callClaude(CONTROL, t), callVariant(t)]);
      const cIsA = i % 2 === 0;
      const jRaw = await callClaude(JUDGE, judgeUser(t, cIsA ? c : v, cIsA ? v : c), 600);
      const j = extract(jRaw);
      if (!j) { console.log(`  [${i + 1}] ⚠️ judge parse fail`); continue; }
      const sc = cIsA ? { c: j.A, v: j.B } : { c: j.B, v: j.A };
      const win = sum4(sc.v) > sum4(sc.c) ? "variant" : sum4(sc.v) < sum4(sc.c) ? "control" : "tie";
      rows.push({ c: sc.c, v: sc.v, win });
      console.log(`  [${i + 1}/${GOLDEN.length}] C=${sum4(sc.c)} V=${sum4(sc.v)} → ${win}${sc.v.critical ? " 🔴CRIT" : ""}`);
    } catch (e) { console.log(`  [${i + 1}] ❌ ${String(e).slice(0, 90)}`); }
  }
  if (!rows.length) { console.error("\n❌ ไม่มีผล"); process.exit(1); }

  const cMean = mean(rows.map(r => sum4(r.c))), vMean = mean(rows.map(r => sum4(r.v)));
  const ratio = cMean > 0 ? vMean / cMean : 0;
  const crit = rows.filter(r => r.v.critical).length;
  const loss = rows.filter(r => r.win === "control").length / rows.length;
  const GO = ratio >= 0.90 && crit === 0 && loss < 0.25;

  console.log(`\n════ สรุป (n=${rows.length}) ════`);
  console.log(`Claude  เฉลี่ย: ${cMean.toFixed(2)}/20`);
  console.log(`Variant เฉลี่ย: ${vMean.toFixed(2)}/20  (${(ratio * 100).toFixed(1)}% ของ Claude)`);
  console.log(`variant ชนะ/เสมอ/แพ้: ${rows.filter(r => r.win === "variant").length}/${rows.filter(r => r.win === "tie").length}/${rows.filter(r => r.win === "control").length} · loss ${(loss * 100).toFixed(0)}% · critical ${crit}`);
  console.log(`\nเกณฑ์: ratio≥90% (${(ratio * 100).toFixed(1)}%) · crit=0 (${crit}) · loss<25% (${(loss * 100).toFixed(0)}%)`);
  console.log(GO
    ? `\n✅ GO — เปิด ${VARIANT} กับงานไทยได้ (ตั้ง MODELS_THAI ในแอป) ต้นทุนลงมาก`
    : `\n⚠️ NO-GO — ยังอย่าเปิดกับงานจริง (ลองโมเดลใหญ่ขึ้น เช่น Typhoon/Qwen-72B หรือคง Claude ไว้)`);
}
main().catch(e => { console.error(e); process.exit(1); });
