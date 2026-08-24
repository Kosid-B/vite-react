---
name: run-ceo-ai-thailand
description: Build, launch, and screenshot the CEO AI Thailand web app (Vite + React SPA). Use when asked to run, start, serve, drive, or take a screenshot of this app, or verify a UI change in the running app.
---

# Run CEO AI Thailand

Vite + React single-page app (Thai SaaS — "บริษัท AI อัตโนมัติ"). No router:
navigation is React state; the sidebar `button.nav-item` switches pages.
Driven headless with **Playwright + the container's pre-installed Chromium**
via `driver.mjs` (no `chromium-cli` in this image).

Paths below are relative to the repo root (the unit). Driver lives at
`.claude/skills/run-ceo-ai-thailand/driver.mjs`.

## Prerequisites

No `apt-get` needed — Chromium ships at `/opt/pw-browsers/chromium` and
Playwright is installed globally (`/opt/node22/lib/node_modules/playwright`).
Node 22 is present. Just install JS deps:

```bash
npm install
```

## ⚠️ ตรวจหน้าจอสถานะเดียว = ตรวจได้แค่เสี้ยวเดียว

หน้าจอของแอปนี้เปลี่ยนตาม **"ธุรกิจของผู้ใช้ไปถึงไหนแล้ว"** ถ่ายภาพสถานะเดียว
จึงเห็นแค่เสี้ยวเดียว และมักเป็นเสี้ยวที่ไม่พังด้วย

ใช้ `--states` เพื่อถ่ายหลายสถานะรวดเดียว (fixtures อยู่ที่ `fixtures.mjs`):

```bash
# ถ่ายการ์ดความพร้อมทั้งสามสถานะ: ผู้ใช้ใหม่ / กำลังพิสูจน์ / พิสูจน์แล้ว
node .claude/skills/run-ceo-ai-thailand/driver.mjs \
  --nav "ห้องบอร์ด" --states blank,validating,proven --clip ".fr" --out /tmp/fr.png
# → /tmp/fr-blank.png, /tmp/fr-validating.png, /tmp/fr-proven.png
```

| ธง | ทำอะไร |
|---|---|
| `--states a,b,c` | ปะข้อมูลตัวอย่างแต่ละสถานะแล้วถ่ายทีละภาพ (ชื่อไฟล์ต่อท้ายด้วยชื่อสถานะ) |
| `--seed <state>` | สถานะเดียว ชื่อไฟล์ไม่เปลี่ยน |
| `--clip "<selector>"` | ถ่ายเฉพาะส่วนนั้น อ่านตัวหนังสือออกกว่าถ่ายทั้งหน้า |
| `--width 900` | ความกว้างจอ (ค่าเริ่มต้น 1320) |

**บั๊กที่วิธีนี้จับได้จริง** (ทั้งหมดโค้ดทำงานถูกต้องทุกบรรทัด ไม่มีเทสต์แดง):

- ผู้ใช้ที่เพิ่งเปิดแอปวินาทีแรกถูกบอกว่า "มีคนจ่ายเงินให้เราแล้ว" เพราะ
  `DEFAULT_DATA` มีดีลสาธิตสถานะ closed ติดมาด้วย
- ด่านที่อ่านข้อมูลซึ่งกรอกได้เฉพาะหน้าผู้ดูแลระบบ → ผู้ใช้ทั่วไปผ่านไม่ได้ตลอดกาล
- ปุ่มที่พาไปหน้าที่ต้องใช้แพ็กเสียเงิน

**ห้ามลบ overlay ด้วย `el.remove()`** — เป็นการลบ node ที่ React เป็นเจ้าของ
พอ re-render รอบถัดไปจะได้ `removeChild: node is not a child of this node`
→ error boundary จับ → ได้ภาพ "เกิดข้อผิดพลาดชั่วคราว" แทนหน้าจริง
driver ซ่อนด้วย CSS ให้แล้ว (เจอมาแล้ว เสียเวลาไล่หาสองรอบ)

## Run (agent path) — the driver

The driver drives an **already-running** server. Start the dev server in the
background, then screenshot:

```bash
# 1. start the dev server (serves at base '/' → localhost:5173)
(npm run dev -- --port 5173 >/tmp/dev.log 2>&1 &)
sleep 4
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:5173/   # expect HTTP 200

# 2. screenshot the dashboard
node .claude/skills/run-ceo-ai-thailand/driver.mjs --out /tmp/dash.png

# 3. screenshot a specific page (click a sidebar item by its Thai label)
node .claude/skills/run-ceo-ai-thailand/driver.mjs --out /tmp/aicompany.png --nav "บริษัท AI"
node .claude/skills/run-ceo-ai-thailand/driver.mjs --out /tmp/billing.png   --nav "แพ็กเกจ"
```

Driver flags: `--url` (default `http://localhost:5173/`), `--out` (png path),
`--nav "<sidebar label>"` (optional click before shot), `--full` (full-page).
On success it prints `OK url=… nav=… title="…" -> <out>`.

Sidebar labels you can pass to `--nav`: `Dashboard`, `Journey Map`,
`Conversion Funnel`, `ROI Calculator`, `Personas`, `Content Plan`,
`Priority Actions`, `Business Model · MIT24`, `VRIO Analysis`, `บริษัท AI`,
`Marketplace`, `ทีม / สมาชิก`, `แพ็กเกจ`, `SaaS Analytics`,
`ISO 9001:2015 QMS`, `AI Research`, `Case Studies`.

Stop the server when done: `pkill -f "vite"`.

## Build (production bundle)

```bash
npm run build      # tsc -b && vite build → dist/  (base '/')
npm run preview -- --port 4173    # serve dist/; driver works with --url http://localhost:4173/
```

For GitHub Pages the base path differs — `BASE_PATH=/vite-react/ npm run build`
emits assets under `/vite-react/` (see `vite.config.ts`). Plain `npm run build`
(and Vercel) use `/`.

## Run (human path)

`npm run dev` → open `http://localhost:5173/`. Useless headless — use the driver.

## Gotchas

- **Login gate vs local mode.** If `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
  are set (in `.env` or env), the app renders a **login screen** instead of the
  dashboard — the driver would screenshot the login page. For UI screenshots run
  in **local mode**: ensure no `.env` with those keys (the app falls back to
  `localStorage`, no auth, dashboard loads directly).
- **Playwright isn't a project dep.** `driver.mjs` `require('playwright')` and
  falls back to `/opt/node22/lib/node_modules/playwright/index.js`. Don't
  `npm install playwright` — use the global one.
- **Must pass `executablePath`.** The driver points Chromium at
  `/opt/pw-browsers/chromium`; without it Playwright tries to download a browser.
- **No routes/URLs per page.** Every page is `/`; switch pages by clicking
  `button.nav-item:has-text("<label>")`, not by navigating to a path.
- **Base path bites preview.** A `BASE_PATH=/vite-react/` build served by
  `vite preview` lives at `/vite-react/`, not `/` → root 404s. Plain build = `/`.

## Troubleshooting

- `curl` not 200 / driver `networkidle` timeout → server not up yet; `cat /tmp/dev.log`
  (usually still compiling — increase the `sleep`).
- Driver screenshots a login form → you're not in local mode; unset the
  `VITE_SUPABASE_*` vars / move `.env` aside, restart `npm run dev`.
- `Executable doesn't exist` from Playwright → the `executablePath` in the driver
  doesn't match; check `ls /opt/pw-browsers/`.
