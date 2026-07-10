# Go-Live Runbook — CEO AI Thailand

> Runbook แก้ "go-live checklist ค้าง" (gap #3 ในรายงานประเมินสมรรถนะ) แบบลงมือได้ทันที
> **สำคัญ:** production = **Cloudflare Workers** (worker `ceo-ai-thailand`) แล้ว — ดังนั้น "A records → GitHub Pages" ใน CLAUDE.md เป็น **legacy ไม่ใช่วิธีที่ถูก** สำหรับสถานะปัจจุบัน
> โดเมน: `ceoaithailand.org` · Supabase prod: `waigsnxhrlwtiotspaim` · ส่งอีเมลผ่าน Resend จาก `noreply@ceoaithailand.org` · รับอีเมลที่ `support@b-tctraining.com`

ทุกค่าด้านล่างเป็น **public** (ไม่มี secret) — DKIM ต้องคัดลอกจาก Resend dashboard ตอนตั้ง

---

## 1. Domain routing → ผูกโดเมนกับ Worker (แทน A records เดิม)

`wrangler.jsonc` ยังไม่มี `routes` และ `public/CNAME` เป็นของ GitHub Pages เดิม → ต้องผูกโดเมนกับ Worker แบบใดแบบหนึ่ง:

**ทางเลือก A — ตั้งใน Cloudflare dashboard (เร็วสุด ไม่ต้องแก้โค้ด)**
1. Cloudflare → **Workers & Pages → `ceo-ai-thailand` → Settings → Domains & Routes**
2. **Add → Custom Domain** → `ceoaithailand.org` → Add
3. ทำซ้ำกับ `www.ceoaithailand.org` (หรือทำ redirect www → root)
4. Cloudflare จะสร้าง proxied record + edge certificate ให้อัตโนมัติ (ไม่ต้องใส่ A records ของ GitHub Pages)

**ทางเลือก B — ผูกเป็นโค้ดใน `wrangler.jsonc` (deploy อัตโนมัติ)**
```jsonc
// เพิ่มระดับบนสุดใน wrangler.jsonc
"routes": [
  { "pattern": "ceoaithailand.org", "custom_domain": true },
  { "pattern": "www.ceoaithailand.org", "custom_domain": true }
]
```
แล้ว merge → Cloudflare auto-deploy (หรือ `npx wrangler deploy`) — จะสร้าง custom domain + cert ให้เอง (ต้องมีโซน `ceoaithailand.org` อยู่ในบัญชี Cloudflare เดียวกัน)

**ล้างของเก่า:** เมื่ออยู่บน Workers แล้ว — **ลบ A records 4 ตัวที่ชี้ GitHub Pages** (185.199.108–111.153) และ `public/CNAME` ไม่จำเป็นอีกต่อไป (ใช้เฉพาะ GitHub Pages legacy)

**ยืนยัน:** `curl -sI https://ceoaithailand.org` → เห็น `HTTP/2 200` + header `server: cloudflare` + cert valid

---

## 2. อีเมล (Resend) — SPF / DKIM / DMARC / bounce

เพิ่ม DNS records เหล่านี้ใน **Cloudflare → DNS → Records** (TXT/MX เป็น DNS only อยู่แล้ว — ไม่ต้อง proxy):

| Type | Name | Value | ที่มา |
|---|---|---|---|
| TXT | `@` | `v=spf1 include:_spf.resend.com ~all` | SPF (ส่งผ่าน Resend เท่านั้น) |
| TXT | `resend._domainkey` | `p=MIGf...` **(คัดลอกจาก Resend)** | DKIM |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) | Resend bounce |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | Resend bounce SPF |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:support@b-tctraining.com; pct=100` | DMARC |

**ขั้นตอน:**
1. Resend → **Domains → Add Domain** → `ceoaithailand.org` → Resend จะโชว์ค่า DKIM (`resend._domainkey`) → คัดลอกค่า `p=MIGf...` มาใส่ในตาราง
2. ใส่ครบทุก record ใน Cloudflare DNS
3. กลับไป Resend → **Verify** → รอสถานะเป็น **Verified** (เขียว) ทุกตัว

**ข้อควรระวัง:** root `@` มี SPF (`v=spf1`) ได้ **เพียง record เดียว** — ถ้ามีอยู่แล้ว ต้อง merge `include:_spf.resend.com` เข้าไป อย่าสร้างซ้ำ

**ยืนยัน:**
```bash
dig +short TXT ceoaithailand.org              # เห็น v=spf1 ...resend...
dig +short TXT resend._domainkey.ceoaithailand.org   # เห็น p=MIGf...
dig +short TXT _dmarc.ceoaithailand.org       # เห็น v=DMARC1...
```
แล้วส่งอีเมลทดสอบผ่าน Resend → เช็คว่าเข้ากล่อง + ผ่าน SPF/DKIM (ดู header `Authentication-Results`)

---

## 3. Supabase Auth — Redirect URL

ป้องกัน login แล้วเด้งกลับ localhost/ผิดโดเมน:
1. Supabase → project **`waigsnxhrlwtiotspaim`** → **Authentication → URL Configuration**
2. **Site URL:** `https://ceoaithailand.org`
3. **Redirect URLs (allow list):** เพิ่ม
   - `https://ceoaithailand.org/**`
   - `https://ceoaithailand.org/oauth/google` *(callback ของ Google Sheets — ถ้าเปิด sheetsLive)*
   - *(ถ้าต้องการทดสอบ)* `http://localhost:5173/**`
4. Save

**ยืนยัน:** เปิด `https://ceoaithailand.org` → login → ต้องเด้งกลับมาที่ ceoaithailand.org (ไม่ใช่ localhost) และเข้า dashboard ได้

---

## 4. Payment go-live (Xendit) — หลัง KYC ผ่าน

เมื่อ Xendit อนุมัติ (ดู `docs/payments/XENDIT-KYC-RESPONSE.md`):
1. `src/config.ts` → `PAYMENT.xenditLive = true` (+ `recurringLive = true` ถ้าเปิดตัดอัตโนมัติ)
2. deploy edge functions: `create-invoice`, `xendit-webhook` (+ `create-recurring-plan`, `recurring-webhook`)
3. ตั้ง Supabase secrets: `XENDIT_SECRET_KEY`, `WEBHOOK_SECRET` (ยังค้างอยู่)
4. ตั้ง webhook URL ใน Xendit dashboard → ชี้มาที่ edge function `xendit-webhook`
5. ทดสอบจ่ายจริงจำนวนน้อย → เช็ค invoice + สถานะ subscription อัปเดต

---

## Checklist สรุป (ติ๊กเมื่อเสร็จ)

- [ ] ผูก custom domain `ceoaithailand.org` (+ www) กับ Worker `ceo-ai-thailand`
- [ ] ลบ A records GitHub Pages เดิม (legacy) + public/CNAME ไม่จำเป็น
- [ ] Resend: เพิ่ม SPF + DKIM + DMARC + bounce records → Verify เขียว
- [ ] Supabase Auth: ตั้ง Site URL + Redirect URLs
- [ ] *(หลัง KYC)* `xenditLive=true` + deploy fn + ตั้ง `WEBHOOK_SECRET` + webhook URL
