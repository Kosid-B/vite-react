# วัดผล A/B — ธีม · Persona · Layout (+ Hero) ที่ GA4

คู่มือตั้งค่า GA4 (property `G-CHJ99RY1Q1`) เพื่ออ่านผลการทดลองบนหน้า Landing/Start
ทุกอย่าง **วัดกับผู้เยี่ยมชมนิรนามฝั่ง GA4** (ไม่ต้องล็อกอิน) — ต่างจากการทดลองใน Pulse (หน้าแอป)
ที่รวมผลใน Admin → เวิร์กสเปซ

> ⚠️ ต้องมี traffic ระดับ **หลักร้อย/วัน** ผลถึงมีนัยสำคัญ · traffic น้อย = "เริ่มเก็บข้อมูลไว้"

---

## 1) อีเวนต์ & พารามิเตอร์ที่ระบบยิงอยู่แล้ว

| อีเวนต์ | พารามิเตอร์ | ความหมาย |
|---|---|---|
| `layout_ab_exposed` | `variant` = `explain_first` / `proof_first` | เห็นหน้า Landing แบบไหน (ลำดับบล็อก) |
| `hero_ab_exposed` | `variant` = `A` / `B` | พาดหัว hero แบบไหน (เฉพาะ seg=default) |
| `persona_banner_shown` | `persona`, `visits` | แถบ persona ที่โชว์ (considering/researcher/returning) |
| `persona_banner_dismissed` | `persona` | ผู้ใช้ปิดแถบ persona |
| `theme_changed` | `theme` = `dark`/`minimal`, `where` = `landing`/`start`/`sale` | สลับธีม |
| `landing_hero_variant` | `seg` | segment ของผู้เข้าชม (จาก UTM/referrer) |
| **`landing_cta_click`** | `cta`, `seg`, `ab`, `layout`, `persona` | **คลิก CTA = ตัวชี้วัด conversion หลัก** |

`landing_cta_click.cta` มีค่า: `hero_try_guest` · `hero_free_trial` · `hero_signup` · `hero_shop_signup` · `persona_banner`

---

## 2) ลงทะเบียน Custom Dimensions (ทำครั้งเดียว)

GA4 อ่านค่าพารามิเตอร์ในรายงาน/Exploration **ก็ต่อเมื่อ** ลงทะเบียนเป็น custom dimension ก่อน
(ข้อมูลก่อนลงทะเบียนจะไม่ย้อนหลัง — ยิ่งตั้งเร็วยิ่งดี)

**Admin → Data display → Custom definitions → Create custom dimensions**
scope = **Event** ทุกตัว:

| Dimension name | Event parameter |
|---|---|
| Layout variant | `layout` |
| AB variant | `variant` |
| Hero AB | `ab` |
| Persona | `persona` |
| Theme | `theme` |
| Theme location | `where` |
| Segment | `seg` |
| CTA | `cta` |

(event-scoped ได้สูงสุด 50 ตัว — ใช้แค่ 8 ตัวนี้พอ)

---

## 3) ทำเครื่องหมาย Key event (conversion)

**Admin → Data display → Events** → เปิดสวิตช์ **Mark as key event** ให้:
- `landing_cta_click` (conversion หลัก)
- (ถ้ามี) อีเวนต์สมัคร/ล็อกอินจริง เช่น `sign_up` — ใช้เป็น conversion ปลายทาง

---

## 4) สร้าง Exploration อ่านผล (ผู้ชนะ)

### 4.1 เทียบ conversion ต่อ variant (Free-form)
**Explore → Blank → Free-form**
- **Rows**: `Layout variant` (หรือ `AB variant` / `Persona` / `Theme`)
- **Values**: `Event count` → filter `Event name exactly matches landing_cta_click`
- เพิ่มคอลัมน์ `Total users` (หรือ Sessions) เพื่อคิดอัตราส่วน
- **อ่าน**: variant ที่มี `landing_cta_click / ผู้ใช้` สูงกว่า = แนวโน้มดีกว่า

### 4.2 Funnel exposed → click (Funnel exploration)
- Step 1 = `layout_ab_exposed`
- Step 2 = `landing_cta_click`
- **Breakdown** = `Layout variant`
- **อ่าน**: variant ไหน % ผ่านจาก Step 1 → 2 สูงกว่า = ชนะ

ทำซ้ำแบบเดียวกันโดยเปลี่ยน breakdown เป็น `AB variant` (hero), `Persona`, `Theme`

---

## 5) วิธีอ่าน "ผู้ชนะ" อย่างซื่อสัตย์
- ดู **อัตราส่วน** (conversion rate) ไม่ใช่ยอดดิบ — variant ที่คนเห็นเยอะกว่าย่อมคลิกเยอะกว่าโดยธรรมชาติ
- อย่าด่วนสรุปถ้าตัวอย่าง < ~หลักร้อยต่อ variant · ให้เวลา ≥ 1–2 สัปดาห์
- `theme_changed` = สัญญาณ "ความชอบ" (กี่ % กดมินิมอล) ไม่ใช่ conversion โดยตรง — ใช้ประกอบการตัดสินใจดีไซน์
- ตรวจว่าอีเวนต์ยิงจริงก่อนเชื่อรายงาน: **Admin → DebugView** (เปิดหน้าเว็บแล้วกดปุ่มจริง ดูอีเวนต์วิ่งเข้า)

---

## 6) หมายเหตุ
- คุกกี้/consent: อีเวนต์ GA ยิงเมื่อผู้ใช้ "ยอมรับทั้งหมด" เท่านั้น (PDPA) → ตัวเลขคือกลุ่มที่ยินยอม
- กรอง internal/bot traffic ก่อน (ดู `docs/marketing/ga4-clean-data-guide.md`) ไม่งั้น A/B เพี้ยน
- การทดลองใน **Pulse (หน้าแอป)** วัดแยกที่ Admin → เวิร์กสเปซ (activationRate + pulseAvg ต่อ variant) — คนละชุดกับ GA4
