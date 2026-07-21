# Conversion & Liquidity Playbook — วัดและอุดรอยรั่วทีละขั้น

> เป้า: เปลี่ยน **คนเข้ามา → ใช้จริง → จ่ายเงิน** อย่างมีระบบ (ไม่เดา) โดยผูกกับ **funnel + GA4 event จริง**
> ที่ระบบมีอยู่แล้ว (`src/lib/analytics.ts`, GA4 `G-CHJ99RY1Q1`). หลักการ: *วัดทุกขั้น → หา % ที่หล่นมากสุด → อุดทีละจุด*.
> ⚠️ ไม่มีใครรับประกันรายได้ได้ — แต่การวัดทีละขั้นทำให้รู้ว่า "กดตรงไหนคุ้มสุด".

## 1) Funnel หลัก (SaaS) + จุดวัดจริง
| ขั้น | GA4 event ที่วัด | รอยรั่วที่พบบ่อย | ตัวช่วยที่มีอยู่แล้ว / ต้องอุด |
|---|---|---|---|
| **เข้าถึง** (คนเห็น landing) | `landing_cta_click` | คนเข้าแต่ไม่กดเริ่ม | /start viral, SEO `/b`, หน้า `/pricing` โปร่งใส |
| **เริ่มใช้** (เปิดร้าน/ตั้งบริษัท) | `seller_onboard_step`, `storefront_published` | สมัครแล้วไม่ทำอะไรต่อ | **Aha 5 นาที**, Seller Aha (<5 นาที), auto-draft |
| **ใช้จริง** (เห็นคุณค่า) | `agent_match_run`, `open_rfq_posted`, `rfq_quote_sent` | เปิดแล้วไม่เกิดกิจกรรม | FirstDealWidget, AI ร่าง RFQ/ใบเสนอราคา |
| **จ่ายเงิน** (paid) | `storefront_published` → subscription active | ถึงเวลาจ่ายแล้วหนี | PromptPay+อัปสลิป (ปลดล็อกแล้ว), upgrade nudge |
| **อยู่ต่อ** (retention) | `streak_extended`, `pulse_submitted` | จ่ายเดือนเดียวแล้วเลิก | streak, first-deal engine, pulse retention cohort |

> **ตัวเลขความเป็นความตาย:** *paid conversion* (สมัคร→จ่าย) และ *retention เดือน 2*. ปีแรกพึ่ง subscription เป็นหลัก.

## 2) Marketplace Liquidity (2 ฝั่ง) + จุดวัด
Marketplace ตายเพราะขาดฝั่งใดฝั่งหนึ่ง — วัดด้วย funnel ใน `src/lib/marketplaceHealth.ts` (พาเนล "สุขภาพดีลของฉัน" หน้า Trade):
```
RFQ → ใบเสนอราคา (quoteRate) → รับ→ออเดอร์ (acceptRate) → ปิดดีล (closeRate)
```
| จุด | อ่านอย่างไร | ถ้าต่ำ = อุดยังไง |
|---|---|---|
| supply (ร้าน active) | จำนวนร้าน published + มีกิจกรรม | Concierge seed เฟส 1 (เชิญที่ปรึกษา) |
| **quoteRate** ต่ำ | RFQ เยอะ แต่ผู้ขายไม่ตอบ | ผู้ขายไม่ active/ไม่ตรงหมวด → จับคู่มือ + AI ร่างใบเสนอราคา |
| **acceptRate** ต่ำ | เสนอราคาแล้วผู้ซื้อไม่รับ | ราคา/คุณภาพไม่ตรงใจ → coaching ผู้ขาย, เพิ่มรีวิว |
| **closeRate** ต่ำ | รับแล้วดีลไม่ปิด | ติดตามส่งมอบ → เตือน + concierge |

## 3) ลูปทำงานประจำ (weekly ritual) — อุดรอยรั่วทีละสัปดาห์
1. **วัด**: เปิด GA4 + พาเนลสุขภาพดีล + Admin เวิร์กสเปซ (adminOps) → จดตัวเลขแต่ละขั้น
2. **หาคอขวด**: ขั้นไหน % หล่นมากสุด = จุดที่ต้องแก้ก่อน (1 จุด/สัปดาห์ พอ)
3. **ตั้งสมมติฐาน + ทดลอง**: ใช้ Pulse & A/B (`src/lib/experiments.ts`) ทดสอบการแก้แบบมีกลุ่มควบคุม
4. **ยืนยันด้วยข้อมูล**: ดู pulseAvg + activationRate ต่อ variant → เก็บตัวชนะ
5. **ทำซ้ำ**: กลับข้อ 1

## 4) 3 จุดที่คุ้มสุดตอนนี้ (impact/effort สูง)
1. **[Activation] Aha ให้จบใน 5 นาที** — คนที่ผ่าน Aha มีโอกาสจ่ายสูงกว่ามาก (มีเครื่องมือแล้ว ดัน adoption)
2. **[Monetization] Trial→Paid nudge** — เตือนก่อนหมด trial + โชว์คุณค่าที่ได้ + ปุ่มจ่าย PromptPay (จ่ายง่ายแล้ว)
3. **[Liquidity] ดีลปิดใบแรกด้วยมือ** (Concierge) — ทุกดีลปิด = 1 รีวิวจริง → SEO → organic รอบใหม่

## 5) ตัวเลขเป้าหมาย (ปรับตามแผนการเงินของคุณ)
ตั้งเป้ารายขั้น แล้วเทียบจริงทุกสัปดาห์ (ตัวอย่างช่วง seed — ปรับได้):
| ขั้น | เมตริก | เป้าเริ่มต้น (ตัวอย่าง) |
|---|---|---|
| เริ่มใช้ | signup → activated (ผ่าน Aha) | ≥ 40% |
| จ่ายเงิน | activated → paid | ≥ 5–10% |
| retention | paid เดือน 2 | ≥ 70% |
| liquidity | ดีลปิด/เดือน | โตทุกเดือน |

---
**เกี่ยวข้อง:** `MARKET-RESEARCH-B2B-MARKETPLACE.md` · `B2B-SELLER-DEEPDIVE-ACTIONPLAN.md` ·
`CONCIERGE-PHASE1-KIT.md` · โค้ด: `src/lib/analytics.ts` · `src/lib/marketplaceHealth.ts` · `src/lib/experiments.ts` · `src/lib/ahaMoment.ts`
