# ทำไมยังไม่มี User เข้าใช้ระบบ — วินิจฉัย + แผนแก้ 30 วัน

> อ่านคู่กับ [MARKETING-PLAN-12MONTH.md](./MARKETING-PLAN-12MONTH.md) · [TIKTOK-CTA-TEMPLATES.md](./TIKTOK-CTA-TEMPLATES.md)
> วันที่วิเคราะห์: ก.ค. 2569 · ข้อมูลจริง: Supabase prod + TikTok + GA4 + สำรวจตลาดภายนอก

## 🎯 คำตอบสั้น (TL;DR)
**ไม่ใช่ปัญหาสินค้า และไม่ใช่ปัญหาว่าไม่มีตลาด** — เป็นปัญหา **distribution: ท่อ funnel ยังไม่ถูกต่อ**
คนเห็นคลิป (awareness มี) แต่ **ไม่มีเส้นทางให้เดินเข้าเว็บ/แอป** เพราะ (1) ยังไม่ตั้ง bio link
(2) คลิปไม่มี CTA (3) ตลาดยังว่าง (ไม่มีร้าน). ผลคือ user จริง = 0 เป็นผลลัพธ์ที่คาดเดาได้ ไม่ใช่เรื่องน่าตกใจ

---

## 1. หลักฐานภายใน (data จริง)

| ตัวชี้วัด | ค่าจริง | หมายเหตุ |
|---|---|---|
| User ทั้งหมด (Supabase) | **1** | คือบัญชีแอดมิน/เจ้าของเอง — ยังไม่มีคนนอก |
| ร้าน published | **0** | ตลาด `/b` ว่างเปล่า |
| signup ใหม่ 7 วัน | 0 | — |
| TikTok บูสต์ ฿338 | 19,460 views | reach มี |
| → profile visit | **23 (0.12%)** | ⚠️ ต่ำผิดปกติ |
| → bio link | **ยังไม่ตั้ง** | traffic ไม่มีทางเข้าเว็บเลย |

## 2. เทียบ Benchmark — ยืนยันว่า "ท่อรั่ว" ไม่ใช่ "ไม่มีคนสนใจ"
- **Profile visit rate เฉลี่ยของ TikTok = 3–5%** (คลิป top = 7–10%) → ของเรา **0.12% = ต่ำกว่าเกณฑ์ ~30 เท่า**
- **Bio link CTR เมื่อตั้งค่าดี = 10–20%** → ของเรา **ไม่มี bio link = 0%** (ต่อให้มี profile visit ก็ไปต่อไม่ได้)
- อัลกอริทึม TikTok 2025 ให้น้ำหนัก **watch time/retention** มากกว่า likes → คลิปเราต้องอุด 6 วิแรก (ทำสคริปต์ไว้แล้ว)

> แปลว่า: แม้แต่คลิปธรรมดาที่ตั้ง bio link ถูกก็ควรได้ profile visit 3–5% + คลิก 10–20% — เรายังไม่ได้ทำ
> "พื้นฐาน" พวกนี้เลย จึงได้ 0 user (ไม่ใช่เพราะคนไม่อยากได้ของ)

## 3. ตลาดมีจริง (สำรวจภายนอก) — demand ไม่ใช่ปัญหา
- **SME ไทย 3.13 ล้านราย** (99.7% ของธุรกิจทั้งหมด, จ้างงาน 70% ของประเทศ)
- **100% ของ SME ไทยขายออนไลน์แล้ว** (สูงกว่าค่าเฉลี่ยโลก 95%), 86% ใช้ดิจิทัลรายวัน
- แต่ **"digital maturity" แค่ 2.45/4** — SME ไทยเป็น "digital followers": ออนไลน์แล้วแต่ยังใช้เทคไม่เต็มที่
  ⇒ **นี่คือช่องว่างที่ CEO AI Thailand เติมพอดี** (มีเครื่องมือแต่ไม่มีระบบ/ทีม → เราให้ทีม AI)
- อุปสรรค AI ของ SME = **เงินทุน + ขาดทักษะ + ข้อมูลไม่พร้อม** → ตรงกับจุดขายเรา (ถูก/ฟรี, ไม่ต้องมีทักษะ)
- ตลาด software พัฒนาแอป ไทย ~$303M (2025) โต 5%/ปี · **AIS+Microsoft เพิ่งเปิด "AI Ready for SMEs"**
  = ยักษ์ใหญ่ลงมายืนยัน demand (และเป็นสัญญาณว่าต้องรีบจับตลาดก่อนถูกกิน)

**สรุป: มีลูกค้า 3 ล้านราย ที่ออนไลน์ พร้อมใช้ แต่ยังใช้เทคไม่เป็น — สินค้าเราพร้อม ตลาดพร้อม ขาดแค่ "สะพาน"**

## 4. Root cause ทีละขั้น (AARRR funnel)

| ขั้น | สถานะ | ปัญหา |
|---|---|---|
| **Awareness** | ✅ มี (TikTok 19K views) | reach ได้ แต่... |
| **Acquisition** | ❌ ~0 | ไม่มี bio link + คลิปไม่มี CTA → traffic ไม่เข้าเว็บ |
| **Activation** | ⛔ N/A | ยังไม่มีคนถึงหน้า /start |
| **Retention** | ⛔ N/A | — |
| **Revenue** | ⛔ N/A | — |
| **(Supply)** | ❌ 0 ร้าน | ต่อให้มีคนเข้าตลาด `/b` ก็ว่างเปล่า ไม่มีอะไรให้ดู |

→ ท่อขาดตั้งแต่ขั้นที่ 2 ทุกอย่างหลังจากนั้นจึงเป็น 0 โดยอัตโนมัติ

---

## 5. 🚀 แผนแก้ 30 วัน (เรียงตาม impact/effort — ทำจากบนลงล่าง)

### สัปดาห์ 0 (วันนี้ · ฟรี · ใช้เวลาเป็นชั่วโมง ไม่ใช่วัน)
1. **ตั้ง bio link = `ceoaithailand.org/start`** ทุกแพลตฟอร์ม (TikTok/FB/IG/LINE) ← **จุดรั่วใหญ่สุด แก้ก่อน**
2. **โพสต์คลิปที่ทำไว้แล้ว** (CEOAI_CTA_short / ISO / seg2) + **ปักหมุดคอมเมนต์ลิงก์ /start**
3. **เปิด LINE Login** (deploy edge fn + flag) — ลด friction สมัครของคนไทยให้เหลือ 2 คลิก

### สัปดาห์ 1–2 (เติม supply ให้ตลาดไม่ว่าง)
4. **Concierge seed:** ชวนคนรู้จัก 10–20 ราย เปิดร้านฟรีด้วยตัวเอง → `published_stores` > 0
   (ใช้ CONCIERGE-PHASE1-KIT.md) — ตลาดมีของ คนเข้ามาแล้วเห็นตัวอย่างจริง
5. **สะพานเชื่อม 2 เว็บ:** ใส่ปุ่ม/แบนเนอร์บนเว็บบริษัท (b-tctraining) หน้า ISO/BCP → `/start`
   (เว็บบริษัทมี organic ISO traffic อุ่น ๆ อยู่แล้ว — GA4 ยืนยัน)

### สัปดาห์ 3–4 (วัด + ปรับจากข้อมูล)
6. **วัด funnel รายวัน:** views → profile visit → คลิก bio → signup `/start` (ตั้ง UTM)
7. **A/B hook คลิป** (retention 6 วิ) ตาม CONTENT-SCRIPT-ISO-CLIP.md → เก็บ hook ที่ผ่าน 6 วิดีสุด
8. **geo-target EEC** สำหรับคอนเทนต์ ISO (data ยืนยัน audience อยู่ชลบุรี/ระยอง)

---

## 6. Checkpoint — ตัวเลขที่ต้องเห็นขยับ (ถ้าไม่ขยับ = ปรับแผน)

| เมื่อ | เป้าขั้นต่ำ |
|---|---|
| 7 วัน | bio link ตั้งครบ + โพสต์คลิป ≥3 + **signup คนจริง ≥1** (ไม่ใช่แอดมิน) |
| 14 วัน | `published_stores` ≥10 · signup ≥5 · profile-visit rate เข้าใกล้ 3% |
| 30 วัน | signup ≥20 · active ≥10 · RFQ/ดีลแรกเริ่มมี |

## 7. เมื่อไรถึงค่อยตั้งคำถามเรื่อง product/demand?
**หลังทำครบ §5 แล้ว 30 วัน** (bio link + คลิป + supply + สะพาน) **ถ้ายัง signup < 5** → ค่อยกลับมา
ตั้งคำถามเรื่อง value proposition / ราคา / persona. **ตอนนี้ยังไม่ถึงจุดนั้น** เพราะยังไม่ได้เปิดหัวจ่ายเลย —
การสรุปว่า "สินค้าไม่ดี/ไม่มีตลาด" ตอนนี้จะเป็นการด่วนสรุปผิด (ข้อมูลตลาดชี้ตรงข้าม)

---

### แหล่งอ้างอิง (สำรวจตลาด)
- [TikTok Bio Link Conversion — Napolify](https://napolify.com/blogs/news/tiktok-bio-link-conversion)
- [Link in Bio CTR Benchmarks by Platform 2026 — Tapmy](https://tapmy.store/blog/link-in-bio-click-through-rate-benchmarks-by-platform-2026-data)
- [TikTok Benchmarks 2026 — Enrich Labs](https://www.enrichlabs.ai/blog/tiktok-benchmarks-2025)
- [Decoding Thailand's AI Boom — Beacon VC](https://www.beaconvc.fund/research/decoding-thailands-ai-boom)
- [AIS, Microsoft power up Thai SMEs with AI — Bangkok Post](https://www.bangkokpost.com/business/general/3266113/ais-microsoft-power-up-thai-smes-with-ai)
- [Digital push aims to transform SMEs — Bangkok Post](https://www.bangkokpost.com/business/general/3270980/digital-push-aims-to-transform-smes)

> ตัวเลขตลาดเป็นการประมาณการจากแหล่งสาธารณะ (พร้อมระบุที่มา) — ใช้ชี้ทิศทาง ไม่ใช่รับประกันผล
