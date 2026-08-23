#!/usr/bin/env node
/* วัด "ปุ่มหลักอยู่เหนือขอบจอไหม" จากเบราว์เซอร์จริง — ห้ามอ่าน CSS แล้วเดา (GOTCHA #3)
 * ขนาดจอ = ค่าที่ Safari/Chrome เหลือให้เว็บจริง ไม่ใช่สเปกเครื่อง (GOTCHA #4)
 * worst case บังคับ: seg ที่ h1 ยาวสุด + ab-B (subLead ยาวสุด)
 */
import { createRequire } from 'node:module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('/opt/node22/lib/node_modules/playwright/index.js');

const DEVICES = [
  { name: 'iPhone SE  320', w: 320, h: 568 },
  { name: 'Android    360', w: 360, h: 640 },
  { name: 'iPhone 8   375', w: 375, h: 667 },
  { name: 'iPhone 13  390', w: 390, h: 664 },
];

const PAGES = process.argv[2] === 'calc'
  ? [{ label: '/  (เครื่องคำนวณ)', url: 'http://localhost:5173/', target: '.quick-input, .quick-form input, input[type=number]' }]
  : [
      { label: '/start default', url: 'http://localhost:5173/start', target: '.start-cta, a.start-cta-btn, .start-hero a' },
      { label: '/start seg=food', url: 'http://localhost:5173/start?seg=food', target: '.start-cta, a.start-cta-btn, .start-hero a' },
      { label: '/start seg=sidebiz', url: 'http://localhost:5173/start?seg=sidebiz', target: '.start-cta, a.start-cta-btn, .start-hero a' },
    ];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let worst = 0;
for (const p of PAGES) {
  console.log(`\n── ${p.label} ──`);
  for (const d of DEVICES) {
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.addInitScript(() => { try { localStorage.setItem('ceo_ai_ab', 'ab-B'); } catch {} });
    await page.goto(p.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const r = await page.evaluate((sel) => {
      const vh = window.innerHeight;
      const el = document.querySelector(sel);
      if (!el) return { vh, found: false };
      const b = el.getBoundingClientRect();
      return { vh, found: true, top: Math.round(b.top + window.scrollY), bottom: Math.round(b.bottom + window.scrollY), text: (el.textContent || '').trim().slice(0, 28) };
    }, p.target);
    if (!r.found) { console.log(`  ${d.name}  🔴 หา element ไม่เจอ (${p.target})`); await ctx.close(); continue; }
    const over = r.bottom - r.vh;
    worst = Math.max(worst, over);
    const mark = over <= 0 ? '🟢' : '🔴';
    console.log(`  ${d.name}  จอใช้ได้ ${r.vh}px · ปุ่มจบที่ ${r.bottom}px  ${mark} ${over <= 0 ? `เหลือ ${-over}px` : `เกิน ${over}px`}   "${r.text}"`);
    await ctx.close();
  }
}
console.log(`\nแย่สุด: ${worst > 0 ? `เกินขอบจอ ${worst}px 🔴` : `อยู่เหนือขอบจอทุกเครื่อง 🟢`}`);
await browser.close();
