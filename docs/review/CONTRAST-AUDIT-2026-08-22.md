# ผลตรวจ contrast ทุกหน้า ทุกธีม — 22 ส.ค. 2569

> รันด้วย `npm run dev` + `node scripts/contrast-audit.mjs 4.5` (เกณฑ์ WCAG AA)
> 🟢 เดินครบ **50 หน้า** (2 ธีม × 3 หน้าสาธารณะ + 22 เมนูในแอป)

## สรุป

| ระดับ | จำนวน | ความหมาย |
|---|---|---|
| 🔴 < 2.0 | **58** | มองไม่เห็นเลย — **12 ตัวเป็นสีเดียวกันเป๊ะ (contrast 1.00)** |
| 🟠 2.0–3.0 | 114 | อ่านออกแบบฝืน |
| 🟡 3.0–4.5 | 45 | ผ่านเฉพาะตัวอักษรใหญ่ |
| **รวม** | **217** | |

## 🔴 ข้อสรุปที่สำคัญที่สุด: **ธีมสว่างไม่เคยถูกทำให้เสร็จสำหรับหน้าในแอป**

| | ธีมสว่าง (minimal) | ธีมเข้ม |
|---|---|---|
| มองไม่เห็นเลย (🔴) | **41** | 17 |
| ทั้งหมด | **151** | 66 |

**หน้าที่หนักที่สุด (นับเฉพาะ 🔴)**

| หน้า | จำนวน |
|---|---|
| บริษัท AI | **26** |
| เมืองบริษัท | 12 |
| แพ็กเกจ & ชำระเงิน | 6 |
| โรงงานอัจฉริยะ | 5 |
| `/` · `/start` · Case Studies · อื่น ๆ | 9 |

⇒ หน้าสาธารณะ (`/`, `/start`) ถูกทำธีมสว่างไว้ครบพอสมควรแล้ว
แต่ **หน้าในแอปยังคิดว่าตัวเองอยู่ในธีมเข้มอย่างเดียว**
`บริษัท AI` ซึ่งเป็นหน้าหลักของผลิตภัณฑ์ มีข้อความที่มองไม่เห็นเลย 26 จุด

## 2 ทางเลือก (เจ้าของตัดสิน)

| | ทำอะไร | เวลา | ผล |
|---|---|---|---|
| **A** | ซ่อนปุ่มสลับธีมในแอป จนกว่าธีมสว่างจะเสร็จ | ~30 นาที | ผู้ใช้ไม่มีวันเจอหน้าจอพัง · แต่เสียฟีเจอร์ชั่วคราว |
| **B** | ไล่แก้ทั้ง 217 จุดให้ผ่าน WCAG AA | ~1–2 วัน | ได้ธีมสว่างจริง · ใช้เวลามาก |

🔴 **ผมแนะนำ A ก่อน แล้วค่อย B ทีละหน้า** — เพราะตอนนี้ปุ่มสลับธีมเปิดอยู่จริง
ใครกดในหน้า `บริษัท AI` จะเจอข้อความหายไป 26 จุดทันที
(และเราเพิ่งรู้เรื่องนี้เพราะเจ้าของถ่ายภาพมาเอง — ไม่ใช่เพราะเครื่องมือบอก)

## ที่แก้ไปแล้ววันนี้

`.de24g-*` (13) · `.de-hero-*` (4) · `.start-why-sec`/`.start-share-sec`/`.start-persona`/
`.start-why-card`/`.isms-badge`/`.start-price-note` (ธีมสว่าง) — จุดที่เจ้าของถ่ายภาพมาโดยตรง

---

## รายงานดิบทั้งหมด

```
  [minimal] พบเมนูในแอป 22 ปุ่ม
  [dark] พบเมนูในแอป 22 ปุ่ม
สแกน 50 หน้า (2 ธีม) · เกณฑ์ contrast < 4.5

🔴 มองไม่เห็นเลย (< 2.0) — 58 คลาส
🔴     1  [minimal] rgb(15, 23, 42) บน rgb(15,23,42)  <B.>  [บริษัท AI]  "แบรนด์ & ดีไซน์"
🔴     1  [minimal] rgb(255, 255, 255) บน rgb(255,255,255)  <BUTTON.cn-toggle>  [บริษัท AI]  "🎨 ให้ CEO เสนอชื่อบริษัท + โลโก้ (Corpo"
🔴     1  [minimal] rgb(255, 255, 255) บน rgb(255,255,255)  <BUTTON.bk-toggle>  [บริษัท AI]  "🎨 Brand Guidelines ของ บริษัท AI ของฉัน"
🔴     1  [minimal] rgba(255, 255, 255, 0.85) บน rgb(255,255,255)  <SPAN.tool-owner-tool>  [บริษัท AI]  "🗺️  Journey Map"
🔴     1  [minimal] rgba(255, 255, 255, 0.42) บน rgb(255,255,255)  <SPAN.tool-owner-desc>  [บริษัท AI]  "แผนที่เส้นทางลูกค้า 8 ขั้น — touchpoints"
🔴     1  [minimal] rgba(255, 255, 255, 0.35) บน rgb(255,255,255)  <SPAN.tool-owner-agent>  [บริษัท AI]  "ยังไม่มีผู้รับผิดชอบ"
🔴     1  [minimal] rgb(15, 23, 42) บน rgb(15,23,42)  <DIV.cs-role>  [บริษัท AI]  "💰 CFO — การเงิน"
🔴     1  [minimal] rgb(15, 23, 42) บน rgb(15,23,42)  <SPAN.cs-kpi-v>  [บริษัท AI]  "฿0"
🔴     1  [minimal] rgb(15, 23, 42) บน rgb(15,23,42)  <DIV.sip-stage-hd>  [บริษัท AI]  "🌱  หมู่บ้านสตาร์ทอัป"
🔴     1  [minimal] rgb(15, 23, 42) บน rgb(15,23,42)  <LI.>  [บริษัท AI]  "( 24 ) — สร้างตัวตน โลโก้ โทนแบรนด์ ให้ล"
🔴     1  [minimal] rgba(255, 255, 255, 0.65) บน rgb(255,255,255)  <BUTTON.mreq-btn>  [บริษัท AI]  "🧑‍💼 ขอเพิ่ม M-level"
🔴     1  [minimal] rgb(15, 23, 42) บน rgb(15,23,42)  <SPAN.brd-t-title>  [บริษัท AI]  "ตรวจร่างอีเมลนิวส์เลตเตอร์ก่อนส่ง"
🔴  1.01  [dark] rgb(28, 24, 20) บน rgb(15,23,42)  <DIV.db-cp-chip>  [/]  "4 รายการ"
🔴  1.04  [dark] rgb(170, 182, 200) บน rgb(56,189,248)  <SPAN.edge-ring-lbl>  [🏙️ เมืองบริษัท]  "/ 100"
🔴  1.04  [dark] rgb(0, 0, 0) บน rgb(2,6,23)  <SPAN.city-card-ico>  [🏙️ เมืองบริษัท]  "🏛️"
🔴  1.05  [minimal] rgb(248, 250, 252) บน rgb(255,255,255)  <DIV.>  [แพ็กเกจ & ชำระเงิน]  "สมัคร Starter ฿790 — รับสิทธิ์ระดับ  ตลอ"
🔴  1.16  [minimal] rgba(255, 255, 255, 0.78) บน rgb(236,238,242)  <SPAN.>  [บริษัท AI]  "ให้ CEO จ้างเอเจนต์เองได้"
🔴  1.16  [minimal] rgb(255, 255, 255) บน rgb(236,238,242)  <BUTTON.ai-plan-btn>  [บริษัท AI]  "📋 ให้ CEO ร่างแผนเริ่มต้น"
🔴  1.18  [minimal] rgb(15, 23, 42) บน rgb(22,36,77)  <DIV.iso-ic>  [🏙️ เมืองบริษัท]  "👥"
🔴  1.18  [dark] rgb(0, 0, 0) บน rgb(15,23,42)  <SPAN.aha-step-ico>  [/]  "▶️"
🔴  1.18  [dark] rgb(0, 0, 0) บน rgb(15,23,42)  <BUTTON.ai-task-lock-btn>  [บริษัท AI]  "🌐"
🔴  1.18  [dark] rgb(226, 232, 240) บน rgb(248,250,252)  <BUTTON.ops-tpl>  [โรงงานอัจฉริยะ]  "⬇ ดาวน์โหลดเทมเพลต CSV"
🔴  1.18  [dark] rgb(226, 232, 240) บน rgb(248,250,252)  <BUTTON.ops-upl>  [โรงงานอัจฉริยะ]  "📎 อัปโหลดไฟล์ CSV"
🔴  1.19  [minimal] rgb(165, 243, 252) บน rgb(248,250,252)  <STRONG.>  [/start]  "ISO/IEC 27001:2022"
🔴  1.23  [minimal] rgb(255, 255, 255) บน rgb(226,232,240)  <BUTTON.>  [หน้าร้านของฉัน]  "เพิ่ม"
🔴  1.24  [minimal] rgb(229, 231, 235) บน rgb(255,255,255)  <BUTTON.sip-btn>  [บริษัท AI]  "คัดลอกสรุป"
🔴  1.24  [minimal] rgb(229, 231, 235) บน rgb(255,255,255)  <DIV.pb-pos>  [บริษัท AI]  "บริษัท AI ของฉัน — มุ่งผลลัพธ์ ให้กำลังใ"
🔴  1.24  [minimal] rgb(229, 231, 235) บน rgb(255,255,255)  <BUTTON.pb-btn>  [บริษัท AI]  "คัดลอก Brand Kit"
🔴  1.24  [minimal] rgb(229, 231, 235) บน rgb(255,255,255)  <BUTTON.brd-btn>  [บริษัท AI]  "📋 คัดลอกรายงาน"
🔴  1.25  [minimal] rgb(253, 230, 138) บน rgb(255,255,255)  <SPAN.skm-official-badge>  [บริษัท AI]  "🏢 เสนอโดยบริษัท"
🔴  1.39  [minimal] rgb(103, 232, 249) บน rgb(248,250,252)  <A.>  [/start]  "ข้อกำหนด"
🔴  1.45  [minimal] rgb(103, 232, 249) บน rgb(255,255,255)  <BUTTON.bill-cycle-btn>  [แพ็กเกจ & ชำระเงิน]  "รายเดือน"
🔴  1.65  [minimal] rgb(234, 179, 8) บน rgb(236,238,242)  <SPAN.cs-tab-tag>  [Case Studies]  "Identity Core / Resilience"
🔴  1.67  [minimal] rgb(251, 191, 36) บน rgb(255,255,255)  <SPAN.hrd-no-agent-tip>  [บริษัท AI]  "⚠️ ยังไม่มี HRD — กด \"ขอเพิ่ม HRD\" ในผัง"
🔴  1.67  [minimal] rgb(251, 191, 36) บน rgb(255,255,255)  <DIV.skm-value-note>  [บริษัท AI]  "💎 เทียบคอร์สขาย + ที่ปรึกษา compliance "
🔴  1.73  [dark] rgb(55, 65, 81) บน rgb(15,23,42)  <DIV.skm-card-cat>  [บริษัท AI]  "🌱  ผลกระทบและการรายงาน"
🔴  1.76  [dark] rgb(26, 79, 138) บน rgb(30,41,59)  <SPAN.cs-tab-tag>  [Case Studies]  "Investment Discipline"
🔴  1.81  [minimal] rgb(165, 180, 252) บน rgb(240,244,255)  <DIV.bill-addon-badge>  [แพ็กเกจ & ชำระเงิน]  "ISO 9001:2015 Add-on"
🔴  1.81  [minimal] rgb(165, 180, 252) บน rgb(240,244,255)  <DIV.bill-addon-tagline>  [แพ็กเกจ & ชำระเงิน]  "สำหรับองค์กรที่มีหรือกำลังเตรียมรับรอง I"
🔴  1.81  [dark] rgb(170, 182, 200) บน rgb(245,240,232)  <SPAN.>  [/]  "/ 3"
🔴  1.81  [dark] rgb(165, 180, 252) บน rgb(240,244,255)  <DIV.bill-addon-badge>  [แพ็กเกจ & ชำระเงิน]  "ISO 9001:2015 Add-on"
🔴  1.81  [dark] rgb(165, 180, 252) บน rgb(240,244,255)  <DIV.bill-addon-tagline>  [แพ็กเกจ & ชำระเงิน]  "สำหรับองค์กรที่มีหรือกำลังเตรียมรับรอง I"
🔴  1.85  [minimal] rgb(196, 181, 253) บน rgb(255,255,255)  <SPAN.brd-count>  [บริษัท AI]  "1 งานรอพิจารณา"
🔴  1.85  [minimal] rgb(245, 158, 11) บน rgb(236,238,242)  <DIV.factory-oee-component-val>  [โรงงานอัจฉริยะ]  "68 %"
🔴  1.85  [minimal] rgb(245, 158, 11) บน rgb(236,238,242)  <DIV.factory-kpi-val>  [โรงงานอัจฉริยะ]  "2.8%"
🔴  1.85  [minimal] rgb(245, 158, 11) บน rgb(236,238,242)  <BUTTON.factory-status-badge>  [โรงงานอัจฉริยะ]  "🟡 Idle"
🔴  1.92  [minimal] rgb(234, 179, 8) บน rgb(255,255,255)  <SPAN.intg-badge>  [บริษัท AI]  "เร็วๆ นี้"
🔴  1.92  [minimal] rgb(234, 179, 8) บน rgb(255,255,255)  <DIV.ict-pay>  [🤝 การค้าระหว่างเมือง]  "⏳ ระบบรับ/จ่ายเงินออนไลน์ (Xendit) กำลัง"
🔴  1.94  [minimal] rgb(245, 158, 11) บน rgb(234,245,255)  <DIV.clv-eyebrow>  [🏙️ เมืองบริษัท]  "Company City · Level Up"
🔴  1.94  [minimal] rgb(245, 158, 11) บน rgb(234,245,255)  <BUTTON.clv-tbtn>  [🏙️ เมืองบริษัท]  "🔄 อัตโนมัติตามเวลาจริง"
🔴  1.94  [minimal] rgb(245, 158, 11) บน rgb(234,245,255)  <SPAN.clv-era-new>  [🏙️ เมืองบริษัท]  "✨ ผู้คนเริ่มเดินในเมือง + พื้นที่สีเขียว"
🔴  1.94  [minimal] rgb(245, 158, 11) บน rgb(234,245,255)  <DIV.clv-city-badge>  [🏙️ เมืองบริษัท]  "👑 ระดับปัจจุบัน · หมู่บ้านสตาร์ทอัป"
🔴  1.94  [dark] rgb(245, 158, 11) บน rgb(234,245,255)  <DIV.clv-eyebrow>  [🏙️ เมืองบริษัท]  "Company City · Level Up"
🔴  1.94  [dark] rgb(245, 158, 11) บน rgb(234,245,255)  <BUTTON.clv-tbtn>  [🏙️ เมืองบริษัท]  "🔄 อัตโนมัติตามเวลาจริง"
🔴  1.94  [dark] rgb(245, 158, 11) บน rgb(234,245,255)  <SPAN.clv-era-new>  [🏙️ เมืองบริษัท]  "✨ ผู้คนเริ่มเดินในเมือง + พื้นที่สีเขียว"
🔴  1.94  [dark] rgb(245, 158, 11) บน rgb(234,245,255)  <DIV.clv-city-badge>  [🏙️ เมืองบริษัท]  "👑 ระดับปัจจุบัน · หมู่บ้านสตาร์ทอัป"
🔴  1.96  [dark] rgb(55, 65, 81) บน rgb(2,6,23)  <DIV.city-tier-name>  [🏙️ เมืองบริษัท]  "หมู่บ้านสตาร์ทอัป"
🔴  1.99  [minimal] rgb(165, 180, 252) บน rgb(255,255,255)  <DIV.brd-summary>  [บริษัท AI]  "เสร็จสมบูรณ์ 1 · รอบอร์ด 1 · คิวถัดไป 3"
🟠     2  [minimal] rgb(245, 158, 11) บน rgb(246,247,249)  <DIV.an-card-value>  [SaaS Analytics]  "4.0 %"
🟠  2.05  [dark] rgb(248, 250, 252) บน rgb(56,189,248)  <SPAN.edge-ring-num>  [🏙️ เมืองบริษัท]  "14"
🟠  2.09  [minimal] rgb(6, 182, 212) บน rgb(236,238,242)  <BUTTON.db-link>  [/]  "อ่าน Case Study →"
🟠  2.09  [minimal] rgb(6, 182, 212) บน rgb(236,238,242)  <SPAN.help-caret>  [หน้าร้านของฉัน]  "ซ่อน ▲"
🟠  2.09  [minimal] rgb(6, 182, 212) บน rgb(236,238,242)  <DIV.inv-kpi-box-val>  [โรงงานอัจฉริยะ]  "฿336,090"
🟠  2.14  [minimal] rgb(56, 189, 248) บน rgb(255,255,255)  <SPAN.page-nav-label>  [/]  "ห้องบอร์ด"
🟠  2.14  [minimal] rgb(56, 189, 248) บน rgb(255,255,255)  <BUTTON.ai-mini-add>  [บริษัท AI]  "🎓 ขอเพิ่ม HRD"
🟠  2.14  [minimal] rgb(56, 189, 248) บน rgb(255,255,255)  <A.sf-preview>  [หน้าร้านของฉัน]  "👁 เปิดดูหน้าร้าน (แท็บใหม่)"
🟠  2.14  [minimal] rgb(56, 189, 248) บน rgb(255,255,255)  <BUTTON.treasury-toggle>  [🏙️ เมืองบริษัท]  "จัดการรายรับ-รายจ่าย  ▼"
🟠  2.14  [minimal] rgb(56, 189, 248) บน rgb(255,255,255)  <SPAN.city-card-lv>  [🏙️ เมืองบริษัท]  "ที่ดินว่าง"
🟠  2.14  [minimal] rgb(56, 189, 248) บน rgb(255,255,255)  <SPAN.city-card-go>  [🏙️ เมืองบริษัท]  "ไปพัฒนา →"
🟠  2.14  [minimal] rgb(56, 189, 248) บน rgb(255,255,255)  <BUTTON.ict-link>  [🤝 การค้าระหว่างเมือง]  "เมืองบริษัท →"
🟠  2.14  [minimal] rgb(56, 189, 248) บน rgb(255,255,255)  <A.meta-chip>  [แพ็กเกจ & ชำระเงิน]  "📄 คู่มือการชำระเงิน (PDF)"
🟠  2.14  [minimal] rgb(56, 189, 248) บน rgb(255,255,255)  <DIV.bill-plan-calls>  [แพ็กเกจ & ชำระเงิน]  "🤖 200 AI calls (ช่วงทดลอง)"
🟠  2.14  [minimal] rgb(56, 189, 248) บน rgb(255,255,255)  <SPAN.xedge-cap>  [ISO 9001:2015 QMS]  "ISO 9001:2015"
🟠  2.15  [minimal] rgb(245, 158, 11) บน rgb(255,255,255)  <DIV.ai-board-col-hd>  [โรงงานอัจฉริยะ]  "⚙️ กำลังผลิต"
🟠  2.15  [minimal] rgb(245, 158, 11) บน rgb(255,255,255)  <SPAN.mk-rating>  [Marketplace]  "★ 4.4"
🟠  2.15  [minimal] rgb(245, 158, 11) บน rgb(255,255,255)  <SPAN.ops-score>  [โรงงานอัจฉริยะ]  "60"
🟠  2.15  [minimal] rgb(245, 158, 11) บน rgb(255,255,255)  <SPAN.inv-alert-item>  [โรงงานอัจฉริยะ]  "⚠️ 2 ล็อตหมดอายุภายใน 30 วัน"
🟠  2.15  [minimal] rgb(245, 158, 11) บน rgb(255,255,255)  <DIV.city-streak>  [🏙️ เมืองบริษัท]  "🔥 ทำงานต่อเนื่อง วัน"
🟠  2.15  [minimal] rgb(245, 158, 11) บน rgb(255,255,255)  <DIV.ict-dir>  [🤝 การค้าระหว่างเมือง]  "🔻 ซื้อจาก"
🟠  2.15  [dark] rgb(26, 79, 138) บน rgb(15,23,42)  <SPAN.ai-task-owner>  [บริษัท AI]  "CTO"
🟠  2.15  [dark] rgb(26, 79, 138) บน rgb(15,23,42)  <DIV.ops-group-hd>  [โรงงานอัจฉริยะ]  "รายวัน"
🟠  2.26  [minimal] rgb(6, 182, 212) บน rgb(246,247,249)  <SPAN.goal-opt-go>  [/]  "เลือกอันนี้ →"
🟠  2.26  [minimal] rgb(6, 182, 212) บน rgb(246,247,249)  <A.app-footer__link>  [/]  "0817817773"
🟠  2.26  [minimal] rgb(6, 182, 212) บน rgb(246,247,249)  <SPAN.org-model-tag>  [ทีม / สมาชิก]  "claude-opus-4-8"
🟠  2.26  [minimal] rgb(6, 182, 212) บน rgb(246,247,249)  <SPAN.iso-adv-clause>  [ISO 9001:2015 QMS]  "ข้อ 4.3"
🟠  2.26  [dark] rgb(255, 255, 255) บน rgb(6,199,85)  <BUTTON.>  [/]  "💬 แชร์ทาง LINE"
🟠  2.28  [minimal] rgb(34, 197, 94) บน rgb(255,255,255)  <TD.>  [โรงงานอัจฉริยะ]  "185"
🟠  2.28  [minimal] rgb(34, 197, 94) บน rgb(255,255,255)  <SPAN.inv-fefo-chip>  [โรงงานอัจฉริยะ]  "📅 2027-06-28 · ปกติ"
🟠  2.28  [minimal] rgb(34, 197, 94) บน rgb(255,255,255)  <SPAN.ict-rev>  [🤝 การค้าระหว่างเมือง]  "รายได้"
🟠  2.28  [dark] rgb(255, 255, 255) บน rgb(34,197,94)  <BUTTON.brd-btn>  [บริษัท AI]  "✅ บอร์ดอนุมัติทั้งหมด & ไปขั้นต่อไป"
🟠  2.37  [minimal] rgb(16, 185, 129) บน rgb(246,247,249)  <BUTTON.skm-btn>  [บริษัท AI]  "🏢 ใช้ได้ (แพ็ก Scale)"
🟠  2.38  [minimal] rgb(154, 166, 216) บน rgb(255,255,255)  <DIV.pb-arch>  [บริษัท AI]  "🚀 ผู้พาไปถึงเป้า (The Hero) · มุ่งผลลัพ"
🟠  2.38  [minimal] rgb(154, 166, 216) บน rgb(255,255,255)  <DIV.mval-sub>  [บริษัท AI]  "ก่อนทุ่มสร้าง — ให้ CMO วิเคราะห์ JTBD ·"
🟠  2.38  [minimal] rgb(154, 166, 216) บน rgb(255,255,255)  <SPAN.mval-empty>  [บริษัท AI]  "เปิด Supabase เพื่อให้ CMO agent พิสูจน์"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <DIV.goal-brand>  [/]  "CEO AI Thailand"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.btn-export>  [/]  "ดูหน้าแนะนำ · แชร์ให้เพื่อน"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.db-export-btn>  [/]  "🖨️ รายงานผู้บริหาร (PDF)"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <SPAN.aha-time>  [/]  "⏱️ เหลือ ~ 5 นาที"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <DIV.db-card-value>  [/]  "16"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <DIV.db-roadmap-pct>  [/]  "29 % เสร็จแล้ว"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.db-cta-btn>  [/]  "คำนวณ ROI →"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <SPAN.aia-fab-label>  [/]  "AI Agent"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <SPAN.meta-chip>  [บริษัท AI]  "4 รออนุมัติ"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.ai-run-btn>  [บริษัท AI]  "เริ่มให้ทีม AI ทำงาน"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.intake-send>  [บริษัท AI]  "ให้ CEO มอบหมายงาน →"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <SPAN.ai-approval-impact>  [บริษัท AI]  "📋 เพิ่มตำแหน่ง: CQO (Quality) · รายงานต"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <SPAN.br-prop-xp>  [ห้องบอร์ด]  "+ 30 XP"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.br-approve>  [ห้องบอร์ด]  "✓ อนุมัติ (+ 30 XP)"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <BUTTON.br-goto>  [ห้องบอร์ด]  "ดูข้อมูล →"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <BUTTON.br-goto-sm>  [ห้องบอร์ด]  "เตรียมข้อมูล →"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.rc-btn-primary>  [ทรัพยากร]  "+ เพิ่ม"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.mk-filter>  [Marketplace]  "ทั้งหมด"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.mk-match-btn>  [Marketplace]  "จับคู่ →"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <BUTTON.dbd-link>  [หน้าร้านของฉัน]  "เปลี่ยนเอง"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.lean-tab>  [โรงงานอัจฉริยะ]  "มูดะ 7 ประการ"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.inv-cat-tab>  [โรงงานอัจฉริยะ]  "ทั้งหมด (3)"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.devmap-toggle>  [🏙️ เมืองบริษัท]  "🤝 มุมมองคู่ค้า"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <DIV.pls-eyebrow>  [💓 Pulse & A/B]  "💓 Pulse & A/B · วัดผลแบบโปร่งใส"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <SPAN.pls-hl>  [💓 Pulse & A/B]  "อยากใช้งานต่อ"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <SPAN.topup-price>  [แพ็กเกจ & ชำระเงิน]  "฿4,900"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.bill-choose>  [แพ็กเกจ & ชำระเงิน]  "เลือกแพ็กนี้"
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <DIV.bill-ribbon>  [แพ็กเกจ & ชำระเงิน]  "ยอดนิยม"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <BUTTON.iso-tab>  [ISO 9001:2015 QMS]  "ภาพรวม"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <BUTTON.pn-chip>  [ตัวช่วย PDPA]  "ติดต่อและให้บริการลูกค้า"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <BUTTON.pn-try-sample>  [ตัวช่วย PDPA]  "🎯 ยังไม่มีข้อมูล? ลองตัวอย่างสำเร็จรูป "
🟠  2.43  [minimal] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.ai-search-btn>  [AI Research]  "ค้นหา ✦"
🟠  2.43  [minimal] rgb(6, 182, 212) บน rgb(255,255,255)  <BUTTON.ai-case-banner-btn>  [AI Research]  "อ่าน Case Studies →"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.btn-export>  [/]  "ดูหน้าแนะนำ · แชร์ให้เพื่อน"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.db-export-btn>  [/]  "🖨️ รายงานผู้บริหาร (PDF)"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.db-cta-btn>  [/]  "คำนวณ ROI →"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <SPAN.aia-fab-label>  [/]  "AI Agent"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.ai-run-btn>  [บริษัท AI]  "เริ่มให้ทีม AI ทำงาน"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.intake-send>  [บริษัท AI]  "ให้ CEO มอบหมายงาน →"
🟠  2.43  [dark] rgb(26, 79, 138) บน rgb(2,6,23)  <DIV.ai-board-col-hd>  [บริษัท AI]  "กำลังทำ"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.br-approve>  [ห้องบอร์ด]  "✓ อนุมัติ (+ 30 XP)"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.rc-btn-primary>  [ทรัพยากร]  "+ เพิ่ม"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.mk-filter>  [Marketplace]  "ทั้งหมด"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.mk-match-btn>  [Marketplace]  "จับคู่ →"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.lean-tab>  [โรงงานอัจฉริยะ]  "มูดะ 7 ประการ"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.inv-cat-tab>  [โรงงานอัจฉริยะ]  "ทั้งหมด (3)"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.devmap-toggle>  [🏙️ เมืองบริษัท]  "🤝 มุมมองคู่ค้า"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.bill-choose>  [แพ็กเกจ & ชำระเงิน]  "เลือกแพ็กนี้"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <DIV.bill-ribbon>  [แพ็กเกจ & ชำระเงิน]  "ยอดนิยม"
🟠  2.43  [dark] rgb(255, 255, 255) บน rgb(6,182,212)  <BUTTON.ai-search-btn>  [AI Research]  "ค้นหา ✦"
🟠  2.45  [minimal] rgb(148, 163, 184) บน rgb(248,250,252)  <P.>  [/start]  "บอกว่าอยากขายอะไร ถนัดอะไร — CEO AI จะร่"
🟠  2.54  [minimal] rgb(16, 185, 129) บน rgb(255,255,255)  <SPAN.ai-badge>  [บริษัท AI]  "กำลังทำงาน"
🟠  2.54  [minimal] rgb(255, 255, 255) บน rgb(16,185,129)  <BUTTON.ai-btn-approve>  [บริษัท AI]  "อนุมัติ"
🟠  2.54  [minimal] rgb(16, 185, 129) บน rgb(255,255,255)  <SPAN.skm-value>  [บริษัท AI]  "มูลค่า ฿ 0"
🟠  2.54  [minimal] rgb(16, 185, 129) บน rgb(255,255,255)  <SPAN.skm-owned-badge>  [บริษัท AI]  "🏢 รวมในแพ็ก Scale"
🟠  2.54  [minimal] rgb(96, 165, 250) บน rgb(255,255,255)  <SPAN.skm-price-xp>  [บริษัท AI]  "+ 200 XP"
🟠  2.54  [minimal] rgba(255, 255, 255, 0.75) บน rgb(16,185,129)  <DIV.mk-stat-lbl>  [Marketplace]  "รายได้ค่าดำเนินการ ( 3 %)"
🟠  2.54  [minimal] rgb(255, 255, 255) บน rgb(16,185,129)  <DIV.mk-stat-num>  [Marketplace]  "฿1,350"
🟠  2.54  [minimal] rgb(16, 185, 129) บน rgb(255,255,255)  <SPAN.mk-verified>  [Marketplace]  "✓ Verified"
🟠  2.54  [minimal] rgb(16, 185, 129) บน rgb(255,255,255)  <DIV.mk-deal-fee>  [Marketplace]  "฿540"
🟠  2.54  [dark] rgb(255, 255, 255) บน rgb(16,185,129)  <BUTTON.ai-btn-approve>  [บริษัท AI]  "อนุมัติ"
🟠  2.54  [dark] rgba(255, 255, 255, 0.75) บน rgb(16,185,129)  <DIV.mk-stat-lbl>  [Marketplace]  "รายได้ค่าดำเนินการ ( 3 %)"
🟠  2.54  [dark] rgb(255, 255, 255) บน rgb(16,185,129)  <DIV.mk-stat-num>  [Marketplace]  "฿1,350"
🟠  2.56  [minimal] rgb(148, 163, 184) บน rgb(255,255,255)  <DIV.db-firstrun-hint>  [/]  "✨ ทำ 3 ก้าวด้านบนให้ครบก่อน — แล้ว Dashb"
🟠  2.56  [minimal] rgb(148, 163, 184) บน rgb(255,255,255)  <BUTTON.tool-collapse-lbl>  [บริษัท AI]  "ซ่อน"
🟠  2.56  [minimal] rgb(148, 163, 184) บน rgb(255,255,255)  <DIV.clw-sub>  [บริษัท AI]  "ทุกวันศุกร์ C-Level ทุกตำแหน่งวิเคราะห์ง"
🟠  2.56  [minimal] rgb(148, 163, 184) บน rgb(255,255,255)  <DIV.sip-cur>  [บริษัท AI]  "ช่วงปัจจุบัน: — วางรากฐาน — มีตัวตน ขายเ"
🟠  2.56  [minimal] rgb(148, 163, 184) บน rgb(255,255,255)  <DIV.brd-sub>  [บริษัท AI]  "AI Agent ดำเนินงานเสร็จ ระบบอัปเดตสถานะเ"
🟠  2.56  [minimal] rgb(148, 163, 184) บน rgb(255,255,255)  <SPAN.ops-sub>  [โรงงานอัจฉริยะ]  "ตัวชี้วัดออกแบบจาก BMC + ประเภทธุรกิจของ"
🟠  2.57  [dark] rgb(124, 58, 237) บน rgb(30,41,59)  <DIV.>  [โรงงานอัจฉริยะ]  "C-Level AI"
🟠  2.58  [minimal] rgb(248, 113, 113) บน rgb(246,247,249)  <SPAN.iso-adv-badge>  [ISO 9001:2015 QMS]  "เอกสารบังคับ"
🟠  2.58  [dark] rgb(59, 91, 219) บน rgb(30,41,59)  <SPAN.cs-badge>  [Case Studies]  "Semiconductor · Consumer Electronics · A"
🟠  2.77  [minimal] rgb(248, 113, 113) บน rgb(255,255,255)  <BUTTON.tool-del-btn>  [บริษัท AI]  "🗑️ ขอลบข้อมูล"
🟠  2.77  [minimal] rgb(248, 113, 113) บน rgb(255,255,255)  <SPAN.ict-exp>  [🤝 การค้าระหว่างเมือง]  "รายจ่าย"
🟠  2.77  [minimal] rgb(248, 113, 113) บน rgb(255,255,255)  <SPAN.iso-adv-level>  [ISO 9001:2015 QMS]  "เริ่มต้น — วางรากฐานระบบ"
🟠  2.79  [minimal] rgb(45, 106, 79) บน rgb(15,23,42)  <DIV.brd-role>  [บริษัท AI]  "▸ CMO · มณี"
🟠  2.79  [dark] rgb(45, 106, 79) บน rgb(15,23,42)  <DIV.brd-role>  [บริษัท AI]  "▸ CMO · มณี"
🟠  2.97  [minimal] rgb(217, 119, 6) บน rgb(246,247,249)  <DIV.iso-kpi-val>  [ISO 9001:2015 QMS]  "26"
🟡  3.15  [minimal] rgb(22, 163, 74) บน rgb(248,250,252)  <A.start-inline-link>  [/start]  "MIT 24 Steps คืออะไร →"
🟡  3.15  [minimal] rgb(22, 163, 74) บน rgb(248,250,252)  <TH.start-cmp-us>  [/start]  "CEO AI Thailand"
🟡   3.3  [minimal] rgb(22, 163, 74) บน rgb(255,255,255)  <DIV.start-core-tag>  [/start]  "เสาที่ 2 · วางระบบให้โต"
🟡  3.33  [minimal] rgb(14, 116, 144) บน rgb(15,23,42)  <SPAN.isms-badge>  [/]  "พัฒนาตามมาตรฐาน"
🟡  3.33  [minimal] rgb(14, 116, 144) บน rgb(15,23,42)  <SPAN.isms-badge-sub>  [/]  "ISMS · ความมั่นคงปลอดภัยสารสนเทศ"
🟡  3.52  [minimal] rgb(8, 145, 178) บน rgb(248,250,252)  <SPAN.start-h1-hl>  [/start]  "รู้ตัวเลขจริงของธุรกิจก่อน แล้วค่อยตัดสิ"
🟡  3.54  [minimal] rgb(8, 145, 178) บน rgb(236,254,255)  <SPAN.start-timing-big>  [/start]  "87%"
🟡  3.54  [minimal] rgb(71, 85, 105) บน rgb(56,189,248)  <SPAN.edge-ring-lbl>  [🏙️ เมืองบริษัท]  "/ 100"
🟡  3.56  [dark] rgb(59, 91, 219) บน rgb(2,6,23)  <DIV.cs-keylesson-label>  [Case Studies]  "💡 บทเรียนสำคัญ"
🟡  3.68  [minimal] rgb(8, 145, 178) บน rgb(255,255,255)  <SPAN.start-brand>  [/start]  "🏢 CEO AI Thailand"
🟡  3.68  [dark] rgb(255, 255, 255) บน rgb(59,130,246)  <BUTTON.skm-btn>  [บริษัท AI]  "🛒 ซื้อ Skill"
🟡   3.7  [dark] rgb(220, 38, 38) บน rgb(15,23,42)  <DIV.iso-kpi-val>  [ISO 9001:2015 QMS]  "0 %"
🟡  3.73  [dark] rgb(196, 75, 43) บน rgb(15,23,42)  <SPAN.sadv-official>  [บริษัท AI]  "Official"
🟡  3.75  [minimal] rgb(100, 116, 139) บน rgb(15,23,42)  <DIV.sidebar-plan-badge>  [/]  "Local Dev"
🟡  3.75  [dark] rgb(100, 116, 139) บน rgb(15,23,42)  <DIV.sidebar-plan-badge>  [/]  "Local Dev"
🟡  3.75  [dark] rgb(100, 116, 139) บน rgb(15,23,42)  <TD.>  [โรงงานอัจฉริยะ]  "100 / 600"
🟡  3.76  [minimal] rgb(239, 68, 68) บน rgb(255,255,255)  <DIV.danger-hd>  [ทีม / สมาชิก]  "🗑 Danger Zone"
🟡  3.76  [minimal] rgb(239, 68, 68) บน rgb(255,255,255)  <DIV.an-card-sub>  [SaaS Analytics]  "ยังไม่มีข้อมูล"
🟡  3.89  [dark] rgb(239, 68, 68) บน rgb(30,41,59)  <DIV.factory-kpi-val>  [โรงงานอัจฉริยะ]  "0%"
🟡  3.96  [dark] rgb(255, 255, 255) บน rgb(168,85,247)  <BUTTON.pb-btn>  [บริษัท AI]  "🎨 เสนอแบรนด์ → CEO → บอร์ด"
🟡  3.98  [dark] rgb(59, 130, 246) บน rgb(30,41,59)  <BUTTON.factory-status-badge>  [โรงงานอัจฉริยะ]  "🔧 Maintenance"
🟡  4.06  [minimal] rgb(111, 124, 174) บน rgb(255,255,255)  <DIV.clw-empty>  [บริษัท AI]  "เปิด Supabase เพื่อให้ C-Level agent วิเ"
🟡  4.06  [minimal] rgb(99, 102, 241) บน rgb(240,244,255)  <SPAN.bill-addon-per>  [แพ็กเกจ & ชำระเงิน]  "–49,999/ปี"
🟡  4.06  [dark] rgb(99, 102, 241) บน rgb(240,244,255)  <SPAN.bill-addon-per>  [แพ็กเกจ & ชำระเงิน]  "–49,999/ปี"
🟡  4.08  [minimal] rgb(255, 255, 255) บน rgb(47,125,225)  <SPAN.clv-tag>  [🏙️ เมืองบริษัท]  "คุณอยู่ที่นี่"
🟡  4.08  [dark] rgb(255, 255, 255) บน rgb(47,125,225)  <SPAN.clv-tag>  [🏙️ เมืองบริษัท]  "คุณอยู่ที่นี่"
🟡  4.16  [minimal] rgb(107, 114, 128) บน rgb(236,238,242)  <DIV.db-insight-tag>  [/]  "Case Study · Tencent"
🟡  4.16  [minimal] rgb(107, 114, 128) บน rgb(236,238,242)  <SPAN.ai-co-lbl>  [บริษัท AI]  "ประเภทธุรกิจ (DBD)"
🟡  4.18  [dark] rgb(220, 38, 38) บน rgb(2,6,23)  <DIV.iso-hm-pct>  [ISO 9001:2015 QMS]  "0 %"
🟡  4.22  [minimal] rgb(15, 23, 42) บน rgb(24,119,242)  <A.plg-ref-copy>  [หน้าร้านของฉัน]  "f แชร์ไป Facebook"
🟡  4.22  [dark] rgb(15, 23, 42) บน rgb(24,119,242)  <A.plg-ref-copy>  [หน้าร้านของฉัน]  "f แชร์ไป Facebook"
🟡  4.23  [minimal] rgb(255, 255, 255) บน rgb(139,92,246)  <SPAN.clw-badge>  [บริษัท AI]  "อัตโนมัติทุกศุกร์"
🟡  4.23  [dark] rgb(255, 255, 255) บน rgb(139,92,246)  <SPAN.clw-badge>  [บริษัท AI]  "อัตโนมัติทุกศุกร์"
🟡  4.24  [dark] rgb(100, 116, 139) บน rgb(2,6,23)  <TD.start-cmp-them>  [/start]  "ธุรกิจยังพึ่งเจ้าของ"
🟡  4.35  [minimal] rgb(255, 255, 255) บน rgb(124,92,255)  <BUTTON.magent-run>  [ซื้อขาย B2B (RFQ)]  "✨ ให้เอเจนต์จับคู่ธุรกิจ"
🟡  4.35  [dark] rgb(255, 255, 255) บน rgb(124,92,255)  <BUTTON.magent-run>  [ซื้อขาย B2B (RFQ)]  "✨ ให้เอเจนต์จับคู่ธุรกิจ"
🟡  4.39  [minimal] rgb(196, 75, 43) บน rgb(253,243,240)  <DIV.db-a-label>  [/]  "Priority 1"
🟡  4.39  [minimal] rgb(196, 75, 43) บน rgb(253,243,240)  <SPAN.skm-tier-badge>  [บริษัท AI]  "Enterprise"
🟡  4.39  [dark] rgb(196, 75, 43) บน rgb(253,243,240)  <DIV.db-a-label>  [/]  "Priority 1"
🟡  4.39  [dark] rgb(196, 75, 43) บน rgb(253,243,240)  <SPAN.skm-tier-badge>  [บริษัท AI]  "Enterprise"
🟡   4.4  [minimal] rgb(111, 124, 174) บน rgb(15,23,42)  <SPAN.finx-hint>  [บริษัท AI]  "รูปแบบ: ชื่อรายการ, จำนวนเงิน, ประเภท(รั"
🟡   4.4  [minimal] rgb(111, 124, 174) บน rgb(15,23,42)  <DIV.cs-empty>  [บริษัท AI]  "ยังไม่มีแผนดำเนินงาน — ตั้งทีมขายแล้วกด "
🟡   4.4  [dark] rgb(111, 124, 174) บน rgb(15,23,42)  <SPAN.finx-hint>  [บริษัท AI]  "รูปแบบ: ชื่อรายการ, จำนวนเงิน, ประเภท(รั"
🟡   4.4  [dark] rgb(111, 124, 174) บน rgb(15,23,42)  <DIV.cs-empty>  [บริษัท AI]  "ยังไม่มีแผนดำเนินงาน — ตั้งทีมขายแล้วกด "
🟡   4.4  [dark] rgb(111, 124, 174) บน rgb(15,23,42)  <DIV.clw-empty>  [บริษัท AI]  "เปิด Supabase เพื่อให้ C-Level agent วิเ"

พบ 217 คลาส — แก้โดยใช้โทเคนธีม (var(--ink)/--ink3/--accent-text) แทนสีตายตัว
```
