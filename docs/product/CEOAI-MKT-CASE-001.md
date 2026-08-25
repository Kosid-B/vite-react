# CEOAI-MKT-CASE-001
## Pre-Acquisition Measurement & Validation Failure

**freeze 24 ส.ค. 2569** · เจ้าของสั่งให้ยกเป็น **Strategic Learning Case แรกของระบบ**
ธุรกิจตัวอย่าง: **CEO AI Thailand เอง** (dogfooding case แรก)
ช่วงข้อมูล: 11–24 ส.ค. 2569 (13 วัน) · แหล่ง: `landing_funnel` + `quickcheck_submissions` + `marketing_*` ใน production

> 🔴 **กติกาสูงสุดของเอกสารนี้: Hypothesis ห้ามเลื่อนชั้นเป็น Fact โดยอัตโนมัติ**
> ทุกบรรทัดต้องอยู่ใน 1 ใน 3 กอง — Observed / Hypothesis / ยังพิสูจน์ไม่ได้
> กลไกเฝ้า: `src/lib/__tests__/decisionRules.test.ts` อ่านไฟล์นี้จริง

---

## 1 · Observed — สิ่งที่นับได้ (ยืนยันได้ทันที ไม่ต้องรอ sample)

| รายการ | ค่า |
|---|---|
| session | **85** |
| ไม่เลื่อนหน้าเลย | **72** |
| session จาก social | **32** |
| social ที่ไม่เลื่อนเลย | **31** |
| social ที่ไปถึงหน้าสมัคร | **0** |
| lead ที่เก็บได้ | **0** |
| แคมเปญ / ข้อเสนอ / คอนเทนต์ | **0 / 0 / 0** |
| session ที่ไม่มีแท็กที่มา | **83/85** |
| session ที่เห็นหน้า default | **81/85** |
| session ที่อยู่นอกการจัดกลุ่ม A/B | **60/85** |

🟢 ตรวจซ้ำสดจาก `waigsnxhrlwtiotspaim` แล้ว — ตรงทุกค่า

---

## 2 · 🔴 สิ่งที่ตัวเลขชุดนี้ **ไม่ได้** พิสูจน์ (เจ้าของแก้คำ 24 ส.ค. 2569)

ผมเคยเขียน 3 ประโยคที่เกินหลักฐาน — แก้แล้ว และทำเป็นกฎในโค้ด:

| ❌ เคยเขียน | ✅ ที่ถูก |
|---|---|
| *"social 32 ครั้ง ให้ผลเป็นศูนย์"* | **"ใน 32 social session ที่สังเกต ยังไม่พบการสมัคร"** — `0/32` ไม่ได้พิสูจน์ว่า conversion จริงของ social = 0 |
| *"ศูนย์ไม่ต้องรอ sample"* | ศูนย์ยืนยันได้แค่ **observed count = 0** · สรุป **true conversion probability = 0** ไม่ได้ |
| *"lead ≥ 50 ก่อนซื้อแอด"* (เขียนเหมือนข้อเท็จจริง) | 🏷️ **HYPOTHESIS / POLICY_THRESHOLD** — ยังไม่มีผลจริงรองรับ · Learning Engine ต้องปรับค่านี้จาก outcome ภายหลัง |

⇒ Measurement Safety Engine แยก **OBSERVED COUNT** ออกจาก **INFERRED RATE** แล้วในโค้ด
(`decisionRules.stateSafely()` · `zeroIsNotProof()` · `THRESHOLD_STATUS`)

---

## 3 · Hypothesis — ยังไม่พิสูจน์ ห้ามใช้เป็นเหตุผลตัดสินใจใหญ่

- ผู้ชมจาก social ส่วนใหญ่น่าจะเป็นกลุ่ม `newbie` และ `employee`
- หน้าที่แยกตามกลุ่ม (segment hero) น่าจะทำให้คนเลื่อนอ่านมากขึ้น
- "เช็ก 6 ข้อ" น่าจะทำให้เริ่มเก็บ lead ได้
- ความไม่ตรงกันระหว่างสารในโพสต์กับหน้าปลายทาง น่าจะเป็นเหตุของ zero-scroll

**วิธียืนยัน**: ติดแท็กที่มาให้ครบ → อ่านผลแยกตามโพสต์ → ใช้เวลา ~1 สัปดาห์

---

## 4 · ยังพิสูจน์ไม่ได้ (Not yet validated)

กลุ่มที่ดีที่สุด · พาดหัวที่ดีที่สุด · อัตราการเปลี่ยน lead เป็นลูกค้า · CAC · LTV · เศรษฐศาสตร์ของช่องทางที่เสียเงิน

---

## 5 · Next Best Action — ลำดับที่ freeze แล้ว (ห้ามข้ามขั้น)

```
Measurement readiness → Lead capture → Segment routing → Message/Offer experiment
→ Organic distribution → Evidence accumulation → Paid validation → Scale
```

**คอขวดตอนนี้ = `measurement-readiness`** (ไม่ใช่ "ทำคอนเทนต์เพิ่ม" และไม่ใช่ "ยิงแอด")
เหตุผล: มีแท็กที่มา **2/85** ⇒ ต่ำกว่าเกณฑ์ **90%** ⇒ ข้อสรุปเรื่องช่องทางทุกข้อยังเชื่อไม่ได้

กลไกในโค้ด: `src/lib/decisionRules.ts` → `diagnose()` คืนคอขวดแรกตามลำดับนี้เสมอ

---

## 6 · 🔬 paid_validation ≠ paid_scale

เจ้าของแก้ถูก: กฎเดิมของผมกั้นการใช้เงินโฆษณา **ทุกกรณี** ซึ่งขัด Growth Mindset
เพราะ **การซื้อสื่อก้อนเล็กคือเครื่องมือหาหลักฐาน** ไม่ใช่การขยายผล

| | Paid validation | Paid scale |
|---|---|---|
| งบ | เล็ก (เพดาน `PAID_VALIDATION_BUDGET_CEILING`) | เพิ่มขึ้น |
| สมมติฐาน | เดียว | — |
| กลุ่ม / ข้อเสนอ | อย่างละหนึ่ง | — |
| เงื่อนไขหยุด | ต้องมี | — |
| ด่านที่ต้องผ่าน | **customer + tracking** เท่านั้น | ครบ 6 ด่านรวม evidence |

⇒ `founderMindset.AskIntent` แยกเป็น `'paid-validation'` กับ `'paid-scale'` แล้ว
และ **จำนวนเงินเป็นตัวตัดสิน ไม่ใช่คำพูด** — พูดว่า "ขอทดสอบ 100,000 บาท" ยังถูกจัดเป็น scale

---

## 7 · Quick Check 6 ข้อ = ประตูเข้าของ Business Genome (ไม่ใช่แค่ฟอร์มเก็บอีเมล)

6 คำถามที่เจ้าของเสนอ ตรงกับ `founderMindset.READINESS_CHECKS` ที่มีอยู่แล้วทั้ง 6 ข้อ:

| คำถามที่ผู้ใช้เห็น | ด่านในระบบ | กิ่งจีโนม |
|---|---|---|
| Customer defined? | `customer` | `customer` |
| Problem evidence? | `problem` | `problem` |
| Offer tested? | `offer` | `offer` |
| Willingness to pay? | `unitEconomics` | `economics` |
| Acquisition evidence? | `evidence` | `experiment` |
| Measurement ready? | `tracking` | `acquisition` |

⇒ ผู้ใช้ได้ **Business Stage · Evidence Gaps · Risk · Next Best Action** กลับไปทันทีก่อนสมัคร
และเราได้ **structured first-party business data** เข้าจีโนม — ไม่ใช่แค่อีเมล

🟡 **ยังไม่ได้ต่อสาย** — `businessGenome` ยังไม่ได้อ่าน `AppData`/`quickcheck_submissions`
เป็นงานถัดไปที่ระบุไว้ใน [ARCHITECTURE-CONSOLIDATION-AUDIT.md](ARCHITECTURE-CONSOLIDATION-AUDIT.md) §2

---

## 8 · POP / POD / MOAT ที่เคสนี้พิสูจน์

**POP** (ใคร ๆ ก็ทำได้): UTM · Landing Page · A/B · Email Capture · Content Generation · Dashboard
**POD** (เกิดตรงนี้): ระบบพูดได้ว่า *"คุณมี 5 กลุ่ม แต่ 81/85 ยังเห็นหน้า default — ตอนนี้ยังไม่ควรทำคอนเทนต์เพิ่มแบบกว้าง ๆ"*
**MOAT**: `Business State → Diagnosis → Recommended Action → Experiment → Outcome → Learning → Updated Decision Rule`

⚠️ วันนี้เรามีถึงแค่ **Decision Rule ที่เขียนด้วยมือ** — ลูปที่ปรับกฎเองจาก outcome ยังไม่มี
ต้องมีผู้ใช้จริง 5 ราย (`competitiveStrategy.moatReadiness`) · **กฎ ≠ เอนจิน ห้ามสับสน**

---

## 9 · เส้นแบ่งเจ้าของ

**เคสนี้ (ข้อมูลการตลาดของเราเอง) → อีกระบบเป็นเจ้าของ** ตามที่เจ้าของตัดสิน 24 ส.ค. 2569
**กฎการตัดสินใจที่ได้จากเคสนี้ → รีโปนี้เป็นเจ้าของ** เพราะมันจะไปทำงานกับ **ธุรกิจของผู้ใช้** ทุกราย
รีโปนี้จึงเก็บ **บทเรียน + กฎ** ไม่ได้เก็บ **ข้อมูลแคมเปญ** (ไม่แตะตาราง `marketing_*`)
