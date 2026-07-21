# Deep-Dive + Action Plan — ผู้ขาย B2B "ที่ปรึกษา/ผู้ให้บริการ" (Seed Supply)

> ต่อยอดจาก `MARKET-RESEARCH-B2B-MARKETPLACE.md` (สรุป: คอขวด = liquidity, ฝั่ง demand หายากกว่า,
> แต่ต้อง **seed supply ก่อน** ให้ /b มีของ). เอกสารนี้เจาะ **1 segment ผู้ขาย** ที่เป็น seed ดีที่สุด
> แล้วแปลงเป็น **action plan ผูกกับฟีเจอร์จริงในโค้ด** (อ้างไฟล์/ฟังก์ชัน/GA4 event จริง).
> วันที่: 2026-07-12.

## ทำไมเลือก segment นี้ (ไม่ใช่โรงงาน/แม่ค้า)
| เกณฑ์ | ที่ปรึกษา/ผู้ให้บริการ B2B ✅ | โรงงานรับผลิต | แม่ค้าออนไลน์ |
|---|---|---|---|
| ตรงเครือข่าย B. Training 20 ปี | **สูงสุด** (concierge seed ได้ทันที) | กลาง | ต่ำ |
| LTV/มูลค่าดีล | สูง (฿10k–50k/ดีล) | สูงสุดแต่ sales cycle ยาว | ต่ำ ถี่ |
| onboarding <5 นาที ทำได้จริง | **ใช่** (ขายของนามธรรม ไม่ต้องรูปสินค้า/สต็อก) | ต้องรูป/สเปกเยอะ | ต้องรูปสินค้าเยอะ |
| ใช้ AI ช่วยได้มาก | **สูงสุด** (ร่าง VP/ใบเสนอราคา/TOR) | กลาง | ต่ำ |
| หมวดที่คู่แข่งไม่จับ | **ใช่** (ISO/มอก./อบรม — Fastwork ไม่มี) | บางส่วน | ไม่ |

→ **ที่ปรึกษา/ผู้ให้บริการ B2B = seed supply ที่ได้ค่ามากสุด ต้นทุนน้อยสุด** และปลดล็อก differentiation หลัก (AI-in-loop + หมวด ISO/ไทย).

---

## Part A — Deep-Dive Persona

### A1. Persona: "พี่โอ๋ — ที่ปรึกษา ISO/พัฒนาองค์กร"
| มิติ | รายละเอียด |
|---|---|
| โปรไฟล์ | ที่ปรึกษาอิสระ/สำนักงานเล็ก 1–5 คน · รับงาน ISO 9001/14001/45001, มอก., อบรม in-house, วางระบบ |
| รายได้ปัจจุบัน | งานมาจาก**ปากต่อปาก + ลูกค้าเก่า** เป็นหลัก → รายได้ไม่สม่ำเสมอ (feast or famine) |
| **Jobs To Be Done** | (1) ได้ลีดใหม่โดยไม่ต้องยิงแอด/ขายเอง (2) ดูน่าเชื่อถือพอให้ลูกค้าใหม่กล้าจ้าง (3) ร่างใบเสนอราคา/TOR เร็วขึ้น |
| Pain หลัก | "งานเข้าไม่สม่ำเสมอ" + "ทำเว็บ/การตลาดเองไม่เป็น ไม่มีเวลา" + "ร่างเอกสารเสนอราคาทีละชั่วโมง" |
| WTP | Starter ฿390–Growth ฿1,490/เดือน (ถ้าได้ลีด 1 ดีล/ไตรมาสก็คุ้มหลายเท่า) |
| Objection | "มันจะมีลูกค้าจริงไหม หรือแค่ร้านร้าง?" · "ต้องกรอกเยอะไหม ไม่มีเวลา" |
| หาเจอที่ไหน | LinkedIn (กลุ่ม ISO/QA/จป.), สมาคมวิชาชีพ, **เครือข่าย B. Training โดยตรง**, กลุ่ม FB "ที่ปรึกษา ISO/ระบบคุณภาพ" |

### A2. Insight ที่ใช้ออกแบบฟีเจอร์
1. **เขาไม่มีเวลา** → onboarding ต้อง <5 นาที และ **auto-ร่างจากข้อมูลที่มีอยู่** (ไม่เริ่มจากหน้าว่าง)
2. **เขากลัวร้านร้าง** → ต้องเห็น "มีงานรอเสนอราคา (Open RFQ)" ทันทีหลังเปิดร้าน = proof ว่ามี demand
3. **เขาเสียเวลากับเอกสาร** → AI ร่าง VP + ใบเสนอราคา + สเปก RFQ = ตรง JTBD #3 พอดี (differentiation)
4. **เขาต้องการความน่าเชื่อถือ** → รีวิวจากออเดอร์จริง + badge "ที่ปรึกษายืนยันแล้ว" = ปิด objection #1

---

## Part B — Action Plan ผูกฟีเจอร์จริง

### 🟩 Workstream 1 — Seller Onboarding < 5 นาที (แก้ Pain "ไม่มีเวลา")

**สถานะปัจจุบัน (โค้ดจริง `src/pages/MyStorefront.tsx`):**
- ✅ auto-ร่างหน้าร้านจากข้อมูลบริษัท (`productDesc`/`productDbd`/BMC) เมื่อยังไม่มีร้าน (`:38`)
- ✅ AI เขียน Value Proposition (`draftVpLocal` local / `ai-assist` prod, `:71–98`)
- ✅ `save(published)` → GA4 `storefront_published` (`:104–113`)
- ⚠️ **ยังไม่มี**: (ก) ตัวจับเวลา/ขั้นตอนชัดว่า "เหลืออีกกี่ก้าวถึงเผยแพร่" (ข) after-publish CTA พาไปดูงานรอเสนอราคาทันที

**สิ่งที่ต้องทำ (concrete):**
| # | งาน | ไฟล์/จุดจริง | Acceptance |
|---|---|---|---|
| 1.1 | **Seller Aha track** — เพิ่มเส้นทาง 3 ก้าว (ยืนยันหมวด DBD → ให้ AI ร่าง VP → เผยแพร่) แบบเดียวกับ `AHA_STEPS` | สร้าง `SELLER_AHA_STEPS` ใน `src/lib/ahaMoment.ts` (mins รวม ≤5) + การ์ดใน `MyStorefront.tsx` | ผู้ใช้ใหม่เห็น "เหลือ 2 ก้าว · ~3 นาที" ก่อนเผยแพร่ |
| 1.2 | **Prefill จาก 24-Step/BMC** ให้แน่นขึ้น — ถ้ามี `de24`/BMC ให้เดา services + description อัตโนมัติ (ลดการพิมพ์) | `MyStorefront.tsx:38` ขยาย logic ร่างเริ่มต้น (reuse `de24ToBmcSeed` ที่มีอยู่) | ฟอร์มมีเนื้อหาพร้อม ~80% ผู้ใช้แค่กด "เผยแพร่" |
| 1.3 | **After-publish CTA → ประกาศงานกลาง** — หลัง publish โชว์ปุ่ม "ดูงานรอเสนอราคา (N งาน)" | `MyStorefront.tsx:104` หลัง `save(true)` เพิ่ม CTA `onNavigate('trade')` (มี `FirstDealWidget` อยู่แล้ว — เชื่อมให้ต่อเนื่อง) | ปิด objection "ร้านร้าง" ทันทีหลังเปิดร้าน |
| 1.4 | **GA4 funnel** — วัดหล่นตรงไหน | เพิ่ม event `seller_onboard_step` {step, ms_elapsed} รอบๆ `storefront_published` | รู้ก้าวที่ drop-off จริง (ไม่เดา) |

> **หลักการ:** ไม่เริ่มจากหน้าว่าง — ระบบ**ร่างให้ก่อน** ผู้ใช้แค่ยืนยัน/ปรับ. เวลาจริงสู่ published ควร ≤5 นาที
> (วัดด้วย `ms_elapsed` ไม่ใช่เดา). ของนามธรรม (บริการ) ไม่ต้องรูปสินค้า → ทำ <5 นาทีได้จริงกว่าแม่ค้า/โรงงาน.

### 🟦 Workstream 2 — RFQ Prompt ฝังในลูป (แก้คอขวด Demand + JTBD "ร่างเอกสารเร็ว")

**สถานะปัจจุบัน (โค้ดจริง `src/pages/Trade.tsx`):**
- ✅ `createRfq` ทั้ง RFQ ตรง (`sellerSlug`) + ประกาศงานกลาง (`sector`, `:115–122`)
- ✅ handoff ปุ่ม "ขอใบเสนอราคา" จากที่อื่น → `sessionStorage['rfq_seller']` → เปิดฟอร์มใน Trade (`:56`)
- ✅ GA4 `open_rfq_posted`
- ⚠️ **ยังไม่มี**: (ก) AI ช่วยร่างเนื้อ RFQ/สเปก (ข) จุดชนวน RFQ อัตโนมัติจากงานที่ต้อง outsource (ค) แชร์ประกาศงานออกนอกแอป

**สิ่งที่ต้องทำ (concrete):**
| # | งาน | ไฟล์/จุดจริง | Acceptance |
|---|---|---|---|
| 2.1 | **AI ร่าง RFQ** — ปุ่ม "ให้ AI ช่วยร่างสิ่งที่ต้องการ" ในฟอร์ม Open RFQ/RFQ ตรง | `Trade.tsx` เพิ่ม handler เรียก `ai-assist` (แบบเดียวกับ `MyStorefront.tsx:79`) เติม `title/detail` | ผู้ซื้อพิมพ์ 1 ประโยค → ได้ร่าง RFQ ครบ (ลด friction ที่ฆ่า B2B marketplace) |
| 2.2 | **จุดชนวน RFQ จากงาน outsource** — เมื่อ Resources/บริษัท AI เจองานที่ควรจ้างนอก → เสนอปุ่ม "โพสต์หาผู้รับงาน (RFQ)" | `src/pages/Resources.tsx` + reuse `sessionStorage['rfq_seller']`/`rfq_sector` handoff → `Trade.tsx` | สร้าง demand จากพฤติกรรมที่เกิดอยู่แล้วในแอป (ไม่ต้องสอนผู้ใช้ใหม่) |
| 2.3 | **แชร์ประกาศงานกลางออกนอกแอป** — ปุ่มแชร์ลิงก์ Open RFQ ไป FB/LINE (ดึง demand จากภายนอก) | `Trade.tsx` เพิ่มปุ่ม copy/share หลัง `open_rfq_posted` | 1 ประกาศ = เข้าถึงกลุ่ม FB ภายนอก → ผู้ขายในระบบ claim |
| 2.4 | **AI ร่างใบเสนอราคา (ฝั่งผู้ขาย)** — ตอน `answerRfq` มีปุ่ม "ให้ AI ร่างใบเสนอราคา" | `Trade.tsx` `answerRfq` flow + `ai-assist` | ตรง JTBD #3 ของพี่โอ๋ (ร่างเอกสารเร็ว) → ผู้ขายตอบ RFQ เร็วขึ้น → quote rate สูงขึ้น |

> **ลำดับความสำคัญ:** 2.1 (AI ร่าง RFQ) และ 1.3 (after-publish CTA) มี **ผลกระทบต่อ liquidity สูงสุดต่อแรงที่ลงน้อยสุด**
> เพราะใช้ ai-assist/handoff/FirstDealWidget ที่มีอยู่แล้ว — เป็น **quick win** ทำก่อน.

### 🟨 Workstream 3 — วัดสุขภาพลูป (ไม่ใช่แค่จำนวนสมัคร)
ผูกกับ skill `marketplace-metrics`. ตัวชี้วัดที่ต้องเห็นในแท็บ Admin เวิร์กสเปซ (reuse `adminOps.ts`):
| Metric | สูตร | ทำไมสำคัญ |
|---|---|---|
| ร้าน active | published & มีกิจกรรม 30 วัน | ฝั่ง supply มีชีวิตไหม |
| RFQ → quote rate | quoted / open | ผู้ขายตอบไหม (ถ้าต่ำ = supply ไม่ active หรือ demand ไม่ตรงหมวด) |
| quote → accept rate | accepted / quoted | ราคา/คุณภาพตรงใจผู้ซื้อไหม |
| **ดีลปิด/เดือน** | orders status=completed | **ตัวเลขความเป็นความตายของ marketplace** |
| time-to-first-deal | วันจากเปิดร้าน→ดีลแรก | onboarding+matching ดีพอไหม |

---

## ลำดับลงมือ (แนะนำ — เรียงตาม impact/effort)
1. **[Quick win] 2.1 AI ร่าง RFQ** + **1.3 after-publish CTA** — ใช้ของที่มีแล้ว (ai-assist, FirstDealWidget) แรงน้อย ผลสูง
2. **1.1 Seller Aha track (<5 นาที)** + **1.4 GA4 funnel** — ทำ onboarding วัดผลได้
3. **2.2 จุดชนวน RFQ จาก outsource** — สร้าง demand แบบ organic ในแอป
4. **2.4 AI ร่างใบเสนอราคา** + **2.3 แชร์ออกนอกแอป** — ยก quote rate + ดึง demand ภายนอก
5. **3 Metrics dashboard** — เปิดหน้าปัดวัดลูป (ตัดสินใจด้วยตัวเลข ไม่ใช่ความรู้สึก)
6. **[คู่ขนาน มือ] Concierge seed** — ทีม B. Training เชิญที่ปรึกษาในเครือข่ายเปิดร้าน + จับคู่ RFQ แรกด้วยมือ
   → ให้ "ดีลปิดใบแรก + รีวิวจริง" เกิดเร็ว แล้ว organic/SEO รับช่วง

> **หมายเหตุ take-rate:** ยังคง **ไม่เปิดค่าฟี 3%** จนดีลปิด/เดือนสม่ำเสมอ (ตาม contrarian #2 ในเอกสารวิจัย) —
> ช่วง seed ให้ฟรีเพื่อสร้างพฤติกรรม.

---
**เอกสารเกี่ยวข้อง:** `MARKET-RESEARCH-B2B-MARKETPLACE.md` · `MARKETPLACE-SEO.md` · `NETWORKING-STRATEGY.md`
(ช่องทางเชิญที่ปรึกษา) · `LINKEDIN-STRATEGY.md` (หา segment นี้) · skill `marketplace-metrics`
**ไฟล์โค้ดอ้างอิง:** `src/pages/MyStorefront.tsx` · `src/pages/Trade.tsx` · `src/components/FirstDealWidget.tsx`
· `src/lib/ahaMoment.ts` · `src/lib/storefront.ts` · `src/lib/adminOps.ts`
