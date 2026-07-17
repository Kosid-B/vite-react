# Stripe Payments — ตัดเงินอัตโนมัติทุกงวด (subscription) สำหรับ CEO AI Thailand

> แทนที่ Xendit (ยกเลิกแล้ว) · flow: ลูกค้ากดจ่ายในแอป → Stripe Checkout (subscription) → จ่าย →
> webhook เปิดใช้งานแพ็กใน workspace อัตโนมัติ + ตัดเงินเองทุกงวด ยกเลิก → ดาวน์เกรด free อัตโนมัติ

## สถาปัตยกรรม (ตาม pattern Xendit เดิม)
```
Billing.tsx (payWithStripe)
   → invoke stripe-create-checkout  [verify_jwt=true]  → คำนวณราคาฝั่ง server → Stripe Checkout Session (subscription)
   → redirect ลูกค้าไปหน้า Stripe → จ่ายด้วยบัตร
Stripe → webhook: stripe-webhook  [verify_jwt=false, verify Stripe-Signature]
   • invoice.paid                  → applyPaidInvoice() เปิด/ต่ออายุแพ็ก (idempotent ด้วย invoice.id) + อีเมล Resend
   • customer.subscription.deleted → ดาวน์เกรด free
```
- ราคาใช้ **inline recurring price_data** → ไม่ต้องสร้าง Price object ล่วงหน้าใน Stripe
- metadata `{ workspace_id, plan_id, cycle }` ติดทั้ง session + subscription → webhook map กลับ workspace ได้
- gate ด้วย `PAYMENT.stripeLive` ใน `src/config.ts` (default false — เปิดเมื่อ deploy + ตั้งคีย์ครบ)

## 🔑 คีย์ไปไหน (สำคัญ)
| คีย์ | ตัวอย่าง | เก็บที่ไหน | หมายเหตุ |
|---|---|---|---|
| Publishable key | `pk_live_…` | `src/config.ts` → `PAYMENT.stripePublicKey` (optional) | public ฝังได้ · ยังไม่ใช้ในโค้ด (เผื่อ Payment Element อนาคต) |
| **Secret key** | `sk_live_…` | **Supabase secret `STRIPE_SECRET_KEY`** | 🔒 ห้าม commit / ห้ามวางในแชต |
| **Webhook secret** | `whsec_…` | **Supabase secret `STRIPE_WEBHOOK_SECRET`** | ได้หลังสร้าง webhook endpoint (ขั้น 2) |

> ⚠️ live mode = ตัดเงินจริง. อยากทดสอบก่อน ใช้คีย์ `sk_test_…` + บัตรทดสอบ `4242 4242 4242 4242`

## ขั้นตอน deploy (ทำครั้งเดียว)

### 1) ตั้ง secret + deploy edge functions
```bash
# ตั้งคีย์ลับ (อย่า commit)
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx --project-ref waigsnxhrlwtiotspaim
supabase secrets set RESEND_API_KEY=re_xxx --project-ref waigsnxhrlwtiotspaim   # (มีอยู่แล้ว)

# deploy 2 ฟังก์ชัน
supabase functions deploy stripe-create-checkout --project-ref waigsnxhrlwtiotspaim
supabase functions deploy stripe-webhook --no-verify-jwt --project-ref waigsnxhrlwtiotspaim
```

### 2) สร้าง Webhook endpoint ใน Stripe → เอา whsec_ มาตั้ง
`Stripe Dashboard → Developers → Webhooks → Add endpoint`
- **Endpoint URL:** `https://waigsnxhrlwtiotspaim.supabase.co/functions/v1/stripe-webhook`
- **Events:** เลือก `invoice.paid` และ `customer.subscription.deleted`
- Save → คัดลอก **Signing secret** (`whsec_…`) → ตั้ง:
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx --project-ref waigsnxhrlwtiotspaim
# ตั้ง secret แล้ว deploy ซ้ำครั้งเดียวให้ฟังก์ชันเห็นค่าใหม่
supabase functions deploy stripe-webhook --no-verify-jwt --project-ref waigsnxhrlwtiotspaim
```

### 3) เปิดใช้งานใน UI
`src/config.ts` → `PAYMENT.stripeLive = true` (+ ใส่ `stripePublicKey: 'pk_live_…'` ถ้าต้องการ) → commit → deploy (Cloudflare auto)

## ทดสอบ end-to-end
1. โหมด test: ตั้ง `sk_test_` + `whsec_` (test) → หน้า Billing กดจ่าย → บัตร `4242 4242 4242 4242` (วันหมดอายุอนาคต, CVC อะไรก็ได้)
2. จ่ายผ่าน → กลับมาที่ `ceoaithailand.org/?paid=1`
3. เช็ก `workspace_state.data.subscription` = `{ plan, status:'active', currentPeriodEnd, invoices:[…] }`
4. เช็ก Stripe → Webhooks → ดู event `invoice.paid` ตอบ 200
5. ทดสอบยกเลิก: Stripe → Subscriptions → Cancel → ดู `customer.subscription.deleted` → workspace กลับ `plan:'free'`

## หมายเหตุ
- Xendit/Omise = retired — ปุ่มถูกซ่อน (flag false) แต่โค้ด adapter เดิม (`create-invoice`/`xendit-webhook`/`omise-*`) ยังอยู่ใน repo เผื่ออนาคต ลบทีหลังได้
- Statement descriptor แนะนำ: `CEOAITHAILAND.ORG` (ตั้งใน Stripe → Settings → Public details / Statement descriptor)
- ไม่มี migration — subscription เก็บใน `workspace_state.data` (JSON) เหมือนเดิม
