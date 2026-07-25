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
