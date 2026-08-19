# Market Validation (Data-Driven) — อ่านสัญญาณ Product-Market Fit จาก GA4 จริง

> ## 🛑 อ่านก่อน — ข้อสรุปในเอกสารนี้ถูกหักล้างแล้ว (19 ส.ค. 2569)
>
> เอกสารนี้อ่าน GA4 ช่วง **23 มิ.ย.–22 ก.ค. 2569** แล้วสรุปว่าเจอสัญญาณ PMF
> ข้อมูลรอบถัดมาบอกคนละเรื่อง:
>
> | เอกสารนี้สรุปว่า | ความจริงรอบถัดมา (🟢 ตรวจ 19 ส.ค.) |
> |---|---|
> | "Active users 128 (+48.84% MoM) — โตเร็ว" | GA4 22 ก.ค.–18 ส.ค. = **62 ผู้ใช้ / 28 วัน · ไม่โต** |
> | "โต organic 50%/เดือน → SEO ทำงาน" | 🔴 **search = 0** (`landing_funnel`: direct 38 · social 31 · other 3) |
> | "25-34 อยู่ 30 นาที/ครั้ง = สัญญาณ PMF แรงมาก" | ผู้ชมจริง (YouTube): **45 ปีขึ้นไป 58.1% · 18–24 = 0.0%** |
> | "⚠️ ยังไม่เห็นสัญญาณจ่าย" | ยังเป็นจริง และหนักกว่าเดิม: **ผู้จ่าย 0 · รายได้ ฿0.00** |
>
> ### 🔴 เหตุผลที่สำคัญกว่านั้น — ตัวเลข engagement ชุดนี้ตีความไม่ได้เลย
> 19 ส.ค. 2569 พบว่า `workspaces` ไม่มี RLS policy สำหรับ INSERT และ `is_member()` วนเรียกตัวเอง
> ⇒ **ผู้ใช้ที่สมัครใหม่ทุกคนใช้ระบบไม่ได้จริง** ตลอดช่วงที่เอกสารนี้เก็บข้อมูล
> ⇒ "เวลาที่อยู่นาน" อาจเป็นบัญชีเจ้าของระบบเอง หรือคนที่กำลังงงว่าทำไมกดแล้วไม่มีอะไรเกิดขึ้น
>
> **ห้ามใช้เอกสารนี้ยืนยัน PMF** · เก็บไว้เป็นบันทึกว่าเราเคยตีความอะไรผิด และผิดเพราะอะไร
> (บทเรียน: อ่าน engagement เป็น PMF ทั้งที่ยังไม่มีใครจ่ายเงิน — และไม่ได้ตรวจว่าระบบทำงานจริงไหมก่อน)
> ตัวเลขที่ใช้ได้จริงอยู่ที่ [MARKET-SIZING-ECOSYSTEM.md](MARKET-SIZING-ECOSYSTEM.md) ฉบับแก้ 19 ส.ค.

> เฟรม: Customer Discovery · Willingness-to-Pay · VRIO · Decision Gate (kill/go)
> ข้อมูล: GA4 CEO AI Thailand 23 มิ.ย.–22 ก.ค. 2569 (organic ล้วน, ไม่มี Google Ads)

## A. หลักฐานจากพฤติกรรมจริง (แทนการเดา)
| สัญญาณ | ค่า GA4 | ตีความ |
|---|---|---|
| Active users | 128 (+48.84% MoM) | ~~โตเร็ว ช่วง early~~ 🔴 รอบถัดมา 62 คน/28 วัน · ไม่โต |
| Sessions | 176 (+60%) | กลับมาใช้ซ้ำ |
| Events | 1,077 (+51.69%) | ใช้งานลึก ไม่ใช่แค่เปิดดู |
| **Avg session (25-34)** | **⏱️ 29:50** | **สัญญาณ PMF แรงมาก** — คนกลุ่มนี้ "จม" กับผลิตภัณฑ์ |
| Avg session รวม | 7:34 (+200.89%) | engagement ลึกขึ้น 3 เท่า |
| แหล่งที่มา | (direct) + google/organic + AI (chatgpt/gemini) | discovery หลากหลาย, SEO ทำงาน |
| งบโฆษณา | (not set) = ฿0 | ~~โต organic ล้วน → CAC ต่ำมาก~~ 🔴 search = 0 · และ ส.ค. เริ่มซื้อวิว TikTok ฿226 → ได้คนเปิดหน้า 8 คน (฿28/คน) |
| เมืองผู้ใช้ | Rayong, Map Ta Phut (นิคมฯ), BKK, เชียงใหม่, ขอนแก่น | ตรงกลุ่มโรงงาน + หัวเมืองธุรกิจ |

### สรุปสัญญาณ PMF
- ✅ **Engagement ลึก** (25-34 = 30 นาที/ครั้ง) → ผลิตภัณฑ์แก้ pain จริงสำหรับกลุ่มนี้
- ✅ **โต organic 50%/เดือน** → word-of-mouth/SEO ทำงาน ไม่ต้องซื้อ traffic
- ✅ **Geo ตรงเป้า** (โซนโรงงาน) → demand มาจากที่ที่มีเงินจ่ายงาน ISO/มอก./BCMS
- ⚠️ **ยังไม่เห็นสัญญาณ "จ่าย"** ใน GA4 (ไม่มี event conversion ชัด) → นี่คือช่องว่างที่ต้องปิด

## B. Jobs-To-Be-Done (JTBD) ที่ข้อมูลยืนยัน
| กลุ่ม | "จ้างงาน" อะไร | ผลิตภัณฑ์ที่ตอบ | หลักฐาน |
|---|---|---|---|
| ผู้ประกอบการ 25-34 | "ช่วยผมบริหาร/วางระบบธุรกิจโดยไม่ต้องมีทีมใหญ่" | CEO AI Thailand | อยู่ 30 นาที/ครั้ง |
| โรงงานในนิคมฯ | "เตรียมเอกสาร มอก./ISO ให้พร้อม audit" | TIS Automate / BCMS | เมือง Rayong/Map Ta Phut |
| องค์กร regulated | "ทำ BCM/ISO 22301 ให้ผ่าน" | BCMS | (niche, มูลค่าสูง) |

## C. VRIO — ความได้เปรียบก่อนทุ่มต่อ
| เกณฑ์ | ประเมิน | เหตุผล |
|---|---|---|
| **Value** | ✅ สูง | แก้ pain จริง (เอกสาร/ความพร้อม ISO-มอก.-BCM) + engagement พิสูจน์แล้ว |
| **Rarity** | ✅ กลาง-สูง | ที่ปรึกษาไทย 20 ปี + AI เข้าใจบริบท มอก./สมอ./DBD = ต่างชาติให้ไม่ได้ |
| **Inimitability** | ✅ กลาง | domain expertise + ฐานเคสจริง B.TC ลอกยาก (แต่ UI ลอกได้) |
| **Organization** | ⚠️ ต้องเสริม | มี ecosystem 3 ตัวแล้ว แต่ **funnel วัดผล/ปิดการขายยังไม่แน่น** |

→ VRIO ผ่าน 3/4 · จุดที่ต้องเสริม = **Organization (ระบบวัด conversion + ปิดดีล)**

## D. Decision Gate
**GO — แต่เปลี่ยนโฟกัสจาก "หา traffic" → "พิสูจน์ revenue"**

ไม่ใช่ kill (สัญญาณ PMF ดีเกินกว่าจะทิ้ง) แต่ **ต้องปิดช่องว่างการวัด conversion ทันที** ไม่งั้นโตแต่ traffic เผาเวลาเปล่า

---

## E. GA4 Funnel/Exploration — ตั้งเพื่อวัด bridge → conversion (ทำเลย)

### E1. Events ที่ต้องมี (โค้ดมีแล้วบางส่วน)
| Event | มีแล้ว? | ที่มา |
|---|---|---|
| `bridge_click` (link_id) | ✅ | การ์ด bridge บน b-tctraining |
| `page_view` /start | ✅ | GA4 อัตโนมัติ |
| `sign_up` / guest_enter | ✅ (มี track ในแอป) | App.tsx |
| `start_trial` / `plan_selected` | ตรวจ | Billing |
| `purchase` / `subscription_paid` | ⚠️ ต้องยืนยัน | Stripe webhook → GA4 |

### E2. Funnel exploration (สร้างใน GA4 → สำรวจ → ช่องทางการทำงาน)
```
ขั้น 1: bridge_click            (คลิกการ์ดจาก b-tctraining)
ขั้น 2: page_view = /start      (มาถึง landing)
ขั้น 3: sign_up / guest_enter   (เริ่มใช้)
ขั้น 4: plan_selected           (สนใจแพ็กเกจ)
ขั้น 5: purchase                (จ่ายจริง)
```
- **Breakdown ด้วย** `utm_campaign` (consultant/tisi_mok/bcms/…) → รู้ว่าการ์ดหน้าไหนทำเงิน
- **Segment** อายุ 25-34 (กลุ่มทอง) เทียบ drop-off กับกลุ่มอื่น

### E3. Custom exploration ที่ต้องดูทุกสัปดาห์
1. **Free-form**: มิติ = Session source/medium · เมตริก = active users, avg engagement time → จับตา `btctraining / content_card` โผล่เมื่อไร = bridge ได้ผล
2. **Funnel**: 5 ขั้นข้างบน → ดู % drop แต่ละขั้น
3. **Cohort**: ผู้ใช้ใหม่รายสัปดาห์ → retention (กลับมาวันที่ 7/14) เทียบ 25-34 vs อื่น

### E4. Conversions ที่ต้อง mark เป็น Key Event ใน GA4
- `bridge_click`, `sign_up`, `plan_selected`, `purchase` (Admin → Events → toggle "Mark as key event")

> ทำใน GA4 UI ได้เลย ไม่ต้องแก้โค้ด (ยกเว้น purchase ต้องยืนยันว่า Stripe → GA4 ยิง event)

---

## F. Willingness-to-Pay — ทดสอบราคาแบบมีหลักฐาน
- **CEO AI**: ทดสอบ starter ฿590 vs growth ฿1,490 → ดูใน funnel ว่า plan ไหนคนเลือก (ใช้ Pulse A/B ที่มีในแอป)
- **TIS/BCMS (consulting)**: มูลค่าสูง — WTP พิสูจน์ที่ "lead → ยอมคุย → ปิดดีล ฿50k–85k" ไม่ใช่ราคาป้าย
- **Pre-Sale Test ในระบบ**: เปิดหน้าร้าน `/b/<slug>` + สินค้า pre-order → วัดที่แผง 🧪 พิสูจน์ไอเดีย (เป้า 10 leads จริง)

## G. Next actions (เรียงตามผลกระทบต่อเงิน)
1. 🔴 **ยืนยัน event `purchase` ยิงเข้า GA4** (จาก Stripe) — ไม่งั้นวัด revenue ไม่ได้เลย
2. 🔴 ตั้ง Funnel exploration 5 ขั้น + mark key events
3. 🟡 เฝ้าดู `btctraining / content_card` ปรากฏ = pipeline bridge ทำงาน
4. 🟡 ทำคอนเทนต์เจาะ 25-34 + geo-ad โซนโรงงาน (ดู `CONTENT-25-34-GEO-ADS.md`)
