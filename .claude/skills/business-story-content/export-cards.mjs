#!/usr/bin/env node
// Export a carousel's .card elements to individual PNGs (@2x) for social posting.
// Usage: node export-cards.mjs <carousel.html> [out-dir] [name0,name1,...]
//   - out-dir default: ./cards
//   - names: comma-separated file stems per card (in DOM order); default 00,01,02…
// Renders single-column, fixed 640px width, near-square point cards (cover/cta stay banners).
// Uses the container's pre-installed Chromium + global Playwright (no npm install needed).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright/index.js')); }
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , input, outArg, namesArg] = process.argv;
if (!input) {
  console.error('usage: node export-cards.mjs <carousel.html> [out-dir] [name0,name1,...]');
  process.exit(1);
}
const out = resolve(outArg || 'cards');
mkdirSync(out, { recursive: true });
const names = (namesArg || '').split(',').map(s => s.trim()).filter(Boolean);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 760, height: 900 }, deviceScaleFactor: 2 });
await page.goto('file://' + resolve(input), { waitUntil: 'networkidle', timeout: 30000 });
await page.addStyleTag({ content: `
  body{ padding:24px !important; }
  .intro,.hint,.promo-bar{ display:none !important; }
  .wrap{ max-width:640px !important; }
  .grid{ grid-template-columns:1fr !important; gap:0 !important; }
  .card{ width:640px !important; margin:0 !important; animation:none !important; padding:40px 34px !important; }
  .card:not(.cover):not(.cta){ min-height:600px !important; justify-content:center !important; }
  .card .top{ margin-bottom:30px !important; }
  .card h3{ margin-top:0 !important; font-size:26px !important; }
  .card p{ font-size:16.5px !important; }
  .card .tag{ margin-top:30px !important; }
` });
await page.waitForTimeout(300);
const cards = await page.$$('.grid > .card');
for (let i = 0; i < cards.length; i++) {
  const name = names[i] || String(i).padStart(2, '0');
  await cards[i].screenshot({ path: `${out}/${name}.png` });
}
console.log(`exported ${cards.length} cards → ${out}`);
await browser.close();
