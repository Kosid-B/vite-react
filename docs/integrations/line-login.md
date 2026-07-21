# LINE Login — คู่มือเปิดใช้งาน

เข้าสู่ระบบด้วยบัญชี LINE (คนไทยมีทุกคน + ฟรี ไม่มีค่า SMS) — ทางเลือกที่ลื่นกว่า phone OTP
โค้ดฝั่ง client + edge function พร้อมแล้ว **gate ด้วย `INTEGRATIONS.lineLoginLive`** (ค่าเริ่มต้น `false`)

## Flow โดยย่อ
```
ปุ่ม "เข้าสู่ระบบด้วย LINE" → หน้ายินยอม LINE → กลับมาที่ /oauth/line?code=…&state=…
  → App เรียก edge fn 'line-login' (แลก code → โปรไฟล์ LINE → สร้าง/หา Supabase user
     → generateLink คืน token_hash) → client verifyOtp({ token_hash }) = เปิด session (ล็อกอินสำเร็จ)
```
- ไม่มีอีเมลจริงจาก LINE → ใช้อีเมล synthetic `line_<userId>@line.ceoaithailand.org` เป็น key บัญชี
  (ถ้า channel ขอ email ได้และผู้ใช้ยินยอม จะใช้อีเมลจริงแทน)

## ขั้นตอนเปิดใช้งาน

### 1) สร้าง LINE Login channel
- ไปที่ [LINE Developers Console](https://developers.line.biz/) → สร้าง Provider → **Create a LINE Login channel**
- **Callback URL** (สำคัญ): `https://ceoaithailand.org/oauth/line` (และ URL preview/dev ถ้าต้องทดสอบ)
- เปิด scope: `profile`, `openid` (+ `email` ถ้าต้องการอีเมลจริง — ต้องยื่นขอสิทธิ์ email ใน console)
- คัดลอก **Channel ID** และ **Channel secret**

### 2) ตั้ง secret ใน Supabase (production project `waigsnxhrlwtiotspaim`)
```bash
npx supabase secrets set LINE_CHANNEL_ID=<channel id> LINE_CHANNEL_SECRET=<channel secret>
# SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY มีให้อัตโนมัติใน Edge runtime อยู่แล้ว
```

### 3) Deploy edge function
```bash
npx supabase functions deploy line-login --no-verify-jwt
```
> `--no-verify-jwt` เพราะตอนเรียกผู้ใช้ยังไม่มี session (กำลังจะล็อกอิน)

### 4) เปิด flag ในโค้ด (`src/config.ts`)
```ts
INTEGRATIONS = {
  lineLoginLive: true,
  lineChannelId: '<channel id>',   // ค่า public ฝังได้
  lineRedirectPath: '/oauth/line',
}
```
merge → Cloudflare auto-deploy → ปุ่ม LINE จะแสดงในหน้า Auth อัตโนมัติ

## ความปลอดภัย
- `state` (CSRF) สุ่มต่อครั้ง เก็บใน sessionStorage แล้วตรวจตอน callback
- Channel secret อยู่ฝั่ง edge function เท่านั้น (ไม่หลุดมา client)
- `token_hash` จาก generateLink ใช้ครั้งเดียว หมดอายุเร็ว
- Service role key อยู่ใน edge runtime เท่านั้น

## หมายเหตุ
- ถ้าไม่เปิด flag → ปุ่มไม่แสดง, ไม่กระทบ login เดิม (email/password, magic link, phone OTP)
- ผู้ใช้ LINE ที่ไม่มีอีเมลจริงจะเปลี่ยน/เพิ่มอีเมลภายหลังได้ในหน้าโปรไฟล์ (ถ้าต้องการ)
