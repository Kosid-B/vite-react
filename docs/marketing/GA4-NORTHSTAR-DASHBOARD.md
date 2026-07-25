# GA4 North-Star Dashboard — ดูตัวเลขจริง เลิกไล่ noise รายวัน

> **ทำไม:** ที่ระดับผู้ใช้หลักสิบ metric %รายวัน (engaged sessions/user ฯลฯ) เด้งขึ้น-ลง 25–43%
> = noise ไม่ใช่เทรนด์ (ดู GA anomaly alerts 20–24 ก.ค. 69) → หยุดดูมัน ดู "ตัวเลขสัมบูรณ์รายสัปดาห์" แทน
>
> หลักการ (จาก saas-metrics-dashboard skill): **pre-revenue = ยังไม่ต้องทำ LTV/CAC/cohort** — ติดตามแค่
> จำนวนผู้ใช้ + intent + รายได้ พอมี 3 เดือน + ผู้ใช้หลักร้อยค่อยเพิ่ม

---

## 1. 3 ตัวสัมบูรณ์ที่เป็น North-Star (ดูรายสัปดาห์)

| # | เมตริก | อ่านว่า | เป้าเริ่มต้น |
|---|---|---|---|
| **1** | **New users / สัปดาห์** | มีคนใหม่เข้ามากี่คนจริง ๆ | 1 → ≥ 10/สัปดาห์ |
| **2** | **begin_checkout + purchase** | มี "intent จ่ายเงิน" กี่ครั้ง (ไม่ใช่แค่ page_view) | ≥ 1 begin_checkout/สัปดาห์ |
| **3** | **ลูกค้าจ่ายเงิน (purchase)** | ← ตัวเดียวที่สำคัญสุด | **1 รายแรก** = พิสูจน์ตลาด |

> ตัวที่ 3 = north-star จริง เมตริกอื่นทั้งหมดเป็นแค่ leading indicator ของตัวนี้

---

## 2. ตั้งค่า GA4 (ทำครั้งเดียว ~15 นาที)

### 2.1 Mark Key Events (เพื่อแยก intent/รายได้ ออกจาก event ทั่วไป)
GA4 → **Admin → Events** → เปิดสวิตช์ "Mark as key event" ให้ 4 ตัวนี้:
```
purchase              ← รายได้จริง (สำคัญสุด)
begin_checkout        ← intent จ่าย
signup_instant        ← สมัครสำเร็จเข้าระบบทันที
compliance_sample_tried / privacy_sample_tried   ← aha-moment ISO/PDPA (เพิ่งทำ)
```
> ปิด key event เดิมที่เป็น "traffic ปลอม" ออก (เช่น page_view, nudge_shown) — ไม่งั้น "key events 132"
> ที่ GA แจ้งเตือนจะปนกับ event ที่ไม่ใช่ intent

### 2.2 สร้าง Exploration "North-Star" (Free-form)
GA4 → **Explore → Free form** →
- **Technique:** Line chart · **Granularity:** Week
- **Values:** `Total users`, `Key events` (filter = purchase), `Event count` (filter = begin_checkout)
- **Date range:** 90 วันล่าสุด
- บันทึกชื่อ "North-Star (weekly)" → นี่คือหน้าเดียวที่ต้องเปิดดู

### 2.3 สร้าง Funnel Exploration (หา จุดรั่ว)
GA4 → **Explore → Funnel exploration** → 5 ขั้น (เรียงตาม event จริงในแอป):
```
1. first_visit                              (เข้าเว็บ)
2. start_cta_click / landing_cta_click      (สนใจ)
3. privacy_sample_tried / compliance_sample_tried  (เห็น aha ISO/PDPA)
4. signup_instant / shop_signup_submitted   (สมัคร)
5. begin_checkout → purchase                (จ่าย)
```
→ เห็นชัดว่าคนหลุดขั้นไหนมากสุด (สมมติฐาน: หลุดหนักที่ 3→4 = signup friction)

---

## 3. เลิกไล่ noise
- GA4 → **Admin → Anomaly detection / Insights** → **ปิด/ลดความถี่ email alert** ที่เป็น %รายวัน
  (ที่ฐานเล็ก มันเด้งขึ้น-ลงทุกวันโดยไม่มีความหมาย → ทำให้เหวี่ยงอารมณ์เปล่า ๆ)
- ตั้ง **Custom Insight** ที่มีความหมายจริงแทน:
  ```
  แจ้งเมื่อ: purchase ≥ 1 (รายสัปดาห์)         → ข่าวดีจริง
  แจ้งเมื่อ: New users < 1 (รายสัปดาห์)        → ท่อแห้ง ต้อง outreach
  ```

---

## 4. แหล่ง "ความจริงของรายได้" (GA4 ไม่ใช่ตัวตัดสิน)
GA4 นับ `purchase` จาก event (client + stripe-webhook ฝั่ง server) — **อาจพลาด/นับซ้ำได้**
ตัวเลขจริงของ "ลูกค้าจ่ายเงิน + MRR" อยู่ที่:
- **ในแอป: Admin → เวิร์กสเปซ → 📊 โหลดสรุปผลการดำเนินงาน** (`adminOps.ts` รวม revenue จาก subscription จริงทุก ws)
- Supabase `workspace_state` → นับ subscription ที่ `status='active'` และ `plan != 'free'`

> ใช้ GA4 ดู "ท่อบน" (traffic → intent) · ใช้ Admin ops ดู "ท่อล่าง" (รายได้จริง) — สองอันคู่กัน

---

## 5. พิธีกรรมรายสัปดาห์ (5 นาที ทุกวันจันทร์)
เปิด 2 หน้า จด 3 ตัวเลข:
```
สัปดาห์นี้:  New users = __   ·  begin_checkout = __   ·  ลูกค้าจ่ายเงิน (สะสม) = __
เทียบสัปดาห์ก่อน:  ▲/▼
1 การกระทำสัปดาห์หน้า: _______________  (ปกติ = โทร outreach เพิ่ม N สาย)
```
→ ตัดสินใจจาก "ตัวเลขสัมบูรณ์ที่ขยับข้ามสัปดาห์" ไม่ใช่ %เด้งรายวัน

---

## สรุป
เป้าเดียว = **ลูกค้าจ่ายเงินรายแรก** · ทุกอย่างอื่นคือ leading indicator
GA alert รายวันที่เห็น (ขึ้น 25% / ลง 43%) = noise จากฐานเล็ก — เลิกดู แล้วโฟกัส 3 ตัวสัมบูรณ์นี้รายสัปดาห์
1 ลูกค้าจ่ายเงิน มีค่ากว่า GA alert ทั้งเดือนรวมกัน
