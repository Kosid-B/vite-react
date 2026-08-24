# Architecture Consolidation Audit — CEO AI Thailand
**24 ส.ค. 2569** · สั่งโดยเจ้าของ: *"ยังไม่ควรสร้าง feature ใหม่ต่อทันที"*
เป้าหมาย: ให้เหลือ **แกนเดียว** — Vision → Constitution → Business Genome → Decision Engine → Marketing/Execution → Evidence → Learning → Stronger Moat

> วิธีตรวจ: อ่านไฟล์จริงในรีโปทั้งหมด (`grep` import graph · นับ call site · เปิดดูโครงข้อมูล)
> ทุกข้อในเอกสารนี้ตรวจจากโค้ด ไม่ได้ตรวจจากความจำหรือจากเอกสารฉบับก่อน

---

## 🔴 ข้อสรุปเดียวที่ต้องอ่าน

**ห่วงโซ่ขาดที่ข้อ 2 → 3 ไม่ใช่ที่ปลายทาง**

รัฐธรรมนูญ · Founder Mindset · DMAIC · Positioning Engine **ถูกเขียนครบและมีเทสต์ครบ**
แต่มันไปถึง **AI ที่ผู้ใช้คุยด้วยจริง = ไม่ถึงเลยสักตัว**

| ทางที่ AI ถูกเรียกจริง | ได้รับรัฐธรรมนูญไหม |
|---|---|
| `src/agent/CeoAiAgent.ts` (Cloudflare DO — guest + ผู้ใช้คุยด้วยตัวนี้) | 🔴 **ไม่** — มี `SYSTEM` ของตัวเอง ไม่อ้าง `brandBrief` เลย |
| `supabase/functions/ai-assist` (AI แนะนำทุกหน้า) | 🔴 **ไม่** |
| `supabase/functions/ai-plan` (CEO วางแผน + มอบงาน) | 🔴 **ไม่** |
| `supabase/functions/agent-run` (รันเอเจนต์ + ค้นเว็บ) | 🔴 **ไม่** |
| `components/GrowthAiPanel.tsx` (แผงในหน้าแอดมิน) | 🟢 ใช่ — ผ่าน `growthPrompt()` |
| `videoBrief.videoScriptPrompt()` | 🟡 ได้รับ แต่ยังไม่มี UI เรียก |

**15 จุดในโค้ดที่ประกอบ `instruction:` ส่งเข้า AI · มี 1 จุดที่แปะรัฐธรรมนูญ**

⇒ ประโยคที่ผมเขียนไว้เองใน `CLAUDE.md` และในข้อความคอมมิตว่า
**"Vision เดินทางไปกับทุก prompt" — ไม่จริง** · แก้แล้วในรอบนี้ (ledger #49)
เป็นความผิดชั้นที่ ① ของ skill `shipped-not-written` เป๊ะ ("โค้ดถูกเรียกใช้จริงไหม")
ที่เกิดขึ้น **ขณะกำลังสร้างกลไกที่มีไว้กันความผิดชนิดนี้เอง**

---

## 1 · แผนที่: อะไรอยู่ที่ไหน และใครเป็น source of truth

| ข้อในห่วงโซ่ | Source of truth (ตัวเดียว) | สถานะ |
|---|---|---|
| **Vision / Constitution** | `src/lib/founderConstitution.ts` | 🟢 มีตัวเดียว · `AGENTS.md` + `CLAUDE.md` มีเทสต์บังคับให้ตรงกันคำต่อคำ |
| **Founder Mindset (ด่านก่อนทำตามคำขอ)** | `src/lib/founderMindset.ts` | 🟢 มีตัวเดียว |
| **วิธีทำงาน (DMAIC)** | `src/lib/dmaic.ts` + `.claude/skills/dmaic/` | 🟢 ผูกกันด้วยเทสต์ |
| **ตัวตน / Positioning ภายนอก** | `src/lib/brandBrief.ts` → `WHO.positioning` | 🟡 `competitiveStrategy.CATEGORY.external` เขียนข้อความเดียวกันซ้ำ |
| **North Star ภายใน** | `src/lib/competitiveStrategy.ts` → `NORTH_STAR` | 🟢 |
| **Business Genome** | `src/lib/businessGenome.ts` | 🔴 **ไม่ผูกกับข้อมูลผู้ใช้เลย** (ดู §2) |
| **Evidence** | `businessGenome.EvidenceNode` + `positioningEngine.ClaimStatus` | 🟡 สองที่ ใช้บันไดเดียวกัน แต่ไม่มีตัวเชื่อม |
| **Decision Engine** | 🔴 **ไม่มีเจ้าของ** — มี 10 ฟังก์ชันตอบ "ทำอะไรต่อ" ไม่มีตัวบน (ดู §3) |
| **Marketing/Execution** | `growthPdca.ts` + `stageFit.ts` + skill `marketing-instruction` | 🟢 ผูกค่าคงที่ร่วมกันแล้ว (`MIN_FOR_RATE`) |
| **Moat / VRIO** | `competitiveStrategy.ts` (`VRIO_ASSETS` · `moatReadiness`) | 🟢 |
| **MIT 24 Steps** | `de24Journey.ts` + `journey.ts` + `growthLadder.ts` | 🟡 สามไฟล์ · `growthLadder.ts` ไม่มีใครเรียก |
| **Skills (161 ตัว)** | `.claude/skills/` | 🟡 CLAUDE.md อ้างถึง 14 · อีก 147 ตัวไม่มีดัชนี |

**เอกสารที่ประกาศตัวตนซ้ำ 5 ที่**: `brandBrief.ts` · `competitiveStrategy.ts` · `BRAND-BRIEF-FORM.md` · `PRODUCT-STRATEGY-PUBLIC-LAUNCH.md` · `CLAUDE.md`
(ตอนนี้ตรงกันทั้งหมด และมีเทสต์เฝ้า 2 คู่ — แต่ยังไม่ครบทุกคู่)

---

## 2 · 🔴 Business Genome ยังไม่แตะข้อมูลจริง

`businessGenome.ts` **ไม่ import `AppData` เลย** และ `founderMindset.ts` ก็ไม่ import
⇒ `GenomeData` เป็นชนิดข้อมูลลอย ๆ ที่ยังไม่มีใครในแอปสร้างขึ้นมาจริง
⇒ `readinessFromGenome()` และ `stuckBranch()` ทำงานถูกต้อง **แต่ไม่เคยได้รับข้อมูลของธุรกิจใครเลย**

นี่คือจุดที่ทำให้ห่วงโซ่ขาด: **Constitution → Genome → Decision Engine**
ข้อ 3 ยังไม่มีสายป้อนเข้า ⇒ ข้อ 4 จึงตัดสินใจจากอะไรไม่ได้

⚠️ **ทางแก้ที่ห้ามทำตอนนี้**: ทำเป็นตาราง DB — **Gate B ยังไม่ปิด** (เจ้าของสั่งห้ามแตะ schema)
⇒ ทางที่ทำได้คือ **map จาก `AppData` ที่มีอยู่แล้ว** (`bmc` · `finance` · `personas` · `de24`) เป็น `GenomeData`
เป็น pure function ตัวเดียว — ไม่แตะ schema เลย และ retrofit เป็นตารางทีหลังได้

---

## 3 · 🔴 มี "Decision Engine" ซ้อนกัน 10 ตัว ไม่มีตัวบน

| ฟังก์ชัน | ตอบว่าอะไร | ไฟล์ |
|---|---|---|
| `stuckBranch()` | ธุรกิจติดกิ่งจีโนมไหน | `businessGenome.ts` |
| `founderGate()` | คำขอนี้ทำได้ไหม / ขั้นต่อไปคืออะไร | `founderMindset.ts` |
| `dmaicGate()` | งานนี้ค้างที่เฟสไหน | `dmaic.ts` |
| `stageOf()` | ธุรกิจอยู่เฟส reach/convert/retain/scale | `stageFit.ts` |
| `growthPdca()` | วงจรการตลาดค้างตรงไหน | `growthPdca.ts` |
| `bottleneckOf()` | คอขวดอยู่ที่ reach/landing/signup | `growthPdca.ts` |
| `moatReadiness()` | ปลดล็อกอะไรได้ตามจำนวนผู้ใช้ | `competitiveStrategy.ts` |
| `focusFor()` | เรื่องถัดไปจากตัวเลขที่ผู้ใช้กรอก | `nextProblems.ts` |
| `journey.nextStep()` | ขั้นถัดไปใน MIT 24 | `journey.ts` |
| `trialRoadmap.nextStep()` | ขั้นถัดไปในแผน 15 วัน | `trialRoadmap.ts` |

`NORTH_STAR.promise` สัญญาว่าระบบจะบอก **"Next Best Business Action"**
แต่ **ไม่มีฟังก์ชันไหนชื่อนั้น และไม่มีตัวไหนอ่านผลของตัวอื่น** — ทั้ง 10 ตัวตอบขนานกัน

⇒ ผู้ใช้คนเดียวกันจะถูกบอกพร้อมกันว่าอยู่ *"ขั้นที่ 3"* · *"เฟส reach"* · *"ไอเดีย"* · *"Define"* · *"ขั้น 7 จาก 24"*
โดยไม่มีตัวแปลงระหว่างกันสักคู่

### บันไดที่มีอยู่ 5 ชุด — ผูกกันแล้ว 2 คู่ ยังไม่ผูก 3 คู่

| บันได | จำนวนขั้น | ผูกกับใครแล้ว |
|---|---|---|
| `MISSION_CHAIN` (ไอเดีย→Scale) | 6 | 🔴 ยังไม่ผูกกับอะไร |
| `CUSTOMER_JOURNEY` | 10 | 🟢 `GENOME_BRANCHES.journeyStep` อ้างอิงแล้ว + เทสต์บังคับว่าขั้น 1–7 ต้องมีกิ่งครบ |
| MIT 24 Steps (`de24`) | 24 (4 เฟส) | 🔴 ยังไม่ผูกกับ `CUSTOMER_JOURNEY` |
| `stageFit.Stage` | 4 | 🟢 ใช้เกณฑ์ร่วมกับ `growthPdca` |
| `dmaic.PHASES` | 5 | — (คนละแกน: วิธีทำงาน ไม่ใช่ขั้นของธุรกิจ) |

---

## 4 · โมดูลที่ไม่มีใครเรียก (ยังไม่ถึงผู้ใช้)

| ไฟล์ | สถานะ |
|---|---|
| `src/lib/competitorMemory.ts` | 🔴 ไม่มีใคร import นอกเทสต์ |
| `src/lib/growthLadder.ts` | 🔴 ไม่มีใคร import นอกเทสต์ |
| `videoBrief.videoScriptPrompt()` | 🔴 ไม่มี UI เรียก |

ไม่ใช่โค้ดเสีย — เป็นโค้ดที่ยังไม่ได้ต่อสาย · แต่ต้องนับเป็น **หนี้** ไม่ใช่ **สินทรัพย์**

---

## 5 · ข้อเสนอ (ให้คะแนนด้วย `dmaic.chooseBest()` ตัวจริง)

| คะแนน | ทางเลือก | เหตุผล |
|---|---|---|
| **91** | **A · ต่อรัฐธรรมนูญเข้า AI ตัวจริง** (`_shared/` ของ edge functions + `CeoAiAgent.SYSTEM`) | ผลแรงที่สุด · **รู้ผลใน 3 วัน** · ถอยกลับได้ |
| 64 | ไม่ทำอะไรเลย | — |
| 61 | C · map `AppData` → `GenomeData` | ผลแรง แต่รู้ผลใน 30 วัน |
| 55 | B · รวมบันไดเป็น `businessStage.ts` ตัวเดียว | ต้องตัดสินใจเรื่องความหมายเยอะ · 21 วัน |
| **0** | D · ทำ Genome เป็นตาราง DB | ⛔ **พักไว้: Gate B ยังไม่ปิด** |

**เลือก A → C → B** ตามลำดับ
- **A** ทำให้สิ่งที่สร้างไปแล้วทั้งหมด (รัฐธรรมนูญ · mindset · DMAIC · positioning) **เริ่มมีผลจริงกับผู้ใช้** โดยไม่ต้องเขียนตรรกะใหม่สักบรรทัด — เป็นงานต่อสาย ไม่ใช่งานสร้าง
- **C** ปลดล็อกข้อ 3 ของห่วงโซ่ โดยไม่แตะ schema
- **B** ค่อยทำเมื่อ A+C เสร็จ เพราะตอนนั้นจะรู้แล้วว่าบันไดไหนถูกใช้จริง — รวมก่อนรู้ = เดา

⚠️ **B ยังไม่ควรทำตอนนี้** ไม่ใช่เพราะยาก แต่เพราะ **การรวมบันไดคือการตัดสินใจเรื่องความหมาย** (ขั้น 7 ของ 24 = ขั้นไหนของ 10?) ซึ่งควรตัดสินตอนมีข้อมูลว่าผู้ใช้เดินจริงยังไง

---

## 6 · กลไกที่เหลือไว้จากรอบนี้ (Control)

| กลไก | กันอะไร |
|---|---|
| `constitutionReach.test.ts` | นับจุดที่เรียก AI ทั้งหมด แล้วบังคับให้แต่ละจุดถูกจัดกลุ่มว่า **ได้รับ / ยังไม่ได้รับ** รัฐธรรมนูญ ⇒ เพิ่มจุดเรียก AI ใหม่แล้วไม่จัดกลุ่ม = แดง |
| แก้ `CLAUDE.md` | ลบประโยค "เดินทางไปกับทุก prompt" ที่ไม่จริง แทนด้วยจำนวนจริง |
| เอกสารฉบับนี้ | เป็นแหล่งเดียวของแผนที่สถาปัตยกรรม — ไฟล์อื่นอ้างมาที่นี่ ห้ามเขียนซ้ำ |
