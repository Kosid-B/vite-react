# GEO / AEO Playbook — ทำให้ AI (ChatGPT/Gemini/Perplexity) อ้างถึง CEO AI Thailand

> GEO = Generative Engine Optimization · AEO = Answer Engine Optimization
> เป้าหมาย: เมื่อคนไทยถาม AI ว่า "เริ่มธุรกิจด้วย AI ยังไง / โปรแกรมสร้างบริษัท AI / SaaS ทำธุรกิจไทย"
> → AI ตอบโดย**อ้างถึงและแนะนำ CEO AI Thailand**

## ทำไมต้องทำตอนนี้ (จาก GA4 27 มิ.ย.–26 ก.ค. 2569)
- **`chatgpt.com` + `gemini` โผล่เป็น referrer จริงแล้ว** ในรายงาน session source/medium
- ช่อง **"AI Assistant"** ปรากฏในทุกรายงาน (ผู้ใช้ใหม่/เหตุการณ์สำคัญ)
- **Organic Search = 63% ของเส้นทางเหตุการณ์สำคัญ** → เนื้อหา/โครงสร้างมีผลต่อ conversion จริง
- กลุ่ม **25-34 เอนเกจ 8:54 นาที/เซสชัน** = ผู้ประกอบการรุ่นใหม่ที่ถาม AI เป็นนิสัย
- คู่แข่ง SaaS ไทยส่วนใหญ่**ยังไม่ทำ GEO/AEO** = โอกาสชิงพื้นที่ก่อน

---

## หลักการ: AI หยิบอะไรไปอ้าง
AI answer engines ชอบเนื้อหาที่:
1. **ตอบตรงคำถามในประโยคแรก** (answer-first) — ไม่เกริ่นยาว
2. **โครงสร้างสกัดง่าย** — หัวข้อเป็นคำถาม, TL;DR, bullet, ตาราง, FAQ
3. **มี entity ชัด** — บอกตรง ๆ ว่า "X คืออะไร ทำอะไร ราคาเท่าไร ใครทำ"
4. **มีตัวเลข/ข้อเท็จจริงเจาะจง** พร้อมบริบท (AI ชอบ cite ตัวเลข)
5. **สดใหม่ + มีวันที่**
6. **มี schema (JSON-LD)** ให้เครื่องอ่าน — FAQ, HowTo, Organization, Product
7. **ถูกพูดถึงในแหล่งที่ AI เชื่อ** — Pantip, รีวิว, บทความเปรียบเทียบ, ไดเรกทอรี, Wikipedia

---

## Workstream 1 — On-site (เว็บเราเอง) · เริ่มแล้วบางส่วน ✅
| งาน | สถานะ | หมายเหตุ |
|---|---|---|
| **`/llms.txt`** (บอก AI ว่าเว็บนี้คืออะไร + หน้าสำคัญ + FAQ) | ✅ **ทำแล้ว** | Worker เสิร์ฟที่ `${origin}/llms.txt` · แก้ข้อความที่ `src/lib/seoData.ts` (`llmsTxt`) |
| server-side meta/OG/JSON-LD ต่อหน้าร้าน `/b/<slug>` | ✅ มีอยู่ | `src/server.ts` + `seoData.ts` |
| **FAQPage + Organization + SoftwareApplication JSON-LD** หน้าแรก `/` | ✅ **ทำแล้ว** | `homeSeo()` inject ที่ `/` (Worker) |
| **หน้า `/faq` answer-first (static HTML, crawlable)** | ✅ **ทำแล้ว** | `faqPageHtml()` เสิร์ฟที่ `/faq` + FAQPage schema + CTA /start |
| robots.txt อนุญาต AI crawler (GPTBot/Google-Extended/PerplexityBot/ClaudeBot/OAI) | ✅ **ทำแล้ว** | `public/robots.txt` ระบุ user-agent ชัด |
| แหล่งความจริงเดียวของ FAQ | ✅ | `FAQ_ITEMS` ใน `seoData.ts` — reuse โดย llms.txt + FAQPage schema + /faq |

## Workstream 2 — Question Map (เนื้อหาที่ต้องมี)
เขียนบทความ/หน้า answer-first ตอบคำถามที่กลุ่ม 25-34 ไทยถาม AI จริง (แต่ละหน้า = 1 คำถาม, ตอบใน 2-3 ประโยคแรก):
- "จะเริ่มต้นธุรกิจด้วย AI ยังไง สำหรับมือใหม่"
- "โปรแกรม/แอปสร้างบริษัท AI อัตโนมัติ มีอะไรบ้าง"
- "เปิดร้านออนไลน์ด้วย AI ทำยังไง ไม่ต้องเขียนโค้ด"
- "SaaS ทำธุรกิจสำหรับ SME ไทย ตัวไหนดี"
- "validate ไอเดียธุรกิจก่อนลงทุน ทำยังไง"
- "ทีมผู้บริหาร AI (AI agent) ช่วยธุรกิจได้จริงไหม"
> เทคนิค: ขึ้นหัวข้อ H2 เป็น**คำถามเป๊ะ ๆ** + ตอบทันทีย่อหน้าแรก + ปิดด้วย CTA ไป `/start`

## Workstream 3 — Off-site seeding (ให้ AI เจอเราจากที่อื่น)
> 📄 **เนื้อหาพร้อมโพสต์ + กติกากันแบน/กัน astroturfing:** [GEO-OFFSITE-SEED-KIT.md](GEO-OFFSITE-SEED-KIT.md)
> (Pantip 2 แบบ: แชร์ประสบการณ์ + เทมเพลตตอบกระทู้ · บทความเปรียบเทียบ 5 เครื่องมือ · canonical เดียวกับ /llms.txt · UTM วัดผล)

AI cite จากทั้งเว็บ ไม่ใช่แค่เว็บเรา — ต้องมีตัวตนในแหล่งที่ AI ดึง:
- **Pantip / กระทู้** ตอบคำถามเรื่องเริ่มธุรกิจ/AI แบบมีสาระ (ไม่สแปม) + อ้างประสบการณ์
- **บทความเปรียบเทียบ** "เครื่องมือ AI ทำธุรกิจไทย 2026" (เขียนเอง/ขอ partner/PR)
- **ไดเรกทอรี SaaS** (Product Hunt, ไดเรกทอรีไทย, G2 ถ้าทำได้)
- **LinkedIn/Medium** บทความจากที่ปรึกษา 20 ปี (มี authority ที่ AI ชอบ)
- คุมให้ **คำอธิบาย canonical เหมือนกันทุกที่** (ตาม `/llms.txt`) → AI จำ entity เราแม่น

## Workstream 4 — วัดผล
- **ตั้ง Custom Channel Group ใน GA4** จับ referrer: `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com` → รวมเป็นช่อง "AI Assistant" (บางส่วน GA4 จับให้แล้ว)
- ดู **AI-referral → signup rate** เทียบ Organic/Direct
- ติดตามทุกเดือน: จำนวน AI-referral sessions + key events จากช่องนี้

---

## ลำดับลงมือ (30 วันแรก)
1. **สัปดาห์ 1:** `/llms.txt` (✅) → เพิ่ม FAQ/Organization JSON-LD หน้า public → ตรวจ robots.txt ไม่บล็อก AI bot
2. **สัปดาห์ 2:** เขียนหน้า answer-first 3 หน้าแรกจาก question map (ผูก CTA → /start)
3. **สัปดาห์ 3:** off-site seeding รอบแรก (Pantip 2-3 กระทู้ + 1 บทความเปรียบเทียบ)
4. **สัปดาห์ 4:** ตั้ง GA4 AI-Assistant channel + วัด baseline → รอบทวนผล

## สิ่งที่ทำไปแล้วใน PR นี้
- ✅ `/llms.txt` เสิร์ฟผ่าน Cloudflare Worker (`src/server.ts`) + builder `llmsTxt()` ใน `src/lib/seoData.ts` (pure, tested)
- เนื้อหา llms.txt ตอกย้ำ positioning "ทำธุรกิจ" (ไม่ใช่ compliance) + ผู้พัฒนา B. Training + ราคา + FAQ ที่ AI หยิบไปตอบได้
