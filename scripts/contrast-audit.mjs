/* contrast-audit — หา "ตัวหนังสือที่มองไม่เห็น" ในธีมสว่าง โดยวัดจากเบราว์เซอร์จริง
 *
 * 🔴 ทำไมต้องมี (เจ้าของแจ้ง 21 ส.ค. 2569): "ตัวอักษรเป็นสีขาวกลืนไปกับพื้นหลัง"
 *    ต้นเหตุคือ CSS เขียนสีตายตัวอย่าง rgba(255,255,255,.5) ซึ่งถูกในธีมเข้ม
 *    แต่ธีมสว่างพลิกพื้นหลังเป็นสีขาว ⇒ contrast = 1.0 = มองไม่เห็นเลยแม้แต่นิดเดียว
 *
 * ⚠️ เครื่องมือที่อ่านไฟล์ CSS ตรวจเรื่องนี้ไม่ได้ — ต้องรู้ว่า "พื้นหลังจริงตอนรัน" คือสีอะไร
 *    (สีพื้นมาจาก element แม่ที่อาจอยู่คนละไฟล์) ⇒ ต้องวัดในเบราว์เซอร์เท่านั้น
 *
 * วิธีใช้:  npm run dev   แล้ว   node scripts/contrast-audit.mjs [threshold]
 *   threshold เริ่มต้น 1.8 = "แทบมองไม่เห็น" · ใช้ 4.5 เพื่อดูตามเกณฑ์ WCAG AA
 */
import { readFileSync } from 'node:fs';

const PW = '/opt/node22/lib/node_modules/playwright/index.js';
const BASE = process.env.AUDIT_URL || 'http://localhost:5173/';
const THRESHOLD = Number(process.argv[2] || 1.8);

const { chromium, devices } = (await import(PW)).default;

const SCAN = (threshold) => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
  };
  // พื้นหลัง "ที่ตาเห็นจริง" = ไล่ขึ้นไปหาแม่ตัวแรกที่ทึบพอ
  const bgOf = (el) => {
    let e = el;
    while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c.rgb; e = e.parentElement; }
    return [255, 255, 255];
  };
  const out = {};
  for (const el of document.querySelectorAll('body *')) {
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (txt.length < 2) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    const L1 = lum(fg.rgb), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (ratio >= threshold) continue;
    const key = el.tagName + '.' + String(el.className).split(' ')[0];
    if (!out[key]) out[key] = { key, ratio: Math.round(ratio * 100) / 100, color: cs.color, bg: `rgb(${bg.join(',')})`, txt: txt.slice(0, 44) };
  }
  return Object.values(out);
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
await ctx.addInitScript(() => { try { localStorage.setItem('ceoai_theme', 'minimal'); localStorage.setItem('ceo_ai_seen', '1'); } catch { /* noop */ } });
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// ปิด overlay เลือกเป้าหมาย (ถ้ามี) เพื่อให้เดินหน้าอื่นต่อได้ — แต่สแกนมันก่อน
let findings = (await page.evaluate(SCAN, THRESHOLD)).map((f) => ({ ...f, page: 'แรกเข้า' }));
await page.evaluate(() => { document.querySelector('.goal-skip')?.click(); });
await page.waitForTimeout(500);

const navs = await page.$$eval('button.nav-item', (els) => els.map((e) => e.textContent.trim()).filter(Boolean));
for (const label of navs) {
  try {
    await page.click(`button.nav-item:has-text("${label.replace(/"/g, '')}")`, { timeout: 2500 });
    await page.waitForTimeout(700);
    for (const f of await page.evaluate(SCAN, THRESHOLD)) {
      if (!findings.some((x) => x.key === f.key)) findings.push({ ...f, page: label });
    }
  } catch { /* หน้านั้นกดไม่ได้ (ล็อกตามแพ็ก) — ข้าม */ }
}

await browser.close();
console.log(`สแกน ${navs.length + 1} หน้า · เกณฑ์ contrast < ${THRESHOLD}`);
if (findings.length === 0) { console.log('✅ ไม่พบตัวหนังสือที่อ่านไม่ออก'); process.exit(0); }
for (const f of findings) {
  console.log(`  ${String(f.ratio).padStart(5)}  ${f.color} บน ${f.bg}  <${f.key}>  [${f.page}]  ${JSON.stringify(f.txt)}`);
}
console.log(`\n🔴 พบ ${findings.length} คลาส — แก้โดยใช้โทเคนธีม (var(--ink) / --ink3 / --accent-text) แทนสีตายตัว`);
process.exit(1);
