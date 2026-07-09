# theossphere → CEO AI Thailand — แผนเชื่อม (Referral + Context Handoff)

> **บริบท:** theossphere = SaaS สอน/วางแผนธุรกิจด้วยกรอบ **MIT 24 Steps** (Disciplined Entrepreneurship)
> กลุ่มเป้าหมาย = **เจ้าของธุรกิจ SME ไทย** — กลุ่มเดียวกับ CEO AI Thailand ที่มี tool `โมเดลธุรกิจ 24 ขั้น (MIT)` อยู่แล้ว
>
> **ผลจาก VP Canvas:** pain ใหญ่สุดของสมาชิก = *"วางแผนเป็น แต่ execute ไม่ไหว"* + *"ต้องเริ่มกรอกใหม่จากศูนย์"*
> → คุณค่าสูงสุดไม่ใช่แค่ส่ง "คน" (referral) หรือ "contact" (lead push) แต่คือส่ง **"แผน"** ข้ามไปให้ทีม AI ทำต่อ (Context Handoff)

---

## Phase 1 — Referral link + UTM (ทำได้เลย · ฟรี · โค้ด 0)

**เป้าหมาย:** validate demand ก่อนลงทุน — สมาชิก theossphere อยากข้ามมา execute จริงไหม (เกณฑ์ผ่าน: conversion ≥ 2–3%)

### Referral link
```
https://ceoaithailand.org/start
  ?utm_source=theossphere
  &utm_medium=referral
  &utm_campaign=24step-execute
  &utm_content=<placement>
  &ref=theossphere
```
> GA4 (G-CHJ99RY1Q1) เก็บ `utm_*` อัตโนมัติตอน pageview → วัด signup/trial ต่อ source ได้ทันทีโดยไม่ต้องแก้โค้ด
> (`ref=theossphere` เผื่ออนาคตให้แอปอ่านเพื่อ personalize — Phase 1 ยังไม่ต้องใช้)

### UTM plan (ต่อจุดวาง)
| Placement (`utm_content`) | medium | campaign | วางตรงไหนใน theossphere | ทำไม |
|---|---|---|---|---|
| `post-mvbp` | referral | 24step-execute | หน้าจบ MVBP (ขั้น ~24) | **จุดแปลงดีสุด** — เพิ่ง "รู้ว่าจะทำอะไร" ต้องการคนลงมือ |
| `post-beachhead` | referral | 24step-execute | หลังเลือก Beachhead Market/Persona | อยากได้ market research/content จริง |
| `dashboard-banner` | referral | 24step-execute | แบนเนอร์ถาวรใน dashboard สมาชิก | reach ต่อเนื่อง |
| `email-nurture` | email | 24step-execute | อีเมล nurture รายสัปดาห์ | ดึงสมาชิกเก่า |

### CTA copy (ไทย · positioning "วางแผนเสร็จ → ให้ทีม AI ลงมือทำ" · ไม่มี fake scarcity)

**A. หลัง MVBP (แข็งสุด):**
> **แผนคุณพร้อมแล้ว — ใครจะลงมือทำ?**
> คุณวางแผน 24 ขั้นเสร็จแล้ว 🎉 ก้าวต่อไปคือ *execute* — จ้าง "พนักงาน AI" (CEO/CMO/CFO) มาลงมือทำตามแผนของคุณจริง เปิดหน้าร้าน หาลูกค้า ทำ content
> **→ ให้ทีม AI ลงมือทำแผนนี้ (ทดลองฟรี 15 วัน)**

**B. Dashboard banner (สั้น):**
> 🤖 วางแผนที่นี่ → ให้ทีม AI ลงมือทำที่ CEO AI Thailand · *ทดลองฟรี*

**C. Email nurture (1 บรรทัด):**
> เปลี่ยนแผน 24 ขั้นของคุณให้เป็นการลงมือทำจริง — พนักงาน AI พร้อมเริ่มงานให้แล้ว →

> **หลัก:** วางถูก "จังหวะ" (หลังทำ step เสร็จ = มี momentum) สำคัญกว่าวางหลายที่ · ซื่อสัตย์ ไม่เร่งเทียม (ตรงกับแนวทางแอปที่ถอด fake scarcity ออก)

---

## Phase 2 — Context Handoff (ทำเมื่อ Phase 1 ผ่าน) 🔑

**แนวคิด:** user กด *"ส่งแผนไป execute"* ที่ theossphere → แผน 24 ขั้นของเขาถูกส่งข้ามมา → CEO AI **pre-fill บริษัท AI + มอบงานให้ทีม AI ทำต่อทันที** (ไม่ต้องกรอกใหม่)

### Flow ที่แนะนำ: Redirect Handoff (แบบ OAuth — user เป็นคนกด = consent ในตัว)
```
[theossphere]  user กด "ส่งแผนไป execute"
      │  1) สร้าง signed token (JWT/HMAC) บรรจุแผน + consent + exp (10 นาที)
      ▼
[redirect]  https://ceoaithailand.org/handoff?token=<signed>
      │  2) CEO AI /handoff verify signature + exp + consent
      │  3) planToAppData(payload) → pre-fill aiCompany (+ มอบงานตั้งต้นให้ทีม AI)
      ▼
[CEO AI]  user ล็อกอิน/สมัคร → เข้า dashboard ที่ "แผนมีชีวิต" พร้อมทีม AI เริ่มงาน
```
> เลือก redirect (ไม่ใช่ server→server push) เพราะ **user คุมเอง + consent ชัด + ไม่ต้องแลก PII ลับหลัง** → ปลอดภัย PDPA

### Payload schema (24-step → AppData mapping)
```jsonc
{
  "source": "theossphere",
  "version": "1",
  "issuedAt": "<iso>",
  "exp": "<iso, +10m>",           // กัน replay
  "nonce": "<uuid>",              // idempotency — ประมวลผลครั้งเดียว
  "consent": { "given": true, "scope": "plan+contact", "at": "<iso>" },  // ต้องมี ไม่งั้น reject
  "member": { "refId": "<opaque>", "email": "<optional, only if consent>" },
  "plan": {
    "businessName": "...",         // → aiCompany.name
    "sector": "...",               // → map เป็นรหัส DBD → aiCompany.industry
    "beachheadMarket": "...",      // → บริบท persona/goal
    "persona": { "who": "...", "jtbd": "...", "pains": ["..."] },  // → personas / mandate
    "valueProp": "...",            // → aiCompany.productDesc / storefront.vp
    "mvbp": "...",                 // → aiCompany.productDesc + งานตั้งต้นของทีม AI
    "goal": "..."                  // → aiCompany.goal
  }
}
```

### mapping ตรง (planToAppData — pure, ทดสอบได้)
| ช่อง theossphere (24-step) | ช่อง CEO AI (AppData) |
|---|---|
| businessName | `aiCompany.name` |
| sector → DBD code | `aiCompany.industry` |
| valueProp / mvbp | `aiCompany.productDesc` |
| goal / core | `aiCompany.goal` |
| persona + mvbp | งานตั้งต้นใน `aiCompany.tasks` (มอบให้ CMO/CEO agent) |

### Security checklist (public-facing + ข้อมูลข้าม product)
- [ ] **Signed token** (JWT HS256 / HMAC) ด้วย `THEOSSPHERE_HANDOFF_SECRET` — verify ก่อนเชื่อทุก field (กันปลอม/สแปม)
- [ ] **Expiry ≤ 10 นาที** (`exp`) + **single-use** (`nonce` dedup) — กัน replay
- [ ] **Consent flag บังคับ** — ไม่มี `consent.given=true` → reject (PDPA)
- [ ] **Validate + sanitize** ทุก field (escape + จำกัดความยาว) ก่อนเก็บ — แผนเป็น user-controlled text (กัน XSS/injection)
- [ ] **Minimize PII** — ส่ง "แผนธุรกิจ" (ไม่ sensitive) เป็นหลัก · email เฉพาะมี consent · ใช้ `refId` opaque
- [ ] **Rate-limit** ต่อ source · log ลง observability
- [ ] Gate ด้วย flag `INTEGRATIONS.theossphereLive` (ปิดจนกว่าตกลง + ตั้ง secret ครบ)

### สถานะการสร้าง (แบบเดียวกับ Xendit modules)
| ชิ้น | ที่ | สถานะ |
|---|---|---|
| `planToAppData()` mapper (pure) | `supabase/functions/_shared/handoff.ts` | ✅ สร้างแล้ว + tested |
| `signHandoff()` / `verifyHandoffToken()` (HMAC/exp/consent) | `_shared/handoff.ts` | ✅ สร้างแล้ว + tested |
| edge `handoff-import` (verify token → คืนแผน) | `supabase/functions/handoff-import/` | ✅ สร้างแล้ว |
| client route `/handoff` (verify → stash → พาไปสมัคร) | `src/Root.tsx` + `src/pages/HandoffLanding.tsx` | ✅ สร้างแล้ว |
| stash helper (localStorage) | `src/lib/handoffClient.ts` | ✅ สร้างแล้ว |
| flag `INTEGRATIONS.theossphereLive` | `src/config.ts` | ✅ สร้างแล้ว |
| **apply-on-first-load** (อ่าน stash → `planToAppData` → updateData) ใน App.tsx | `src/App.tsx` | ⏳ **wiring สุดท้าย** — ทำตอน live test ได้ (ตรรกะ pure พร้อมแล้ว) |
| **nonce dedup** (กัน replay) — ตาราง `handoff_nonces` + RPC `consume_handoff_nonce` + เดินสายใน `handoff-import` | `migrations/0028` · `_shared/handoff.ts` (`claimNonce`) · `handoff-import/index.ts` | ✅ โค้ดพร้อม (ทดสอบ `claimNonce`) — go-live แค่ apply migration 0028 + deploy fn |

**เปิดใช้:** deploy `handoff-import` (`--no-verify-jwt`) + ตั้ง secret `THEOSSPHERE_HANDOFF_SECRET` (แชร์กับ theossphere) + `INTEGRATIONS.theossphereLive = true`

---

## ลำดับตัดสินใจ
1. **ทำ Phase 1 (referral) ทันที** → เก็บตัวเลข 2–4 สัปดาห์
2. conversion ≥ 2–3% **หรือ** feedback ว่าอยากได้ continuity → **ลงมือ Phase 2 (handoff)**
3. ตกลงเงื่อนไขระหว่าง 2 product ก่อน (revenue share/referral fee, ใครถือ data, consent copy)

> **ไม่แนะนำ:** lead push (server ส่ง contact ให้ตามขาย) เดี่ยว ๆ — คุณค่าต่อ user ต่ำ/ติดลบ + เสี่ยง PDPA (ดู VP analysis)
