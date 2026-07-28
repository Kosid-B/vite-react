# Technical Spike — เอา Open Agent / MCP มาเป็น "เครื่องยนต์ส่งงานเสร็จ"

> เป้า: ยกระดับจาก "AI ให้คำแนะนำ (แชต)" → **"AI ส่งงานเสร็จ (ไฟล์/แอ็กชันจริงในแอป)"**
> ตามเทรนด์ OpenWorker (Andrew Ng) — **แต่ไม่ใช่ local-first** (ลูกค้าเรา = SME ไม่ใช่สายเทค) → ทำฝั่ง server (SaaS)
> หลักการ: ยืนบนไหล่ยักษ์ (open-source + MCP) แทนสร้าง agent engine เอง

---

## 0. เรามีอะไรอยู่แล้ว (ฐานดีกว่าที่คิด)
| องค์ประกอบ | มีแล้ว | = หลักการ OpenWorker |
|---|---|---|
| `CeoAiAgent` Durable Object (`src/server.ts` → `/api/agent/CeoAiAgent/<id>`) แยกต่อ workspace | ✅ | agent runtime |
| `chatWithFallback` / `pickModels` (`_shared/llm.ts`, `modelRouter.ts`) | ✅ | **model-agnostic (ไม่ล็อกค่าย)** |
| edge functions 24 ตัว (ai-plan, agent-run+Serper, privacy-notice, create-invoice…) | ✅ | = "tools/actions" |
| RLS ต่อ workspace | ✅ | ขอบเขตความปลอดภัยของ agent |

> ขาดแค่ 2 อย่าง: (1) **ชั้น orchestration** ที่แตกเป้าหมาย→ขั้นตอน→เรียก action→ส่ง**ไฟล์เสร็จ**
> (2) **MCP tool layer** ที่ทำให้ action เป็นมาตรฐานให้ agent (เรา/หรือ external) เรียกได้

---

## 1. สองทิศทางของ MCP (เลือกทำได้ทั้งคู่)

### ทิศ A (inbound) — เปิด "Thai actions" ของเราเป็น MCP tools ⭐ แนะนำเริ่มที่นี่
เปิด action ไทยเป็น MCP server: `create_storefront` · `post_rfq` · `generate_thai_invoice` · `promptpay_qr` · `draft_privacy_notice` · `dbd_category_lookup`
- agent ตัวไหนก็เรียกได้ — **CeoAiAgent ของเรา** *หรือ* **OpenWorker/Claude ของลูกค้าเอง**
- ผล: Thai rails (moat #2) กลายเป็น "tool layer" ที่ ecosystem มาต่อ = distribution + lock-in
- ความปลอดภัย: MCP tool ทำงานภายใต้ RLS ของ workspace เท่านั้น

### ทิศ B (outbound) — ให้ CeoAiAgent เรียก MCP tools ภายนอก
DO ของเราเป็น MCP client → เอื้อม LINE/Sheets/ปฏิทิน ฯลฯ ผ่าน MCP มาตรฐาน (ไม่ต้องเขียน integration ทีละตัว)

---

## 2. Spike PoC (1–2 สัปดาห์) — พิสูจน์ "goal → งานเสร็จ"

**เลือก 1 flow ที่มี aha ชัด:** *"เปิดร้านให้ฉัน"* (business-building + ส่งของจริง)

```
ผู้ใช้บอกปลายทาง: "เปิดร้านขายกาแฟคั่ว รับสั่งซื้อ B2B"
  → CeoAiAgent (DO) แตกเป้าหมาย:
     1. dbd_category_lookup("กาแฟ") → หมวดธุรกิจ
     2. draft_value_prop(...) → จุดขาย (chatWithFallback)
     3. create_storefront(name, vp, category) → หน้าร้าน published
     4. generate summary.md (ไฟล์เปิด/แชร์ได้)
  → ส่งกลับ: ลิงก์หน้าร้านจริง + ไฟล์สรุป (ไม่ใช่แค่คำแนะนำ)
```

**สโคป PoC:**
- เขียน orchestration ใน CeoAiAgent DO (มี state ต่อ workspace อยู่แล้ว)
- ห่อ 3–4 action ที่มีอยู่แล้วเป็น "tool" (schema + handler) — เริ่มแบบ in-process ก่อน (ยังไม่ต้อง MCP server เต็ม)
- ส่งออก **ไฟล์จริง** (storefront URL + .md/.pdf) → ยืนยัน "ส่งงานเสร็จ" ได้

**วัดผล:** สำเร็จ end-to-end กี่ % · ต้นทุน token/งาน · latency · ต้องมีคนช่วยกี่จุด (ยิ่งน้อยยิ่งดี)

---

## 3. Build vs Adopt (การตัดสินใจ)
| ทางเลือก | ข้อดี | ข้อเสีย |
|---|---|---|
| **Adopt** OpenWorker (open-source) เป็น engine ฝั่ง server | ไม่ต้องสร้าง orchestration เอง · MCP ฟรี | OpenWorker = local-first (ต้อง adapt ให้รัน server/DO) · ประเมิน fit ก่อน |
| **Build** orchestration บาง ๆ บน CeoAiAgent DO ที่มีอยู่ | คุมได้ · ต่อ RLS/edge fn ตรง | ต้องดูแล loop/cost เอง |
| **Hybrid** ⭐ | ยืม *แนวคิด+MCP schema* จาก OpenWorker · orchestration เองบน DO | สมดุลสุด |

> แนะนำ **Hybrid**: ใช้มาตรฐาน MCP + เรียนจาก OpenWorker (open-source อ่านโค้ดได้) แต่รันฝั่ง server บน infra ที่มี (DO + edge fn) — **ไม่ยัด local-first ให้ SME**

---

## 4. ความเสี่ยง / ต้องระวัง
- **ต้นทุน:** agent loop = token เพิ่มหลายเท่า → กัน budget cap + ใช้ model tiering (pickModels: งานง่าย→โมเดลถูก)
- **ความปลอดภัย:** ทุก tool ทำงานในขอบ RLS workspace · ห้าม agent เขียนข้าม workspace (บทเรียน R8)
- **ความน่าเชื่อถือ:** chatWithFallback อยู่แล้ว → agent ล่ม/parse พังต้อง fallback (ไม่ปล่อยงานครึ่ง ๆ)
- **ขอบเขต:** เริ่ม 1 flow (เปิดร้าน) อย่าเปิด 25 integration พร้อมกันแบบ OpenWorker (เราไม่ใช่สายเทค — เลือกที่ SME ใช้จริง: หน้าร้าน · RFQ · ใบกำกับ · PromptPay)

---

## 5. ลำดับลงมือ
1. **PoC "เปิดร้านให้ฉัน"** บน CeoAiAgent DO (in-process tools) — พิสูจน์ "ส่งงานเสร็จ"
2. ถ้าเวิร์ก → ยก tools เป็น **MCP server** (ทิศ A) ให้ agent อื่นเรียกได้ = moat #2 เป็น platform
3. ต่อ MCP client (ทิศ B) เอื้อม LINE/Sheets ภายหลัง
4. วัด cost/latency ทุกขั้น — ถ้าต้นทุนต่องานสูงไป กลับไป tiering/limit

> ⚠️ อย่าเริ่ม spike นี้ก่อนปิดลูกค้าจ่ายเงินราย ทดสอบกับ **ลูกค้าจริง 1–2 ราย** ดีกว่าสร้างล่วงหน้า —
> "ส่งงานเสร็จ" มีค่าก็ต่อเมื่อมีคนจ่ายเพื่อรับงานนั้น
