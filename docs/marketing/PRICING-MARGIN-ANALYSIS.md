# Pricing & Margin Analysis — CEO AI Thailand

> คำถามบอร์ด (ก.ค. 2569): "ทุก Package ต้องกำไร > 20% ของราคาขาย หลังหักต้นทุน AI ของ user —
> หรือต้องใช้กลยุทธ์ Share token (BYOK) กับ backend ที่ใช้ Claude API + Supabase?"
> ที่มาต้นทุน: `src/lib/aiCost.ts` (MODEL_PRICE, CALL_PROFILE), `src/lib/usage.ts` (PLAN_AI_CALLS),
> `supabase/functions/_shared/modelRouter.ts` (โมเดล prod = Sonnet-4-6). ตัวเลขทั้งหมดคำนวณจากโค้ดจริง ไม่ใช่สมมติ.

## TL;DR (คำตอบตรงคำถาม)

1. **ทุกแพ็กเกจเสียเงินกำไร > 20% อยู่แล้ว — เกินเป้าเยอะ** (36–67% แม้เคสเลวร้ายสุด) **โดยไม่ต้องขึ้นราคา และไม่ต้องใช้ BYOK/Share token.** เศรษฐศาสตร์ผ่านสบาย
2. **แต่กำไรนี้เป็นจริง "ก็ต่อเมื่อ quota เป็นเพดานจริง" — ตอนนี้ยังไม่ใช่.** `PLAN_AI_CALLS` เป็นแค่ **มิเตอร์โชว์** (อ่านที่ Billing.tsx เท่านั้น) ไม่มีโค้ดบล็อกเมื่อเกิน + นับใน localStorage (รีเซ็ตได้) → **user หนัก 1 คน / guest 1 คน ทำให้มาร์จินติดลบได้ไม่จำกัด**
3. **ตัวเสี่ยงจริง = การใช้ที่ไม่มีเพดาน (guest/free/whale) ไม่ใช่ "ราคา".** ทางแก้ = บังคับ quota ฝั่ง server + จำกัด guest แรง + เปิด BYOK/top-up "เป็นวาล์วเฉพาะ whale" (ไม่ใช่โมเดลหลัก)
4. **สำหรับ "ให้กลุ่มเป้าหมายตัดสินใจลงทุนเร็วขึ้น":** เรามี headroom กำไร 58–67% → ใช้ headroom นี้ **ลงทุนกับคุณค่า/quota ที่ใจกว้าง + onboarding + ROI framing** แทนการตัดราคา. เปิด **model-tiering (Haiku งานเบา)** เพื่อให้ quota ใจกว้าง "ถูกลง 20–60%" — quota เยอะ = value prop แรง = ตัดสินใจเร็ว

---

## 1. ต้นทุน AI จริงต่อ 1 call (จาก `aiCost.ts`, prod = Sonnet-4-6, USD_THB=36)

| ชนิดงาน | tokens (in/out) | Sonnet (ปัจจุบัน) | Haiku (งานเบา) | Typhoon (งานไทย) |
|---|---|--:|--:|--:|
| assist (คำแนะนำสั้น) | 700 / 400 | ฿0.29 | **฿0.10** | — |
| plan (วางแผน) | 1,100 / 900 | ฿0.60 | ฿0.20 | — |
| agent (รันงานจริง) | 1,400 / 1,100 | ฿0.75 | ฿0.25 | ฿0.08 |
| **blended** (mix 50/20/30) | — | **฿0.49** | **฿0.39** | **฿0.19** |

> Tiering (assist→Haiku) ลด blended ~20% · Aggressive (assist→Haiku + agent→Typhoon) ลด ~60% — ตั้งผ่าน env `MODEL_*`/`MODELS_*` ไม่ต้องแก้โค้ด (modelRouter.ts)

## 2. Margin ต่อแพ็กเกจ — ที่ 100% ของ quota (เพดานสูงสุดที่ระบบตั้งใจให้ใช้)

Quota/เดือน (usage.ts): free 200 · starter 300 · growth 1,000 · scale 5,000

| Plan | ราคา/เดือน | เคสปกติ (blended ฿0.49) | margin | เคสเลวร้าย (agent ล้วน ฿0.75) | margin |
|---|--:|--:|--:|--:|--:|
| Starter | ฿590 | ฿147 | **75%** | ฿224 | **62%** |
| Growth | ฿1,490 | ฿490 | **67%** | ฿745 | **50%** |
| Scale | ฿5,900 | ฿2,450 | **59%** | ฿3,726 | **37%** |

**สรุป:** แม้ user ใช้เต็ม quota ทุกเดือน + ทุก call เป็นงานหนักสุด (agent-run) มาร์จินก็ยัง **37–50%** — เกิน 20% ทุกแพ็ก. Fixed infra (Supabase Pro ~฿900/เดือน, Resend/Serper/Cloudflare free-tier, SlipOK 100 เช็ค/เดือนฟรี) เฉลี่ยต่อ payer แทบไม่มีนัยเมื่อมี payer > ~30 ราย.

เปิด Haiku-tiering → เคสเลวร้ายขยับเป็น margin ~58–70% (quota เท่าเดิม แต่ต้นทุนต่ำลง).

## 3. จุดรั่วจริง (ไม่ใช่ราคา)

| ความเสี่ยง | ต้นทุน | ทำไมเสี่ยง | แก้ |
|---|--:|---|---|
| **Guest mode** = Scale ไม่จำกัด ไม่ต้องล็อกอิน (access.ts `guestFullAccess`) | **ไม่จำกัด** | ใครก็ได้ในเน็ตได้ AI ระดับ Scale ฟรี · quota ไม่บังคับ | **hard-cap guest ~20–30 calls + ฝั่ง server (per IP/anon)** |
| **Free/trial 15 วัน (฿0)** | ฿98–150/คน | 200 calls × ฿0.49–0.75 = CAC ล้วน | ยอมรับได้ถ้า conversion โอเค — แต่ **บังคับหยุดที่ 200** |
| **quota ไม่ enforce** (soft meter) | ไม่จำกัด | whale Scale ยิง 50,000 calls = ต้นทุน ฿24,500 จ่าย ฿5,900 → **-฿18,600** | **enforce ฝั่ง server** (นับใน DB/Edge Fn ต่อ user) + เกิน quota → บล็อก/ให้ top-up |
| **trackAiCall = localStorage** | — | รีเซ็ตได้ ไม่ผูก server | ย้ายตัวนับไป server-side |

### ✅ สถานะ: server-side enforcement สร้างแล้ว (ship dark — รอเปิดสวิตช์)
`supabase/migrations/0035_ai_usage.sql` + `_shared/quota.ts` wire เข้า ai-assist/ai-plan/agent-run:
- ตัวนับ atomic ต่อ **workspace/เดือน** (rpc `bump_ai_usage`) — plan อ่านจาก workspace_state · โควตาตรงกับ usage.ts
- **guest cap 25/เดือน ต่อ IP** (x-forwarded-for) — ปิดรูรั่ว "anon-key ยิงฟรีไม่จำกัด" โดยไม่ต้องแก้ client
- **FAIL-OPEN + FLAG-GATED**: ทำงานเฉพาะ `ENFORCE_AI_QUOTA=true` · error ใด ๆ = อนุญาต (ไม่พัง prod)

เปิดใช้จริง:
```bash
# ✅ 1) migration — apply แล้วบน prod (ผ่าน MCP 2026-07-28) + smoke test ผ่าน (guest cap 25 ทำงาน)
#    หมายเหตุ: DDL idempotent (if not exists / or replace / drop-if-exists) → db push ซ้ำได้ไม่พัง
# 2) redeploy 3 functions (CLI bundle _shared อัตโนมัติ — ปลอดภัยกว่า MCP)
supabase functions deploy ai-assist ai-plan agent-run --project-ref waigsnxhrlwtiotspaim
# 3) เปิด flag (secret ตั้งได้เฉพาะฝั่ง operator)
supabase secrets set ENFORCE_AI_QUOTA=true --project-ref waigsnxhrlwtiotspaim
supabase functions deploy ai-assist ai-plan agent-run --project-ref waigsnxhrlwtiotspaim  # redeploy รับ env ใหม่
```
⚠️ ตรวจครั้งแรกที่มี payment จริง: ยืนยันว่า trigger เขียน workspace_plan (role='service_role' detection ถูก)
— ถ้า mirror ว่าง paid user จะถูก cap ที่ 200 ชั่วคราว (ปัจจุบัน payer = 0 → ไม่มีผล)
⚠️ ข้อจำกัดที่เหลือ: plan อ่านจาก JSON ที่ client แก้ได้ → whale แก้เป็น scale เองได้ (กัน guest/free/runaway ได้เต็ม
แต่ whale-spoof ต้อง harden ด้วย plan column/payment_submissions ในงานถัดไป)

## 4. Share token / BYOK — จำเป็นไหม?

**ไม่จำเป็นเป็นโมเดลหลัก** — เศรษฐศาสตร์ผ่าน 20% อยู่แล้ว และ BYOK เพิ่ม friction (ต้องไปขอ API key เอง) = **ขัดเป้าหมาย "ตัดสินใจลงทุนเร็วขึ้น"**.

ใช้ BYOK/top-up **เฉพาะเป็นวาล์วสำหรับ whale** (Scale ที่ใช้เกิน quota):
- **Option A — Top-up pack:** เกิน quota → ซื้อ "แพ็ก AI เพิ่ม" (เช่น +1,000 calls ฿490) = ต้นทุนกลายเป็น "รายได้ marginal" ✅ ง่ายสุด รักษา value prop
- **Option B — BYOK (ใส่ Anthropic key เอง):** ต้นทุนโมเดลเป็นของ user, เราคิดค่า platform → เหมาะ enterprise แต่ friction สูง เก็บไว้ทีหลัง

## 5. คำแนะนำ (เรียงตาม leverage ต่อ "ตัดสินใจเร็วขึ้น")

1. **อย่าเพิ่มแพ็ก ฿499 / อย่าขึ้นราคาเพื่อมาร์จิน** — ไม่จำเป็น (มาร์จินผ่านสบาย) และเพิ่ม choice paralysis
2. **เพิ่ม billing รายปี (2 เดือนฟรี = ลด 16.7%)** — anchor ราคา + เงินสดล่วงหน้า + ลูกค้า commit เร็วขึ้น (Starter ฿5,900/ปี · Growth ฿14,900/ปี · Scale ฿59,000/ปี) → *value-prop lever อันดับ 1*
3. **เปิด model-tiering (Haiku งานเบา ผ่าน env)** — quota ใจกว้างขึ้นได้โดยต้นทุนเท่าเดิม = คุณค่าต่อบาทสูงขึ้น
4. **บังคับ quota + hard-cap guest ฝั่ง server** — ปิดรูรั่วก่อน scale traffic (ไม่งั้นยิ่งโต ยิ่งเจ็บ)
5. **Top-up pack สำหรับ whale** — เปลี่ยนความเสี่ยงต้นทุนเป็นรายได้
6. **A/B ราคา/ข้อเสนอ ผ่าน Pulse** (`experiments.ts`) — วัดจริงว่าอะไรทำให้ "ตัดสินใจเร็วขึ้น" ก่อน lock

## เปิด model-tiering (Haiku งานเบา) — ลดต้นทุนโดยไม่แตะโค้ด

`modelRouter.ts` เลือกโมเดลตาม env — default = Sonnet ทุก tier จนกว่าจะตั้ง secret:

```bash
# งานเบา (assist/สรุป/เติม template) → Haiku (ถูกกว่า Sonnet ~70% ต่อ call)
supabase secrets set MODEL_SIMPLE=claude-haiku-4-5-20251001 --project-ref waigsnxhrlwtiotspaim

# (ทางเลือก aggressive) งานไทยล้วน → Typhoon ผ่าน Fireworks
# supabase secrets set MODELS_THAI="typhoon-v2.1-12b-instruct,claude-sonnet-4-6"

# redeploy ให้ instance รับ env ใหม่ (warm instance ถือ env เก่า)
supabase functions deploy ai-assist ai-plan agent-run --project-ref waigsnxhrlwtiotspaim
```

ผล: blended cost/call ฿0.49 → ~฿0.39 (tiering) หรือ ~฿0.19 (aggressive) → margin ทุกแพ็กขยับขึ้น
~5–15 จุด **โดยไม่ลด quota** = คุณค่าต่อบาทสูงขึ้น (value prop แรงขึ้น). ต้องเช็คคุณภาพคำตอบไทยของ
Haiku/Typhoon ก่อนเปิด production (A/B คุณภาพกับงานเบาก่อน).

## Formula (คำนวณซ้ำเมื่อราคาโมเดล/quota เปลี่ยน)

```
ต้นทุน/call (บาท) = (in_tok × price_in + out_tok × price_out) / 1e6 × USD_THB   // callCostThb()
ต้นทุน/เดือน (เพดาน) = quota_ของแพ็ก × blended_cost_per_call
margin % = (ราคาขาย − ต้นทุน/เดือน) / ราคาขาย × 100
เกณฑ์ผ่าน: margin ≥ 20%  → ปัจจุบันผ่านทุกแพ็กแม้เคสเลวร้าย (37–50%)
```
ปรับค่าได้ที่: `MODEL_PRICE`/`USD_THB`/`CALL_PROFILE` (aiCost.ts) · `PLAN_AI_CALLS` (usage.ts)
