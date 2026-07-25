#!/usr/bin/env node
// haiku-eval.mjs — A/B คุณภาพ Haiku vs Sonnet สำหรับ ai-assist (Fireworks Playbook · quality gate ก่อนเปิด MODEL_SIMPLE)
//
// วิธีรัน (ต้องมี ANTHROPIC_API_KEY — คีย์เดียวกับที่ตั้งใน Supabase secrets):
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/haiku-eval.mjs
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/haiku-eval.mjs --out /tmp/haiku-eval.json
//
// ทำอะไร: ยิง prompt จริงของ ai-assist (ชุดทอง 12 เคส ครอบคลุมหลายหน้า) เข้า "ทั้ง Sonnet และ Haiku"
//   แล้วให้ LLM-judge (Sonnet) ให้คะแนนแบบ blind (สลับ A/B ไม่ให้รู้ว่าอันไหนโมเดลไหน)
//   ตาม rubric 4 ด้าน → สรุป go/no-go ตามเกณฑ์ที่ตั้งไว้ล่วงหน้า (ไม่ peek, รันครบทุกเคส)
//
// เกณฑ์ตัดสิน (ตั้งก่อนรัน — ห้ามขยับหลังเห็นผล):
//   ✅ GO ถ้า:  Haiku mean ≥ 0.95 × Sonnet mean  AND  0 critical failure  AND  Haiku loss-rate < 20%
//   ⚠️ ELSE  = อย่าเพิ่งเปิด (คงใช้ Sonnet / ปรับ prompt / ลองโมเดลอื่น)

const API = "https://api.anthropic.com/v1/messages";
const KEY = process.env.ANTHROPIC_API_KEY;
const SONNET = process.env.MODEL_SONNET || "claude-sonnet-4-6";
const HAIKU = process.env.MODEL_HAIKU || "claude-haiku-4-5-20251001";
const JUDGE = process.env.MODEL_JUDGE || SONNET;

if (!KEY) { console.error("❌ ต้องตั้ง ANTHROPIC_API_KEY ก่อน"); process.exit(1); }

// ─── system prompt ต้องตรงกับ supabase/functions/ai-assist/index.ts (non-stream JSON path) ───
const AI_ASSIST_SYSTEM =
  "คุณคือทีม AI Agent ผู้ช่วยภายในแพลตฟอร์ม CEO AI Thailand (สร้างบริษัท AI อัตโนมัติสำหรับธุรกิจไทย) " +
  "ทำหน้าที่เป็นที่ปรึกษากลยุทธ์/การตลาด/ปฏิบัติการตามหน้าที่ผู้ใช้กำลังทำงานอยู่ " +
  "ให้คำแนะนำที่ลงมือทำได้จริง กระชับ เป็นภาษาไทย และตอบเป็น JSON เท่านั้น";

function aiAssistUser({ pageLabel, context, instruction }) {
  return `หน้า/ขั้นตอนที่ผู้ใช้กำลังทำงาน: ${pageLabel ?? "-"}\n` +
    `บริบทข้อมูลปัจจุบัน:\n${context ?? "(ไม่มี)"}\n\n` +
    `คำสั่งจากผู้ใช้: ${instruction}\n\n` +
    `ตอบกลับเป็น JSON: {"summary":"สรุปคำแนะนำสั้น ๆ 1-2 ประโยค",` +
    `"suggestions":["ข้อเสนอแนะที่ลงมือทำได้ 3-6 ข้อ"]}`;
}

// ─── ชุดทอง (golden set) — เคสจริงจากหลายหน้าในแอป ───
const GOLDEN = [
  { page: "aicompany", pageLabel: "บริษัท AI", instruction: "ช่วยแตกงานให้ CMO ทำการตลาดร้านกาแฟใหม่",
    context: "ธุรกิจ: ร้านกาแฟ · เอเจนต์: CEO, CMO, CFO · งบ/เดือน: 15,000 บาท" },
  { page: "boardroom", pageLabel: "ห้องบอร์ด", instruction: "ควรอนุมัติจ้างเอเจนต์ฝ่ายขายเพิ่มไหม",
    context: "รายได้/เดือน: 42,000 · รายจ่าย: 38,000 · ดีลค้างท่อ: 6" },
  { page: "resources", pageLabel: "ทรัพยากร", instruction: "จัดสรรงบ 20,000 ให้คุ้มที่สุด",
    context: "ทีม: 3 คน · เครื่องมือ: Canva, LINE OA · ขาด: คนทำคอนเทนต์" },
  { page: "iso9001", pageLabel: "ISO 9001:2015 QMS", instruction: "โรงงานเราพร้อม audit กี่ % และขาดอะไร",
    context: "ทำแล้ว: นโยบายคุณภาพ, คู่มือ · ยังไม่ทำ: internal audit, management review" },
  { page: "trade", pageLabel: "ซื้อขาย B2B (RFQ)", instruction: "ช่วยร่างใบขอเสนอราคาจ้างทำเว็บ",
    context: "ต้องการ: เว็บ 5 หน้า + ระบบจองคิว · งบ: 30,000-50,000" },
  { page: "marketing", pageLabel: "กลยุทธ์การตลาด", instruction: "วางแผนคอนเทนต์ 1 สัปดาห์เจาะคนอายุ 25-34",
    context: "ช่องทาง: TikTok, FB · สินค้า: คอร์สออนไลน์สอนทำขนม" },
  { page: "billing", pageLabel: "แพ็กเกจ & ชำระเงิน", instruction: "ลูกค้าถามว่าแพ็ก Growth คุ้มกว่า Starter ตรงไหน",
    context: "Starter 390: ฟีเจอร์พื้นฐาน · Growth 1490: + AI search, team, analytics" },
  { page: "storefront", pageLabel: "หน้าร้านของฉัน", instruction: "เขียนคำโปรยร้านให้ขายดีขึ้น",
    context: "ร้าน: รับทำป้ายไวนิล/สติกเกอร์ · จุดเด่น: ส่งไว 24 ชม. ในกรุงเทพ" },
  { page: "analytics", pageLabel: "SaaS Analytics", instruction: "churn เดือนนี้ 8% ควรทำอะไรก่อน",
    context: "ผู้ใช้: 320 · churn: 8% · ฟีเจอร์ยอดฮิต: ประเมิน ISO, เมืองบริษัท" },
  { page: "citytrade", pageLabel: "การค้าระหว่างเมือง", instruction: "ควรจับคู่ค้ากับพาร์ทเนอร์รายไหนก่อน",
    context: "พาร์ทเนอร์: A(ราคาถูก คุณภาพกลาง), B(แพง คุณภาพสูง), C(กลางๆ ส่งไว)" },
  { page: "team", pageLabel: "ทีม / สมาชิก", instruction: "onboard สมาชิกใหม่ให้เริ่มงานได้ใน 1 วันยังไง",
    context: "สมาชิกใหม่: 2 คน (ฝ่ายคอนเทนต์) · เครื่องมือหลัก: แอปนี้ + Canva" },
  { page: "casestudies", pageLabel: "Case Studies", instruction: "สรุปบทเรียนจากเคสให้เอาไปใช้กับธุรกิจตัวเอง",
    context: "เคส: SME ผลิตอาหารเพิ่มยอด 3 เท่าใน 6 เดือนด้วยระบบ + คอนเทนต์สม่ำเสมอ" },
];

async function call(model, system, user, maxTokens = 1200) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!r.ok) throw new Error(`${model} → ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return (d?.content?.[0]?.text ?? "").trim();
}

const JUDGE_SYSTEM =
  "คุณคือกรรมการประเมินคุณภาพคำตอบผู้ช่วย AI ภาษาไทยสำหรับแพลตฟอร์มธุรกิจ SME ไทย " +
  "ให้คะแนนอย่างเข้มงวดและยุติธรรม โดยไม่รู้ว่าคำตอบมาจากโมเดลใด ตอบเป็น JSON เท่านั้น";

function judgeUser(task, ansA, ansB) {
  return `งานของผู้ช่วย (หน้า: ${task.pageLabel}):\nคำสั่ง: ${task.instruction}\nบริบท: ${task.context}\n\n` +
    `=== คำตอบ A ===\n${ansA}\n\n=== คำตอบ B ===\n${ansB}\n\n` +
    `ให้คะแนนแต่ละคำตอบ 1-5 ต่อ 4 ด้าน (accuracy=ถูกต้องตรงบริบท, actionability=ลงมือทำได้จริง, ` +
    `thai=ภาษาไทยเป็นธรรมชาติ/มืออาชีพ, format=เป็น JSON summary+suggestions ครบถูก) ` +
    `และระบุ critical=true ถ้าคำตอบผิดร้ายแรง/หลุดภาษาไทย/ฟอร์แมตพัง/ให้คำแนะนำอันตราย\n` +
    `ตอบ JSON: {"A":{"accuracy":n,"actionability":n,"thai":n,"format":n,"critical":bool},` +
    `"B":{...},"winner":"A"|"B"|"tie","reason":"สั้นๆ"}`;
}

function extractJson(t) { const s = t.indexOf("{"), e = t.lastIndexOf("}"); try { return JSON.parse(t.slice(s, e + 1)); } catch { return null; } }
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const sum4 = (o) => (o.accuracy + o.actionability + o.thai + o.format);

async function main() {
  const outArg = process.argv.indexOf("--out");
  const outPath = outArg > -1 ? process.argv[outArg + 1] : null;
  console.log(`🔬 A/B คุณภาพ: ${SONNET} (control) vs ${HAIKU} (variant) · judge=${JUDGE}`);
  console.log(`   ชุดทอง ${GOLDEN.length} เคส · rubric 4 ด้าน (เต็ม 20/คำตอบ)\n`);

  const rows = [];
  for (let i = 0; i < GOLDEN.length; i++) {
    const t = GOLDEN[i];
    const user = aiAssistUser(t);
    try {
      const [sonnet, haiku] = await Promise.all([
        call(SONNET, AI_ASSIST_SYSTEM, user),
        call(HAIKU, AI_ASSIST_SYSTEM, user),
      ]);
      // blind: สลับตำแหน่ง A/B ต่อเคส (คู่ index → sonnet=A, คี่ → haiku=A)
      const sonnetIsA = i % 2 === 0;
      const ansA = sonnetIsA ? sonnet : haiku;
      const ansB = sonnetIsA ? haiku : sonnet;
      const jRaw = await call(JUDGE, JUDGE_SYSTEM, judgeUser(t, ansA, ansB), 700);
      const j = extractJson(jRaw);
      if (!j) { console.log(`  [${i + 1}/${GOLDEN.length}] ${t.pageLabel} — ⚠️ judge parse fail`); continue; }
      const sc = sonnetIsA ? { sonnet: j.A, haiku: j.B } : { sonnet: j.B, haiku: j.A };
      const winner = j.winner === "tie" ? "tie" : ((j.winner === "A") === sonnetIsA ? "sonnet" : "haiku");
      rows.push({ page: t.pageLabel, sonnet: sc.sonnet, haiku: sc.haiku, winner, reason: j.reason });
      console.log(`  [${i + 1}/${GOLDEN.length}] ${t.pageLabel.padEnd(22)} S=${sum4(sc.sonnet)} H=${sum4(sc.haiku)} → ${winner}${sc.haiku.critical ? " 🔴CRIT(H)" : ""}`);
    } catch (e) {
      console.log(`  [${i + 1}/${GOLDEN.length}] ${t.pageLabel} — ❌ ${String(e).slice(0, 80)}`);
    }
  }

  if (!rows.length) { console.error("\n❌ ไม่มีผลลัพธ์"); process.exit(1); }

  const sMean = mean(rows.map(r => sum4(r.sonnet)));
  const hMean = mean(rows.map(r => sum4(r.haiku)));
  const ratio = sMean > 0 ? hMean / sMean : 0;
  const critH = rows.filter(r => r.haiku.critical).length;
  const wins = { sonnet: 0, haiku: 0, tie: 0 };
  rows.forEach(r => wins[r.winner]++);
  const lossRate = rows.length ? wins.sonnet / rows.length : 1; // Haiku "แพ้" = Sonnet ชนะ

  const GO = ratio >= 0.95 && critH === 0 && lossRate < 0.20;

  console.log(`\n════════ สรุป (n=${rows.length}) ════════`);
  console.log(`Sonnet เฉลี่ย : ${sMean.toFixed(2)}/20`);
  console.log(`Haiku เฉลี่ย  : ${hMean.toFixed(2)}/20  (${(ratio * 100).toFixed(1)}% ของ Sonnet)`);
  console.log(`ชนะ/เสมอ/แพ้ (Haiku): ${wins.haiku}/${wins.tie}/${wins.sonnet}  · Haiku loss-rate ${(lossRate * 100).toFixed(0)}%`);
  console.log(`critical failure (Haiku): ${critH}`);
  console.log(`\nเกณฑ์: ratio≥95% (${(ratio * 100).toFixed(1)}%) · crit=0 (${critH}) · loss<20% (${(lossRate * 100).toFixed(0)}%)`);
  console.log(GO
    ? `\n✅ GO — เปิด MODEL_SIMPLE=${HAIKU} ได้ (คุณภาพผ่านเกณฑ์ ต้นทุนลง ~80%/call)`
    : `\n⚠️ NO-GO — ยังอย่าเปิด Haiku กับ ai-assist (คงใช้ Sonnet / ปรับ system prompt / ลองโมเดลอื่น)`);

  if (outPath) {
    const fs = await import("node:fs");
    fs.writeFileSync(outPath, JSON.stringify({ sMean, hMean, ratio, critH, wins, lossRate, GO, rows }, null, 2));
    console.log(`\n💾 บันทึกผลดิบ: ${outPath}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
