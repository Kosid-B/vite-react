# Feasibility — Equity Research / Investment Analysis บน CEO AI Thailand (สำรวจ)

> สถานะ: **สำรวจ (explore) — ยังไม่ build เข้าโปรดักต์** · จุดประสงค์: ประเมินว่าชุดความสามารถวิเคราะห์การลงทุน
> (Company Tearsheet, DCF, Comparables, Earnings, Investment Memo, Long/Short Pitch, Portfolio Risk,
> Three-Statement Model, Model Audit, Thesis/Catalyst tracking) ทำได้แค่ไหน + เข้ากับโปรดักต์ไหม

## บริบท
วิดีโอทดสอบ (ก.ค. 2569) ยืนยันว่า Gemini + ChatGPT อธิบาย CEO AI Thailand ได้ตรง positioning
= **"ทีมผู้บริหาร AI สำหรับ SME ไทย (multi-agent ไม่ใช่แชตบอต)"** — positioning นี้เพิ่งชนะ จึงต้องระวัง
ไม่เอา domain ใหม่มาเจือจนสับสน

---

## 1. ทำได้จริงแค่ไหน — แยกตาม "วัตถุดิบข้อมูลที่ต้องมี"
สถาปัตยกรรมปัจจุบัน (multi-agent + edge functions `ai-assist`/`agent-run` + Serper Google Search)
เก่ง **reasoning/เขียน/ค้นข่าว** แต่ **ไม่มี financial data feed** (งบการเงิน/ราคา/มัลติเปิล)

| ความสามารถ | ทำได้ตอนนี้ | ติดตรงไหน |
|---|---|---|
| Investment Memo / Long-Short Pitch | 🟢 ได้เลย | งานเขียน/สังเคราะห์ (มี prototype แล้ว — ดูข้อ 4) |
| Thesis / Catalyst tracking (calendar/watchlist) | 🟢 ได้ | tracking + ข่าว (Serper) — โครงสร้างข้อมูลง่าย |
| Earnings Preview/Deep Dive | 🟡 บางส่วน | ได้จากข่าวสาธารณะ · ตัวเลขงบต้องมี data จริง |
| Company Tearsheet | 🟡 บางส่วน | โครงร่างได้ · ตัวเลขต้องมาจาก data |
| DCF / Comparables Valuation | 🔴 ยังไม่แม่น | ต้องมีงบ + ราคา/มัลติเปิลจริง (มั่วจากข่าวไม่ได้) |
| Three-Statement Model | 🔴 ยังไม่ได้ | เป็นงาน spreadsheet ผูกสูตร + งบย้อนหลัง |
| Model Audit | 🔴 ต้องมีโมเดลก่อน | ต่อ xlsx + ตรวจสูตร |
| Portfolio Risk | 🔴 ยังไม่ได้ | ต้องมี price/position data + คำนวณเชิงปริมาณ |

**ต้นตอเดียวที่บล็อกกลุ่ม 🔴 = ไม่มีแหล่งข้อมูลการเงินจริง** — ไม่ใช่เรื่อง AI คิดไม่เป็น แต่ไม่มี "วัตถุดิบ"
ที่ verify ได้ · การให้ AI เดาตัวเลขงบ/ราคา = **อันตรายกับการตัดสินใจลงทุน** (ต้องกันเด็ดขาด)

## 2. ช่องว่างจริง = Data Infrastructure
ถ้าจะไปกลุ่ม 🔴 ต้องลงทุนต่อ **แหล่งข้อมูลการเงิน** อย่างใดอย่างหนึ่งก่อน:
- SET / ตลท. (หุ้นไทย) · SEC filings/EDGAR (หุ้นสหรัฐ) · ผู้ให้บริการ data (เช่น Financial Modeling Prep, Alpha Vantage, EOD)
- ราคาตลาด + มัลติเปิล + งบ 3 ปีขึ้นไป
= โปรเจกต์ระดับ infrastructure (ไม่ใช่แค่ prompt)

## 3. เข้ากับ positioning ไหม + ทางเลือก
Equity Research = **คนละ persona** (กองทุน/นักวิเคราะห์/นักลงทุน) กับ SME business-builder ปัจจุบัน

| ทางเลือก | เหมาะเมื่อ | ความพร้อม |
|---|---|---|
| **A. ต่อยอด `CFO AI`** (การเงิน**ธุรกิจตัวเอง**ของ SME: cash flow/KPI/valuation ธุรกิจตัวเองแบบง่าย) | อยู่ในคอนเซปต์เดิม ไม่เจือ positioning | 🟢 ทำได้เลย ไม่ต้อง data feed |
| **B. Skill ขายใน Marketplace** (ผู้เชี่ยวชาญการเงินขายบริการวิเคราะห์ · AI ช่วยร่าง) | มีซัพพลายผู้เชี่ยวชาญ | 🟢 ทำได้ (คนจริง + AI) |
| **C. โปรดักต์แยก Investment Research AI** | จริงจังตลาดนักลงทุน | 🔴 ต้องลงทุน data infra ก่อน = โปรเจกต์ใหญ่ + คนละแบรนด์ |

**ข้อควรระวัง:** อย่ายัด sell-side research เข้าโปรดักต์ SME เดิม — จะทำให้ positioning ที่ AI เพิ่งจำได้ถูกต้อง (ข้อ บริบท) เบลอ

---

## 4. Prototype ที่ทำแล้ว (ความสามารถกลุ่ม 🟢)
`src/lib/investmentMemo.ts` (pure · tested · **ยังไม่ผูก nav/UI**):
- `investmentMemoPrompt(input)` — instruction ให้ `ai-assist` เขียน memo คม ๆ · **กติกาห้ามแต่งตัวเลข** · บังคับมี **Kill criteria**
- `renderMemoOutline(input)` — จัดโครง memo แบบ local (ไม่ต้องมี AI ก็เห็นรูป) + เตือนเรื่อง data + disclaimer
- ทดสอบ `src/lib/__tests__/investmentMemo.test.ts` (5 เคส)

### ตัวอย่างผลลัพธ์จริง (จาก `renderMemoOutline`)
```markdown
# Investment Memo — ตัวอย่าง เทค (DEMO)

**คำแนะนำ:** LONG (ซื้อ/ถือ) · conviction: medium · เป้า: +30% ใน 12 เดือน · กรอบเวลา: 12 เดือน

## Thesis
ตลาดให้ค่าธุรกิจ recurring ต่ำเกินไปหลังบริษัทเปลี่ยนโมเดลเป็น subscription

## ตัวขับเคลื่อนหลัก (ทำไมตลาดมองผิด)
- สัดส่วนรายได้ recurring โต 40%→65% ใน 2 ปี
- churn ลดจาก 5%→2.5% หลังปรับ onboarding
- gross margin ขยายจาก mix ที่ดีขึ้น

## กรอบ Valuation
- วิธีที่ควรใช้: (DCF / Comparables / Sum-of-parts — เลือกตามธุรกิจ)
- ⚠️ ตัวเลขต้องดึงจาก งบการเงินจริง + ราคาตลาด ก่อนสรุป (prototype นี้ยังไม่ต่อ data feed)

## Catalysts (ตัวเร่ง + กรอบเวลา)
- ประกาศงบ Q3 (คาด recurring เร่งตัว) — พ.ย. 2569
- เปิดตัวสินค้าใหม่ + ตลาด CLMV — Q1 2570

## ความเสี่ยงหลัก
- การแข่งขันด้านราคาจากเจ้าใหญ่
- พึ่งลูกค้า enterprise ไม่กี่ราย (>30% ของรายได้)

## Kill criteria (อะไรทำให้เลิก thesis)
- (เงื่อนไขที่วัดได้ เช่น "ถ้า margin ต่ำกว่า X 2 ไตรมาสติด")

⚠️ เอกสารช่วยจัดโครงเท่านั้น ไม่ใช่คำแนะนำการลงทุน · ตัวเลข/valuation ต้องยืนยันกับข้อมูลการเงินจริงก่อนใช้
```

## 5. ข้อสรุป + ถ้าจะไปต่อ
- **เขียน/สังเคราะห์/ติดตาม** (Memo, Thesis, Catalyst, Earnings preview) → พร้อมสุด · prototype พิสูจน์แล้ว
- **โมเดล/valuation เชิงตัวเลข** (DCF, 3-statement, Comparables, Portfolio risk) → **ต้องมี data infra ก่อน** ถึงจะแม่นและปลอดภัย
- **แนะนำ:** ถ้าจะทำจริง เริ่มที่ **ทางเลือก A** (ต่อยอด CFO AI สำหรับธุรกิจตัวเองของ SME) — อยู่ใน positioning + ไม่ต้องรอ data feed · ส่วน sell-side research (ทางเลือก C) เก็บเป็นโปรดักต์แยกในอนาคตเมื่อพร้อมลงทุน data
