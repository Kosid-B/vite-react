# กลยุทธ์ Fireworks AI ประยุกต์กับ CEO AI Thailand — ลดต้นทุน AI = สร้างคูเมือง (Moat)
> บทเรียน Fireworks: อย่าแข่งสร้างโมเดลฉลาดสุด — **แก้คอขวดที่ทุกคนต้องใช้ (ความเร็ว + ต้นทุน inference)**
> ผ่าน infra ที่รันโมเดล open-source ได้ถูก+เร็วกว่าหลายสิบเท่า ไม่ผูกกับโมเดลปิดราคาแพง

## 🔴 ปัญหาจริง: ต้นทุน AI = ตัวกินมาร์จินอันดับ 1 (จาก src/pages/Billing.tsx)
| แพ็ก | ราคา | ต้นทุน AI (Claude) | ต้นทุนรวม | **มาร์จิน** | **% ที่เป็นต้นทุน AI** |
|---|---|---|---|---|---|
| Starter | ฿390 | ฿228 | ฿313 | ฿77 (**19.7%**) | **73%** |
| Growth | ฿1,490 | ฿760 | ฿1,190 | ฿300 (**20.1%**) | **64%** |
| Scale | ฿5,900 | ฿3,800 | ฿4,650 | ฿1,250 (**21.2%**) | **82%** |

**สรุป:** มาร์จินบางมาก (~20%) และ **64–82% ของต้นทุนคือค่าเรียก Claude API** → นี่คือ "คอขวด" แบบเดียวกับที่ Fireworks เจาะ

→ ถ้าลดต้นทุน AI ลงครึ่งหนึ่ง มาร์จินพุ่งจาก ~20% เป็น ~50%+ **โดยไม่ต้องขึ้นราคา** = ความได้เปรียบยั่งยืน (แข่งราคาถูกสุดในตลาด SME ไทยได้)

---

## 🎯 กลยุทธ์: "Fireworks Playbook" 3 ชั้น (ลดต้นทุน + เพิ่มความเร็ว)

### ชั้น 1 — Model Tiering (จับงานให้ตรงโมเดล) ⭐ ผลกระทบสูงสุด
ปัจจุบันเรียก **Claude Sonnet (~฿0.76/call)** กับ**ทุกงาน** — แต่งานส่วนใหญ่ไม่ต้องใช้พลังขนาดนั้น
| ประเภทงาน | ตอนนี้ | ควรเป็น | ประหยัด |
|---|---|---|---|
| สรุป/สกัดข้อมูล/เติม template/จัดรูปแบบ | Sonnet | **โมเดลถูก+เร็ว** (Haiku / open-source) | ~80–95%/call |
| แนะนำสั้น ๆ ต่อหน้า (ai-assist) | Sonnet | โมเดลถูก | ~80% |
| วางแผน/วิเคราะห์ธุรกิจซับซ้อน (ai-plan) | Sonnet | **คง Sonnet** (งานคุ้มค่า) | — |
| งานภาษาไทยล้วน | Sonnet | **โมเดล open-source ไทย (Typhoon)** | มาก + ไทยดีขึ้น |

> หลักการ Fireworks: ใช้โมเดลที่ "เพียงพอ" กับงาน ไม่ใช่ฉลาดสุดกับทุกงาน

### ชั้น 2 — โมเดล Open-source (ไม่ผูกกับเจ้าเดียว) ⭐ หัวใจกลยุทธ์
- **Typhoon** (SCB 10X) = LLM **open-source ภาษาไทย** — รันผ่าน OpenTyphoon API / Fireworks / Together ได้ถูกกว่า Claude มาก + เข้าใจบริบทไทย/ราชการดีกว่า
- Provider inference ราคาถูก+เร็ว: **Fireworks AI · Groq · Together AI** (รัน Llama/Qwen/Typhoon open models)
- = "สร้างทางด่วน" ให้แอปเราไม่ต้องพึ่งโมเดลปิดราคาแพงเจ้าเดียว (ตรงบทเรียน Fireworks เป๊ะ)

### ชั้น 3 — Prompt Caching + ควบคุม token (ทำได้ทันที ต้นทุนต่ำ)
- **Prompt caching** (Anthropic รองรับ): context ซ้ำ (system prompt, ข้อกำหนด ISO/มอก.) แคชได้ → ลดต้นทุน input token 90% สำหรับ context ที่ใช้ซ้ำ
- **ตัดความยาว/คุม max_tokens** ต่องาน (มีบางส่วนแล้วใน tis-readiness-ai) → ทำให้ครบทุก edge function

---

## 📊 ผลลัพธ์คาดการณ์ (ถ้าทำครบ)
| | ก่อน | หลัง (ประมาณ) |
|---|---|---|
| ต้นทุน AI/call | ฿0.76 (Sonnet ทุกงาน) | ~฿0.10–0.30 (เฉลี่ยถ่วง tiering) |
| มาร์จิน Growth | 20% | **~45–55%** |
| ความเร็วตอบ | Sonnet latency | เร็วขึ้น (Haiku/Groq เร็วกว่ามาก) |
| ความเสี่ยง vendor | ผูก Anthropic เจ้าเดียว | กระจาย (Claude + open-source) |

→ **คูเมือง:** เป็น AI-team ราคาถูกสุด+เร็วสุดสำหรับ SME ไทย ที่ต่างชาติเลียนแบบยาก (ต้นทุนต่ำ + เข้าใจไทย)

---

## 🛠️ แผนลงมือ (phased — ทำทีละขั้น วัดผลจริง)
### Phase 1 — วางโครง Model Router (โค้ด, low-risk) ✅ เสร็จ (PR #267)
- สร้าง `supabase/functions/_shared/modelRouter.ts` — helper `pickModel(tier)` เลือกโมเดลตาม env
- config: `MODEL_SIMPLE / MODEL_COMPLEX / MODEL_THAI` (env-driven, สลับได้ไม่ต้องแก้โค้ด)
- ยังไม่เปลี่ยนพฤติกรรม (default = ANTHROPIC_MODEL/sonnet) — แค่วางท่อ + wire `ai-assist` → `pickModel('simple')`

### Phase 2 — wire ทุก edge function เข้า router (วัดคุณภาพ) ✅ เสร็จ (โค้ด)
- `ai-plan` → `pickModel('complex')` · `agent-run` → `MODEL_MAP[model] ?? pickModel('complex')` (คง override จาก frontend)
- `ai-assist` → `pickModel('simple')` (จาก Phase 1)
- **เปิดใช้จริง (ไม่ต้องแก้โค้ด แค่ตั้ง secret + redeploy):**
  - `supabase secrets set MODEL_SIMPLE=claude-haiku-4-5-20251001 --project-ref waigsnxhrlwtiotspaim`
  - `supabase functions deploy ai-assist ai-plan agent-run` (deploy 3 ตัวให้ import `_shared/modelRouter.ts` ติดไปด้วย)
  - วัด: คุณภาพ ai-assist บน Haiku ยอมรับได้ไหม + ต้นทุนลดจริง (A/B) · ถ้าดี ค่อยขยับ MODEL_COMPLEX

### Phase 3 — เพิ่ม Open-source ไทย (Typhoon) + caching ✅ เสร็จ (โค้ด · รอ provider key)
- สร้าง `supabase/functions/_shared/llm.ts` — helper `chat()` เรียก LLM แบบ **provider-agnostic**
  (Anthropic **หรือ** OpenAI-compatible: Fireworks / Together / OpenTyphoon) เลือกจากชื่อโมเดล + env
- wire `ai-plan` ผ่าน `chat()` แล้ว (Anthropic path เทียบเท่าโค้ดเดิม 100% → default ไม่เปลี่ยน)
- **prompt caching**: helper รองรับ `cacheSystem` + beta header · มีผลจริงเมื่อ system prompt ยาว ≥ ~1k tokens
  (prompt ปัจจุบันสั้นเกินเกณฑ์ → ยังไม่ประหยัด แต่ auto-cache เมื่อ context โตขึ้น เช่น ISO/มอก.)
- **เปิด Typhoon จริง (ไม่ต้องแก้โค้ด):**
  ```
  supabase secrets set FIREWORKS_API_KEY=... MODEL_THAI=accounts/fireworks/models/typhoon-... \
    --project-ref waigsnxhrlwtiotspaim
  # แล้ว route งานไทยไป tier 'thai' + redeploy ai-plan
  ```
  > default = ไม่ตั้ง key → วิ่ง Anthropic เหมือนเดิม (ไม่มี provider ใหม่เปิดเอง) · ต้อง A/B วัดคุณภาพก่อนสลับจริง

### Phase 4 — Dashboard ต้นทุน AI จริง (วัด margin จริงต่อ workspace)
- log token/cost ต่อ call → admin เห็นต้นทุน AI จริง เทียบราคาแพ็ก

---

## ⚠️ ข้อควรระวัง (contrarian)
- **คุณภาพ:** โมเดลถูกกว่าอาจตอบแย่ลงบางงาน → ต้อง A/B วัดจริงก่อนสลับ (อย่าสลับหมดทันที)
- **ความซับซ้อน:** เพิ่ม provider = เพิ่มจุดพัง → ต้องมี fallback (provider ล่ม → กลับไป Claude)
- **secret ใหม่:** FIREWORKS_API_KEY / TYPHOON_API_KEY (ตั้งใน Supabase secrets ฝั่ง server เท่านั้น)
- อย่าทำ Phase 2–3 ก่อน Phase 1 เสร็จ + มีระบบวัดคุณภาพ

## เริ่มที่ไหน
**Phase 1 (วางโครง Model Router)** = low-risk, ไม่เปลี่ยนพฤติกรรม, เปิดทางให้ Phase 2–4 → แนะนำเริ่มตรงนี้
