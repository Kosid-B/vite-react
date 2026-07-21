# Auto-deploy production (Cloudflare Workers) เมื่อ merge เข้า main

> Workflow: `.github/workflows/cloudflare-deploy.yml`
> ทำไม: production จริง = Cloudflare Worker `ceo-ai-thailand` (ผูก `ceoaithailand.org`) แต่เดิม
> ต้อง `npx wrangler deploy` เอง → ไฟล์/โค้ดใหม่ไม่ขึ้น production จนกว่าจะ deploy มือ
> ตอนนี้: merge เข้า main → build → `wrangler deploy` อัตโนมัติ

## ⚙️ ต้องตั้ง GitHub Secrets 2 ตัว (ครั้งเดียว)
ไปที่ **repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | ค่า | หาได้จาก |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | API token ที่มีสิทธิ์ deploy Worker | Cloudflare Dashboard → My Profile → **API Tokens** → Create Token → เทมเพลต **"Edit Cloudflare Workers"** |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID | Cloudflare Dashboard → Workers & Pages → คอลัมน์ขวา **Account ID** (หรือใน URL) |

> `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — ตั้งอยู่แล้ว (ใช้ร่วมกับ deploy.yml) ไม่ต้องตั้งใหม่

### สร้าง API Token (ละเอียด)
1. Cloudflare → **My Profile → API Tokens → Create Token**
2. เลือกเทมเพลต **"Edit Cloudflare Workers"** (ให้สิทธิ์ Workers Scripts:Edit + Workers Routes:Edit + Account:Read ครบสำหรับ deploy Worker + Durable Object + assets)
3. Account Resources = บัญชีของคุณ · Zone Resources = `ceoaithailand.org` (หรือ All zones)
4. Continue → Create → **คัดลอก token** (โชว์ครั้งเดียว) → เอาไปใส่ GitHub Secret

## ✅ หลังตั้ง secrets แล้ว
- Push/merge เข้า main ครั้งถัดไป → workflow "Deploy to Cloudflare Workers" รันเอง → production อัปเดต
- ดูสถานะ: repo → **Actions** tab → workflow run
- ทดสอบ trigger ทันทีโดยไม่ต้อง commit: Actions → เลือก workflow → **Run workflow** (workflow_dispatch)

## 🔒 หมายเหตุความปลอดภัย
- **secrets ของ Worker** (`ANTHROPIC_API_KEY` ฯลฯ) ที่ตั้งผ่าน Cloudflare dashboard/`wrangler secret put` **คงอยู่** หลัง deploy — `wrangler deploy` ไม่ลบ (ไม่ต้องใส่ใน CI)
- `vars` สาธารณะ (SUPABASE_URL/ANON_KEY/SITE_ORIGIN) อยู่ใน `wrangler.jsonc` แล้ว — deploy ตั้งให้เอง
- อย่าใส่ API token/secret ลงในโค้ดหรือ commit — ใช้ GitHub Secrets เท่านั้น

## หมายเหตุ deploy.yml (GitHub Pages)
- ยังรันอยู่แต่เป็น **legacy** (host จริงคือ Cloudflare Worker) — ปล่อยไว้ได้ ไม่กระทบ
- ถ้าอยากปิดเพื่อลดความสับสน: ลบ/disable `.github/workflows/deploy.yml` ภายหลังได้ (แจ้งได้)
