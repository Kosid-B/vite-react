# ผลตรวจ contrast ทุกหน้า ทุกธีม — 22 ส.ค. 2569

> รันด้วย `npm run dev` + `node scripts/contrast-audit.mjs 4.5` (เกณฑ์ WCAG AA)
> 🟢 เดินครบ **50 หน้า** (2 ธีม × 3 หน้าสาธารณะ + 22 เมนูในแอป)

## ผลรวม — ก่อน / หลัง

| ระดับ | ก่อนแก้ | หลังแก้ | ลดลง |
|---|---|---|---|
| 🔴 < 2.0 (มองไม่เห็นเลย) | **58** | **2** | −97% |
| 🟠 2.0–3.0 (อ่านออกแบบฝืน) | 114 | 13 | −89% |
| 🟡 3.0–4.5 (ผ่านเฉพาะตัวใหญ่) | 45 | 45 | — |
| **รวม** | **217** | **60** | **−72%** |

🟢 **ไม่มีจุดที่ "มองไม่เห็นเลย" เฉพาะธีมสว่างเหลืออยู่แล้ว** (2 จุดที่เหลือเกิดทั้งสองธีม)

## สิ่งที่แก้ และวิธีแก้

| กลุ่ม | จำนวน | วิธี |
|---|---|---|
| สีตายตัวใน `index.css` | ~150 | สร้าง override จากผลวัดจริง — คงเฉดเดิม ปรับความสว่างจนได้ ≥4.6 |
| **สีจากข้อมูลผ่าน inline style** | 4 จุด | `src/lib/readableColor.ts` → `readableOn(color, surface)` |
| คู่ "สี+พื้น" ที่กำหนดครึ่งเดียว | 6 | เขียนคู่กันใน selector เดียวกัน |
| ลิงก์ที่ไม่มีคลาสของตัวเอง | 6 | ให้คลาส `.legal-link` ผูกกับโทเคนธีม |

🔴 **บทเรียนที่แพงที่สุด**: จุดที่แย่ที่สุดหลายจุดมาจาก **inline style ที่เอาสีจากข้อมูลมาใส่**
(`col.color` · `catMeta.color` · `s.level.color`) — inline style ชนะทุกกฎใน stylesheet
⇒ **CSS override เอาชนะไม่ได้เลย ต้องแก้ที่จุดที่ส่งสีเข้าไป**
(นี่คือเหตุผลที่ override รอบแรกทำ 8 คลาสแย่ลงกว่าเดิม แล้วต้องถอนออก)

## 🟡 จุดบอดที่ประกาศไว้ (ยังหาต้นตอไม่เจอ)

```
🔴 1.81  [ทั้งสองธีม]  rgb(170,182,200) บน rgb(245,240,232)  <SPAN.>  [/]  "/ 3"
```
เป็น `<span>` ที่ไม่มีคลาส · grep ทุกแพตเทิร์นแล้วยังไม่พบจุดที่เรนเดอร์
บันทึกไว้พร้อมค่าที่วัดได้ เพื่อให้ตามต่อได้ **ดีกว่าเดาแก้หรือเงียบ**

## ที่เหลือ (13 🟠 + 45 🟡) — อ่านออกแต่ตกเกณฑ์ WCAG AA

ส่วนใหญ่เป็นตัวอักษรบนปุ่มสีสด (ขาวบนม่วง/เขียว/ไซแอน) และตัวเลข KPI สีแดง/น้ำเงินบนพื้นเข้ม
**ไม่ใช่เรื่องอ่านไม่ออก** แต่ยังไม่ผ่านมาตรฐาน — ทำต่อได้ทีละหน้า

## สถานะปุ่มสลับธีมในแอป

`config.THEME.inAppLive = false` (ยังปิดอยู่)
🟢 เงื่อนไขเปิดคืนตามที่เขียนไว้ (ไม่มี 🔴 เฉพาะธีมสว่าง) **ผ่านแล้ว** — รอเจ้าของสั่งเปิด

---

## รายงานดิบครั้งล่าสุด

```
  [minimal] พบเมนูในแอป 22 ปุ่ม
  [dark] พบเมนูในแอป 22 ปุ่ม
สแกน 50 หน้า (2 ธีม) · เกณฑ์ contrast < 4.5

🔴 มองไม่เห็นเลย (< 2.0) — 2 คลาส
🔴  1.81  [minimal] rgb(170, 182, 200) บน rgb(245,240,232)  <SPAN.>  [/]  "/ 3"
🔴  1.81  [dark] rgb(170, 182, 200) บน rgb(245,240,232)  <SPAN.>  [/]  "/ 3"
🟠  2.15  [minimal] rgb(26, 79, 138) บน rgb(15,23,42)  <SPAN.ai-task-owner>  [บริษัท AI]  "CTO"
🟠  2.15  [dark] rgb(26, 79, 138) บน rgb(15,23,42)  <SPAN.ai-task-owner>  [บริษัท AI]  "CTO"
🟠  2.26  [minimal] rgb(255, 255, 255) บน rgb(6,199,85)  <BUTTON.>  [/]  "💬 แชร์ทาง LINE"
🟠  2.26  [minimal] rgb(170, 182, 200) บน rgb(12,133,93)  <DIV.mk-stat-lbl>  [Marketplace]  "รายได้ที่คาดได้เพิ่ม"
🟠  2.26  [dark] rgb(255, 255, 255) บน rgb(6,199,85)  <BUTTON.>  [/]  "💬 แชร์ทาง LINE"
🟠  2.26  [dark] rgb(170, 182, 200) บน rgb(12,133,93)  <DIV.mk-stat-lbl>  [Marketplace]  "รายได้ที่คาดได้เพิ่ม"
🟠  2.43  [minimal] rgb(26, 79, 138) บน rgb(2,6,23)  <DIV.ai-board-col-hd>  [บริษัท AI]  "กำลังทำ"
🟠  2.43  [dark] rgb(26, 79, 138) บน rgb(2,6,23)  <DIV.ai-board-col-hd>  [บริษัท AI]  "กำลังทำ"
🟠  2.45  [minimal] rgb(148, 163, 184) บน rgb(248,250,252)  <P.>  [/start]  "บอกว่าอยากขายอะไร ถนัดอะไร — CEO AI จะร่"
🟠  2.57  [minimal] rgb(124, 58, 237) บน rgb(30,41,59)  <DIV.>  [โรงงานอัจฉริยะ]  "C-Level AI"
🟠  2.57  [dark] rgb(124, 58, 237) บน rgb(30,41,59)  <DIV.>  [โรงงานอัจฉริยะ]  "C-Level AI"
🟠  2.79  [minimal] rgb(45, 106, 79) บน rgb(15,23,42)  <DIV.brd-role>  [บริษัท AI]  "▸ CMO · มณี"
🟠  2.79  [dark] rgb(45, 106, 79) บน rgb(15,23,42)  <DIV.brd-role>  [บริษัท AI]  "▸ CMO · มณี"
🟡  3.07  [minimal] rgb(110, 231, 183) บน rgb(25,108,244)  <BUTTON.skm-btn>  [บริษัท AI]  "🏢 ใช้ได้ (แพ็ก Scale)"
🟡  3.07  [dark] rgb(110, 231, 183) บน rgb(25,108,244)  <BUTTON.skm-btn>  [บริษัท AI]  "🏢 ใช้ได้ (แพ็ก Scale)"
🟡  3.15  [minimal] rgb(22, 163, 74) บน rgb(248,250,252)  <TH.start-cmp-us>  [/start]  "CEO AI Thailand"
🟡  3.56  [minimal] rgb(59, 91, 219) บน rgb(2,6,23)  <DIV.cs-keylesson-label>  [Case Studies]  "💡 บทเรียนสำคัญ"
🟡  3.56  [dark] rgb(59, 91, 219) บน rgb(2,6,23)  <DIV.cs-keylesson-label>  [Case Studies]  "💡 บทเรียนสำคัญ"
🟡   3.7  [minimal] rgb(220, 38, 38) บน rgb(15,23,42)  <DIV.iso-kpi-val>  [ISO 9001:2015 QMS]  "0 %"
🟡   3.7  [dark] rgb(220, 38, 38) บน rgb(15,23,42)  <DIV.iso-kpi-val>  [ISO 9001:2015 QMS]  "0 %"
🟡  3.72  [minimal] rgb(229, 231, 235) บน rgb(158,66,246)  <BUTTON.pb-btn>  [บริษัท AI]  "คัดลอก Brand Kit"
🟡  3.72  [dark] rgb(229, 231, 235) บน rgb(158,66,246)  <BUTTON.pb-btn>  [บริษัท AI]  "คัดลอก Brand Kit"
🟡  3.75  [minimal] rgb(100, 116, 139) บน rgb(15,23,42)  <DIV.sidebar-plan-badge>  [/]  "Local Dev"
🟡  3.75  [minimal] rgb(100, 116, 139) บน rgb(15,23,42)  <TD.>  [โรงงานอัจฉริยะ]  "100 / 600"
🟡  3.75  [dark] rgb(100, 116, 139) บน rgb(15,23,42)  <DIV.sidebar-plan-badge>  [/]  "Local Dev"
🟡  3.75  [dark] rgb(100, 116, 139) บน rgb(15,23,42)  <TD.>  [โรงงานอัจฉริยะ]  "100 / 600"
🟡   3.8  [minimal] rgb(98, 123, 226) บน rgb(30,41,59)  <SPAN.cs-badge>  [Case Studies]  "Semiconductor · Consumer Electronics · A"
🟡   3.8  [dark] rgb(98, 123, 226) บน rgb(30,41,59)  <SPAN.cs-badge>  [Case Studies]  "Semiconductor · Consumer Electronics · A"
🟡  3.81  [minimal] rgb(226, 232, 240) บน rgb(4,127,148)  <BUTTON.mk-filter>  [Marketplace]  "การตลาด & คอนเทนต์"
🟡  3.81  [dark] rgb(226, 232, 240) บน rgb(4,127,148)  <BUTTON.mk-filter>  [Marketplace]  "การตลาด & คอนเทนต์"
🟡  3.85  [minimal] rgb(229, 231, 235) บน rgb(23,132,63)  <BUTTON.brd-btn>  [บริษัท AI]  "📋 คัดลอกรายงาน"
🟡  3.85  [dark] rgb(229, 231, 235) บน rgb(23,132,63)  <BUTTON.brd-btn>  [บริษัท AI]  "📋 คัดลอกรายงาน"
🟡  3.89  [minimal] rgb(239, 68, 68) บน rgb(30,41,59)  <DIV.factory-kpi-val>  [โรงงานอัจฉริยะ]  "0%"
🟡  3.89  [minimal] rgb(28, 21, 3) บน rgb(32,114,220)  <SPAN.clv-tag>  [🏙️ เมืองบริษัท]  "เป้าหมายถัดไป ↑"
🟡  3.89  [dark] rgb(239, 68, 68) บน rgb(30,41,59)  <DIV.factory-kpi-val>  [โรงงานอัจฉริยะ]  "0%"
🟡  3.89  [dark] rgb(28, 21, 3) บน rgb(32,114,220)  <SPAN.clv-tag>  [🏙️ เมืองบริษัท]  "เป้าหมายถัดไป ↑"
🟡  3.98  [minimal] rgb(59, 130, 246) บน rgb(30,41,59)  <BUTTON.factory-status-badge>  [โรงงานอัจฉริยะ]  "🔧 Maintenance"
🟡  3.98  [dark] rgb(59, 130, 246) บน rgb(30,41,59)  <BUTTON.factory-status-badge>  [โรงงานอัจฉริยะ]  "🔧 Maintenance"
🟡  4.18  [minimal] rgb(220, 38, 38) บน rgb(2,6,23)  <DIV.iso-hm-pct>  [ISO 9001:2015 QMS]  "0 %"
🟡  4.18  [dark] rgb(220, 38, 38) บน rgb(2,6,23)  <DIV.iso-hm-pct>  [ISO 9001:2015 QMS]  "0 %"
🟡  4.22  [minimal] rgb(15, 23, 42) บน rgb(24,119,242)  <A.plg-ref-copy>  [หน้าร้านของฉัน]  "f แชร์ไป Facebook"
🟡  4.22  [dark] rgb(15, 23, 42) บน rgb(24,119,242)  <A.plg-ref-copy>  [หน้าร้านของฉัน]  "f แชร์ไป Facebook"
🟡  4.23  [minimal] rgb(255, 255, 255) บน rgb(139,92,246)  <SPAN.clw-badge>  [บริษัท AI]  "อัตโนมัติทุกศุกร์"
🟡  4.23  [dark] rgb(255, 255, 255) บน rgb(139,92,246)  <SPAN.clw-badge>  [บริษัท AI]  "อัตโนมัติทุกศุกร์"
🟡  4.35  [minimal] rgb(255, 255, 255) บน rgb(124,92,255)  <BUTTON.magent-run>  [ซื้อขาย B2B (RFQ)]  "✨ ให้เอเจนต์จับคู่ธุรกิจ"
🟡  4.35  [dark] rgb(255, 255, 255) บน rgb(124,92,255)  <BUTTON.magent-run>  [ซื้อขาย B2B (RFQ)]  "✨ ให้เอเจนต์จับคู่ธุรกิจ"
🟡  4.39  [minimal] rgb(196, 75, 43) บน rgb(253,243,240)  <DIV.db-a-label>  [/]  "Priority 1"
🟡  4.39  [minimal] rgb(196, 75, 43) บน rgb(253,243,240)  <SPAN.skm-tier-badge>  [บริษัท AI]  "Enterprise"
🟡  4.39  [dark] rgb(196, 75, 43) บน rgb(253,243,240)  <DIV.db-a-label>  [/]  "Priority 1"
🟡  4.39  [dark] rgb(196, 75, 43) บน rgb(253,243,240)  <SPAN.skm-tier-badge>  [บริษัท AI]  "Enterprise"
🟡  4.43  [minimal] rgb(248, 250, 252) บน rgb(12,133,93)  <DIV.mk-stat-num>  [Marketplace]  "฿45,000"
🟡  4.43  [dark] rgb(248, 250, 252) บน rgb(12,133,93)  <DIV.mk-stat-num>  [Marketplace]  "฿45,000"
🟡  4.49  [minimal] rgb(248, 250, 252) บน rgb(4,127,148)  <BUTTON.lean-tab>  [โรงงานอัจฉริยะ]  "5S Checklist"
🟡  4.49  [minimal] rgb(248, 250, 252) บน rgb(4,127,148)  <BUTTON.inv-cat-tab>  [โรงงานอัจฉริยะ]  "วัตถุดิบ (1)"
🟡  4.49  [minimal] rgb(248, 250, 252) บน rgb(4,127,148)  <BUTTON.bill-choose>  [แพ็กเกจ & ชำระเงิน]  "เลือกแพ็กนี้"
🟡  4.49  [dark] rgb(248, 250, 252) บน rgb(4,127,148)  <BUTTON.lean-tab>  [โรงงานอัจฉริยะ]  "5S Checklist"
🟡  4.49  [dark] rgb(248, 250, 252) บน rgb(4,127,148)  <BUTTON.inv-cat-tab>  [โรงงานอัจฉริยะ]  "วัตถุดิบ (1)"
🟡  4.49  [dark] rgb(248, 250, 252) บน rgb(4,127,148)  <BUTTON.bill-choose>  [แพ็กเกจ & ชำระเงิน]  "เลือกแพ็กนี้"

พบ 60 คลาส — แก้โดยใช้โทเคนธีม (var(--ink)/--ink3/--accent-text) แทนสีตายตัว
```
