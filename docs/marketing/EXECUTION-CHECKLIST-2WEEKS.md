# Execution Checklist — 2 สัปดาห์ (เปลี่ยน "ระบบที่สร้างไว้" → "ผลลัพธ์จริง")
> เป้าหมาย: ให้เห็น 3 ตัวเลขใน GA4 ภายใน 2-4 สัปดาห์ →
> (1) source `btctraining/content_card` โผล่ · (2) event `purchase` เริ่มมี · (3) ไทย new users โตต่อเนื่อง
> เรียงตาม ROI · ⏱️ = เวลาโดยประมาณ · ✅ = เกณฑ์ว่าทำสำเร็จ

---

## 🔴 สัปดาห์ที่ 1 — วางรากฐาน + เปิดการวัดผล (สำคัญสุด ทำก่อน)

### วัน 1-2: ติดตั้งสะพาน (bridge) ให้ครบ
- [ ] **วางการ์ด static 5 หน้าให้ครบ** (ที่ปรึกษา/มอก./BCMS/training/สร้างธุรกิจ) — โค้ดอยู่ใน `docs/integrations/btctraining-static-cards-5.html`
  - ⏱️ 30 นาที · ✅ เปิดแต่ละหน้าเห็นการ์ดฟ้าท้ายบทความ
- [ ] **เช็กการ์ด BCMS เก่าที่ชี้ผิด** — หน้าไหนยังชี้ `ceoaithailand.org/start?...campaign=bcms` แก้เป็น `bcms.theossphere.com`
  - ⏱️ 10 นาที · ✅ ทุกการ์ด BCMS ชี้ bcms.theossphere.com
- [ ] **เปลี่ยน floating banner เป็นธีมสว่าง** — โค้ดใน `docs/integrations/btctraining-floating-banner-light.html` (ตั้งค่า → โค้ดและสคริปต์ → ภายใต้ `<head>`)
  - ⏱️ 10 นาที · ✅ แถบล่างเป็นพื้นขาว-ฟ้า
- [ ] **แก้ footer ตัวหนังสือมองไม่เห็น** — เมนูน้ำเงินท้ายเว็บ เปลี่ยนสีตัวอักษรเป็นขาว (ตกแต่ง → เมนูท้าย)
  - ⏱️ 10 นาที · ✅ อ่านลิงก์ footer ออกชัด

### วัน 2-3: เปิดการวัดรายได้ (Stripe → GA4)
- [ ] **สร้าง GA4 Measurement Protocol secret** — GA4 → Admin → Data Streams → เลือก stream → Measurement Protocol API secrets → Create
  - ⏱️ 5 นาที · ✅ ได้ค่า secret
- [ ] **ตั้ง secret + deploy webhook**
  ```
  supabase secrets set GA_API_SECRET=<secret> --project-ref waigsnxhrlwtiotspaim
  supabase functions deploy stripe-webhook --no-verify-jwt --project-ref waigsnxhrlwtiotspaim
  ```
  - ⏱️ 5 นาที · ✅ deploy สำเร็จ

### วัน 3-4: ตั้ง GA4 funnel + key events
- [ ] **Mark key events** — GA4 → Admin → Events → toggle "Mark as key event": `bridge_click`, `sign_up`, `plan_selected`, `purchase`
  - ⏱️ 5 นาที · ✅ 4 events มีธง key
- [ ] **สร้าง Funnel exploration 5 ขั้น** — bridge_click → page_view(/start) → sign_up → plan_selected → purchase (คู่มือใน `MARKET-VALIDATION-GA4.md`)
  - ⏱️ 15 นาที · ✅ เห็น funnel + % drop แต่ละขั้น
- [ ] **สร้าง comparison "Country = Thailand"** (ตัด bot noise) เป็นมุมมองหลัก
  - ⏱️ 5 นาที · ✅ ดูตัวเลขไทยล้วนได้

### วัน 4-5: SEO ที่ค้าง (ROI สูง ทำครั้งเดียว)
- [ ] **Submit sitemap.xml เข้า Google Search Console** (verified แล้ว เหลือกดส่ง `https://ceoaithailand.org/sitemap.xml`)
  - ⏱️ 5 นาที · ✅ GSC ขึ้น "Success"
- [ ] **Rich Results Test** 1 หน้าร้าน `/b/<slug>` — ยืนยัน JSON-LD ถูก
  - ⏱️ 5 นาที · ✅ ผ่าน ไม่มี error
- [ ] **เช็ก robots.txt ไม่บล็อก AI bots** (GPTBot, Google-Extended, PerplexityBot, ClaudeBot) — ตาม `GEO-LLM-SEO-PLAN.md`
  - ⏱️ 5 นาที · ✅ ไม่มี Disallow bots เหล่านี้

### วัน 5-7: ทดสอบ end-to-end (พิสูจน์ว่าวัดได้จริง)
- [ ] **ทดสอบซื้อจริง 1 รอบ** (หรือ Stripe test) → เช็ก GA4 Realtime เห็น `purchase` + value
  - ⏱️ 15 นาที · ✅ purchase โผล่ใน Realtime พร้อมยอดเงิน
- [ ] **กดการ์ด bridge เอง 1 ครั้ง** → เช็ก GA4 Realtime เห็น `bridge_click`
  - ⏱️ 5 นาที · ✅ bridge_click โผล่

**🏁 จบสัปดาห์ 1: ระบบครบ + วัดได้จริง — พร้อมดึง traffic เข้า funnel**

---

## 🟡 สัปดาห์ที่ 2 — ดึงคน + คอนเทนต์ (ขยายผล)

### วัน 8-9: คอนเทนต์เจาะ 25-34 (organic ก่อน ฟรี)
- [ ] **ถ่าย/ทำ 2 คลิปแรก** จากเฟรม + CapCut ที่มี (`iso-short-infographic-*` + `CONTENT-25-34-GEO-ADS.md`)
  - ⏱️ 2-3 ชม. · ✅ ได้ 2 คลิป 9:16 พร้อมโพสต์
- [ ] **โพสต์ organic** (TikTok/Reels/YT Shorts) เวลาพีค 10 โมง/บ่าย 3 · bio link ติด utm
  - ⏱️ 30 นาที · ✅ โพสต์แล้ว วัด engagement

### วัน 9-11: GEO/LLM-SEO (จับ AI Assistant)
- [ ] **ปรับ 3 บทความเดิม** (ที่ปรึกษา ISO / PDPA / audit) — เพิ่ม: ตอบตรงย่อหน้าแรก + ตัวเลข + FAQ
  - ⏱️ 2 ชม. · ✅ แต่ละบทความมี FAQ + ราคา/ตัวเลขชัด
- [ ] **เขียน 2 บทความใหม่**: "ขอ มอก. 10 ขั้น (HowTo)" → TIS · "BCM/ISO 22301 คืออะไร" → BCMS
  - ⏱️ 3 ชม. · ✅ 2 บทความ + bridge card ในหน้า

### วัน 11-12: ทดสอบ geo-ad เล็ก (หลัง organic พิสูจน์)
- [ ] **เปิด geo-ad ฿300/วัน 1 โซน** (ระยอง/มาบตาพุด) 1 สัปดาห์ — creative = คลิปที่ engagement ดีสุด
  - ⏱️ 30 นาที · ✅ แคมเปญรัน · เกณฑ์ขยาย: CPC<฿5, landing→signup>10%

### วัน 12-14: วัดผล + ปรับ
- [ ] **เช็ก GA4 (กรอง Thailand)**: `content_card` โผล่ยัง? · funnel drop ตรงไหน? · purchase มีไหม?
  - ⏱️ 30 นาที · ✅ รู้ว่าจุดไหนรั่ว
- [ ] **ทดสอบถาม AI** 5 คำถาม (ราคาที่ปรึกษา ISO/ขอ มอก./BCM/PDPA/audit) ใน ChatGPT+Gemini → จดว่าเอ่ยถึงเราไหม
  - ⏱️ 20 นาที · ✅ รู้ว่า AI รู้จักเราช่องไหน

**🏁 จบสัปดาห์ 2: มี data จริงบอกว่าอะไรได้ผล → ทุ่มต่อจุดนั้น**

---

## 📊 Dashboard ที่ต้องดูทุกสัปดาห์ (กรอง Thailand)
| ตัวชี้วัด | ที่ไหน | เกณฑ์ "ดีขึ้นจริง" |
|---|---|---|
| source `btctraining/content_card` | GA4 → Acquisition | มีตัวเลข = สะพานได้ผล |
| event `purchase` (value รวม) | GA4 → Monetization | > ฿0 = เริ่มมีรายได้จริง |
| Funnel conversion แต่ละขั้น | GA4 → Explore → Funnel | หาขั้นที่ drop มากสุด = จุดแก้ต่อ |
| channel "AI Assistant" | GA4 → Acquisition | โต = GEO ได้ผล |
| ไทย new users | GA4 (Thailand filter) | โตต่อเนื่อง = ตลาดจริงโต |

## กติกาสำคัญ
- **ทำสัปดาห์ 1 ให้ครบก่อน** (วางระบบ) — อย่าข้ามไปยิงแอดก่อนวัดผลได้
- **organic ก่อนเสมอ** — พิสูจน์คลิป/คอนเทนต์ฟรีก่อน แล้วค่อยเอาตัวที่ดีไปยิงแอด
- **ยิงแอดเล็ก วัดจริง ค่อยเท** — organic CAC ต่ำอยู่แล้ว อย่าเผางบก่อนพิสูจน์ conversion
- **ดูเลขกรอง Thailand** — ตัด bot noise (US/Linux) ออกก่อนตัดสินใจ
