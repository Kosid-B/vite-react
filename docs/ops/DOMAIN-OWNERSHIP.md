# Domain Ownership — ceoaithailand.org (เจ้าเดียว = Cloudflare Worker)

> กันสับสน "ใครตอบชื่อโดเมน" — ก.ค. 2569 พบว่ามีหลายเจ้าแย่งชื่อ `ceoaithailand.org`
> ทำให้ผู้ใช้เจอหน้า protection/review ของ Vercel แทน landing ของแอป

## กติกา: 1 โดเมน = 1 เจ้าของ

| Host | บทบาทที่ถูกต้อง | ผูก `ceoaithailand.org` ไหม |
|---|---|---|
| **Cloudflare Worker** (`ceo-ai-thailand`) | **production เจ้าเดียว** | ✅ ใช่ (`wrangler.jsonc` routes custom_domain) |
| **Vercel** | PR preview เท่านั้น (`*.vercel.app`) | ❌ **ห้ามผูก** custom domain · ถ้าเผลอผูก Vercel จะเอา Deployment Protection มาขวาง |
| **GitHub Pages** | เลิกใช้ (legacy) | ❌ ลบ `public/CNAME` แล้ว |

## Production serving path (ที่ถูกต้อง)

```
ผู้ใช้ ──► Cloudflare edge ──► Worker ceo-ai-thailand ──► env.ASSETS (dist/index.html = SPA)
                                   └► SSR SEO เฉพาะ /b, /b/<slug>, /sitemap.xml
Root `/` → ASSETS ตรง ๆ (ไม่มี auth/policy ขวาง)
```

## ถ้าเว็บขึ้นหน้าแปลก (ไม่ใช่ landing แอป)

1. เช็ก URL bar — ถ้าเป็น `*.vercel.app` = เปิดลิงก์ preview ผิด → เปิด `https://ceoaithailand.org`
2. ถ้าเป็น `ceoaithailand.org` แต่ขึ้นหน้า Vercel/อื่น → โดเมนถูกผูกไว้ที่ Vercel:
   - **Vercel → Project → Settings → Domains → Remove** `ceoaithailand.org` + `www`
   - **Cloudflare → Workers & Pages → ceo-ai-thailand → Domains & Routes** ต้องเห็นทั้งคู่ Active
   - **Cloudflare → DNS** ต้องไม่มี record ชี้ไป Vercel (`76.76.21.21` / `cname.vercel-dns.com`) หรือ GitHub Pages (`185.199.108–111.153`)
3. verify: `nslookup ceoaithailand.org` ต้องไม่ได้ IP ของ Vercel

## Deploy

production = Cloudflare Workers: `npm run build` → `npx wrangler deploy` (หรือ Cloudflare Workers Builds auto จาก main)
