#!/usr/bin/env node
// Export each .frame of an emotional-reel HTML to a 1080×1920 (9:16) PNG.
// Usage: node export-reel.mjs <reel.html> [out-dir]   (out-dir default: ./reel-frames)
// Uses the container's pre-installed Chromium + global Playwright (no npm install needed).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright/index.js')); }
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , input, outArg] = process.argv;
if (!input) { console.error('usage: node export-reel.mjs <reel.html> [out-dir]'); process.exit(1); }
const out = resolve(outArg || 'reel-frames');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 600, height: 1000 }, deviceScaleFactor: 2 });
await page.goto('file://' + resolve(input), { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(300);
const frames = await page.$$('.frame');
for (let i = 0; i < frames.length; i++) {
  await frames[i].screenshot({ path: `${out}/${String(i + 1).padStart(2, '0')}.png` });
}
console.log(`exported ${frames.length} frames (1080x1920) → ${out}`);
await browser.close();
