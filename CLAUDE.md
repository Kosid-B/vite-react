# CEO AI Thailand — Project Memory

## Overview
Thai SaaS app "บริษัท AI อัตโนมัติ" — Vite + React SPA, no router (navigation = React state).
Sidebar `button.nav-item` switches pages. Deployed on Cloudflare Workers + Supabase backend.

🛑 **กฎสูงสุด — ความถูกต้องมาก่อนเสมอ** (เจ้าของยืนยัน 19 ส.ค. 2569 · เหนือกว่าทุกข้อด้านล่าง)
**ห้ามพูดสิ่งที่ยังไม่ได้ตรวจ** · ตรวจไม่ได้ ให้บอกว่าตรวจไม่ได้ **เพราะอะไร** — ห้ามเดาแล้วเล่าเหมือนรู้
ทุกคำกล่าวอ้างต้องติดป้ายได้: 🟢 ตรวจแล้ว (บอกได้ว่าตรวจยังไง) · 🟡 ยังไม่ได้ตรวจ · 🔴 ตรวจไม่ได้เพราะ X
**ความเร็วต้องยอมแพ้ความถูกต้องเสมอ** — ตอบช้าแต่ถูก ดีกว่าตอบไวแล้วผู้ใช้เสียเวลาไปกับของที่ไม่จริง
⚠️ วันที่ 17–19 ส.ค. 2569 ผิดกฎนี้ 5 ครั้งใน 2 วัน (ledger ข้อ 10–17) — ทุกครั้งรูปแบบเดียวกัน:
   **รายงานว่าจริง/เสร็จ ก่อนไปดูของจริง** ทั้งที่หลักฐานอยู่ในมือแล้ว (ไฟล์ · config · CI · ข้อมูลใน DB)

📚 **skill ภายนอกที่ sync มา (`thai-*`) — ของรีโปนี้ชนะเสมอเมื่อขัดกัน** (`src/lib/skillOverrides.ts` · 24 ส.ค. 2569)
เรียกใช้ได้จริง 4 ตัว: `thai-marketing-strategy` · `thai-content-social` · `thai-performance-ads` · `thai-seo`
(อีก 11 ตัว `*-th` เชิงวิชาการ **ยังไม่ถูก sync** ⇒ เรียกไม่ได้ · งานของเจ้าของถ้าต้องการ)
🔴 **`thai-marketing-strategy` สั่งให้สร้าง `BRAND.md` แล้วเรียกมันว่า "แหล่งความจริงเดียว"** (SKILL.md บรรทัด 19–21)
   ⇒ ทำตาม = ได้แหล่งความจริงเรื่องแบรนด์ **ตัวที่สาม** ซ้อนกับ `brandBrief.ts` และ `marketing_brand_rules` ของอีกระบบ
   ⇒ **แหล่งความจริงคือ `src/lib/brandBrief.ts` เสมอ · ห้ามสร้าง `BRAND.md`/`brand-profile.md` ในรีโปนี้** (เทสต์เฝ้า · ยืนยันแดงจริง)
⚠️ เกณฑ์ตัวเลขในคลังภายนอกเป็นค่ากลางของตลาด **ไม่ใช่ค่าที่พิสูจน์จากธุรกิจของผู้ใช้** — อ่านเป็น `policy` ห้ามเป็น `validated`
   (`thai-performance-ads` เขียน "ผลต่าง ≥ 20% = มีนัย · ขยายงบเมื่อ conversion ≥ 30" ⇒ ใช้ `MIN_SAMPLE_FOR_RATE` + ด่าน `paid-scale` ของเราแทน)
⚠️ **ไม่ได้ห้ามใช้** — ใช้ได้และมีประโยชน์ แต่ต้องผ่าน `violatesBrand()` + skill `content-link-contract` ก่อนปล่อยทุกชิ้น

🧱 **เส้นแบ่งความเป็นเจ้าของ — Marketing OS = อีกระบบ** (เจ้าของตัดสิน 24 ส.ค. 2569 · ห้ามข้ามโดยไม่มีคำสั่งใหม่)
🔴 **production `waigsnxhrlwtiotspaim` มีสองระบบเขียนลง** — ตาราง `marketing_*` **33 ตาราง** จาก 10 migration (23 ส.ค.) **ไม่มีในรีโปนี้**
   ⇒ รีโปนี้ **ห้ามสร้าง migration `marketing_*` · ห้ามอ่าน/เขียนตาราง `marketing_*`** (กลไก: `ownershipBoundary.test.ts`)
| อีกระบบเป็นเจ้าของ | รีโปนี้เป็นเจ้าของ |
|---|---|
| การตลาดของเราเอง — แคมเปญ · ข้อเสนอ · คอนเทนต์ · brand rules · segment · pillar · attribution | ตัวผลิตภัณฑ์ — แอปที่ผู้ใช้ล็อกอิน · Landing/`/start` · Worker · billing · marketplace |
| Marketing OS · Instruction Profiles | **รัฐธรรมนูญ · Founder Mindset · DMAIC · Business Genome · VRIO/Moat** (สมองที่ทำงานให้ *ธุรกิจของผู้ใช้*) |
⚠️ **ของที่ซ้ำ ให้ถืออีกระบบเป็นแหล่งจริง — แก้บั๊กได้ เพิ่มความสามารถไม่ได้**: `brandBrief.MESSAGE_HIERARCHY`/`violatesBrand()` (ซ้ำ `marketing_brand_rules` 10 ข้อ) · `brandBrief.AUDIENCE` (ซ้ำ `marketing_audience_segments`) · `positioningEngine.reviewCampaign()` · `videoBrief.ts` · `competitorMemory.ts`
⚠️ **`growthPdca`/`stageFit` เห็นแค่ `landing_funnel` ของเรา ไม่เห็นแคมเปญของอีกระบบ** ⇒ ห้ามอ่านผลมันเป็น "ภาพรวมการตลาด"
🔴 **กฎ "ห้ามแตะ schema เพราะ Gate B ยังไม่ปิด" กันได้แค่รีโปนี้** — schema ของ production ถูกเปลี่ยนไปแล้ว 10 ครั้งโดยอีกระบบ
แผนที่เต็ม: [ARCHITECTURE-CONSOLIDATION-AUDIT.md](docs/product/ARCHITECTURE-CONSOLIDATION-AUDIT.md) §0

📜 **รัฐธรรมนูญผู้ก่อตั้ง — `src/lib/founderConstitution.ts` + [AGENTS.md](AGENTS.md)** (เจ้าของ freeze 23 ส.ค. 2569)
**VISION**: ทำให้คนไทยทุกคนสามารถเปลี่ยนไอเดียให้เป็นธุรกิจที่มีลูกค้า มีหลักฐาน มีระบบ และขยายได้ ด้วย AI
**MOONSHOT**: *Build Thailand's Business Intelligence Infrastructure* — ⚠️ **วิสัยทัศน์ไม่ใช่พาดหัว** (พาดหัวยังเป็นปัญหาของลูกค้าเสมอ)
**PRODUCT DNA (freeze)**: คิดให้ใหญ่ · เริ่มให้เล็ก · พิสูจน์ให้เร็ว · เรียนรู้ตลอดเวลา · สร้างให้เป็นระบบ · แล้วขยายอย่างชาญฉลาด
**MISSION CHAIN (ห้ามข้ามขั้น)**: ไอเดีย → ลูกค้า → หลักฐาน → รายได้ → ระบบ → Scale
🔴 **GOLDEN QUESTION — ตอบไม่ได้ = ไม่สร้าง แม้ AI จะ "ทำได้"**
   *"สิ่งที่กำลังทำนี้ช่วยให้ธุรกิจเข้าใกล้ลูกค้า หลักฐาน กำไร หรือ Scale มากขึ้นอย่างไร?"*
   คำตอบต้องชี้ไปที่ **ลูกค้า / หลักฐาน / กำไร / Scale** เท่านั้น — *"ระบบเรามีฟีเจอร์นี้อยู่แล้ว"* = เหตุผลเรื่อง **เครื่องมือเรา** ไม่ใช่ **ธุรกิจเขา** ⇒ ปัดตกเสมอ (`TOOL_CENTRIC_EXCUSES`)
🚪 **Founder Mindset Engine — `src/lib/founderMindset.ts`**: ก่อนทำตามคำขอ ต้องเช็ก 6 ด่าน
   (problem · customer · offer · unitEconomics · tracking · evidence) **ตามเจตนาของคำขอ**
   ตัวอย่างที่เจ้าของให้: *"อยากยิง Ads 100,000 บาท"* ที่ยังไม่มีหลักฐาน ⇒ **กั้น** + คืนขั้นต่อไปที่ทำได้จริง (สัมภาษณ์ลูกค้าเป้าหมาย 10 คน)
   ⚠️ **`REQUIRED_BY_INTENT.validate = []` — ห้ามกั้นการพิสูจน์** · ยิ่งใช้เงิน/ยิ่งขยาย ยิ่งต้องผ่านด่านมากขึ้น
   ⇒ **ห้ามรีบทำตามที่ผู้ใช้ขอ · Validation ก่อน Scale เสมอ**
กลไก: `constitutionBlock()` + `founderMindsetBlock()` ต่อเข้า `brandBriefBlock()`
   🔴 **แต่ยังไปไม่ถึง AI ตัวจริง** (ตรวจ 24 ส.ค. 2569): 15 จุดในโค้ดที่ส่งคำสั่งเข้า AI มี **1 จุด** ที่ได้รับ
   · `CeoAiAgent` (ตัวที่ผู้ใช้คุยด้วย) + `ai-assist`/`ai-plan`/`agent-run` = **ไม่ได้รับเลย**
   ⇒ ห้ามพูดว่า "เดินทางไปกับทุก prompt" · แผนที่เต็ม: [ARCHITECTURE-CONSOLIDATION-AUDIT.md](docs/product/ARCHITECTURE-CONSOLIDATION-AUDIT.md) · กลไกเฝ้า: `constitutionReach.test.ts`
   · `founderMindset.test.ts` (24 เทสต์) บังคับว่ารัฐธรรมนูญถูกเรียกใช้จริง ไม่ใช่แค่เขียนไว้ (ledger #47)

🔧 **วิธีทำงานที่บังคับใช้ — skill `growth-mindset`** (อ่านก่อนส่งมอบทุกครั้ง)
ผิดแล้วต้องเหลือ **กลไก** ไม่ใช่คำขอโทษ · พยายามพิสูจน์ว่าตัวเองผิดก่อนส่ง โดยเฉพาะตอนกำลังจะเห็นด้วย
ตรวจว่าเครื่องมือทำงานจริงก่อนเชื่อผล (เช่น `tsc --noEmit` ที่รากเป็น no-op — ต้องใช้ `tsc -p tsconfig.app.json`)
เช็คกับหลักการโปรเจกต์ก่อนสามัญสำนึกตลาด · พูด "ยังทำไม่ได้เพราะขาด X" ไม่ใช่ "ทำไม่ได้"
บันทึกความผิดพลาด→กลไก: [docs/LESSONS-LEDGER.md](docs/LESSONS-LEDGER.md) — **เพิ่มแถวทุกครั้งที่พลาด พร้อมกลไกจริง**
📝 **ยอมรับว่าพูดผิดในแชต ≠ แก้แล้ว** (ledger #41 · 23 ส.ค. 2569) — บทสนทนาหายไปกับ context window **แต่เอกสารอยู่ต่อ**
   และรอบถัดไปเราจะอ่านเอกสารนั้นแล้วเชื่อมันอีก ⇒ **จบงานเมื่อ `grep` หาประโยคที่ผิดในทุกไฟล์แล้วแก้ครบ** ไม่ใช่ตอนพิมพ์คำว่า "ผมผิด"
   กลไก: `briefDocsContract.test.ts` **อ่านไฟล์ .md ตัวจริง** (เทสต์ที่ตรวจแต่โค้ดจับความผิดในเอกสารไม่ได้เลยสักข้อ)
📄 **ทำเอกสารเป็น PDF**: `node scripts/md-to-pdf.mjs <in.md> <out.pdf> ["หัวเรื่อง"]` — ใช้ Chromium (HarfBuzz) เพราะไลบรารี PDF ทั่วไปวางวรรณยุกต์ไทยผิด

🧠 **กฎการตัดสินใจ — `src/lib/decisionRules.ts`** (เจ้าของ freeze 24 ส.ค. 2569 จาก Case #001)
**POD ที่ไฟล์นี้ทำให้เกิดจริง**: ระบบทั่วไปตอบ *"สร้างคอนเทนต์อะไรดี"* · CEO AI ต้อง **วินิจฉัยก่อน** แล้วตอบว่า *"ตอนนี้ยังไม่ควรทำคอนเทนต์เพิ่ม เพราะ X"*
**ลำดับคอขวด (ห้ามข้ามขั้น)**: Measurement readiness → Lead capture → Segment routing → Message/Offer experiment → Organic distribution → Evidence accumulation → Paid validation → Scale
🔬 **`paid_validation` ≠ `paid_scale`** (เจ้าของแก้ถูก — กฎเดิมของผมกั้นการใช้เงินทุกกรณี = hard-block ที่ขัด Growth Mindset)
   ทดลอง (งบเล็ก · สมมติฐานเดียว · กลุ่มเดียว · มีเงื่อนไขหยุด) ต้องผ่านแค่ **customer + tracking** · เพิ่มงบต้องผ่านครบ 6 ด่านรวม evidence
   ⚠️ **จำนวนเงินเป็นตัวตัดสิน ไม่ใช่คำพูด** — "ขอทดสอบยิงแอด 100,000 บาท" = `paid-scale`
🔴 **นับได้ ≠ อัตราจริง** — `0/32` แปลว่า *"ยังไม่พบ"* **ไม่ใช่** *"อัตราจริงเป็นศูนย์"* (`stateSafely()` · `zeroIsNotProof()`)
   ⇒ เลิกใช้ประโยค *"ศูนย์ไม่ต้องรอ sample"* · observed count ยืนยันได้ทันที · inferred rate ต้องมี `MIN_SAMPLE_FOR_RATE`
🏷️ **ทุกเกณฑ์ติดป้าย `THRESHOLD_STATUS`** = `policy`/`hypothesis` เท่านั้น — **ห้ามมีตัวไหนเป็น `validated`** จนกว่าจะมีผลจริง
   (เช่น "lead ≥ 50 ก่อนเพิ่มงบ" = **hypothesis** ไม่ใช่ข้อเท็จจริง · Learning Engine ต้องปรับค่านี้จาก outcome ภายหลัง)
เคสต้นทาง: [CEOAI-MKT-CASE-001.md](docs/product/CEOAI-MKT-CASE-001.md) — dogfooding case แรก (ธุรกิจตัวอย่าง = เราเอง)
   · เทสต์ `decisionRules.test.ts` (18) อ่านเอกสารจริง บังคับว่า Observed/Hypothesis/ยังพิสูจน์ไม่ได้ ต้องแยกกันเสมอ

⚗️ **ทุกครั้งที่เจอปัญหา — skill `dmaic`** (เจ้าของสั่ง 24 ส.ค. 2569: *"คุณหมกมุ่นแต่ปัญหา ๆ ต้องหาวิธีพัฒนาแล้วประเมินผล แล้วหาทางเลือกที่ดีที่สุดเลย · ผมอายุ 50 ปีแล้ว อย่าให้ผมเสียเวลาเยอะ"*)
🔴 **ความผิดที่กันคือ "หยุดอยู่ที่ Analyze"** — รายงานว่าอะไรพัง ทำไมพัง มีจุดบอดอะไร แล้วส่งให้เจ้าของตัดสินใจเอง
   = **โยนงานที่หนักที่สุด (การเลือก) กลับไปให้คนที่มีเวลาน้อยที่สุด** · รายการปัญหายาว ๆ ดูเหมือนทำงานเยอะ ทั้งที่ยังไม่ได้ตัดสินใจอะไรเลย
**D**efine (เป้าหมายเป็นตัวเลข+เส้นตาย) → **M**easure (ค่าตั้งต้น · วัดไม่ได้ต้องบอกว่าเพราะอะไร) → **A**nalyze (สาเหตุราก 1 ข้อ)
→ **I**mprove (**ทางเลือก ≥ 3 รวม "ไม่ทำอะไรเลย" + คะแนน + ข้อที่เลือก**) → **C**ontrol (กลไกกันไหลกลับ)
⚠️ **ไม่มีค่าตั้งต้น = งานแรกคือซ่อมการวัด ไม่ใช่แก้ตัวสินค้า** · **ชนะ "ไม่ทำอะไรเลย" ไม่ได้ = อย่าเพิ่งทำ**
⏱️ **ของที่รู้ผลใน 14 วัน ชนะของที่ผลใหญ่กว่าแต่ต้องรอ** — เร็วที่จะรู้ว่าผิด = ต้นทุนต่ำที่สุด (ผลใหญ่ที่ต้องรอ 90 วัน = เดิมพัน ไม่ใช่การพัฒนา)
📤 **บรรทัดแรกของคำตอบต้องเป็นข้อเสนอ ไม่ใช่ที่มา** — ที่มาคือของที่เปิดดูเมื่ออยากตรวจ ไม่ใช่ของที่ต้องอ่านผ่านก่อน
กลไก: `src/lib/dmaic.ts` (`dmaicGate()` คืน `stuckAt` = เฟสแรกที่ยังไม่ผ่าน · `chooseBest()` คืนข้อเสนอ ไม่ใช่ตาราง)
   · ต่อเข้า `brandBriefBlock()` แล้ว (ครอบคลุมเท่ากับรัฐธรรมนูญ — ดูข้อจำกัดด้านบน) · `dmaic.test.ts` (28 เทสต์) ผูก SKILL.md เข้ากับค่าคงที่จริง
   · ⚠️ **กฎสูงสุด (ความถูกต้องมาก่อน) ยังอยู่เหนือ skill นี้** — ตรวจไม่ได้ยังต้องบอกว่าตรวจไม่ได้ **แต่ต้องบอกต่อว่าแล้วจะทำยังไง**

🚢 **ก่อนบอกว่า "เสร็จ" ทุกครั้ง — skill `shipped-not-written`** (บทเรียนรวม 17–18 ส.ค. 2569)
"เขียนถูก" ≠ "ทำงานจริง" · เครื่องมือทุกตัว (tsc/vitest/eslint/wrangler --dry-run) ตรวจแค่ว่าโค้ดถูก **ไม่มีตัวไหนตรวจว่าโค้ดถูกเรียกใช้**
พิสูจน์ 4 ชั้น: ①โค้ดถูกเรียกจริงไหม ②ข้อมูลหน้าตาตรงกับที่ประกาศไหม (`as Partial<>` = ประกาศ ไม่ใช่ตรวจ) ③เครื่องมือที่ตรวจ = ตัวที่ใช้จริงไหม ④CI ขึ้น success แล้วไหม
⚠️ **"push แล้ว" ≠ "อยู่บน production แล้ว"** — เช็ค GitHub Actions ก่อนบอกผู้ใช้ให้ไปทดสอบเสมอ
🚦 **ด่านเดียวก่อน commit ทุกครั้ง = `npm run ci`** (= `lint && build && test:run` — ขั้นเดียวกับที่ CI รันจริง)
   ห้ามพูดว่า "เทสต์ผ่าน" ถ้ารันแค่ `vitest`/`typecheck` — **`lint` คือขั้นที่ถูกลืมจนแดงติดกัน 54 รอบ 3 วัน** (ledger #36)
   และห้ามพูดว่า "เสร็จ" ถ้ายังไม่ได้เปิดดูผล CI รอบล่าสุดด้วยตาตัวเอง — เจ้าของไม่ควรต้องถ่ายภาพหน้าจอมาบอกเรา
   กลไก: `ciGate.test.ts` อ่าน **`ci.yml` และ `cloudflare-deploy.yml` ตัวจริง** ⇒ ขั้นใหม่ที่ไม่อยู่ใน `npm run ci` = แดงทันที
🔒 **`cloudflare-deploy.yml` มีขั้น `lint` แล้ว (22 ส.ค. 2569 · ห้ามลบ)** — เดิมรันแค่ `build` ⇒ ของที่ lint ไม่ผ่านขึ้น production ได้
   นั่นคือเหตุผลที่ CI แดง 54 รอบโดย**ไม่มีอาการอะไรให้สังเกต** (deploy ยังเขียวตลอด = CI ที่แดงไม่ได้กั้นอะไรเลย)
   ⚠️ ผลข้างเคียงที่ยอมรับแล้ว: lint แดง = deploy ไม่ออก แม้ตอนแก้ของเสียด่วน — **ทางออกคือแก้ lint ให้ผ่าน ไม่ใช่ลบขั้นนี้**
กลไก: `rpcContract.test.ts` (SQL↔TS) · `workerRouting.test.ts` (server.ts↔wrangler.jsonc) · `deployToolchain.test.ts` (เวอร์ชันเครื่องมือ dev↔CI)

📣 **ก่อนปล่อยคอนเทนต์ทุกชิ้น — skill `content-link-contract`** (ยกเป็นกฎบังคับ 19 ส.ค. 2569)
ส่งมอบคอนเทนต์ = **คอนเทนต์ + ลิงก์ติดตัวย่อ + บทความปลายทางที่มีของจริง** ขาดข้อใดข้อหนึ่ง = ยังไม่เสร็จ
⚠️ **ปลายทางที่ไม่มีเนื้อหาจริง แย่กว่าไม่มีลิงก์เลย** — ไม่มีลิงก์คือไม่ได้อะไรเพิ่ม แต่กดแล้วหาไม่เจอ = เขาเรียนรู้ว่าเราหลอกให้กด
🎬 **ตอนจบคลิปต้อง "ค้าง" ไม่ใช่ "อิ่ม"** — ปิดด้วยคำถามที่เขาตอบเองไม่ได้ถ้าไม่รู้ตัวเลขของตัวเอง · **คำถามมาก่อนลิงก์เสมอ** (ลิงก์ก่อน = โฆษณา)
เส้นแบ่งระหว่าง "เปิดช่องว่าง" กับ "หลอกให้กด" = ปลายทางมีของจริงไหม เท่านั้น
กลไก: `contentLinkContract.test.ts` (ทุก offer/คลิป → `provenBy`/`answeredBy` ต้องเป็นหัวข้อจริงในบทความ + ถ้าสัญญาว่ามี "ตาราง/เครื่องคำนวณ/เช็คลิสต์" บทความต้องมีจริง) · `videoEndingContract.test.ts`

🔁 **การวางระบบทุกอย่างต้องเป็นวงจร PDCA** (ยืนยันโดยเจ้าของ 19 ส.ค. 2569)
ห้ามส่งมอบ "สิ่งที่ทำ" เดี่ยว ๆ — ต้องบอกได้ว่ามันอยู่ตรงไหนของวงจร และวงจรปิดยังไง
**① Plan** ตั้งใจปล่อยอะไร กี่ชิ้น · **② Do** หลักฐานคือ **มีคนเข้ามาจากชิ้นนั้นจริง** ไม่ใช่คำว่า "โพสต์แล้ว"
**③ Check** ต้องพิสูจน์ว่า *เครื่องมือวัดทำงานอยู่* **ก่อน** อ่านตัวเลข · **④ Act** ห้ามตัดสินใจถ้า ③ ยังตาบอด
⚠️ **ลำดับนี้ห้ามข้าม** — ที่ผ่านมาเรากระโดดไป Act (แก้พาดหัว/เพิ่มฟีเจอร์) ตอน Check ยังตาบอด
   ผลคือ "แก้แล้วดีขึ้นไหม" ตอบไม่ได้สักครั้ง แล้ววนแก้ใหม่ไปเรื่อย ๆ
⚠️ **เครื่องมือที่ "ตั้งไว้แต่ไม่ได้ต่อ" ทำให้ทุกตัวเลขกลายเป็นคำโกหกโดยการละเว้น** (Amplitude ได้ 0 event 
   มาตลอด — ledger ข้อ 18) · `receiving: null` = **ตรวจไม่ได้** ต้องประกาศเป็นจุดบอด ห้ามเดาว่า "มีคีย์ = ใช้ได้"
กลไก: `src/lib/growthPdca.ts` (pure/tested · `stuckAt` = เฟสแรกที่ยังไม่ผ่าน · `canAct` ล็อกเมื่อ Check ไม่ผ่าน)
   · แผง `components/GrowthPdcaPanel.tsx` **อยู่บนสุด** ของแท็บการเติบโต (อ่านตัวเลขก่อนรู้ว่าวงจรค้างตรงไหน = มั่นใจแต่ผิด)
   · PDCA ฝั่งคุณภาพ/ISO เป็นคนละวงจร ใช้หลักเดียวกัน: `src/lib/eqms.ts`
   · `envContract.test.ts` = ชั้น Check ของ "โค้ดถูกเรียกใช้จริงไหม" (env ทุกตัวต้องถูกส่งเข้า build)

⚙️ **กฎบังคับการพัฒนา — skill `dynamic-plg`** (ยืนยันโดยเจ้าของ 16 ส.ค. 2569)
ทุกการแก้ไข/พัฒนาต้องเป็น **PLG** (ผู้ใช้ได้คุณค่าเองโดยไม่ต้องผ่านคน) และ **Dynamic PLG** (สิ่งที่เห็นเปลี่ยนตามสิ่งที่ระบบรู้เกี่ยวกับเขา)
รวมถึง **Landing Page ต้อง dynamic ตามผู้ใช้** — ระบบรู้อะไรแล้วยังแสดงเหมือนไม่รู้ = ผิดกฎ
⚠️ ต้องตรวจ **ทั้งสาย**: ต้นทางส่งบริบท → ไม่ตกหล่นระหว่างหน้า → **ปลายทางใช้จริง**
(เคยพลาด: เติม `?seg=` ให้ CTA แล้ว แต่ `/start` ไม่ได้อ่านค่านั้นเลย)
กลไกบังคับ: `src/lib/__tests__/dynamicPlg.test.ts` · แผนที่สัญญาณ: `src/lib/ctaContext.ts` + `src/lib/startHero.ts`

👥 **กลุ่มเป้าหมาย — แก้ระดับโครงสร้าง 23 ส.ค. 2569 (เจ้าของตัดสินใจ · แทนที่กฎ 16 ส.ค. ทั้งข้อ)**
🔴 **Current Audience ≠ Target Market** — ความผิดที่ทำให้ต้องแก้: เราอ่านสถิติผู้ชม YouTube
   แล้วสรุปว่านั่นคือกลุ่มเป้าหมาย · **ผู้ชมวันนี้เป็นผลของหัวข้อคลิปที่เราลง** ไม่ใช่หลักฐานว่าผลิตภัณฑ์สร้างมาเพื่อใคร
🎯 **Positioning: AI Business Builder สำหรับคนไทย** — พาไปจาก *"อยากมีธุรกิจ" → "มีลูกค้าจริง" → "เติบโตอย่างเป็นระบบ"*
   ชั้นกลุ่มเป้าหมาย (เรียงแล้ว ไม่ใช่ 5 กลุ่มเท่ากัน · หัวหาด = Primary):
   **Primary** คนทำงานประจำที่อยากมีรายได้เพิ่มด้วยธุรกิจ · **Secondary** นักศึกษาจบใหม่
   **Broad** คนที่อยากเริ่ม/สร้างธุรกิจของตนเอง · **Growth** เจ้าของที่ขายแล้วอยากโตเป็นระบบ · **Side Door** ISO/PDPA (`seg=audit`)
   **Persona เชิงสถานะ ไม่ใช่เชิงอายุ**: *"คนที่อยากมีธุรกิจของตัวเอง แต่ยังไม่รู้ว่าควรเริ่มจากอะไร และไม่อยากเสียเงินก่อนรู้ว่ามีลูกค้าจริงไหม"*
🗺️ **Customer Journey 10 ขั้น = ตัวตัดสินว่าสารไหนพูดกับใครตอนไหน** (`brandBrief.CUSTOMER_JOURNEY`)
   Idea → ลูกค้าที่ใช่ → ทดสอบตลาด → ตั้งราคา → ลูกค้ารายแรก → กำไร → กระบวนการ → KPI → ระบบ → Scale
   **สารหาลูกค้า (Acquisition) อยู่ขั้น 1–3** · **ISO/SOP/KPI เริ่มมีความหมายที่ขั้น 7** (`ISO_ENTERS_AT_STEP`)
   ⇒ เอา ISO ไปพูดกับคนขั้น 1–3 = พูดเรื่องที่เขายังไม่มีปัญหา (เหตุผลเชิงผลิตภัณฑ์ · หนักกว่าเหตุผลไม่แข่งกับ B.Training)
⚠️ **ความเสี่ยงที่ยอมรับแล้ว**: กลุ่มใหม่ยังไม่มีตัวตนในการเข้าถึงปัจจุบัน (18–24 = **0.0%**)
   และคลิปที่ทำผลงานดีที่สุด (942/782/665) พูดกับ Growth ทั้งหมด ⇒ **ต้องสร้างการเข้าถึงใหม่ ไม่ใช่ใช้ของเดิมต่อ**
   ตัวเลขช่วงแรกจะนิ่งหรือลด — **ห้ามตีความว่าล้มเหลว** · และ WTP ต่ำกว่ากลุ่ม Growth ⇒ **ชั้นฟรีต้องแข็งแรง**
📌 ข้อมูลเดิมที่ยังใช้ได้ (แต่เป็น **Current Audience** เท่านั้น): YouTube คลิป 942 วิว **อายุ 18–24 = 0.0% · 45+ = 58.1%** · ผู้ติดตามแทบไม่ขยับ และแทบไม่มีใครกดออกไปเว็บ
🔴 **เลิกอ้าง "คงผู้ชม 89% = เนื้อหาดีจริง"** (ล้มแล้ว 23 ส.ค. 2569 · [PLATFORM-REACH](docs/marketing/PLATFORM-REACH-2026-08-23.md))
   เวลารับชมรวม 6.3 ชม. ÷ 4,600 วิว = **4.9 วินาที/วิว** ⇒ คลิปเราเป็น Shorts ยาวไม่เกิน ~27 วิ
   "ดูจบ 89%" = ดูจบคลิป 20 วินาที **ไม่ใช่** สัญญาณว่าเขาสนใจเรื่องนี้ — Shorts เล่นเองในฟีด
🔴 **คอขวดไม่ใช่ "ไม่มีคนเห็น"** — แพลตฟอร์มเข้าถึง ~5,700 คน/สัปดาห์ (FB 18,242 + YT 4,600 ต่อ 28 วัน)
   แต่มาถึงเว็บ 20 คน/สัปดาห์ = **0.35%** ⇒ ที่ตันคือ **สะพาน** ไม่ใช่ปริมาณคอนเทนต์
   ⚠️ `stageFit`/`growthPdca` รับแต่ตัวเลขฝั่งเว็บ ⇒ จะสั่ง "ไปทำคอนเทนต์เพิ่ม" ผิดข้อเสมอ จนกว่าจะป้อนเลขแพลตฟอร์มเข้า `ReachFunnelPanel`
⚠️ **ไม่ได้ตัดคนที่ขายอยู่แล้วทิ้ง** — เขาอยู่ `seg=seller`/`owner` = **ขั้นถัดไปของ Journey**
`src/lib/startHero.ts` (default = broad market "อยากมีธุรกิจ แต่ไม่รู้จะเริ่มจากอะไร" · เพิ่ม `sidebiz` สำหรับ Primary)
`ctaContext.FALLBACK_SEG = 'newbie'` · `heroVariant.HeroSeg` เพิ่ม `'sidebiz'` (คนทำงานประจำ · matcher มาก่อน newbie)
บรีฟฉบับที่ 3: [BRAND-BRIEF-FORM.md](docs/marketing/BRAND-BRIEF-FORM.md)

🎯 **ก่อนเสนอให้ "โฟกัส/ตัดให้แคบลง" — skill `beachhead-who-not-what`** (เจ้าของค้านถูก 21 ส.ค. 2569)
**หัวหาด (Beachhead) = "กลุ่มคน" ไม่ใช่ "ปัญหาเดียว"** — ขั้น 1–6 ของ DE พูดถึงคนทั้งหมด
และขั้น 6 (`Full Life Cycle Use Case`) **บังคับให้ครอบคลุมทั้งวงจร** = ตรงข้ามกับ "เลือก pain เดียว"
⇒ กติกา: **แคบที่ "คน" (เจ้าของธุรกิจที่ขายอยู่แล้ว 35–65) · กว้างที่ "ปัญหาที่แก้ให้เขา" (12 หัวข้อที่เตรียมไว้)**
⚠️ ห้ามพูดว่า "นี่ไม่ใช่ความเห็นผม มันคือหลักการของ X" ถ้ายังไม่ได้เปิด X อ่านจริงในรอบนั้น — อ้างกรอบเป็นอำนาจแล้วผิด เสียหายกว่าเดาผิดธรรมดา
⚠️ **ตรวจ "ตำแหน่ง" ก่อนโทษ "กลยุทธ์"** — 15 จาก 19 บล็อกบนหน้า Landing มีคนเห็น 0 คน (เวลาที่ทุกคนเคยใช้กับเนื้อหาเรารวมกัน = 86 วินาที)
   ⇒ ที่ดูเหมือน "สื่อสารกว้างเกินไป" จริง ๆ คือ "ความกว้างถูกวางในที่ที่ไม่มีใครเห็น" · ห้ามเสนอตัดเนื้อหาที่ยังไม่เคยถูกเห็น

🏰 **ก่อนออกแบบฟีเจอร์/ตาราง/agent ใหม่ทุกครั้ง — skill `moat-architecture`** (เจ้าของ freeze 23 ส.ค. 2569)
**North Star (ป้ายภายใน)**: *AI Business Validation-to-Scale Operating System สำหรับคนไทย*
คำถามเดียวที่ต้องตอบ: **"ฟีเจอร์นี้เพิ่ม moat หรือเพิ่มแค่จำนวนฟีเจอร์"**
   ⇒ เพิ่ม moat ได้ก็ต่อเมื่อ ① จีโนมสมบูรณ์ขึ้น ② กฎตัดสินใจแม่นขึ้น ③ ผลลัพธ์ไหลกลับเข้าระบบ
🔗 **ห่วงโซ่ห้ามข้ามขั้น** (`NORTH_STAR.chain`): POD → Workflow → Decision Rules → Structured Data
   → Outcome Learning → Benchmark → Data Network Effect → MOAT
🧬 **Business Genome = หัวใจ** (`src/lib/businessGenome.ts` · 8 กิ่ง · เทสต์บังคับว่า Journey ขั้น 1–7 มีกิ่งรองรับครบ)
   🔴 **ประวัติแชต/prompt/ไฟล์อัปโหลด ไม่ใช่จีโนม** — ลอกได้ทันทีที่เปลี่ยน LLM
   `stuckBranch()` ตอบว่าธุรกิจติดกิ่งไหน = วัตถุดิบของ Next Best Action
🔬 **Evidence Graph**: Claim → Hypothesis → Experiment → Observed → Outcome → **Learning** → Confidence
   ⚠️ **ผลจริงอย่างเดียวไม่พอ ต้องมีบทเรียนด้วยถึงเป็น `validated`** (ผลที่ไม่ถูกสรุป = ไม่ไหลกลับเข้าจีโนม)
🥊 **ก่อนพูดว่าอะไร "ต่าง"** ต้องผ่าน `assessDifferentiation()` เทียบ `KNOWN_MARKET`
   (รวม **"Excel / จดมือ / ไม่ทำอะไรเลย"** = คู่แข่งที่ชนะบ่อยที่สุดและมักถูกลืม)
📊 **VRIO Engine** (`VRIO_ASSETS` + `vrioVerdict`) — **R และ I เป็นตัวชี้ขาด ไม่ใช่ V** · V=5 แต่ R/I ต่ำ = POP เสมอ
🪜 **ปลดล็อกตามจำนวนผู้ใช้จริง** (`moatReadiness`): 0 → Genome + Playbook · 1 → Experiment Memory
   · 5 → Decision Engine · 30 → Benchmark + Learning Loop · ⚠️ **กฎ ≠ เอนจิน** (เขียนกฎได้วันนี้ · เอนจินที่เรียนรู้ต้องรอ)
🔒 **ห้ามแตะ schema/migration** จนกว่า Gate B ปิด → Phase 1 Acceptance #2 → freeze baseline
   🔴 **Gate B ไม่ปรากฏในรีโปนี้** — ต้องถามเจ้าของ ห้ามสันนิษฐานว่าปิดแล้ว
สถาปัตยกรรมเต็ม: [MOAT-ARCHITECTURE-V1.md](docs/product/MOAT-ARCHITECTURE-V1.md)

🚦 **ด่านกลยุทธ์ที่ block ได้จริง — `src/lib/positioningEngine.ts`** (ยกระดับ 23 ส.ค. 2569)
เจ้าของยก POP/POD/VRIO จาก "แนวคิดการตลาด" เป็น **กฎหลักของ AI Marketing OS**
**หลักการแม่**: *"อย่าใช้ AI เพื่อสร้าง Content ให้มากขึ้น — ใช้ AI เพื่อค้นหาว่าอะไรควรพูด กับใคร เพราะอะไร และเรียนรู้อะไรจากผลลัพธ์"*
🧬 **CONTENT_DNA (ห้ามสลับ)**: Customer Problem → Business Insight → POD → Proof → AI-enabled Action → Experiment → Measurement → Learning
   (ของเดิม AI → Feature → Content → CTA = ขายเครื่องมือ · AI ต้องอยู่**กลางสาย** ในฐานะกลไก ไม่ใช่หัวเรื่อง)
🧠 **MARKETING_BRAIN**: Positioning Engine อยู่ **ก่อน** Message/Content — ไม่ใช่ตรวจทีหลัง · วงจรปิดที่ VRIO Strengthens
✅ **10 คำถามต้องตอบครบก่อนสร้าง** (`STRATEGY_GATE_QUESTIONS`) — ตอบไม่ครบ = `pass:false` **สร้างไม่ได้ ไม่ใช่แค่เตือน**
🔴 **4 กฎบังคับ** (`reviewCampaign`) — NO POD → ห้ามอ้างความต่าง · NO EVIDENCE → คงเป็นสมมติฐาน ·
   LOW SAMPLE (< `MIN_FOR_RATE` ตัวเดียวกับ growthPdca) → ห้ามสรุปผลงาน · POP ONLY → บอกเล่าได้ ห้ามอ้างความได้เปรียบ
🏷️ **ClaimStatus 4 ระดับ**: hypothesis → research → observed → validated · **งานวิจัยของคนอื่นยังไม่พอ** ต้องถึง observed
⚠️ **ห้ามใช้วิธี "ตัดคำจากประโยค" จำแนก POP/POD** — เคยพัง 2 ทาง (POP กลายเป็น POD · จำแนกผิดชั้น) ⇒ ใช้ `POD[].keywords`
🔒 **ไม่แตะ schema/migration** ตามที่เจ้าของสั่ง (Gate B ยังไม่ปิด) — ทั้งหมดเป็น pure logic

🏁 **แกนการแข่งขันก่อนเปิด Public — `src/lib/competitiveStrategy.ts`** (เจ้าของกำหนด 23 ส.ค. 2569)
**POP = ความสามารถ AI · POD = วิธีสร้างธุรกิจ · VRIO = ระบบเรียนรู้ธุรกิจที่สะสมเอง**
⇒ เปลี่ยน LLM ได้โดยความได้เปรียบไม่หาย — model คือเครื่องยนต์ · ข้อมูลธุรกิจที่สะสมคือสินทรัพย์
🔴 **"มี AI / AI Agent / สร้างคอนเทนต์ได้" = POP ไม่ใช่ moat** — AIS×Microsoft แจก AI Agent ให้ SME แล้ว
   ⇒ ขึ้นหน้าด้วยข้อพวกนี้ = โดนถามทันทีว่า "ต่างจาก ChatGPT + Canva ยังไง"
🔴 **ห้ามประกาศว่ามี moat ที่ยั่งยืน** (`MOAT_CLAIM.mustNotClaim`) — R/I ที่แข็งเกิดหลังมีข้อมูลผลลัพธ์จริง
   วันนี้ 4 บัญชี · จ่ายจริง 0 ราย ⇒ อ้างตอนนี้ = คำโกหกที่ฟังดูเป็นมืออาชีพ
🗂️ **หมวดหมู่ = ป้ายภายใน ห้ามเป็นพาดหัว** (`CATEGORY`) — ภายใน "AI Business Building System" ·
   ภายนอก "AI Business Builder สำหรับคนไทย" · **พาดหัว = ปัญหา**: *"อย่าเพิ่งสร้างธุรกิจ จนกว่าจะรู้ว่าใครจะซื้อ"*
🪜 **บันได VRIO มีตัวเลขปลดล็อก** (`moatReadiness`) — ที่ผู้ใช้ 0 ราย ทำได้เฉพาะ **Business Genome + Thai Playbook**
   (เป็นโครงข้อมูล/กฎ ไม่ใช่ฟีเจอร์ · retrofit แพง) · Decision Engine ต้องมีผู้ใช้ 5 · Benchmark ต้อง 30
🟢 **POD ที่เปิดใช้ได้ทันทีและเราลืมว่ามี**: Evidence-Based AI + Measurement Safety สร้างเสร็จมีเทสต์แล้ว
   (`MIN_FOR_RATE` · `MIN_SAMPLE` · `PMF_MIN_SAMPLE` · `receiving:null` …) **แต่ไม่เคยถูกเอาไปสื่อสาร**
กลยุทธ์เต็ม: [PRODUCT-STRATEGY-PUBLIC-LAUNCH.md](docs/marketing/PRODUCT-STRATEGY-PUBLIC-LAUNCH.md)

🔇 **ก่อนสรุปว่า "อะไรได้ผล/ไม่ได้ผล" — skill `invisible-influence`** (เจ้าของค้านถูก 23 ส.ค. 2569)
**~39% ของผู้บริโภคดิจิทัลไทยไม่ทิ้ง engagement ให้เห็นเลย** แต่จดจำ+ค้นหา+ซื้อภายหลัง
(78% จำแบรนด์ได้แม้ไม่กดอะไร · 77% เก็บไว้ในใจก่อนซื้อ · 60% บอกต่อผ่าน **DM** ที่เราไม่มีวันเห็น)
⇒ **แดชบอร์ดวัดได้แค่ "คนที่เลือกจะแสดงออก"** · ตัดช่องที่ engagement ต่ำ = ตัดขาแบรนด์ตัวเอง
🔴 **ห้ามเอาตัวเลขที่เกิดจากข้อบกพร่องของเราเอง ไปตั้งเป็นข้อเท็จจริงเรื่องตลาด** (พลาดจริง · ledger #43)
   ตัวอย่างที่เกิดแล้ว: `quickcheck = 0` **ไม่ใช่** "ไม่มีใครสนใจ" แต่คือ **ช่องกรอกอยู่ใต้ขอบจอทุกเครื่อง** ·
   `search = 0` คือ **เพิ่ง index 7 วัน** · `social 32` คือ **เงาของการไม่ติด utm** (78/80 ไม่มีแท็ก)
   ⇒ ก่อนตีความตัวเลขทุกครั้ง ถามก่อน: **"เลขนี้วัดตลาด หรือวัดบั๊กของเรา"**
⏳ **Be Remembered ให้ผลภายหลัง — ห้ามฆ่าด้วย KPI รายสัปดาห์** · ตัวชี้วัดการรับรู้ที่จริงที่สุดคือ
   **branded search** (คนพิมพ์ชื่อเราเอง — ปลอมไม่ได้ ซื้อไม่ได้ และขึ้นช้าเสมอ)
กลยุทธ์เต็ม: [AWARENESS-STRATEGY-2026-08-23.md](docs/marketing/AWARENESS-STRATEGY-2026-08-23.md) (Be Found/Remembered/Recommended + ปฏิทิน 4 ช่วง × 2 สัปดาห์)

🧭 **ก่อนลงมือทำการตลาดทุกครั้ง — skill `marketing-instruction`** (ตั้ง 22 ส.ค. 2569)
skill อื่นคุม "กฎรายข้อ" · ตัวนี้คุม **"ลำดับ"** และ **"วันนี้ทำอะไร"** — ไม่เขียนกฎซ้ำ แต่ชี้ว่าเมื่อไรใช้ตัวไหน
**ขั้น 0 บังคับ: ตรวจเฟสก่อนเสมอ** (แผง 🎯 / `stageFit`) — **เฟสเปลี่ยน = คำสั่งทั้งแผ่นเปลี่ยน**
ลำดับงานเฟส `reach` (ห้ามสลับ ①② · ห้ามเริ่มที่ ④) — แก้ 23 ส.ค. 2569 ให้ตรงกับ SKILL.md §2:
   ① **ปล่อยคอนเทนต์ "ธุรกิจ" ที่มีปลายทางจริง** (สารหลัก · ตลาดใหญ่สุด)
   ② อ่านผลจาก Search Console (ยืนยันแล้ว) ว่าคนค้นคำอะไร
   ③ ปิด **Pilot ฿1,990** กับคนที่มีทริกเกอร์ — **งานคู่ขนาน ห้ามยกขึ้นเป็นสารหลักบนเว็บ**
   ④ ยิงแอดงบเล็ก "ซื้อคำตอบ"
   ⚠️ เดิม CLAUDE.md เขียน ① = Pilot ซึ่งขัดกับ MESSAGE_HIERARCHY ที่ตั้งไว้เอง (ธุรกิจนำ · ISO ตาม)
🔴 **ลำดับของสาร: "ธุรกิจ" นำ · "ISO/มาตรฐาน" ตาม** (เจ้าของยืนยัน 22 ส.ค. 2569 · `brandBrief.MESSAGE_HIERARCHY`)
   ① CEO AI สร้างมาสำหรับ**คนทำธุรกิจ** — compliance = ฟีเจอร์เสริม ไม่ใช่ตัวสินค้า
   ② 🔴 **นำด้วย ISO = แข่งกับบริษัทแม่ตัวเอง** — B.Training ขายที่ปรึกษา ISO **฿50,000–85,000/โปรเจกต์**
      ⇒ เสียรายได้หลักหมื่น เพื่อได้ค่าสมาชิกหลักพัน (เหตุผลที่ลืมง่ายที่สุดและแพงที่สุด)
   ③ ตลาดต่างกัน ~30 เท่า — ISO 50,000–100,000 ราย vs เจ้าของธุรกิจ ~3.2 ล้านราย
   ⚠️ **ไม่ได้ห้ามพูด ISO** — คนที่พิมพ์คำนั้นค้นเองยังต้องเจอเรา (`seg=audit`) แต่นั่นคือ **ประตูข้าง ไม่ใช่ป้ายหน้าร้าน**
   ⚠️ และห้ามพูดชื่อ **หมวดหมู่สินค้า** ขึ้นหน้าเสมอ (AI Business OS) — ให้พูด **"ปัญหา"** ขึ้นหน้า
      เพราะ **คนที่ไม่รู้ว่าตัวเองมีปัญหา ไม่ค้นหา**
กลไก: `marketingInstruction.test.ts` ผูก instruction เข้ากับ `growthPdca` + `stageFit` + `SHORT_LINKS`
   ⇒ แก้ค่าคงที่แล้วไม่แก้คำสั่ง / แอบเติมงานเฟสหลัง / ลอกคำต้องห้ามมาไว้ซ้ำ = แดงทันที

🏭 **ก่อนลอกกลยุทธ์จากเคสบริษัทยักษ์ — skill `case-study-stage-fit`** (จากคลิป Lockheed Martin 22 ส.ค. 2569)
เคสที่ถูกทำเป็นคลิป = บริษัทที่ **ชนะไปแล้ว** ⇒ เล่า "กลไกตอนจบ" (ผูกขาด · lock-in · ไม่ต้องทำการตลาด)
ซึ่งเป็น **ผล** ของการมีลูกค้ามหาศาล ไม่ใช่ **วิธี** ที่ทำให้ได้ลูกค้ามา — ใช้ผิดเฟส = ดูดเวลาไปจากสิ่งเดียวที่ควรทำ
บังคับคัดทุกบทเรียนลง 3 กอง: ✅ ใช้ได้ตอนนี้ · ⏳ ใช้ได้ทีหลัง (**ต้องมีตัวเลขปลดล็อก**) · ❌ ห้ามลอก (ต้องบอกว่าทำไม)
⚠️ **"ของดีไม่ต้องโฆษณา" = คำอธิบายของผู้ชนะ ไม่ใช่วิธีชนะ** — จริงเมื่อลูกค้าไม่มีทางเลือกอื่นเท่านั้น
   ของเราตรงข้ามทุกข้อ: ผู้เข้าชม**ตลอดกาล 79 คน** · ลูกค้าจ่ายเงินจริง **0 ราย** (146 รายการ = `admin-free` ทั้งหมด)
⚠️ lock-in ของเราต้องเป็น **"ย้ายแล้วเสียดาย" ไม่ใช่ "ย้ายไม่ได้"** — `processRegister` มี export ตั้งแต่วันแรก ห้ามถอย
กลไก: `caseStudyStageFit.test.ts` ผูก skill เข้ากับค่าคงที่จริงใน `growthPdca.ts` (แก้โค้ดแล้วไม่แก้ skill = แดง)

📊 **ก่อนเชื่อผลการทดลอง — skill `experiment-reality-check`**
นับ **คนที่เห็นความต่างจริง** ไม่ใช่ผู้เข้าชมทั้งหมด (ของใต้ครึ่งหน้า = คนที่เลื่อนถึง — เคยหลอกตา: 60 คน แต่เห็นจริง 1)
ตัวชี้วัดต้องเกิดบ่อยพอ (สมัคร 1 ครั้งใน 60 คน = วัดความบังเอิญ → ใช้ CTA แทน) · คนน้อยให้รันทีละชุด
"หยุด" ≠ "ฟีเจอร์แย่" — ต้องมีค่าตั้งต้น + เหตุผลในโค้ด · "ปรับตามสถานะ" ≠ "การทดลอง" (กลุ่มไม่ได้สุ่มมา เทียบไม่ได้)
แผนต้องอยู่ในโค้ดและมีเทสต์ยืนยันว่าถูกเรียกใช้จริง: `src/lib/experimentPlan.ts`

🔑 **หลักการก่อตั้งที่ห้ามลืม — ISO ทำได้ตั้งแต่ปีแรก** (skill `iso-from-day-one`)
ISO ไม่ใช่ใบเซอร์ของบริษัทใหญ่ แต่คือวิธีสร้างธุรกิจให้ทำซ้ำได้+ขยายได้ → ธุรกิจปีแรกคือจังหวะที่ถูกที่สุด
ด่านคือ **"ความไว้ใจของเจ้าของ" ไม่ใช่ "ความพร้อมของธุรกิจ"** · ยิ่งรอยิ่งแพงเพราะต้อง retrofit
⚠️ ห้ามเขียนกลยุทธ์/คอนเทนต์ว่า "รอให้ธุรกิจโตก่อนค่อยทำ ISO" — ขัดจุดยืนโปรเจกต์ (พลาดมาแล้ว 16 ส.ค. 2569)
⚠️ ห้ามขึ้นต้นคอนเทนต์ด้วยคำว่า ISO กับคนเพิ่งเริ่มธุรกิจ — ใช้บันไดความไว้ใจ 5 ขั้นก่อน

**Positioning (ยืนยัน ก.ค. 2569): "AI Business Operating System"** — ระบบสร้างธุรกิจด้วย AI ตั้งแต่ต้นน้ำ ให้โตอย่างเป็นระบบ+พร้อมขยาย
ผสาน 2 เสา: **MIT 24 Steps** (หา PMF/ลูกค้า/คุณค่า) × **ระบบบริหาร/ISO 20+ ปี B.TC** (SOP/KPI/Risk/scalability).
สารหลัก **ไม่ใช่** "จ้างทีม AI ทั้งบริษัท" — "ทีม AI" = กลไกสนับสนุน · คุณค่าหลัก = ลดความเสี่ยงเริ่มธุรกิจ + ฐานลูกค้าแข็งแรง + scale.
compliance (PDPA/ISO) = ฟีเจอร์เสริม (ไม่ใช่บริการทำใบเซอร์ — งานที่ปรึกษาส่งต่อ B.Training). แหล่ง canonical: `src/lib/seoData.ts` + `/start` + [BRAND-ARCHITECTURE.md](docs/marketing/BRAND-ARCHITECTURE.md) §8

## Stack
- **Frontend**: Vite + React + TypeScript, CSS variables (dark theme `#0f172a`)
- **Backend**: Supabase (Auth, Postgres RLS, Edge Functions)
- **Deploy**: Cloudflare Workers (worker `ceo-ai-thailand`, `npx wrangler deploy` — production ยืนยันโดย Board ก.ค. 2569); `deploy.yml` → GitHub Pages ยังรันอยู่แต่เป็น legacy; Vercel = PR preview
- **Email**: Resend API (via Edge Functions) — ส่งจาก `noreply@ceoaithailand.org`
- **Search**: Serper.dev (Google Search API) — ใช้ใน agent-run Edge Function
- **Billing**: pg_cron + billing-cron Edge Function (daily 02:00 UTC)

## TIS Automate (ผลิตภัณฑ์แยก)
```
Supabase Project ID : galtbbkcddugnsfkgyqm  (แยกจากระบบหลักโดยสมบูรณ์ — ทางเลือก B โดย Board)
Supabase URL        : https://galtbbkcddugnsfkgyqm.supabase.co
Region              : ap-southeast-1 (สิงคโปร์) · Free tier ฿0/เดือน
Schema              : migrations/0016_tis_automate + 0017_tis_rls_fixes + 0018_tis_write_policies_and_seed
                      13 ตาราง (organizations/standards/clauses/projects/requirements/kanban/
                      documents/validations/marketing_events/…) + 5 enums + RLS ครบ
                      ⚠️ project galtbbkcddugnsfkgyqm = INACTIVE (ยืนยันผ่าน MCP 10 ก.ค. 2569) — สถานะ apply ต้องตรวจเมื่อ resume
หมายเหตุ            : 0016–0018 อยู่ใน repo นี้เพื่อเก็บประวัติ แต่ apply กับ project TIS เท่านั้น
                      (ห้าม apply กับ production หลัก waigsnxhrlwtiotspaim หรือ dev oudykxmtrnjeskglaluh) · frontend/subdomain ยังไม่สร้าง
```

## Production Credentials
```
Supabase Project ID : waigsnxhrlwtiotspaim  (org bgvyelbcbxhzzfrzuqnh, Pro — production จริง ยืนยัน 2026-07-07)
Supabase URL        : https://waigsnxhrlwtiotspaim.supabase.co
Public Key          : sb_publishable_Tf6Q7Mq6I2OLtfXot-EWJA_FESohA9E  (publishable = public โดยดีไซน์ ตรงกับ wrangler.jsonc)
Custom Domain       : ceoaithailand.org
Admin Email         : support@b-tctraining.com
GA4                 : G-CHJ99RY1Q1 (ใส่ใน index.html แล้ว)
```
> ⚠️ Production identity แก้ 2 รอบ (config drift R11/R19). ตัวจริง = `waigsnxhrlwtiotspaim` — ยืนยันด้วย JS bundle
> เว็บจริง + deploy scripts + wrangler.jsonc. project เดิม `rsjbqmnvocvtveelselj` (Vercel org, Free) **ไม่ใช่ prod**
> (เก็บเป็น backup รอตัดสินใจลบ). แหล่งความจริง: [docs/isms/environment-map.md](docs/isms/environment-map.md) v3.0

## Local Dev vs Production
- **Local mode** (ไม่มี `.env`): ข้อมูลเก็บใน `localStorage`, ไม่ต้อง login, plan = Scale (full access)
- **Production mode** (มี `VITE_SUPABASE_URL`): ต้อง login, sync ขึ้น Supabase, plan บังคับใช้
- **ห้ามสร้าง `.env` ใน repo** — ตั้งผ่าน GitHub Secrets เท่านั้น

## ⚠️ Lessons Learned — Layout/UX gotchas (กันพลาดซ้ำ)
```
GOTCHA #1 — .guest-bar กลายเป็น "แถบฟ้าเต็มความสูง" ดันเนื้อหาไปขวา (บั๊กเสียเวลา debug นาน ก.ค. 2569)
  • .app { display:flex } (row) · .guest-bar เป็นลูกตรงของ .app (App.tsx ~623) พื้นหลัง gradient teal
    ถ้าไม่กำหนดความกว้าง → กลายเป็น flex column เต็มความสูง (align-items:stretch) ดัน .main ไปขวา
  • แก้: .app { flex-wrap:wrap } + .guest-bar { flex:0 0 100%; width:100% }  (index.css)
  • ⚠️ .guest-bar โผล่ "เฉพาะ production guest mode" (isSupabaseEnabled && !session && guestMode)
    → LOCAL DEV ไม่ render (ไม่มี Supabase) = reproduce ตรง ๆ ไม่ได้!
    วิธี debug: Playwright inject <div class="guest-bar"> เข้า .app แล้ววัด box (ดู scratchpad/verify.mjs)

บทเรียนกระบวนการ (สำคัญกว่าตัวบั๊ก):
  1. UI ที่เป็น "prod/guest-only" reproduce ใน local ไม่ได้ — ต้อง inject element จำลอง ก่อนสรุปสาเหตุ
  2. อย่าโทษ "การแก้ล่าสุดของตัวเอง" โดยไม่ reproduce ให้เห็นก่อน — ครั้งนี้เดาผิดว่าเป็น max-width
     ของตัวเอง (revert ไปก็ไม่หาย) ทั้งที่ตัวจริงคือ .guest-bar flex column
  3. เจอบั๊ก layout: ตรวจ "ลูกตรงของ flex container" ทุกตัวว่ามีความกว้างชัดเจนไหม (โดยเฉพาะ banner/overlay
     ที่ควรเต็มแถวแต่ไม่ได้กำหนด flex-basis) — align-items:stretch ทำให้มันสูงเต็ม container
  4. ผู้ใช้บอก "มือถือปกติ + เมื่อวานปกติ" = เบาะแสทองว่าเป็น state-specific (guest vs login) ไม่ใช่ทุกคน

GOTCHA #2 — ข้อความ header sidebar "ซ้อนทับกัน" (collapsed:hover peek / จอเตี้ย)
  • .sidebar = flex column, position:fixed height 100vh · .sidebar-brand เดิม flex-shrink:1 (default)
    เมื่อเนื้อหา sidebar สูงเกินจอ → flex บีบ .sidebar-brand (มี min-height:52px ของ state ยุบ)
    เหลือ 52px แต่ content (sub/badge) ล้นออกมาทับ .nav-section ด้านล่าง
  • แก้: .sidebar-brand { flex-shrink:0 } → brand ไม่ถูกบีบ · sidebar เลื่อน (overflow-y:auto) แทน
  • บทเรียน: flex item ที่ "ต้องคงความสูงตาม content" (header/brand) ให้ flex-shrink:0 เสมอ
    โดยเฉพาะใน flex-column ที่ parent สูงจำกัด — ไม่งั้นถูกบีบจน content ล้นทับตัวถัดไป
  • reproduce: force .sidebar.collapsed + page.hover (ต้องลบ .onb-overlay/.goal-overlay ก่อน hover) — scratchpad/sb2.mjs

GOTCHA #3 — แก้ index.css แล้ว "ไม่ขยับ" เพราะ inline <style> ในคอมโพเนนต์ทับอยู่ (20 ส.ค. 2569)
  • LandingPage.tsx มี <style> ฝังในคอมโพเนนต์ → อยู่ "หลัง" index.css ใน DOM
    specificity เท่ากัน + !important ทั้งคู่ ⇒ ตัวหลังชนะเสมอ = index.css แพ้
  • ของจริงที่เจอ: padding-bottom:200px !important ที่กันที่ไว้ให้แถบคุกกี้ตัวเก่า (สูง 130px)
    แต่แถบคุกกี้ถูกย่อเหลือ 86px ไปแล้ว → กันที่เกินจริง 114px ค้างอยู่โดยไม่มีใครรู้
    ⇒ แก้ index.css รอบแรกได้คืนแค่ 21px ทั้งที่ค่าที่เขียนถูกต้อง
  • บทเรียน: ค่าที่ "กันที่ไว้ให้ของอีกชิ้น" (ความสูงแถบ/แถบล่าง/header) เป็นหนี้ที่ลืมง่ายที่สุด
    เปลี่ยนความสูงของชิ้นไหน ให้ไล่หาว่าใครกันที่ไว้ให้มันบ้าง (grep ค่าตัวเลขนั้น)
  • วิธีตรวจว่าโดนทับไหม: getComputedStyle ในเบราว์เซอร์จริง ไม่ใช่อ่านไฟล์ CSS
    (อ่านไฟล์ = เห็น "สิ่งที่เราเขียน" · getComputedStyle = เห็น "สิ่งที่เบราว์เซอร์ใช้จริง")
  • ⚠️ ขอบจอแรกบนมือถือคือทรัพยากรที่แพงที่สุดของเว็บนี้ — ข้อมูลจริง: ผู้เข้าชม 75 คน
    เลื่อนหน้าเฉลี่ย 5.2% · 85% ไม่เลื่อนเลย ⇒ อะไรอยู่ใต้ขอบจอ = แทบไม่มีใครเห็น

GOTCHA #4 — "ขอบจอ" ของ iPhone **ไม่ใช่ 844px** (พลาดจริง 20 ส.ค. 2569 · ledger #23)
  • 390x844 = ขนาดจอเครื่อง · Safari กินแถบที่อยู่+แถบล่างไป ~180px ⇒ ที่ให้เว็บใช้จริง = **664px**
    Playwright `devices['iPhone 13'].viewport` = 390x664 ตรงกับของจริง — ใช้ค่านี้ ไม่ใช่สเปกเครื่อง
  • ห้ามตัดสินว่า "อยู่ในจอแรกไหม" ด้วยเลขที่จำมา — อ่าน `window.innerHeight` จากเบราว์เซอร์เสมอ
  • ตรวจหลายขนาดเสมอ: iPhone 13 =664 · iPhone SE =568 · iPhone 14 Pro Max =740 · Pixel 7 =839
  • ⚠️ **ความกว้างสำคัญกว่าความสูง** — จอแคบลง ตัวอักษรตกบรรทัดมากขึ้น hero จึง**สูงขึ้น**ทั้งที่จอเตี้ยลง
    ต้องตรวจครบทั้ง 4 ชั้น: **320 (SE) · 360 (Android) · 375 (iPhone 8) · 390+** (ledger #27 — เคยตรวจแค่ 4 เครื่อง
    แล้วประกาศว่าเหลือแค่ SE ที่ไม่ผ่าน ทั้งที่ 360 และ 375 ก็ไม่ผ่าน)
  • บังคับวัดด้วย **worst case** เสมอ: `?seg=food` (h1 ยาวสุด) + `localStorage.ceo_ai_ab='ab-B'` (subLead ยาวสุด)
    ไม่งั้นผลเปลี่ยนไปมาทุกครั้งที่รัน เพราะพาดหัวเป็น A/B
  • 🔴 ของที่ `position:fixed` (แถบคุกกี้/แถบล่าง) บัง **ก้นจอ** ไม่ใช่ก้นของ section ไหน
    ⇒ ห้ามเว้น padding ใน section เพื่อกันมัน (เคยเว้น 200→104px แล้ววัดจริงปุ่มยังถูกบัง 34px)
    ที่ถูก = กันที่ท้าย `<body>` โดยวัดความสูงจริงของแถบ (CookieConsent.tsx + ResizeObserver)
  • กลไก: `src/lib/__tests__/mobileFoldContract.test.ts` (เพดาน padding + ลำดับ section + วิธีกันที่ของ fixed)
    · `onboardingOverlay.test.ts` ล็อกว่า quickcheck ต้องเป็น section ที่ 2 ต่อจาก hero

GOTCHA #4b — ตัวอักษรกลืนพื้นหลัง: **แก้สีตัวอักษรตามธีม ต้องไล่ดูพื้นหลังด้วยเสมอ** (เกิด 2 รอบ · 21+22 ส.ค. 2569)
  • ธีมสว่าง override สีตัวอักษรให้เข้ม แต่ไม่ได้ override พื้นหลังที่เขียนตายตัวเป็นสีเข้ม
    ⇒ เข้มบนเข้ม = contrast **1.00** มองไม่เห็นเลย (`.start-h2` ถูก override · `.start-why-sec` ไม่ถูก)
  • กฎ: เขียนสีตัวอักษรตายตัวเมื่อไร **ต้องเขียนพื้นหลังตายตัวคู่กันใน selector เดียวกัน** ไม่งั้นใช้โทเคนทั้งคู่
  • 🔴 บทเรียนที่แพงกว่าตัวบั๊ก: **เครื่องมือตรวจที่เดินไม่ครบ อันตรายกว่าไม่มีเครื่องมือ**
    `contrast-audit` เดินแค่ 6 หน้าจากเกือบ 30 (เมนูยุบ + โหมดโฟกัสซ่อน) แล้วรายงานเขียว
    ⇒ ตัวตรวจทุกตัวต้อง **พิมพ์จำนวนหน่วยที่เดินจริง** และ **ล้มเองถ้าเดินไม่ครบ** (`MIN_PAGES`)
  • สั่ง: `npm run dev` แล้ว `node scripts/contrast-audit.mjs 4.5` · skill `theme-safe-color`
  • กลไก: `themeSafeColor.test.ts` — เฝ้าทั้ง CSS และ **ตัวเครื่องมือเอง**

GOTCHA #5 — ตัวเลข "เลื่อนไปกี่ %" บนหน้า Landing **ไม่ได้แปลว่าอ่านไปเท่านั้น** (วัดจริง 20 ส.ค. 2569)
  • หน้า Landing สูง **38,894px** บน iPhone 13 (จอ 664px) = 58 หน้าจอ
    ⇒ คนที่อ่าน hero + เครื่องคำนวณ + positioning + roadmap ครบ (2,400px) ได้ `max_scroll` = **6%**
    ⇒ `engaged` ที่นิยามว่า "เลื่อน ≥ 50%" = ต้องเลื่อนผ่าน 19,000px ≈ ไม่มีวันมีใครถึง
  • ⚠️ ห้ามอ่าน `avg_scroll` ว่า "อ่านเนื้อหาไปกี่ %" — ให้ดู `sections` (วินาทีต่อบล็อก) แทน
    ซึ่งเพิ่งเริ่มเก็บได้จริงหลังแก้ GOTCHA ของ IntersectionObserver (ledger #25)
  • `max_scroll = 0` แปลว่า "ขยับน้อยกว่า ~190px" ไม่ใช่ "ไม่ขยับเลย"

GOTCHA #6 — แท็ก utm ตายกลางทาง ระหว่างลิงก์สั้น → บทความ → /start (ledger #24)
  • ลิงก์สั้นทุกตัวชี้ไป `/blog/<slug>` หรือ `/calc` = HTML ที่ Worker เรนเดอร์ **ไม่มี React**
    ⇒ ไม่มีแถวใน `landing_funnel` เลย · funnel เห็นคนก็ต่อเมื่อเขาเดินมาถึงหน้า Landing แล้ว
  • ปุ่มในบทความเคยเขียน `utm_source=blog` **ทับ** ที่มาจริง ⇒ เครดิตของ Facebook/TikTok หายที่ hop นั้น
  • ⚠️ คนที่มาจากบทความของเราเอง จะถูกจำแนกเป็น `ref_kind='direct'` เสมอ (referrer = โดเมนตัวเอง)
    ⇒ ตัวเลข "direct" ในรายงาน **ไม่ใช่** "พิมพ์ URL เข้ามาเอง"
  • กลไก: `src/lib/utmForward.ts` (`mergeUtm` — ที่มาแรกชนะสำหรับ source/medium · หน้าปัจจุบันชนะสำหรับ
    campaign/content) + `utmForwardScript()` ฝังท้ายทุกหน้า server-rendered (ต้องทำฝั่ง browser
    เพราะหน้าพวกนี้ cache 1 ชม. — ฝังฝั่ง server = คนถัดไปได้เครดิตของคนก่อน)
    · `attributionContract.test.ts` รันสคริปต์ตัวจริงใน jsdom + บังคับว่า JS กับ TS ใช้ชื่อคีย์เดียวกัน
  • 🔁 **แก้ 23 ส.ค. 2569** — เดิมเขียนว่า *"`landing_funnel` ยังไม่มีคอลัมน์ `utm_medium`"* → 🟢 **มีแล้ว**
    (ตรวจสด: `information_schema.columns` มี `utm_source/utm_medium/utm_campaign/utm_content` ครบ)
  • 🔴 **ปัญหาจริงอยู่คนละที่**: 80 ผู้เข้าชมตลอดกาล มี utm แค่ **2 session** (tiktok 1 · facebook/comment 1)
    ⇒ **78 คน = 97.5% ระบุแพลตฟอร์มไม่ได้** — ไม่ใช่เพราะระบบไม่เก็บ **แต่เพราะลิงก์ที่เราปล่อยออกไปไม่ได้ติดแท็ก**
    ⇒ คำถาม "แพลตฟอร์มไหนได้ผล" ตอบไม่ได้ทุกข้อ จนกว่าลิงก์ทุกตัวจะติด `utm_source`+`utm_medium`
```

## Key Source Files
```
src/App.tsx                    — root component, routing state, auto-trial logic
src/types.ts                   — TypeScript interfaces (AppData, Task, Agent, etc.)
src/data.ts                    — default data / task templates
src/lib/access.ts              — plan access control (canAccess, effectiveRank, PAGE_MIN_PLAN)
src/components/Sidebar.tsx     — navigation + plan badge + lock icons
src/components/UpgradeWall.tsx — locked page overlay
src/components/Billing.tsx     — subscription management UI
src/pages/AICompany.tsx        — บริษัท AI page (factory, agent tasks) · ชื่อ/เป้าหมาย = controlled draft (แก้บั๊กพิมพ์แล้วหาย)
src/lib/companyIdentity.ts     — CEO เสนอชื่อบริษัท (หลัก Corporate Identity) + โลโก้ SVG monogram โปรซีเจอรัล (pure/tested) · components/CompanyNamer.tsx (AI ออนไลน์ / rule-based ออฟไลน์) → บอร์ดเลือก → aiCompany.name+logoSvg
src/lib/opsMetrics.ts          — ออกแบบตัวชี้วัดผลการดำเนินงานจาก BMC + ประเภทธุรกิจ (รายวัน/สัปดาห์) + evaluatePerformance + CSV template/parse (pure/tested) · components/OpsDataPanel.tsx ในหน้า Factory → AppData.opsData.entries → ประเมินสมรรถนะ
src/lib/marketSizing.ts        — วิจัยตลาด + ประเมินขนาดตลาด TAM/SAM/SOM (top-down + ช่วง) + opportunityScore 5 ปัจจัย + cmoResearchPrompt (pure/tested) · components/MarketSizingPanel.tsx ในหน้า 'marketing' — CMO (a-cmo มณี) นำเสนอ · AI ผ่าน agent-run + Serper (useWebSearch) / rule-based fallback
src/pages/CaseStudies.tsx      — case studies (built-in CASES + data.caseStudies ที่แอดมินนำเข้า)
src/pages/AdminTabs/CaseStudyTab.tsx — Content Studio: นำเข้า Case (ฟอร์ม/JSON/AI สรุป) + ปุ่ม "💰 เสนอเป็น Skill" แปลงเคส→สินค้า Marketplace พร้อมประเมินราคาอัตโนมัติ
src/lib/skillValuation.ts      — suggestSkillFromCase() ประเมินหมวด/tier/ราคา/valueNote จากเคส (pure, tested)
src/pages/BoardRoom.tsx        — หน้า 'boardroom' ห้องบอร์ด: CEO เสนอวาระ → User อนุมัติ + สะสมทักษะบริหาร/การตลาด (lib/boardRoom.ts: AGENDA 5 DE gates + feature, skillLevels)
src/pages/Resources.tsx        — หน้า 'resources' บริหารทรัพยากร: รายการ+จำนวน · C-Level ดูแล/ขอเพิ่ม-ลด · CEO/บอร์ดอนุมัติ · AI จัดสรร (agent-run จริง + fallback heuristic)
src/lib/cfoAnalysis.ts         — CFO AI วิเคราะห์การเงิน "ธุรกิจตัวเอง" ของ SME จากตัวเลขจริง (d.finance): cfoMetrics(recurring/breakEvenGap/topExpense) + cfoFlags(ธงสุขภาพ) + cfoLocalAdvice(fallback offline) + cfoPrompt(ai-assist · ห้ามแต่งตัวเลข) · pure/tested · แสดงใน components/CfoAnalysis.tsx ใต้คลังเมือง (CompanyCity) — ต่อยอด cfoReport.ts (KPI report) เป็นชั้นให้คำแนะนำเชิงลงมือ
src/lib/resources.ts           — Resource/Request types + templates + applyApproval + parseAiAllocations (pure, tested)
src/lib/commentReply.ts        — ตอบคอมเมนต์เฟซบุ๊กด้วยตัวเลขจริงของผู้คอมเมนต์ (กลไก "จบในแพลตฟอร์ม")
                                 parseNumbers (รับ "50/30" · "ขาย 1,500 ทุน 900" · เลขไทย ๕๐/๓๐) → buildReply
                                 ⚠️ ช่อง 'comment' ห้ามมีลิงก์ (FB กดการมองเห็น) · ลิงก์อยู่ในช่อง 'dm' เท่านั้น
                                 คำนวณจาก pricingAnalysis ตัวเดียวกับหน้าเว็บ → ตัวเลขตรงกันเสมอ
                                 KEYWORD_OFFERS = โพสต์แบบ "คอมเมนต์คำเดียว" (ราคา/ทุน/ลูกค้า/ระบบ) ผูก SHORT_LINKS จริง
                                 UI: pages/AdminTabs/CommentReplyTab.tsx (แท็บ 💬 ตอบคอมเมนต์)
                                 ชุดโพสต์พร้อมใช้: docs/marketing/social/FB-LEAD-MAGNET-PACK.md
src/lib/productQuickCheck.ts   — "ตรวจสินค้าเร็ว" ประตูหน้าบน Landing: กรอกราคา/ต้นทุน → กำไร/จุดคุ้มทุนทันที
                                 ⚠️ ไม่เรียก AI โดยตั้งใจ (เร็ว ฟรี และแต่งตัวเลขไม่ได้) · AI = เฟส 2
                                 กันตัวเลขไม่มีแหล่งด้วย type: Insight มีแค่ calc(ต้องมี from)/question(ต้องมี why)/action
                                 — ไม่มีชนิด 'fact' ให้ใส่สถิติตลาดได้เลย · เทสต์มี banned-words guard
                                 verdictOf: กำไรสุทธิมาก่อนกำไรต่อหน่วยเสมอ (netLoss) กัน "ป้ายเขียวทั้งที่ขาดทุน"
                                 saveQuickDraft/readQuickDraft → App.migrate ยกเข้า finance = "ไม่ต้องกรอกซ้ำ"
                                 (ต่อยอด bizHint.ts · ร่างเก่า >30 วันทิ้ง · ชื่อสินค้าอยู่ localStorage ไม่ขึ้น DB)
                                 components/ProductQuickCheck.tsx วางสูงสุดบน Landing (นอก A/B holdout)
                                 GA4: quickcheck_submitted / quickcheck_topic_opened (← รู้ว่าคนกังวลเรื่องอะไร) / quickcheck_signup_click
src/lib/nextProblems.ts        — "เรื่องต้นทุนจบแล้ว — ยังเหลืออีก 7 เรื่องที่ทำให้ร้านไม่โต" (pure/tested)
                                 วางท้ายเครื่องคำนวณ **โดยตั้งใจ** — หน้า Landing มี 19 บล็อก แต่ 15 บล็อกท้ายหน้า
                                 มีคนเห็น **0 คน** (เวลาที่ทุกคนเคยใช้กับเนื้อหาเรารวมกัน = 86 วินาที)
                                 จุดเดียวที่มีหลักฐานว่าคนอยู่จริงคือท้ายเครื่องคำนวณ (อยู่ 10 วิ · hero ได้ 6 วิ)
                                 focusFor() ชี้เรื่องถัดไปจาก **ตัวเลขที่เขากรอกเอง** เท่านั้น · คืน null เมื่อข้อมูลไม่พอ (ห้ามเดา)
                                 nextProblemsFor() จัดลำดับใหม่เท่านั้น **ห้ามตัดเรื่องไหนทิ้ง** (skill beachhead-who-not-what)
                                 ทุกเรื่องต้องมีปลายทางจริงทั้ง SHORT_LINKS และ PageId · ลิงก์ติด utm_medium=quickcheck
                                 ⇒ GA/DB ตอบได้ว่า **pain ไหนของ SME ไทยแรงที่สุด** (event: nextproblem_click)
src/lib/pricingAnalysis.ts     — วิเคราะห์ราคา (ติดตั้งจาก skill `pricing-analysis` เข้าเป็นโค้ดจริง)
                                 แกน: จุดคุ้มทุนเมื่อเปลี่ยนราคา y = 1 − m/m′ (m = กำไรต่อหน่วย)
                                 ⇒ "ขึ้นราคา 10% เสียลูกค้าได้กี่ %" และ "ลดราคา 10% ต้องขายเพิ่มกี่ %"
                                 เป็นเลขคณิตแน่นอน ไม่ต้องมีข้อมูลตลาด · + costPlusSignal (จับ anti-pattern
                                 ตั้งราคาจากต้นทุน) + positionOf (ต้องมีราคาคู่แข่ง ≥2 เจ้าที่ผู้ใช้กรอกเอง)
                                 ใช้ Insight type เดียวกับ productQuickCheck → พ่นราคาตลาดที่ไม่มีแหล่งไม่ได้
                                 หัวข้อ "ตั้งราคา" บน Landing เรียกโมดูลนี้ทั้งก้อน (pure/tested 19 เทสต์)
src/lib/trialRoadmap.ts        — แผน 15 วันที่ผู้ใช้ได้ของจริงกลับไป (ใช้ทั้งบน Landing เป็นคำสัญญา
                                 และในแอปเป็นความคืบหน้า: nextStep/roadmapProgress) · เทสต์บังคับว่าทุกขั้น
                                 ชี้หน้าที่มีอยู่จริง ห้ามสัญญาสิ่งที่ยังไม่ได้สร้าง · components/TrialRoadmap.tsx
src/lib/processRegister.ts     — ทะเบียนกระบวนการ+ตัววัด (ขั้นที่ 1 ของ "SaaS แทนเอกสาร ISO" — docs/product/SAAS-AS-THE-SYSTEM.md)
                                 registerIssues/registerHealth บังคับสายโซ่: ตัววัดทุกตัวต้องมี whyFrom (มาจากความเสี่ยง/คุณค่าอะไร)
                                 ไม่งั้น blocker ที่ข้อ 9.1 · PROCESS_TEMPLATES + seedProcesses() วางโครงครอบคลุมข้อกำหนดครบทุกข้อ
                                 แต่ "ไม่เติมตัววัดให้โดยตั้งใจ" (KPI สำเร็จรูป = ตอบผู้ตรวจไม่ได้) · CSV/JSON export (ลูกค้าถือข้อมูลเอง)
                                 pure/tested (30 เทสต์ · มีเทสต์ยืนยันว่าโครงตั้งต้นครอบคลุมทุกข้อและไม่ซ้ำ ทั้ง 4 มาตรฐาน)
src/pages/ProcessRegister.tsx  — หน้า 'process' ทะเบียนกระบวนการ (free · nav ใต้ มาตรฐาน ISO) — แก้ inline + ชิปเลือกข้อกำหนด
                                 (ข้อที่กระบวนการอื่นถือแล้วจะจาง) + แถบสุขภาพ + รายการ "สิ่งที่ผู้ตรวจจะเจอ"
                                 · demoRegister() = "อาฮ่า 10 วินาที" โหมดพรีวิว (ไม่บันทึกลง AppData · save() ปิดตายตอน demo)
                                   จงใจใส่ตัววัดที่ไม่มี whyFrom 1 ตัว ให้เห็นระบบจับได้สด ๆ
src/lib/growthPdca.ts          — วงจร PDCA ของ "การเติบโต" (คนละวงจรกับ eqms.ts ที่เป็น PDCA ของคุณภาพ/ISO)
                                 growthPdca() คืน stuckAt = เฟสแรกที่ยังไม่ผ่าน · canAct = false เมื่อ Check ยังไม่ ok
                                 shippedPieces() นับ Do จาก "คนเข้าจริงต่อแคมเปญ" ไม่ใช่จำนวนโพสต์ที่เราบอกว่าโพสต์แล้ว
                                 bottleneckOf() ตอบ 'unknown' อย่างซื่อสัตย์เมื่อคนน้อยเกินฟันธง (MIN_FOR_RATE=100)
                                 REACH_FLOOR_PER_WEEK=100 — ต่ำกว่านี้คอขวดคือ "ไม่มีคนมา" ห้ามไปแก้หน้าเว็บ
                                 Tracker.receiving: true/false/**null(=ตรวจไม่ได้)** → blindSpots 🔴/🟡 (pure/tested 16 เทสต์)
src/lib/videoBrief.ts          — Brand Brief แปลงเป็น "บรีฟทำคลิป 1 ชิ้น" (pure/tested 24 เทสต์)
                                 **ประกอบจากของที่มีอยู่ ไม่เขียนซ้ำ**: brandBrief (ครึ่งหน้า) + commentReply.videoEnding (ครึ่งหลัง)
                                 สิ่งที่เติมคือชั้นกลางที่ยังไม่มี: CLIP_STRUCTURE 5 ช่วง · PROOF · VIDEO_DONT
                                 🔴 หน้าที่ของคลิป = ทำให้เขารู้ตัวว่า "ไม่รู้ตัวเลขของตัวเอง"
                                    **ไม่ใช่** อธิบายว่าผลิตภัณฑ์เราทำอะไรได้ (คนที่ยังไม่รู้จักเราไม่มีเหตุผลจะดู)
                                 ⚠️ PROOF.banned — เรายังไม่มีลูกค้าจ่ายจริง ⇒ ห้ามใช้รีวิว/จำนวนผู้ใช้/เคสความสำเร็จ
                                    ใช้แทนด้วย: โชว์เครื่องมือคำนวณ**สด ๆ** + เครดิต B.Training 20+ ปี + ตัวเลขที่ผู้ชมกรอกเอง
                                 `videoScriptPrompt()` = Brand Brief → PROMPT → AI (แผนภาพในรูปที่ใช้งานได้จริง)
                                 `checkVideoScript()` ตรวจสคริปต์ก่อนถ่าย (คำต้องห้าม · อ้างรีวิว · ขึ้นต้นด้วยทักทาย)
src/lib/brandBrief.ts          — Brand Brief เป็นโค้ด: "บริษัท · ปัญหา · ความต้องการ · ผลลัพธ์" ที่ต้องเข้าไปอยู่ใน prompt
                                 `brandBriefBlock({forPublicCopy})` → บล็อกบริบทแปะหน้า prompt (ใช้แล้วใน `growthAnalysis.growthPrompt`)
                                 `violatesBrand(text)` → ตรวจคำต้องห้ามก่อนปล่อยคอนเทนต์
                                 🔴 ช่องที่ brief ทั่วไปไม่มี = **HONEST_STATE** (ยังไม่มีลูกค้าจ่ายจริง · ผู้เข้าชมหลักสิบ)
                                    ⇒ กัน AI เขียนอ้างการยอมรับที่ยังไม่มี ซึ่งเป็นคำโกหกที่จับยากที่สุดเพราะฟังดูปกติ
                                 ห้ามเขียนคำโฆษณาใหม่ในไฟล์นี้ — ทุกข้อผูกกับแหล่งจริง (seoData/ctaContext/landingClaims)
                                 เทสต์เทียบทีละตัว ⇒ แก้ราคาในเว็บแล้วไม่แก้ brief = แดง · doc: docs/marketing/BRAND-BRIEF.md
src/lib/stageFit.ts            — "งานชิ้นนี้ถึงเวลาของมันหรือยัง" (skill `case-study-stage-fit` ในรูปโค้ด)
                                 stageOf() หาเฟสจากตัวเลขจริง: reach → convert → retain → scale (ข้ามไม่ได้)
                                 ใช้ REACH_FLOOR_PER_WEEK + MIN_FOR_RATE ตัวเดียวกับ growthPdca (ห้ามเขียนเลขซ้ำ)
                                 INITIATIVES = งานจริง 12 รายการ → คัดเป็น ✅ทำได้ตอนนี้ / ⏳ยังไม่ถึงเวลา / 🚫ห้ามทำ
                                 กฎที่เทสต์บังคับ: งานที่เลื่อน **ต้องมีตัวเลขปลดล็อก** (ห้ามเขียน "เมื่อโตกว่านี้")
                                 · งานที่ห้าม ต้องบอกว่าทำไม · ทุกงานต้องอยู่กองใดกองหนึ่ง ห้ามหาย
                                 ⚠️ ผลจริง 22 ส.ค. 2569: เฟส **reach** (19 คน/สัปดาห์ · สะสม 79 · จ่ายจริง **0 ราย**)
                                    ⇒ Video Orchestrator/CRM/lock-in = ยังไม่ถึงเวลา · แต่ "ทำคลิปด้วยมือ 5 คลิป" = ทำได้เลย
                                 components/StageFitPanel.tsx อยู่ใต้ GrowthPdcaPanel (PDCA บอกว่าค้างตรงไหน · แผงนี้บอกว่าทำอะไร)
                                 lib/payments.ts `payingCustomerCount()` นับ **ธุรกิจ** ที่จ่ายจริง (ตัด admin-free)
                                 คืน null = **ตรวจไม่ได้** ≠ 0 · UI fail-closed: ตรวจไม่ได้ = ไม่ปลดล็อกงานเฟสหลัง
src/lib/amplitude.ts           — sink ที่ 2 คู่กับ GA (funnel/retention/cohort + session replay)
                                 ⚠️ ต้องมี VITE_AMPLITUDE_KEY ใน GitHub Secrets **และ** ใน build step ของ
                                 cloudflare-deploy.yml ไม่งั้นเงียบสนิทโดยไม่มีใครรู้ (ledger #18) — `envContract.test.ts` เฝ้าอยู่
src/lib/resourceBridge.ts      — คำขอก้อนใหญ่→ห้องบอร์ด(+XP) + ทรัพยากรอนุมัติ→รายจ่าย finance อัตโนมัติ (pure, tested)
src/pages/CityLevelUp.tsx      — หน้า 'citylevelup' เมือง 3 มิติ Level Up (ใช้ lib/cityScape.ts)
src/lib/cityScape.ts           — เอนจินวาดเมืองไอโซเมตริก SVG + auto-detect เวลา/ฤดู (framework-agnostic)
src/pages/Pulse.tsx            — หน้า 'pulse' Pulse & A/B (opt-in, โปร่งใส) ใช้ lib/experiments.ts
src/lib/experiments.ts         — registry A/B + assign แบบ deterministic + pulse + aggregate/export
src/lib/tokenEconomics.ts      — เศรษฐศาสตร์ Token (source of truth): เพดาน token/แพ็ก + trial 15 วัน + free รายวันตาม engagement (คนดูนาน=มากกว่า) + ราคา top-up token · คิดต้นทุน worst-case (Sonnet 4.6 $3/$15) ให้กำไร ≥30% ทุกแพ็ก (pure, tested) · ใช้ร่วม client+DO
src/index.css                  — all styles (dark theme, CSS vars)
supabase/functions/            — 6 Edge Functions
supabase/migrations/           — 0001–0028 (สถานะ apply จริงยืนยันสดที่ docs/isms/NC-01-migration-verification.md — dev ตรวจแล้ว, prod ตรวจแยกด้วยสิทธิ์ prod)
public/CNAME                   — custom domain (ceoaithailand.org)
.github/workflows/deploy.yml   — GitHub Pages auto-deploy (legacy — production = Cloudflare Workers)
wrangler.jsonc                 — Cloudflare Workers config (production) + vars SEO (SUPABASE_URL/ANON_KEY/SITE_ORIGIN — public)
src/server.ts                  — Worker: /api/agent DO + /api/guest-ask (guest ลอง AI จริงไม่ต้องสมัคร) + SEO ฝั่ง server (/b/<slug>, /b, /blog, /sitemap.xml)
src/agent/CeoAiAgent.ts        — DO: AI ที่ปรึกษา (haiku) · guestAsk() = แก้ pain "คิดว่าต้องสมัครถึงใช้ AI" ให้ guest ลอง AI จริงก่อน cap 3/IP/วัน + เพดานรวม 400/วัน (fail-closed กันงบบาน · จองโควตาก่อนเรียก · ไม่เก็บประวัติข้าม guest) · client: lib/guestAi.ts + components/GuestAiTry.tsx บน Landing
src/lib/seoData.ts             — pure SEO builders (title/meta/canonical/JSON-LD/sitemap) ใช้ร่วม worker+client
src/lib/seo.ts                 — client applySeo() (idempotent) เรียกในหน้า public
src/lib/ambientAudio.ts        — เพลงบรรเลงโปรซีเจอรัล (Web Audio API ไม่มีไฟล์/ลิขสิทธิ์) ปรับโทนตามเวลาจริง (reuse detectTime) · opt-in ปิดเป็นค่าเริ่มต้น · ปุ่ม components/AmbientMusic.tsx ใน sidebar footer
docs/design/FIGMA-WORKFLOW.md   — ออกแบบใน Figma → เขียนเป็นโค้ด (ไฟล์ `uYYmkDgjSHTRjGAKCRMSU2`)
                                 กรอบเครื่อง 3 ขนาดพร้อมเส้น "ขอบที่มองเห็นได้จริง" + Variables สีที่ชื่อตรงกับโทเคนในโค้ด
                                 ⚠️ Figma ไม่ใช่ตัวตัดสินขอบจอ — ต้องวัดซ้ำในเบราว์เซอร์เสมอ (ต่างกัน ~114px)
docs/marketing/BRAND-BRIEF.md   — Brand Brief คืออะไร ใช้ยังไง ผูกกับแหล่งไหน (เนื้อ brief สร้างจาก `src/lib/brandBrief.ts`)
docs/marketing/BRAND-BRIEF-FORM.md — ฟอร์ม Brand Brief 8 ข้อของเอเจนซี **กรอกครบแล้ว** (22 ส.ค. 2569 · ตัวเลขดึงสดจาก production)
                                 🔴 **Brand Brief มีไว้ "ทำให้กลุ่มเป้าหมายรู้จักเรา"** — การที่ยังไม่มีใครรู้จัก
                                    = **เหตุผลที่ต้องมีบรีฟ** ไม่ใช่ข้อจำกัดของบรีฟ (เจ้าของค้านถูก 22 ส.ค. 2569)
                                    ⇒ ช่อง "ตัวตน/สาร" (ข้อ 1·3·4·6·8) กรอกครบได้ตั้งแต่วันแรก ไม่ต้องมีฐานลูกค้า
                                      มีแต่ช่อง "ค่าตั้งต้น KPI" (2.2·7) เท่านั้นที่ต้องมีข้อมูล — ห้ามเอามาปนกัน
                                 ⚠️ ข้อ 2 ตัด "เพิ่มยอดขาย" ออก — เฟสนี้งานคือทำให้รู้จัก ยอดขายยังไม่ใช่ตัววัดที่อ่านได้
                                 🔁 ข้อ 5 **แก้จุดยืนเรื่องแอดแล้ว** — เดิมเขียน "ตัดแอดทั้งหมด ฿0" ซึ่งเป็นเงื่อนไขที่กินตัวเอง
                                    (ห้ามยิงแอดจนกว่าคนรู้จักเยอะพอ · ทั้งที่แอดคือเครื่องมือทำให้คนรู้จัก)
                                    ตอนนี้: **แอด = เครื่องมือ "ซื้อคำตอบ" ไม่ใช่ "ซื้อยอดขาย"** — งบก้อนเล็กมีเพดาน
                                    ปลายทาง = เครื่องคำนวณ (ฟรี ไม่ต้องสมัคร) · วัดที่ **จำนวนคนกรอก** ไม่ใช่ยอดสมัคร
                                    ยังห้ามอยู่: ยิงแอดเพื่อ "เร่งยอดขาย/เร่งสมัคร" (ปลายทางยังพิสูจน์ไม่ได้)
                                 ⚠️ ข้อ 5.4 ตัด "รีวิวลูกค้า" ออก — ยังไม่มีลูกค้าจ่ายจริง ทำตอนนี้ = รีวิวปลอม
                                 🔴 5 ช่องที่ต้องให้เจ้าของกรอกเอง (URL โซเชียล · งบแอด · ระยะเวลา · Pilot ฿1,990 · ขอบเขตพื้นที่)
docs/marketing/                — แผนการตลาด/หาลูกค้า (SEO, FB group, LinkedIn, networking, market research)
```

## เมืองบริษัท (Company City) — เกมส์ SIM การเติบโต
```
หน้า 'city' (nav ใต้ องค์กร AI) — เมืองโตตามงานจริง (gamification สำหรับ Gen Z/มือใหม่)
src/lib/companyCity.ts  — cityStats(): อาคาร 13 หลังจากข้อมูลจริง (agents/tasks/skills/…+การเงิน)
src/lib/finance.ts      — รายรับ/รายจ่าย (กรอกเอง d.finance + ดึงค่าแพ็กเกจ auto) → financeSummary()
src/lib/rewards.ts      — REWARDS ปลดตามการเงิน+ระดับ → discount(คูปอง)/featured/unlock (claimReward)
src/lib/streak.ts       — bumpStreak() ต่อเนื่องรายวัน (เรียกใน updateData ของ App.tsx)
components/CityTreasury.tsx (คลังเมือง+ledger) · CityRewards.tsx (รับรางวัล)
AppData: finance, claimedRewards, coupon{pct}, featuredVoucherDays, cityUnlocks, streak, proMode
รางวัลใช้จริง: คูปอง→หน้า Billing · featured→ปุ่มใน MyStorefront (setFeatured) · proMode ซ่อนเกมบน Dashboard
GA4 events: city_viewed, finance_entry_added, reward_claimed, streak_extended, featured_voucher_redeemed
หน้า 'citytrade' — การค้าระหว่างเมือง: src/lib/interCityTrade.ts (CEO จับคู่/CMO ให้คะแนน rule-based
จาก marketplace.partners) → tradeReport() บอร์ดดู · closeTrade() = Deal(closed)+finance entry
(ขาย→รายได้หักฟี 3% / ซื้อ→รายจ่าย) ป้อนคลังเมือง · รับจ่ายจริง gate PAYMENT.xenditLive (รอ KYC)
หน้า 'citylevelup' — เมืองบริษัทแบบไอโซเมตริก 3 มิติ (Level Up):
  src/lib/cityScape.ts renderCityscape(svg,time,season) วาด SVG โปรซีเจอรัล (deterministic seed)
  โหมดอัตโนมัติตามเวลาจริง: detectTime(นาฬิกาเครื่อง เช็คทุก 1 นาที) + detectSeason(เดือน ภูมิอากาศไทย
  มี.ค.–พ.ค.ร้อน/มิ.ย.–ต.ค.ฝน/ก.พ.ใบไม้ผลิ/พ.ย.–ม.ค.หนาว) · เงาตามทิศแดด + อากาศ (ฝน/หิมะ/กลีบ/เมฆ)
  กดปุ่มเอง=ปิดออโต้ · แถบ XP+การ์ดระดับ ผูกข้อมูลจริง (cityStats + COMPANY_LEVELS) ไม่ hardcode
```

## Pulse & A/B — วัด "อะไรทำให้อยากใช้งานต่อ" แบบโปร่งใส (opt-in)
```
หน้า 'pulse' (nav ใต้ องค์กร AI) — จริยธรรมมาก่อน (ตรงข้าม dark pattern):
  ยินยอมก่อน (default ปิด) · ไม่ระบุตัวตน (uid สุ่ม) · ผู้ใช้เห็นกลุ่ม A/B ตัวเอง + ข้อมูลตัวเอง · ปิด/ลบได้
src/lib/experiments.ts:
  EXPERIMENTS[] (แต่ละอันมี ≥2 variant ซื่อสัตย์ ไม่ scarcity ปลอม) · variantFor() assign แบบ djb2 hash
  recordPulse()/pulseSummary() (😕1/🙂2/😄3 รายวัน) · aggregateExperiments() รวมข้ามผู้ใช้ (ฝั่ง Admin)
  expReportCsv()/expReportTsv() export ผล A/B · Experiment.goto = หน้าปลายทางปุ่ม "อยากทำต่อ"
  recordActiveDay() (เรียกใน updateData เมื่อ enabled) เก็บ activeDays[] → retentionCohorts():
    แบ่ง cohort ตาม pulse เฉลี่ย (สูง≥2.5/กลาง/ต่ำ<2) เทียบ retention 7/14 วัน + เส้น W0–W3 รายสัปดาห์
    (สัปดาห์ยังมาไม่ถึง=null ไม่นับ churn) → ตอบ "pulse สูงกลับมาใช้ต่อจริงไหม"
src/pages/Pulse.tsx: consent gate + pulse รายวัน + การ์ดทุกการทดลอง + สถิติตัวเอง (streak/เฉลี่ย/7วัน)
AppData.experiments: {enabled,seenConsent,uid,assignments,pulses[],activations[]} (migrate default ใน App.tsx)
Admin (แท็บเวิร์กสเปซ): loadOps → aggregateExperiments → เทียบ activationRate + pulseAvg ต่อ variant + ผู้ชนะ
GA4 events: pulse_consent, experiment_exposed, pulse_submitted, pulse_activation, pulse_data_cleared
เทสต์: src/lib/__tests__/experiments.test.ts
```

## Marketplace SEO (server-side)
```
Worker (src/server.ts) intercept GET /b/<slug>, /b, /sitemap.xml ก่อน fallback ASSETS →
อ่าน public.storefronts ผ่าน Supabase REST (anon key = public) → HTMLRewriter inject
title/meta/canonical/OG + JSON-LD (LocalBusiness/BreadcrumbList/ItemList) ลง index.html
= Google index ได้โดยไม่รอ JS. client (src/lib/seo.ts applySeo) inject ซ้ำฝั่ง browser ให้ parity.
seoData.ts = source of truth เดียว (escape กัน XSS). Deploy: merge → Cloudflare auto-deploy (ไม่ต้อง manual).
⚠️ กัน thin page: MIN_STOREFRONTS_TO_INDEX=5 — ร้านน้อยกว่านี้ /b จะ noindex,follow + ไม่ถูกลิสต์ใน sitemap
   (ทั้ง server + client applySeo ต้องพูดตรงกัน · ตรวจ 16 ส.ค. 2569: ร้านจริง = 0)
🟢 **Google Search Console ยืนยันแล้ว** (เจ้าของยืนยันด้วยภาพหน้าจอ 22 ส.ค. 2569 · เก็บข้อมูลตั้งแต่ ~20 ก.ค.)
   สถานะ: **จัดทำดัชนีแล้ว 12 หน้า** · ไม่ได้จัดทำดัชนี 21 หน้า (4 เหตุผล)
   ⚠️ 10 หน้าที่ขึ้นว่า "หน้าเว็บสำรองที่มีแท็กตามรูปแบบบัญญัติที่ถูกต้อง" = **URL ทับสแลช `/blog/x/`**
      ไม่ใช่ error — server.ts redirect 301 ไป `/blog/x` + canonical ตรงกัน = **ระบบทำงานถูกแล้ว**
   🔴 **ยังไม่รู้ 3 เหตุผลที่เหลือ (11 หน้า)** — ต้องเปิด GSC ดู (ผู้ช่วยเข้าไม่ได้ ต้องให้เจ้าของส่งมา)
   ⚠️ **บทเรียน ledger #39**: ห้ามเขียนว่างานที่ "ตรวจเองไม่ได้" เป็น "ยังไม่ได้ทำ" — ให้เขียนว่า **ตรวจไม่ได้ ต้องถาม**
   ตั้งค่า GOOGLE_SITE_VERIFICATION ใน Cloudflare vars → ขั้นตอนเต็มที่ docs/marketing/SEARCH-CONSOLE-SETUP.md
```

## Plan / Access Control
```typescript
// src/lib/access.ts
PAGE_MIN_PLAN = {
  trade: 'starter',
  aisearch: 'growth', market: 'growth', team: 'growth',
  iso9001: 'growth', analytics: 'growth', sipoc: 'growth',
  admin: 'scale',
  // factory = FREE (part of AI Company feature)
}
Plans: free(0) → starter(1) ฿790/mo → growth(2) ฿1,490/mo → scale(3) ฿5,900/mo
Trial: 15 วัน auto-start เมื่อ login ครั้งแรก
Admin (support@b-tctraining.com): ใช้ Scale ฟรีเสมอ — App.tsx เรียก setAdminFullAccess(isAdminEmail(email))
  → effectiveRank/isExpired/planLabel bypass (access.ts). ระบบ admin = app_admins table + is_app_admin() (0005)
```

### รอบบิลรายเดือน + PLG payment (ยืนยันโดย User ก.ค. 2569)
```
นโยบาย "เตือนล่วงหน้า + ผ่อนผัน": จ่ายเอง (PromptPay ไม่มี auto-charge) → autoRenew=false เสมอ (Billing.tsx)
  billing-cron (daily 02:00 UTC) — automate ผ่าน cron ล้วน ไม่พึ่ง payment gateway:
    • ADVANCE_DAYS=3: ก่อนครบกำหนด → อีเมล "🔔 ใกล้ครบกำหนด อีก N วัน" ครั้งเดียว/รอบ (sub.reminderSentFor กันซ้ำ)
    • ครบกำหนด → past_due + อีเมล "ครบกำหนดต่ออายุ" · GRACE_DAYS=7 (access.ts: active/past_due ใช้แพ็กเดิมต่อได้)
    • พ้น grace → downgrade free (ถ้าเตือนล่วงหน้าแล้วไม่ต่อ = คัดกรอง 'benefit ไม่พอ' โดยตรง ไม่ใช่หลุดเพราะลืม)
  ⚠️ billing-cron ต้อง deploy มือ: supabase functions deploy billing-cron
PLG (ไม่มี admin เป็น gate): อัปสลิปในแอป → เปิดแพ็ก 'ทันที' (Billing.activateFromSlip) ไม่รอ admin
  payment_submissions row ยัง 'pending' = คิว 'ตรวจย้อนหลัง' (PaymentsTab) ไม่ใช่คิวอนุมัติ
  admin ✅ยืนยันถูกต้อง=ปิดรายการ / 🚫ตีกลับ=rejected → client เจ้าของ ws ถอนแพ็กเอง (revokedPaymentIds)
  appliedPaymentIds กันเปิดซ้ำ · Stripe webhook (stripe-webhook) = ทาง PLG อัตโนมัติเต็ม (รอ KYC ผ่าน)
```

### ตรวจสลิปกับธนาคารจริง (SlipOK) — ปิดช่องโหว่ "อัปรูปมั่วก็เปิดฟรี" (LIVE ก.ค. 2569)
```
ปัญหาเดิม: activateFromSlip เปิดแพ็กฝั่ง client (เชื่อรูป + เขียน plan เองได้) = ช่องโหว่
แก้: ย้ายการตัดสิน+เปิดแพ็กไป server ผ่าน SlipOK (มาตรฐานตรวจสลิป SME ไทย ตรวจกับ record ธนาคารจริง)
  supabase/functions/verify-slip — verify_jwt=true + membership check + ราคา server-side
    → เรียก SlipOK (POST api.slipok.com/api/line/apikey/<branch>, header x-authorization, files+log:true)
    → ตรวจ: ยอด>=ราคาแพ็ก · บัญชีผู้รับ (SlipOK คุมเองด้วย err 1014 เพราะบัญชีผูกกับสาขา) · กันสลิปซ้ำ (transRef unique + err 1012)
    → ผ่านครบ เขียน plan ด้วย service-role (mirror activateFromSlip) + payment_submissions.approved
  migration 0034: payment_submissions + trans_ref (unique กันซ้ำ), sender, verified_at, verify_method
  config PAYMENT.slipOkLive=true → uploadSlip เรียก verify-slip; ปิด client auto-activate safety-net (Billing.tsx)
    (slipOkLive=false = โหมดเดิม เปิดทันทีเชื่อผู้ใช้) · src/lib/payments.ts: verifySlip()+slipReasonText()
  error map ครบ 16 codes: แยก "ปัญหาลูกค้า" (ยอด/ผู้รับ/ซ้ำ/รูป) จาก "ปัญหาร้าน" (1000-1004/1015=config/quota
    → "การโอนของคุณยังอยู่ ทีมงานจะเปิดแพ็กให้" ไม่โทษลูกค้า + console.error log)
─ ค่าจริง (production waigsnxhrlwtiotspaim) ─
  Supabase secret: SLIPOK_API_KEY, SLIPOK_BRANCH_ID=72189  (ตั้งใน Edge Functions→Secrets ของ prod เท่านั้น)
  บัญชี K BIZ 009-8-92560-0 (0098925600) เชื่อมกับสาขา SlipOK #72189 → SlipOK ตรวจผู้รับให้ในตัว
  โควตา 100 ครั้ง/เดือน (ถึง 27 ส.ค. 2026) — 1 การจ่าย = 1 check · quota endpoint ไม่กินโควตา
⚠️ GOTCHA สำคัญ (เสียเวลา debug เยอะ):
  • API Key จริง = ค่าที่ขึ้นต้น "SLIPOKWL…" (สั้น ~13 ตัว) — หาในหน้า API/การ์ด API ของสาขา
  • ❌ ห้ามใช้ค่าใต้ "เลขอ้างอิงการแจ้งเตือน" (slipok-xxxx-xxxx…43 ตัว) = เลขแจ้งเตือน LINE คนละตัว → ขึ้น 1002
  • branch id + API key ต้องมาจากสาขาเดียวกัน · สร้างสาขาใหม่ = key เปลี่ยนด้วย
  • ตั้ง secret ต้องอยู่ project prod (waigsnxhrlwtiotspaim) ไม่ใช่ dev (oudykxmtrnjeskglaluh)
  • เปลี่ยน secret แล้ว redeploy ฟังก์ชันด้วย (warm instance ถือ env เก่า)
```

## Admin Operating Summary (สรุปผลการดำเนินงานของ User)
```
หน้า admin แท็บ "เวิร์กสเปซ": ปุ่ม "📊 โหลดสรุปผลการดำเนินงาน" → wsLoad ทุก ws (RLS is_app_admin เห็นหมด)
src/lib/adminOps.ts: workspaceOps(d) รวม revenue/expense/net + tasksDone/dealsClosed/agents/cityTier/streak
  (ใช้ financeSummary + cityStats) · opsTotals() KPI รวม · opsCsv()/opsTsv() export (CSV ดาวน์โหลด / TSV วางลง Google Sheets)
Google Sheets ของ User (เชื่อมบัญชีเอง) = Phase 2b — โค้ดเสร็จแล้ว (sheets-oauth + sheets-sync +
  src/lib/sheets.ts + INTEGRATIONS flag ใน config.ts) gate ด้วย INTEGRATIONS.sheetsLive
  รอ Board: สร้าง OAuth Client ใน Google Cloud + ตั้ง GOOGLE_CLIENT_ID/SECRET + deploy 2 ฟังก์ชัน (PowerShell)
  callback = /oauth/google (App.tsx handleSheetsCallback) · ดู supabase/README.md
```

## Sidebar Pages (nav labels)
`Dashboard`, `บริษัท AI`, `ห้องบอร์ด`, `ทรัพยากร`, `เมืองบริษัท`, `เมือง · Level Up`, `Pulse & A/B`, `การค้าระหว่างเมือง`,
`Marketplace`, `หน้าร้านของฉัน`, `ซื้อขาย B2B (RFQ)`,
`ทีม / สมาชิก`, `โรงงานอัจฉริยะ`, `แพ็กเกจ & ชำระเงิน`, `SaaS Analytics`,
`ผู้ดูแลระบบ` (admin email เท่านั้น), `ISO 9001:2015 QMS`, `ทะเบียนกระบวนการ + ตัววัด`, `AI Research`, `Case Studies`
⚠️ กลุ่ม "มาตรฐาน ISO" ซ่อนในโหมดมือใหม่ (Sidebar `ADVANCED_PAGES` มี `iso9001`) — เห็นเมื่อ `ceo_ai_beginner='0'`

เครื่องมือ (sub-menu ใต้ `บริษัท AI`): `Journey Map`, `Conversion Funnel`, `ROI Calculator`,
`Personas`, `Content Plan`, `Priority Actions`, `Business Model · MIT24`, `Product Roadmap`,
`กลยุทธ์การตลาด`, `VRIO Analysis`, `SIPOC Process`

### Onboarding "เข้าง่าย + ลึกได้" (คัดคนตั้งใจด้วยการลงมือ+จ่าย ไม่ใช่ UI ยาก)
```
ผู้ใช้ใหม่ (onboardGoal ยังไม่เลือก + visitedPages ≤ 1) → components/GoalChooser.tsx
  ถาม "วันนี้อยากทำอะไร?" 3 การ์ด (โฟกัสวัตถุประสงค์จริง = สร้าง & ทำธุรกิจ ไม่ใช่ compliance):
    สร้างบริษัท AI→aicompany · เปิดร้าน&ขายของ→storefront · เริ่มจากไอเดีย(validate)→bmc
  (+ skip "ดูภาพรวมก่อน"→onboardGoal='explore') → บันทึก AppData.onboardGoal + พาไปหน้านั้นทันที
  ⚠️ PDPA/ISO = ฟีเจอร์เสริม (หมวด Compliance) ไม่ใช่พระเอก — CEO AI Thailand ≠ เครื่องมือ compliance
     (นั่นเป็น domain ที่ปรึกษาของ B.Training · ดู docs/marketing/BRAND-ARCHITECTURE.md)
Sidebar focus mode: onboardGoal set + !focusDismissed → โชว์เฉพาะหน้าเป้าหมาย + related + Billing/Dashboard
  + ปุ่ม "🔓 ปลดล็อกเมนูทั้งหมด" (→ focusDismissed=true) · FOCUS map ใน Sidebar.tsx
OnboardingTour gate: โชว์เฉพาะ explore หรือผู้ใช้เดิม (ผู้เลือกเป้าหมายไม่เจอทัวร์ = ไม่ชนกัน) — App.tsx showTour
GA4: goal_chooser_shown, goal_chosen{goal}, goal_skip · AppData: onboardGoal, focusDismissed
```

Public routes (ไม่ต้อง login): `/start` (viral landing), `/b`, `/b/<slug>` (หน้าร้านสาธารณะ)
Command reference: ดู `COMMAND.md`

## Supabase Schema
```
public.app_state          — user data (legacy, 1 row per user)
public.workspaces         — workspace per company
public.workspace_members  — members + roles (owner/admin/member)
public.workspace_state    — AppData JSON per workspace (main store)
public.app_admins         — system admins (support@b-tctraining.com)
public.marketplace_skills — skill ที่ admin วางขาย (0006)
public.skill_purchases    — บันทึกการซื้อ skill + pay_method (0007)
public.storefronts        — หน้าร้านสาธารณะ slug + vp (0009, 0011)
public.rfqs               — ใบขอเสนอราคา B2B; seller_slug NULL = ประกาศงานกลาง (0010, 0011)
public.orders             — ออเดอร์ + ค่าธรรมเนียม 3% (0010)
public.skill_auctions     — ประมูล skill แบบ English Auction (0012)
public.skill_bids         — บิดประมูล โปร่งใสเห็นกันหมด (0012)
public.workspace_integrations — credential ของ integration ที่ User เชื่อมเอง (LINE/Sheets) RLS per-workspace, revoke anon; ไม่อยู่ใน workspace_state (กัน secret รั่ว) (0020)
public.ai_usage           — ตัวนับ AI calls ต่อ (bucket=ws/user/guest-IP, เดือน) บังคับ quota ฝั่ง server (0035) · RLS ปิดหมด เข้าผ่าน rpc bump_ai_usage/get_ai_usage (SECURITY DEFINER) · guest cap 25/เดือน/IP · flag ENFORCE_AI_QUOTA (default off, fail-open) wire ใน ai-assist/ai-plan/agent-run ผ่าน _shared/quota.ts · plan อ่านจาก workspace_plan mirror (trigger sync เฉพาะ role=service_role กัน spoof)
public.client_errors (0058) — error ที่ผู้ใช้เจอจริงบนเบราว์เซอร์ (message/stack/path/ua · ไม่เก็บ IP/user id โดยตั้งใจ)
  ทำไม: GA4 บอกได้แค่ "มี error กี่ครั้ง" · ตัวข้อความอยู่ใน Cloudflare Workers Logs ที่เก็บไม่กี่วัน → ตอบไม่ได้ว่าพังเพราะอะไร
  เส้นทาง: ErrorBoundary/global handler → `errorReport.reportError` → beacon `/api/client-error` → worker `saveClientError`
           → rpc `track_client_error` (anon · กันถล่มด้วยเพดาน 500 แถว/ชม.) · อ่านผ่าน `client_errors_agg` (guard is_app_admin)
  UI: `components/ClientErrorsPanel.tsx` ในแท็บเวิร์กสเปซ (GrowthDashboard) · logic `lib/clientErrors.ts` (pure/tested)
  ⚠️ chunk error ครั้งแรก **ไม่ถูกรายงาน** — ErrorBoundary reload แล้ว `return` ออกก่อน (เทสต์ล็อกไว้แล้ว)
     ⇒ `react.ErrorBoundary` ใน GA/ตารางนี้ = บั๊กจริง ไม่ใช่ผลข้างเคียงของการ deploy (เคยตีความผิด — LESSONS-LEDGER #10)
public.quickcheck_submissions (0056) — เก็บสิ่งที่ผู้เยี่ยมชมกรอกใน "ตรวจสินค้าเร็ว" บน Landing (first-party · ไม่มี PII)
  เก็บ: biz(dropdown)/price/cost/units/fixed_cost/verdict/topics[]/reached_cta · ❌ ไม่เก็บชื่อสินค้าที่ผู้ใช้พิมพ์
  (free text อาจมีชื่อร้าน/เบอร์ — อยู่ localStorage เครื่องผู้ใช้เพื่อยกเข้าแอปตอนสมัครเท่านั้น · มีเทสต์บังคับ)
  RLS ปิด + revoke grant anon/authenticated · เข้าผ่าน rpc track_quickcheck (anon) / quickcheck_agg (admin-guarded)
  session = เดียวกับ landing_funnel (join ได้) · แผงในหน้า admin: GrowthDashboard "ตรวจสินค้าเร็ว"
  ⭐ by_topic = ตอบว่าเจ้าของธุรกิจกังวลเรื่องอะไรจริง (ต้อง >=30 คนกดหัวข้อถึงเชื่ออันดับได้)
public.landing_funnel     — first-party visitor funnel (PDPA-safe · 0051): 1 แถว/ผู้เข้าชม (session uuid สุ่มฝั่ง client) เก็บ seg/ref_kind/max_scroll/max_dwell/reached_cta/reached_signup · RLS ปิด เข้าผ่าน rpc track_landing (anon, upsert monotonic) / landing_funnel_agg (admin-guarded) · ไม่เก็บ PII/cursor path · แสดงในแผง GrowthDashboard "Landing Funnel" (lib/landingFunnel.ts) · A/B holdout (0054): คอลัมน์ ab (show/control) assign deterministic ฝั่ง client จาก session (lib/landingAb.ts) → วัดว่า "2 ส่วนใหม่ (GuestAiTry+WhyTrustAi) ช่วย signup จริงไหม" · agg คืน by_ab (total/signup/cta ต่อกลุ่ม) → landingAbVerdict แสดงใน GrowthDashboard · LandingPage gate 2 ส่วนด้วย showNewSections(currentLandingVariant())
public.ai_token_quota (0052) — โมเดลโควตา AI แบบ "token" (แทน "จำนวน call") ship dark ผ่าน secret ENFORCE_AI_TOKENS=true (คู่ ENFORCE_AI_QUOTA) · ai_usage.tokens + ai_topup.tokens (คอลัมน์เพิ่ม) · rpc check_ai_tokens (gate ก่อนเรียก · authed รายเดือน) + record_ai_tokens (บันทึก in+out จริงหลังตอบ) + get_ai_tokens (มิเตอร์ UI) + grant_ai_topup_tokens (admin/service) · เพดาน ai_token_quota_for: scale 12M/growth 3M/starter 1.5M/free-trial 400K · guest daily-free token = Cloudflare DO (CeoAiAgent) แยก ต่อ IP/วัน tier ตาม engagement (FREE_DAILY_TOKENS cold 20K/warm 40K/hot 70K) · edge functions (ai-assist/ai-plan/agent-run) wire ผ่าน _shared/quota.ts (enforceAiTokens+recordAiTokens · fail-open) · client มิเตอร์/ซื้อ token gate ด้วย config.ts TOKENS.live (ต้องเปิดพร้อม secret ฝั่ง server) · เพดาน/ราคา = src/lib/tokenEconomics.ts (margin ≥30%)
public.ai_topup_request (0053) — คิว top-up รองรับแพ็ก token (คอลัมน์ tokens + credits nullable) · rpc topup_tokens_for_pack (จำนวน server-side จาก pack_id) + approve_token_topup_request (admin เปิด token) · Billing (ซื้อ PromptPay+แจ้งโอน) + PaymentsTab (admin เปิด token)
public.ai_topup           — Top-up packs: credits AI เพิ่มต่อ workspace/เดือน (0036) · rpc grant_ai_topup (admin/service_role เท่านั้น) · bump/get_ai_usage รวม credits เข้า quota · แพ็ก src/lib/topup.ts (+500฿490/+1000฿990/+3000฿2900 · margin>20% แม้ worst-case) · UI: Billing (ซื้อ PromptPay) + PaymentsTab (admin เปิด credits)
```

## Edge Functions
| Function | JWT | Purpose |
|---|---|---|
| ai-assist | ✅ | AI แนะนำทุกหน้า (Claude API) |
| ai-plan | ✅ | CEO วางแผน + มอบงาน |
| agent-run | ✅ | รันเอเจนต์ + Serper.dev (Google Search) |
| generate-badge | ❌ | ISO badge PNG (public GET) |
| billing-cron | ❌ | ต่ออายุ/downgrade อัตโนมัติ (deployed prod v30) |
| verify-slip | ✅ | ตรวจสลิปกับธนาคารจริงผ่าน SlipOK → เปิดแพ็ก server-side (deployed prod · LIVE) |
| promptpay-webhook | ❌ | รับ webhook จาก payment gateway |
| hubspot-sync | ❌ | ซิงก์ platform_leads → HubSpot CRM (contacts upsert by email · cron · code-ready ยังไม่ deploy — รอ HUBSPOT_TOKEN) |

### Marketing connectors / analytics sinks
```
Amplitude (product analytics: funnel/retention/cohort + Session Replay) — src/lib/amplitude.ts
  ส่ง event ชุดเดียวกับ GA ผ่าน track() (analytics.ts) เข้า Amplitude Browser SDK + plugin-session-replay-browser
  (อัดเมาส์/คลิก/สโครล ดูว่าคนค้าง/ลังเลตรงไหน) · SDK โหลดแบบ dynamic import = ไม่บวมบันเดิลหลักเมื่อไม่มีคีย์
  gate ด้วย VITE_AMPLITUDE_KEY (public client key เหมือน GA id — ไม่มี = inert สนิท) · Session Replay mask
  ระดับ 'medium' = ปิดบังทุก input (อีเมล/ชื่อ/เบอร์) อัตโนมัติ (PDPA) · sampleRate ปรับผ่าน VITE_AMPLITUDE_REPLAY_SR
  (default 1) · identifyAmplitudeUser(uid) ผูกตอน login / resetAmplitudeUser() ตอน logout (App.tsx) ·
  tab_open ยิงตอนสลับหน้า (feature funnel) · ควร gate ด้วย consent เหมือน GA/Pixel ที่จุดเรียก track()
  ⚠️ deps เพิ่ม nanoid override ^3.3.17 (rrweb ดึง nanoid <3.3.17 = high vuln → CI dependency-audit fail ถ้าไม่ override)
HubSpot (CRM + marketing automation) — supabase/functions/hubspot-sync (cron pattern เดียวกับ lead-nurture)
  upsert lead อีเมล→contact · standard properties เท่านั้น (custom ceo_ai_* uncomment เมื่อสร้าง property แล้ว)
  Secret: HUBSPOT_TOKEN (Private App · crm.objects.contacts.write) + CRON_SECRET · deploy: supabase functions deploy hubspot-sync --no-verify-jwt
Connectors ที่ org ต่อไว้ (ผ่าน claude.ai) ใช้ผ่าน MCP: Figma/Miro/Stripe/GCal/GDrive/Gmail/Cloudflare (พร้อม)
  · Amplitude/HubSpot/Notion/Slack (ต่อแล้วแต่ต้องเปิด enabledInChat ก่อนผมเรียกได้)
```

### agent-run — Serper.dev Integration
```typescript
// POST https://google.serper.dev/search
// Header: X-API-KEY, Content-Type: application/json
// Body: { q, gl: 'th', hl: 'th', num: 5 }
// Response: data.organic[].{ title, link, snippet }
const SERPER_KEY = Deno.env.get('SERPER_API_KEY') ?? '';
```

## Secrets / Environment Map (R11)
```
┌─ CEO AI Thailand (production หลัก) ──────────────────────────────
│ Supabase project  : waigsnxhrlwtiotspaim (Pro · prod จริง — เดิม rsjbqmnvocvtveelselj = backup ไม่ใช่ prod)
│ GitHub Actions    : VITE_SUPABASE_URL ✅, VITE_SUPABASE_ANON_KEY ✅ (ใช้โดย deploy.yml legacy)
│ Cloudflare Worker : ANTHROPIC_API_KEY (vars ใน wrangler/dashboard — ใช้โดย CeoAiAgent DO)
│ Supabase Fn       : ANTHROPIC_API_KEY ✅, CRON_SECRET ✅, SERPER_API_KEY ✅, RESEND_API_KEY ✅
│                     SLIPOK_API_KEY ✅ (ขึ้นต้น SLIPOKWL…), SLIPOK_BRANCH_ID ✅ =72189 (ตรวจสลิป verify-slip)
│ Pending           : WEBHOOK_SECRET (ตั้งพร้อม payment gateway)
├─ TIS Automate (แยก) ─────────────────────────────────────────────
│ Supabase project  : galtbbkcddugnsfkgyqm — ไม่มี secret ฝั่ง client (publishable key ฝังได้)
├─ Dev/local ──────────────────────────────────────────────────────
│ ไม่มี .env — local mode ใช้ localStorage · Vercel PR preview build โดยไม่มี VITE_SUPABASE_*
└──────────────────────────────────────────────────────────────────
กติกา: ห้ามใช้ secret ข้ามกล่อง · ห้าม commit .env · anon/publishable key = public โดยดีไซน์
```

## Dev Commands
```bash
npm install          # install deps
npm run dev          # dev server → http://localhost:5173
npm run typecheck    # ⚠️ ตรวจ "ทั้งสองฝั่ง": tsc -b (แอป) + tsconfig.worker.json (server.ts/agent)
                     #    tsc --noEmit ที่รากเป็น no-op · และ tsconfig.app.json exclude server.ts ไว้
                     #    → ก่อน 17 ส.ค. 2569 โค้ด worker ไม่ถูกตรวจชนิดข้อมูลเลย (LESSONS-LEDGER #13)
npm run build        # production build → dist/ (รวม typecheck ทั้งสองฝั่งแล้ว)
npm run preview      # preview dist/ locally

# Screenshot (requires dev server running)
node .claude/skills/run-ceo-ai-thailand/driver.mjs --out /tmp/shot.png
node .claude/skills/run-ceo-ai-thailand/driver.mjs --out /tmp/shot.png --nav "บริษัท AI"
```

## Deploy Flow
```
Production = Cloudflare Workers (worker ceo-ai-thailand ผูก custom domain ceoaithailand.org)
🔴 GOTCHA ร้ายแรงที่สุดที่เคยเจอ (17 ส.ค. 2569) — `run_worker_first` ใน wrangler.jsonc ห้ามลบ
  Cloudflare เสิร์ฟ static asset ก่อนเสมอ และตั้งแต่ compatibility_date >= 2025-04-01
  flag `assets_navigation_prefers_asset_serving` เปิดเอง → navigation request (Sec-Fetch-Mode: navigate)
  ที่ไม่ตรงไฟล์ไหน จะได้ index.html 200 **โดยไม่เรียก Worker เลย**
  ⇒ ลิงก์สั้น /ราคา /ทุน /ลูกค้า ไม่ redirect · SEO ฝั่ง server ของ /start /sale /shop /legal /b/<slug>
     ไม่ทำงาน · ทั้งที่โค้ด+เทสต์+`wrangler deploy --dry-run` ผ่านหมด (ทั้งสามตรวจแค่ว่าโค้ดถูก
     ไม่มีอันไหนตรวจว่าแพลตฟอร์ม "เรียก" โค้ดนั้นจริงไหม)
  กลไก: `src/lib/__tests__/workerRouting.test.ts` อ่าน wrangler.jsonc จริง + จำลอง matcher ของ Cloudflare
     บังคับว่าทุกเส้นทางของ server.ts (รวมลิงก์สั้นทุกตัวทั้งไทย/percent-encoded) ต้องถึง Worker
  ⚠️ /api/* ไม่โดนผลกระทบ (POST/fetch ไม่ใช่ navigation) — จึงหลอกให้คิดว่า Worker ทำงานปกติ
AUTO-DEPLOY: push/merge เข้า main → .github/workflows/cloudflare-deploy.yml → wrangler deploy
  ต้องมี GitHub secrets: CLOUDFLARE_API_TOKEN (Workers Scripts:Edit + Zone Workers Routes:Edit
    + DNS:Edit + Account Settings:Read + User Details:Read) + CLOUDFLARE_ACCOUNT_ID
  ⚠️ GOTCHA: wrangler-action ต้อง pin wranglerVersion >= 3.91.0 (อ่าน wrangler.jsonc/JSONC)
    — 3.90.0 ล้มด้วย "Missing entry-point" · ดู prerender-seo.mjs รันตอน build (static /llms.txt,/faq,/mit24,/sitemap.xml)
Manual (สำรอง): npm run build → npx wrangler deploy
Legacy: deploy.yml → GitHub Pages (ยังรันอยู่ ไม่ใช่ production host จริง)
Vercel: PR preview อัตโนมัติ (*.vercel.app เท่านั้น — ห้ามผูก custom domain)
```

## Email / DNS (ceoaithailand.org)
- **ส่งออก (sending)**: ผ่าน **Resend** จาก `noreply@ceoaithailand.org` — DNS อยู่บน subdomain `send` + DKIM (ไม่แตะราก `@`)
- **รับเข้า (receiving)**: ใช้ **Cloudflare Email Routing** forward `→ support@b-tctraining.com`
  (⚠️ **ไม่ใช้ Resend Inbound / ไม่ใช้ AWS SES inbound** — ราก `@` รับเมลได้ระบบเดียว, ให้ Cloudflare Routing เป็นเจ้าของ MX ราก)
- Resend **region = `ap-northeast-1` (โตเกียว)** สำหรับโดเมนนี้ · feedback host = `*.amazonses.com` (ยืนยันจาก Resend dashboard 2569)

DNS records ที่ต้องตั้งใน Cloudflare (ทุกตัว **DNS only / grey cloud**):
```
# GitHub Pages — A records (legacy — production ย้ายไป Cloudflare Workers แล้ว
# ถ้า route worker ผ่าน custom domain ใน Cloudflare ไม่ต้องใช้ A records ชุดนี้)
@       A       185.199.108.153
@       A       185.199.109.153
@       A       185.199.110.153
@       A       185.199.111.153
www     CNAME   kosid-b.github.io

# === ส่งออก: Resend (subdomain send + DKIM — ไม่ชนกับราก) ===
# DKIM — Resend (ค่าจริงจาก Resend Dashboard > Domains)
resend._domainkey   TXT   "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCxA6v+Vi/vGFPov6GzOE2nA7IQLnqXAw3tORZ8J8GFrSOURgkQVs/OFl+GpohQ1kL2sINPvFQJyrrPoj9oWrFq5UCD08KED5vxvtMCGDB/vSwFy7/O8LUZ0Z4fyQ7fshEO52JI3Xrmaz3MXJJjlibKPhp4VnGIxzhMbA8IGuBNYQIDAQAB"
# Return-path / bounce (region ap-northeast-1, host .amazonses.com)
send    MX  10  feedback-smtp.ap-northeast-1.amazonses.com
send    TXT     "v=spf1 include:amazonses.com ~all"

# === รับเข้า: Cloudflare Email Routing (Cloudflare ใส่ MX ราก 3 ตัวให้เองเมื่อ Enable) ===
# @   MX  route1.mx.cloudflare.net / route2 / route3   ← อย่าตั้งเอง ให้ Email Routing จัดการ
# ❌ ห้ามใส่:  @  MX  inbound-smtp.ap-northeast-1.amazonaws.com  (Resend Inbound — จะชนกับ Routing)

# DMARC
_dmarc  TXT     "v=DMARC1; p=quarantine; rua=mailto:support@b-tctraining.com; pct=100"
```
> หมายเหตุ SPF ราก: Resend ยุคนี้ยึด SPF ที่ subdomain `send` (ด้านบน) — SPF ราก `@ include:_spf.resend.com`
> ไม่จำเป็นแล้ว (legacy) ถ้ามีอยู่ปล่อยไว้ได้ แต่อย่ามี TXT SPF ซ้ำชื่อเดียวกันหลายอัน (กัน SPF conflict)

**หมายเหตุ Cloudflare**: `www` CNAME ต้องเป็น DNS only (grey cloud) ไม่ใช่ orange cloud
เพราะ GitHub Pages ต้องตรวจสอบ IP ตรงๆ · ใน Resend dashboard แถว **"MX (Receiving)"** จะค้าง Pending
ตลอด — **ถือว่าปกติ** (เราตั้งใจไม่ใช้ Resend Inbound) การส่งออกไม่พึ่ง record นั้น

## Pending Items
- [ ] ตั้ง A records + www CNAME (grey cloud) ใน Cloudflare
- [x] Verify domain ใน Resend dashboard → ใส่ DKIM + SPF (send) ใน Cloudflare (region ap-northeast-1) แล้ว
- [x] รับเมล: เปิด Cloudflare Email Routing → catch-all → support@b-tctraining.com (ไม่ใช้ Resend Inbound)
- [ ] ตั้ง DMARC record ใน Cloudflare (ถ้ายังไม่ได้ตั้ง)
- [ ] GitHub repo Settings → Pages → Custom domain → `ceoaithailand.org`
- [ ] ตั้ง Supabase Auth redirect URL: `https://ceoaithailand.org`
- [ ] Payment Gateway (Omise / GB Prime Pay) + ตั้ง `WEBHOOK_SECRET`
- [x] Google Analytics 4 (G-CHJ99RY1Q1) ใส่ใน index.html
- [x] RESEND_API_KEY ตั้งใน Supabase secrets
- [x] SERPER_API_KEY ตั้งใน Supabase Edge Function secrets
- [x] agent-run: เปลี่ยนจาก Brave Search → Serper.dev
- [x] ลบ Brave Search references ออกจาก UI ทั้งหมด
