#!/usr/bin/env node
// Driver for CEO AI Thailand (Vite + React SPA).
// Drives the RUNNING app with Playwright + the pre-installed Chromium,
// optionally clicks a sidebar nav item, and writes a screenshot.
//
// Prereq: a dev/preview server must already be running (see SKILL.md).
// Usage:
//   node .claude/skills/run-ceo-ai-thailand/driver.mjs --out shot.png
//   node .claude/skills/run-ceo-ai-thailand/driver.mjs --out billing.png --nav "แพ็กเกจ"
//   node .claude/skills/run-ceo-ai-thailand/driver.mjs --url http://localhost:5173/ --out shot.png
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// playwright isn't a project dep — fall back to the container's global install
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright/index.js')); }

const args = Object.fromEntries(
  process.argv.slice(2).join(' ').split('--').filter(Boolean)
    .map(s => s.trim().split(/\s+(.+)/)).map(([k, v]) => [k, v ?? true])
);
const url = args.url || 'http://localhost:5173/';
const out = args.out || 'screenshot.png';
const nav = args.nav || null;
const execPath = '/opt/pw-browsers/chromium';

const browser = await chromium.launch({ executablePath: execPath });
const page = await browser.newPage({ viewport: { width: 1320, height: 900 } });
try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  if (nav) {
    await page.click(`button.nav-item:has-text("${nav}")`, { timeout: 8000 });
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: out, fullPage: !!args.full });
  const title = await page.title();
  console.log(`OK  url=${url}  nav=${nav ?? '-'}  title="${title}"  ->  ${out}`);
} catch (e) {
  console.error('DRIVER ERROR:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
