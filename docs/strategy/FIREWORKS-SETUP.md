# เชื่อม Fireworks AI — ขั้นที่ 1: พิสูจน์ท่อก่อน (แล้วค่อยสร้างฟีเจอร์ทับ)
> ทุกไอเดีย (Compliance Assistant / Privacy Notice generator / RAG) พึ่ง "ท่อ Fireworks" อันเดียวกัน
> ระบบมี `_shared/llm.ts` รองรับ Fireworks (OpenAI-compatible) อยู่แล้ว — เหลือแค่ **ใส่ key + ยืนยันว่าเชื่อมจริง**

## ทำ 3 ขั้น (10 นาที)

### 1) สมัคร + เอา API key
- ไป https://fireworks.ai → สมัคร → **API Keys** → สร้าง key (`fw_...`)
- (ทางเลือกไทยล้วน: OpenTyphoon https://opentyphoon.ai ก็เป็น OpenAI-compatible เหมือนกัน)

### 2) รัน smoke test บนเครื่องคุณ (ยังไม่แตะ production)
```powershell
git pull origin main
$env:FIREWORKS_API_KEY="fw_..."
node scripts/fireworks-smoke.mjs
# เลือกโมเดลอื่น: $env:FIREWORKS_MODEL="accounts/fireworks/models/llama-v3p1-70b-instruct"
```
สคริปต์จะยิง 2 เคส (คำแนะนำไทย + พรีวิวตรวจ ISO) แล้วรายงาน **latency · token · ต้นทุน/call · เช็คภาษาไทย** + คำตัดสิน ✅/⚠️
- ใช้ตรรกะเดียวกับ `_shared/llm.ts` เป๊ะ → **ผ่าน = edge function เชื่อมได้แน่นอน**

### 3) ถ้าผ่าน → เปิดใน production (ไม่ต้องแก้โค้ด)
```bash
supabase secrets set FIREWORKS_API_KEY=fw_... MODEL_THAI=accounts/fireworks/models/llama-v3p1-70b-instruct \
  --project-ref waigsnxhrlwtiotspaim
supabase functions deploy ai-plan ai-assist agent-run --project-ref waigsnxhrlwtiotspaim
```
> `_shared/llm.ts` เลือก provider จากชื่อโมเดลอัตโนมัติ: ชื่อขึ้นต้น `accounts/` หรือมี `/` → วิ่ง Fireworks · `claude*` → Anthropic

## เชื่อมหลายโมเดล + ให้ระบบเลือกเอง (multi-model + auto-fallback)
`_shared/modelRouter.ts` รองรับ **รายการโมเดลเรียงลำดับต่อ tier** + เลือกตามภาษา + fallback อัตโนมัติ
ตั้งเป็น comma list (เรียงตามความชอบ) — ระบบลองตัวแรกก่อน · ล่ม/ตอบไม่ได้ → ตัวถัดไป · สุดท้าย fallback Claude เสมอ:
```bash
# งานไทย (Privacy Notice / ISO / คำแนะนำไทย) → Typhoon ก่อน แล้ว Llama แล้ว Claude
supabase secrets set MODELS_THAI="typhoon-v2.1-12b-instruct,accounts/fireworks/models/llama-v3p3-70b-instruct"
# งานเบา → Llama 8B (ถูก+เร็ว) แล้ว Haiku
supabase secrets set MODELS_SIMPLE="accounts/fireworks/models/llama-v3p1-8b-instruct,claude-haiku-4-5-20251001"
# งานหนัก → Llama 70B แล้ว fallback Claude เอง
supabase secrets set MODELS_COMPLEX="accounts/fireworks/models/llama-v3p3-70b-instruct"
supabase functions deploy ai-plan ai-assist agent-run --project-ref waigsnxhrlwtiotspaim
```
> **เลือกตามภาษาอัตโนมัติ:** ถ้า input เป็นภาษาไทย ระบบจะดันโมเดลใน `MODELS_THAI` (เช่น Typhoon) ขึ้นก่อนเสมอ
> **default-safe:** ไม่ตั้ง `MODELS_*`/`MODEL_*` = ใช้ Claude เดิมตัวเดียว (พฤติกรรมไม่เปลี่ยน)

### open-source ที่แนะนำ (จับคู่กับ tier)
| tier | โมเดล | เหตุผล |
|---|---|---|
| `thai` | **Typhoon** (SCB 10X) | เทรนไทยโดยตรง — Privacy Notice/ISO/มอก. ดีสุด |
| `simple` | **Llama 3.1 8B / Mistral 7B** | เร็ว+ถูกสุด สำหรับสรุป/จัดหมวด/เติมฟอร์ม |
| `complex` | **Llama 3.3 70B / Qwen 2.5 72B / Mixtral 8x7B** | ฉลาด/ราคาคุ้ม สำหรับวางแผน/วิเคราะห์ (Mixtral เด่นเชิงตรรกะ) |
| ทุก tier | **Claude (fallback สุดท้าย)** | กันทุกตัวล่ม — ตั้งอัตโนมัติ ไม่ต้องใส่เอง |

## หลังท่อผ่านแล้ว — สร้างฟีเจอร์ต่อ (ตามที่คุยไว้)
| ลำดับ | ฟีเจอร์ | ขนาดงาน |
|---|---|---|
| ✅ ตอนนี้ | พิสูจน์ท่อ Fireworks (`fireworks-smoke.mjs`) | เล็ก |
| ถัดไป | **Privacy Notice / SOP generator** (ฟอร์ม → AI ร่าง) | เล็ก-กลาง · เห็นผลไว ขายได้ |
| แล้ว | **AI Compliance Assistant** (ตรวจเอกสารเทียบ ISO/มอก. เรียลไทม์) | กลาง |
| เฟสใหญ่ | **RAG Knowledge Base** (pgvector + embeddings ถาม-ตอบข้อกำหนด) | ใหญ่ |

## ข้อควรระวัง
- **key = server secret** — ตั้งใน Supabase secrets เท่านั้น ห้าม commit / ห้ามใส่ฝั่ง client
- **A/B คุณภาพก่อนสลับงานจริง** — Fireworks/open-source อาจตอบต่างจาก Claude ในบางงาน (reuse `scripts/haiku-eval.mjs` เปลี่ยน `MODEL_HAIKU=` เป็นโมเดล Fireworks เทียบได้)
- **มี fallback** — ถ้า Fireworks ล่ม ลบ secret = กลับ Anthropic ทันที (default-safe)
