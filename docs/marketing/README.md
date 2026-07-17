# แผนการตลาด & การเติบโต — CEO AI Thailand

ชุดกลยุทธ์ Go-To-Market เพื่อ **หาลูกค้าจริงให้ CEO AI Thailand** (ceoaithailand.org) และดัน
liquidity เข้าตลาด `/b`. เอกสารทั้งหมดปรับให้ตรงบริบทจริงของผลิตภัณฑ์ (ราคา, กลุ่มเป้าหมาย,
ช่องทางไทย) — สร้างจาก skills ใน `.claude/skills/` (marketplace-seo, market-research,
facebook-group-plan, networking-strategy, linkedin-strategy).

## เอกสารในโฟลเดอร์นี้
| ไฟล์ | ตอบคำถาม | Owner ที่แนะนำ |
|---|---|---|
| ⭐ [MARKETING-PLAN-12MONTH.md](./MARKETING-PLAN-12MONTH.md) | **แผนแม่บท 12 เดือน** — ร้อยทุกกลยุทธ์เป็น timeline รายไตรมาส (market-research + marketplace-seo) | ผู้บริหาร (แผนหลัก) |
| [MARKET-RESEARCH.md](./MARKET-RESEARCH.md) | ลูกค้าคือใคร อยู่ไหน จ่ายไหวเท่าไหร่ ตลาดใหญ่แค่ไหน | ผู้บริหาร |
| [TIKTOK-CTA-TEMPLATES.md](./TIKTOK-CTA-TEMPLATES.md) | CTA + caption + bio link สำหรับคลิป TikTok (อุดรอยรั่ว view→action) | Content |
| [CONTENT-SCRIPT-ISO-CLIP.md](./CONTENT-SCRIPT-ISO-CLIP.md) | สคริปต์คลิป ISO 2 เวอร์ชัน (อุด 6 วิแรก) + คลัง hook + แผน A/B | Content |
| [blog/](./blog/) | บทความ SEO สาย ISO (พร้อมเผยแพร่) จากหัวข้อที่ GA4 พิสูจน์ว่าคนค้นจริง | Content |
| [MARKETPLACE-SEO.md](./MARKETPLACE-SEO.md) | ลูกค้าหาเราเจอบน Google ได้ยังไง (ผูกกับโค้ดจริง) | Dev + Content |
| [FACEBOOK-GROUP-PLAN.md](./FACEBOOK-GROUP-PLAN.md) | สร้างชุมชน + lead gen ฟรีบน Facebook | Community |
| [LINKEDIN-STRATEGY.md](./LINKEDIN-STRATEGY.md) | สร้าง authority + inbound leads B2B/องค์กร | ผู้บริหาร/ที่ปรึกษา |
| [NETWORKING-STRATEGY.md](./NETWORKING-STRATEGY.md) | พันธมิตร + referral (ช่องที่ปิดดีลเร็วสุด) | ผู้บริหาร |

## ลำดับลงมือ 90 วันแรก (จากถูก→แพง, เร็ว→ช้า)
**ช่องทางที่ควรเริ่มก่อน = ต้นทุนต่ำ + เข้าถึงกลุ่มเป้าหมายจริง:**

1. **สัปดาห์ 0–2 — วางฐาน (ฟรี, ทำครั้งเดียว)**
   - SEO: merge งาน server-side SEO (มีในโค้ดแล้ว) → ส่ง `sitemap.xml` เข้า Google Search Console
   - ตั้งกลุ่ม Facebook "เจ้าของธุรกิจไทยใช้ AI" ตาม `FACEBOOK-GROUP-PLAN.md`
   - ปรับโปรไฟล์ LinkedIn ที่ปรึกษา 20+ ปี ตาม `LINKEDIN-STRATEGY.md`
2. **สัปดาห์ 2–6 — ป้อนคอนเทนต์ + seed liquidity**
   - โพสต์กลุ่ม FB ทุกวันตามตารางคอนเทนต์ 7 วัน → ดันคนสมัคร `/start` และเปิดร้าน `/shop`
   - ชวนธุรกิจที่รู้จัก 10–20 ราย (`NETWORKING-STRATEGY.md` Tier 1) มาเปิดร้านฟรี → ให้ตลาด `/b` ไม่ว่างเปล่า
   - LinkedIn โพสต์ 3 ครั้ง/สัปดาห์ (expertise/story/opinion)
3. **สัปดาห์ 6–12 — ขยาย + ปิดดีล**
   - Networking: ตั้งพันธมิตร referral 3–5 ราย (สมาคม SME, ที่ปรึกษา ISO, โค้ชธุรกิจ)
   - SEO เริ่มติดผล → วัดจาก Search Console (impressions หน้า `/b/<slug>`)
   - เก็บ feedback → ปรับ persona/ราคา (skill `feedback-analysis`, `customer-persona`)

## ตัวชี้วัดกลาง (ทุกช่องทางรายงานเข้าที่เดียว)
เชื่อมกับ GA4 `G-CHJ99RY1Q1` (มี funnel events แล้ว — ดู `src/lib/analytics.ts`):
- **Acquisition**: ผู้เข้าใหม่ต่อช่องทาง (organic / facebook / linkedin / referral)
- **Activation**: สมัคร `/start` → เปิดร้าน `/shop` → เผยแพร่หน้าร้าน (`storefront published`)
- **Revenue**: อัปเกรด Starter ฿390 → Growth ฿1,490; RFQ → ออเดอร์
- **Liquidity ตลาด**: จำนวนร้าน published, จำนวน RFQ/สัปดาห์, อัตราจับคู่ (Marketplace Agent)

> หมายเหตุ: เอกสารเหล่านี้เป็น **แผน** — ตัวเลขตลาด (TAM/SAM/SOM) เป็นการประมาณการพร้อมระบุสมมติฐาน
> ไม่ใช่การรับประกันผล (ดู constraint ใน `.claude/skills/market-research/SKILL.md`).
