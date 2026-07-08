# Context Handoff — Activation Runbook (เปิดใช้จริง)

> เปิดสวิตช์ handoff theossphere → CEO AI Thailand · โค้ดฝั่ง CEO AI พร้อมแล้ว (ดู [theossphere-handoff.md](theossphere-handoff.md))
> **ทำตามลำดับ** — flip flag เป็น**ขั้นสุดท้าย**หลังทุกอย่างพร้อม (เปิดก่อน = route คืน 503 handoff_not_configured)

---

## ① สร้าง shared secret (ครั้งเดียว · เก็บเป็นความลับ ใช้ทั้ง 2 ฝั่ง)
```bash
openssl rand -hex 32      # ผลลัพธ์ = THEOSSPHERE_HANDOFF_SECRET
```
> ⚠️ ห้าม commit · ตั้งผ่าน secret store เท่านั้น (Supabase secrets + env ของ theossphere)

## ② ฝั่ง CEO AI Thailand — deploy + secret
```bash
supabase functions deploy handoff-import --no-verify-jwt --project-ref waigsnxhrlwtiotspaim
supabase secrets set THEOSSPHERE_HANDOFF_SECRET=<secret จากข้อ ①> --project-ref waigsnxhrlwtiotspaim
```

## ③ ฝั่ง theossphere — ลงนาม token + ปุ่ม (ให้ dev theossphere ทำ)
เมื่อสมาชิกกด "ส่งแผนไป execute" → ลงนาม token ด้วย secret (ข้อ ①) แล้ว **redirect** ไป
`https://ceoaithailand.org/handoff?token=<token>` (ดู snippet §A/§B ด้านล่าง — copy ไปใช้ได้เลย)

## ④ เปิด flag (ขั้นสุดท้าย) — ฝั่ง CEO AI
`src/config.ts` → `INTEGRATIONS.theossphereLive = true` → commit → merge (Cloudflare auto-deploy)

## ⑤ ทดสอบ end-to-end
theossphere กดส่ง → เด้ง `/handoff` → เห็น "รับแผนของคุณแล้ว — <ชื่อธุรกิจ>" → สมัคร/login →
บริษัท AI ถูก pre-fill (`aiCompany.name/industry/goal/productDesc` จากแผน) + toast "นำแผนจาก theossphere มาเริ่มให้ทีม AI แล้ว"

**ตรวจ fail cases:** token หมดอายุ (>10 นาที) / secret ผิด / ไม่มี consent → หน้า `/handoff` แสดง "ลิงก์ไม่ถูกต้องหรือหมดอายุ" (ปลอดภัย)

---

## Payload schema (ต้องตรงกับ verifier `_shared/handoff.ts`)
```jsonc
{
  "source": "theossphere",
  "version": "1",
  "issuedAt": "<ISO>",
  "exp": 1800000000000,             // epoch ms หมดอายุ — แนะนำ now + 10 นาที
  "nonce": "<uuid>",
  "consent": { "given": true, "scope": "plan+contact", "at": "<ISO>" },  // given=true บังคับ (PDPA)
  "member": { "refId": "<opaque>", "email": "<optional>" },
  "plan": {
    "businessName": "...",          // → aiCompany.name
    "sector": "...",                // → aiCompany.industry (หมวด DBD)
    "valueProp": "...",             // ─┐ รวมเป็น aiCompany.productDesc
    "mvbp": "...",                  // ─┘
    "goal": "..."                   // → aiCompany.goal
  }
}
```
**token format:** `base64url(JSON(payload)) + "." + base64url(HMAC_SHA256(base64url-payload-string, secret))`

---

## §A. Snippet ลงนาม — Node.js (`node:crypto`) — Express/Next.js API route/ทั่วไป
```js
import crypto from 'node:crypto';

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** คืน URL ให้ redirect ผู้ใช้ไป · plan = { businessName, sector, valueProp, mvbp, goal } */
export function buildHandoffUrl(plan, { memberRefId, memberEmail, secret, origin = 'https://ceoaithailand.org' }) {
  const now = Date.now();
  const payload = {
    source: 'theossphere', version: '1',
    issuedAt: new Date(now).toISOString(),
    exp: now + 10 * 60 * 1000,                 // +10 นาที
    nonce: crypto.randomUUID(),
    consent: { given: true, scope: 'plan+contact', at: new Date(now).toISOString() },
    member: { refId: memberRefId, email: memberEmail },
    plan,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = b64url(crypto.createHmac('sha256', secret).update(body).digest());
  return `${origin}/handoff?token=${body}.${sig}`;
}
// ใช้: res.redirect(buildHandoffUrl(plan, { memberRefId: user.id, memberEmail: user.email, secret: process.env.THEOSSPHERE_HANDOFF_SECRET }))
```

## §B. Snippet ลงนาม — Web Crypto (Deno / Edge / Cloudflare Worker / เบราว์เซอร์ฝั่ง server)
```ts
const enc = (s: string) => new TextEncoder().encode(s);
const b64url = (bytes: Uint8Array) => {
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export async function buildHandoffUrl(plan, { memberRefId, memberEmail, secret, origin = 'https://ceoaithailand.org' }) {
  const now = Date.now();
  const payload = {
    source: 'theossphere', version: '1', issuedAt: new Date(now).toISOString(),
    exp: now + 10 * 60 * 1000, nonce: crypto.randomUUID(),
    consent: { given: true, scope: 'plan+contact', at: new Date(now).toISOString() },
    member: { refId: memberRefId, email: memberEmail }, plan,
  };
  const body = b64url(enc(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc(body))));
  return `${origin}/handoff?token=${body}.${sig}`;
}
```

> ทั้งสอง §A/§B ให้ token ที่ **ผ่าน `verifyHandoffToken` ของ CEO AI** (HMAC-SHA256 + exp + consent) — ทดสอบได้ในชุด `src/lib/__tests__/handoff.test.ts` (sign/verify round-trip)

---

## เงื่อนไข 2 product — บันทึกการตัดสินใจ
| # | เงื่อนไข | สถานะ | สรุป |
|---|---|---|---|
| 1 | **Data ownership** | ✅ ตัดสินแล้ว | ข้อมูลเป็นของ **User ที่ให้ข้อมูล** (consent-based) · **ทั้ง 2 platform ต้องมี RoPA (Record of Processing Activities) + Privacy Notice บน platform ตัวเอง** (PDPA ม.30 เทียบเท่า) |
| 2 | **Consent copy** | ✅ ตัดสินแล้ว | อนุมัติข้อความ (ไทย+อังกฤษ) ด้านล่าง — theossphere นำไปแสดงก่อน redirect (`consent.given=true` + เก็บ timestamp) |

> **ครบทั้ง 4 เงื่อนไข** — เหลือขั้น go-live เชิงเทคนิค (secret + deploy + flag) เท่านั้น (ดูขั้น ①–⑤ ด้านบน)
| 3 | **Revenue model** | ✅ ตัดสินแล้ว | **Free referral** — ไม่มีค่าแนะนำ/ไม่แบ่งรายได้ · เป็นพันธมิตรเสริมคุณค่า (theossphere วางแผน → CEO AI execute) แต่ละฝ่ายได้ผู้ใช้ที่ตรงกลุ่ม |
| 4 | **Branding/UX** | ✅ ตัดสินแล้ว | **co-brand** + CTA **"ให้ทีม AI ลงมือทำ"** (ดู spec ล่าง) |

> **สถานะ CEO AI (ทำแล้วใน PR นี้):** (ก) เพิ่ม RoPA entry P7 (handoff processing) → [../isms/ropa.md](../isms/ropa.md) · (ข) อัปเดต Privacy Notice `LegalPage.tsx §2` ระบุการรับข้อมูลจาก theossphere + ฐาน consent + สิทธิ์เพิกถอน
> **theossphere ต้องทำ:** RoPA entry (ส่งออกข้อมูลไป CEO AI) + Privacy Notice ระบุปลายทาง + เก็บหลักฐาน consent (timestamp)

## Consent copy — ✅ อนุมัติแล้ว (ข้อความก่อนกดปุ่ม "ให้ทีม AI ลงมือทำ" ฝั่ง theossphere)
> ต้องแสดง**ก่อน** redirect + ผู้ใช้กดยินยอมเอง (`consent.given=true`) — เก็บ timestamp เป็นหลักฐาน
> **การใช้งาน:** checkbox/toggle ค่าเริ่มต้น**ไม่ติ๊ก** · ปุ่มส่งเปิดใช้เมื่อผู้ใช้ติ๊กยินยอม · บันทึก `consent.at` (ISO timestamp) ลง token + เก็บ log ฝั่ง theossphere เป็นหลักฐาน (PDPA)

**ไทย:**
> ✅ ฉันยินยอมให้ **theossphere** ส่ง *แผนธุรกิจของฉัน* (ชื่อธุรกิจ หมวดหมู่ คุณค่า และเป้าหมาย) ไปยัง **CEO AI Thailand** เพื่อนำไปเตรียมพร้อมให้ทีม AI ทำงานต่อ ฉันเข้าใจว่าข้อมูลนี้เป็นของฉัน และฉันสามารถถอนความยินยอม/ลบข้อมูลได้ทุกเมื่อ ([นโยบายความเป็นส่วนตัว CEO AI](https://ceoaithailand.org/legal))

**English:**
> ✅ I consent to **theossphere** sending *my business plan* (business name, sector, value proposition, and goals) to **CEO AI Thailand** to prepare it for the AI team to act on. I understand this data is mine and I may withdraw consent or delete it at any time. ([CEO AI Privacy Policy](https://ceoaithailand.org/legal))

## Co-brand spec (ตัดสินใจแล้ว: co-brand · CTA "ให้ทีม AI ลงมือทำ")
**ฝั่ง CEO AI (ทำแล้ว):** หน้า `/handoff` แสดง lockup `theossphere ✦ CEO AI Thailand` ทุกสถานะ → ต่อเนื่องไม่สะดุด

**ฝั่ง theossphere (ปุ่ม/แบนเนอร์ — ใช้ข้อความนี้):**
- ปุ่มหลัก (หลัง MVBP): **"ให้ทีม AI ลงมือทำ →"** (รอง: "ส่งแผนไปให้ทีม AI ทำต่อ")
- co-brand lockup ข้างปุ่ม: `theossphere ✦ CEO AI Thailand` (หรือโลโก้คู่)
- ประโยคประกอบ: *"แผน 24 ขั้นของคุณพร้อมแล้ว — ให้พนักงาน AI ลงมือทำจริง (ไม่ต้องกรอกใหม่)"*
- โทน: complementary (เรียน/วางแผนที่ theossphere → execute ที่ CEO AI) ไม่ใช่แข่งกัน

## หมายเหตุความปลอดภัย (ก่อนเปิด production)
- **exp ≤ 10 นาที** + **consent.given=true** = บังคับ (verifier reject ถ้าขาด) — ตรงตาม PDPA (user กดส่งเอง)
- **nonce dedup (กัน replay ซ้ำ)**: ปัจจุบัน verifier ยังไม่ dedup (exp 10 นาทีจำกัด window) → ก่อน scale แนะนำเพิ่มตาราง `handoff_nonces` + เช็คใน `handoff-import` (ดู [theossphere-handoff.md](theossphere-handoff.md) CAPA)
- ส่ง **แผนธุรกิจ** (ไม่ sensitive) เป็นหลัก · email เฉพาะมี consent · ใช้ `refId` opaque ไม่ใช่ raw member id
