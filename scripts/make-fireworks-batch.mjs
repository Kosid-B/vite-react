#!/usr/bin/env node
// make-fireworks-batch.mjs — สร้างไฟล์ .jsonl สำหรับอัปโหลดเข้า Fireworks Batch Inference
// แต่ละบรรทัด = 1 request (รูปแบบ OpenAI chat/completions ที่ Fireworks รองรับ)
//
// วิธีใช้:
//   node scripts/make-fireworks-batch.mjs > fireworks-batch-input.jsonl
//   node scripts/make-fireworks-batch.mjs --model accounts/fireworks/models/llama-v3p3-70b-instruct > out.jsonl
//   node scripts/make-fireworks-batch.mjs --task compliance > compliance-batch.jsonl
//
// แล้วเอาไฟล์ .jsonl นี้ไป "เลือกไฟล์" (upload dataset) ในหน้า Fireworks Batch Inference

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i > -1 ? args[i + 1] : d; };
const MODEL = opt("model", "accounts/fireworks/models/llama-v3p1-8b-instruct");
const TASK = opt("task", "assist"); // assist | compliance | privacy
const MAX = Number(opt("max", "1200"));

// system prompts (ให้ตรงกับ edge functions จริงของเรา)
const SYS = {
  assist: "คุณคือทีม AI Agent ผู้ช่วยภายในแพลตฟอร์ม CEO AI Thailand ให้คำแนะนำที่ลงมือทำได้จริง กระชับ ภาษาไทย",
  compliance: "คุณคือผู้ตรวจประเมินระบบมาตรฐานของไทย วิเคราะห์เอกสารเทียบข้อกำหนดอย่างตรงไปตรงมา ตอบภาษาไทย",
  privacy: "คุณคือที่ปรึกษา PDPA ร่างเอกสารภาษาไทยที่ถูกต้อง ชัดเจน เป็นมืออาชีพ",
};

// ชุดตัวอย่างงานจริงต่อ task (ปรับ/เพิ่มได้ตามต้องการ — 1 object = 1 บรรทัดในไฟล์)
const TASKS = {
  assist: [
    "ช่วยแตกงานให้ CMO ทำการตลาดร้านกาแฟใหม่ งบ 15,000/เดือน",
    "ควรอนุมัติจ้างเอเจนต์ฝ่ายขายเพิ่มไหม รายได้ 42,000 รายจ่าย 38,000",
    "วางแผนคอนเทนต์ 1 สัปดาห์เจาะคนอายุ 25-34 ขายคอร์สออนไลน์",
    "churn เดือนนี้ 8% ควรทำอะไรก่อน",
    "เขียนคำโปรยร้านรับทำป้ายไวนิล ส่งไว 24 ชม.",
  ],
  compliance: [
    "องค์กรมีนโยบายคุณภาพ คู่มือคุณภาพ แต่ยังไม่มี internal audit — ขาดข้อกำหนด ISO 9001 อะไรบ้าง",
    "เตรียมตัวก่อน internal audit ISO 9001 ต้องทำอะไร",
    "ปฏิบัติการแก้ไข (corrective action) ที่ดีต้องมีองค์ประกอบอะไร",
  ],
  privacy: [
    "ร่างประกาศความเป็นส่วนตัว PDPA สำหรับร้านค้าออนไลน์ที่เก็บ ชื่อ เบอร์ อีเมล ที่อยู่",
    "ร่าง SOP การจัดการคำขอใช้สิทธิเจ้าของข้อมูลตาม PDPA",
  ],
};

const system = SYS[TASK] || SYS.assist;
const items = TASKS[TASK] || TASKS.assist;

for (let i = 0; i < items.length; i++) {
  const line = {
    custom_id: `${TASK}-${i + 1}`,
    method: "POST",
    url: "/v1/chat/completions",
    body: {
      model: MODEL,
      max_tokens: MAX,
      messages: [
        { role: "system", content: system },
        { role: "user", content: items[i] },
      ],
    },
  };
  process.stdout.write(JSON.stringify(line) + "\n");
}
