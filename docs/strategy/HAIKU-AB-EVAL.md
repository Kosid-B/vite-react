# A/B วัดคุณภาพ Haiku ก่อนเปิดจริง — Quality Gate สำหรับ `MODEL_SIMPLE`
> ก่อนสลับ `ai-assist` จาก Sonnet → Haiku (ประหยัด ~80%/call) ต้องพิสูจน์ก่อนว่า "คุณภาพไม่ตก"
> ใช้ระเบียบวิธี A/B (hypothesis-first · 1 ตัวแปร · เกณฑ์ตัดสินตั้งไว้ก่อน · ไม่ peek) แบบ **offline golden-set eval**
> (วัดก่อนเปิด — ไม่ยิงใส่ผู้ใช้จริง จนกว่าจะผ่านเกณฑ์)

## 1) สมมติฐาน (เขียนก่อนรัน)
> **"ถ้าเราสลับ `ai-assist` (งานแนะนำสั้น) จาก Sonnet → Haiku คะแนนคุณภาพ (rubric) จะยังอยู่ ≥ 95% ของ Sonnet
> เพราะงานนี้เป็นคำแนะนำสั้นตามบริบท ไม่ต้องใช้การใช้เหตุผลเชิงลึกแบบ Sonnet — ขณะที่ต้นทุนลดลง ~80%/call"**

- **ตัวแปรเดียวที่เปลี่ยน:** โมเดล (Sonnet → Haiku) · system prompt / input เหมือนกันเป๊ะ
- **ทำไมเลือก ai-assist:** เป็น tier `simple` (คำแนะนำ 3-6 ข้อ) = ผู้สมัครที่ดีที่สุดของ model tiering

## 2) วิธีวัด (แทน "traffic" ด้วย "golden set")
เราไม่มี traffic มากพอจะทำ live A/B แบบมีนัยสำคัญ + ผู้ใช้ทุกคนยังควรได้ Sonnet จนกว่าจะพิสูจน์ → ใช้ **golden set**:
1. ชุดทอง **12 เคสจริง** ครอบคลุมหลายหน้า (บริษัท AI, ห้องบอร์ด, ทรัพยากร, ISO, RFQ, การตลาด, billing, ร้าน, analytics, …)
2. ยิง prompt เดียวกัน (ระบบ+ผู้ใช้ ตรงกับ `ai-assist` จริง) เข้า **ทั้ง Sonnet และ Haiku**
3. **LLM-judge (Sonnet) ให้คะแนนแบบ blind** — สลับตำแหน่ง A/B ทุกเคส ไม่ให้กรรมการรู้ว่าอันไหนโมเดลไหน
4. rubric 4 ด้าน (เต็ม 20/คำตอบ): `accuracy` (ตรงบริบท) · `actionability` (ทำได้จริง) · `thai` (ภาษาเป็นธรรมชาติ) · `format` (JSON ครบ)
5. ธง `critical` = ผิดร้ายแรง / หลุดภาษาไทย / ฟอร์แมตพัง / คำแนะนำอันตราย

### metric
- **primary:** คะแนนเฉลี่ยรวม (Haiku ÷ Sonnet = ratio)
- **secondary:** win/tie/loss ของ Haiku · จำนวน critical failure

## 3) เกณฑ์ตัดสิน (ตั้งก่อนเห็นผล — ห้ามขยับ)
| | เกณฑ์ผ่าน |
|---|---|
| คุณภาพ | Haiku mean ≥ **95%** ของ Sonnet |
| ความปลอดภัย | critical failure ของ Haiku = **0** |
| ความสม่ำเสมอ | Haiku loss-rate < **20%** (แพ้ Sonnet ไม่เกิน 1 ใน 5 เคส) |

- ✅ **GO** (ผ่านทั้ง 3) → เปิด `MODEL_SIMPLE=claude-haiku-4-5-20251001` + redeploy `ai-assist`
- ⚠️ **NO-GO** → คงใช้ Sonnet · ปรับ system prompt แล้ววัดใหม่ · หรือทดลองโมเดลอื่น (Typhoon/Qwen)

## 4) วิธีรัน
```bash
# ใช้คีย์เดียวกับ Supabase secret (ห้าม commit)
ANTHROPIC_API_KEY=sk-ant-... node scripts/haiku-eval.mjs

# เก็บผลดิบเป็น JSON ด้วย
ANTHROPIC_API_KEY=sk-ant-... node scripts/haiku-eval.mjs --out /tmp/haiku-eval.json
```
สคริปต์พิมพ์ตารางต่อเคส + สรุป ratio/win-loss/critical + คำตัดสิน **GO / NO-GO** อัตโนมัติ (~24 calls โมเดล + 12 judge ≈ ไม่กี่บาท)

> ต้นทุนรัน eval เองน้อยมากเทียบกับที่จะประหยัดได้ทุกเดือนถ้า Haiku ผ่าน — คุ้มที่จะวัดก่อนเสมอ

## 5) ถ้าผ่านแล้ว (post-test)
1. เปิด `MODEL_SIMPLE` + redeploy → เฝ้าดูแผง **"🤖 ต้นทุน AI (ประมาณการ)"** (แท็บเวิร์กสเปซ Admin) ว่ามาร์จินขยับจริง
2. เก็บ feedback ผู้ใช้จริง (Pulse) ต่ออีก 1-2 สัปดาห์ — ถ้าคุณภาพรู้สึกตกค่อย rollback (ลบ secret = กลับ Sonnet ทันที ไม่ต้องแก้โค้ด)
3. ทำ eval ซ้ำแบบเดียวกันตอนจะขยับ tier อื่น (เช่น งานไทย → Typhoon) — reuse `scripts/haiku-eval.mjs` เปลี่ยน `MODEL_HAIKU=`

## Anti-patterns ที่กันไว้แล้ว
- ❌ สลับทั้งระบบทันทีแล้วค่อยดู — เราวัด **ก่อน** เปิด · rollback = ลบ secret
- ❌ ขยับเกณฑ์หลังเห็นผล — เกณฑ์ตั้งไว้ในสคริปต์ (95% / 0 crit / <20% loss)
- ❌ judge รู้ว่าอันไหนโมเดลไหน — สลับ A/B blind ทุกเคส
- ❌ เปลี่ยนหลายตัวแปร — เปลี่ยนแค่โมเดล (prompt เท่าเดิม)
