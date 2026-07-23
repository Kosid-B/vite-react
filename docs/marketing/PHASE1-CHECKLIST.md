# เฟส 1 Checklist — "เปิดสะพาน" (สัปดาห์ 1–2)

> เป้า: ทำให้ funnel เริ่มมีคนไหลจริง + วัดผลได้ · tick ทีละข้อ
> อ้างอิงแผน: `GTM-MASTER-PLAN.md` · `PROMOTION-ENGINE.md`

## 🌉 A. วางสะพาน b-tctraining → /start (สำคัญสุด)
- [ ] วางการ์ด bridge หน้า **consultant** (จาก `btctraining-iso-bridge-cards.html` บล็อก [4])
- [ ] วางการ์ด **pdpa** (บล็อก [5])
- [ ] วางการ์ด **iso22301** (บล็อก [1])
- [ ] วางการ์ด **ims** (บล็อก [2])
- [ ] วางการ์ด **training** (บล็อก [3])
- [ ] วางการ์ด **bmc** (บล็อก [6])
> วิธี: เปิดบทความ R-Web → โหมด HTML → วางกลาง/ท้ายบทความ → บันทึก

## 📝 B. เผยแพร่คอนเทนต์ (feed ช่อง Organic ที่พิสูจน์แล้ว)
- [ ] โพสต์บทความ **"7 เอกสาร auditor ขอบ่อย"** (`blog/html/iso-audit-7-documents-2569.html`)
- [ ] โพสต์บทความ **"จ้างที่ปรึกษา ISO ราคา"** (`blog/html/iso-consultant-cost-diy-2569.html`)
- [ ] โพสต์บทความ **"PDPA ต้องทำเอกสารอะไรบ้าง"** (`blog/html/pdpa-documents-checklist-2569.html`)
- [ ] โพสต์ **LinkedIn founder** (`social/linkedin-founder-week1.md`) + ลิงก์ในคอมเมนต์แรก

## 🔍 C. SEO / GSC (ทำครั้งเดียว ได้ผลยาว)
- [x] ยืนยัน GSC ceoaithailand.org ✅ (เสร็จแล้ว)
- [ ] ส่ง sitemap `sitemap.xml` ใน GSC → Submit
- [ ] (ถ้ามีสิทธิ์) เพิ่ม property b-tctraining.com + ส่ง sitemap ของมัน

## 💳 D. เปิดช่องรับเงินให้ครบ (ถ้ายังไม่ได้ทำ)
- [x] Stripe webhook ยืนยัน 200 ✅
- [ ] สร้าง Stripe Payment Link **ISO Pilot ฿1,990** (one-time) → วางใน `config.ts` `stripePaymentLinkPilot`
- [ ] ตั้ง GitHub Secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (auto-deploy · ดู `docs/ops/CLOUDFLARE-DEPLOY.md`)

## 🧪 E. ทดสอบ funnel เอง 1 รอบ (กันพัง)
- [ ] เปิด `ceoaithailand.org/start` → กด "⚡ ลองเล่น 30 วิ" → ทำงานได้ผล 1 ชิ้น → ใส่อีเมล → ลื่นไหล

## 📊 F. ตั้ง baseline วัดผล (ศุกร์สัปดาห์ที่ 1)
- [ ] GA4 → event `bridge_click` (แยก `link_id`) มีเข้าไหม
- [ ] GA4 → `landing_cta_click` / `hero_try_guest`
- [ ] Supabase → `auth.users` เพิ่มขึ้นไหม
- [ ] จดตัวเลขวันนี้ไว้เทียบสัปดาห์หน้า

---

## ✅ เกณฑ์ผ่านเฟส 1
- การ์ด 6 หน้าวางครบ + บทความ 3 ชิ้น + LinkedIn โพสต์แล้ว
- sitemap ส่ง GSC แล้ว
- เห็น `bridge_click` เริ่มมีใน GA4 (มีคนกดจริง)
→ ผ่านแล้วไปเฟส 2 (outreach 40 + concierge 5 คนแรก · ใช้ `OUTREACH-20-LEADS-SCRIPTS.md`)
