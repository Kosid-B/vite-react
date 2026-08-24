#!/usr/bin/env node
// Driver for CEO AI Thailand (Vite + React SPA).
// Drives the RUNNING app with Playwright + the pre-installed Chromium,
// optionally clicks a sidebar nav item, and writes a screenshot.
//
// Prereq: a dev/preview server must already be running (see SKILL.md).
// Usage:
//   node .../driver.mjs --out shot.png
//   node .../driver.mjs --out billing.png --nav "แพ็กเกจ"
//   node .../driver.mjs --nav "ห้องบอร์ด" --states blank,validating,proven --out board.png
//   node .../driver.mjs --nav "ห้องบอร์ด" --seed proven --clip ".fr" --out card.png
//
// ⚠️ ทำไมต้องมี --states: หน้าจอของแอปนี้เปลี่ยนตาม "ธุรกิจไปถึงไหนแล้ว"
// ถ่ายสถานะเดียวจึงตรวจได้แค่เสี้ยวเดียว และเสี้ยวที่มักไม่พังด้วย
// บั๊กที่เจอจริงในรอบที่ผ่านมา (ด่านที่ผ่านไม่ได้ตลอดกาล · ปุ่มพาไปหน้าที่เข้าไม่ได้ ·
// ศัพท์ที่กลุ่มเป้าหมายไม่เข้าใจ) โผล่ให้เห็นตอนดูหน้าจอที่มีข้อมูลจริงเท่านั้น
import { createRequire } from 'module';
import { FIXTURES } from './fixtures.mjs';
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
const clip = args.clip || null;
const states = String(args.states || args.seed || '').split(',').map(s => s.trim()).filter(Boolean);
const execPath = '/opt/pw-browsers/chromium';
const width = Number(args.width) || 1320;

const unknown = states.filter(s => !FIXTURES[s]);
if (unknown.length) {
  console.error(`DRIVER ERROR: ไม่รู้จักสถานะ ${unknown.join(', ')} — มีให้เลือก: ${Object.keys(FIXTURES).join(', ')}`);
  process.exit(1);
}

/** ชื่อไฟล์ต่อสถานะ: board.png → board-validating.png */
function outFor(state) {
  if (!state || states.length <= 1) return out;
  return out.replace(/(\.[a-z]+)$/i, `-${state}$1`);
}

/**
 * ปะข้อมูลตัวอย่างลงบน AppData จริงที่แอปสร้างไว้แล้ว
 *
 * ⚠️ ห้ามเขียนทับทั้งก้อน — โครงจะไม่ครบ แอป render ไม่ออก แล้วภาพที่ได้จะดูเหมือน
 * "หน้าเปล่า" ซึ่งอ่านผิดได้ว่าเป็นบั๊กของหน้า ทั้งที่เป็นบั๊กของเครื่องมือถ่ายภาพเอง
 */
async function seed(page, state) {
  if (!state) return;
  await page.evaluate((patch) => {
    const d = JSON.parse(localStorage.getItem('cjux2') || '{}');
    localStorage.setItem('cjux2', JSON.stringify({ ...d, ...patch }));
  }, FIXTURES[state]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
}

/**
 * ซ่อนหน้าต่างต้อนรับ/หน้าถามเป้าหมายที่บังการคลิก
 *
 * ไม่มีขั้นนี้ การคลิกเมนูจะ timeout โดยขึ้นว่า "หาเมนูไม่เจอ" ซึ่งชี้ไปผิดที่ทั้งหมด
 * (เมนูอยู่ตรงนั้น แค่มี overlay ทับ) — เสียเวลาไล่หาสองรอบมาแล้ว
 *
 * ⚠️ ต้องซ่อนด้วย CSS ห้ามลบ node ทิ้ง
 * el.remove() คือการลบ node ที่ React เป็นเจ้าของ · พอ React re-render รอบถัดไป
 * มันจะหา node นั้นไม่เจอแล้วโยน "removeChild: node is not a child of this node"
 * → error boundary จับ → ได้ภาพ "เกิดข้อผิดพลาดชั่วคราว" แทนหน้าจริง
 * ซึ่งอ่านผิดได้ว่าหน้าพัง ทั้งที่พังเพราะเครื่องมือถ่ายภาพเอง (เจอมาแล้ว)
 */
async function hideOverlays(page) {
  await page.addStyleTag({
    content: '.onb-overlay,.goal-overlay,.aud-overlay,.aha-card{display:none !important}',
  });
}

const browser = await chromium.launch({ executablePath: execPath });
try {
  for (const state of states.length ? states : [null]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      deviceScaleFactor: 2,
    });

    // ข้ามหน้า landing เพื่อให้เข้าแอปตรง ๆ (ไม่งั้นทุกภาพคือหน้า landing)
    await page.addInitScript(() => {
      localStorage.setItem('ceo_ai_seen', '1');
      localStorage.setItem('ceo_ai_biz_named', '1');
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    await hideOverlays(page);
    await seed(page, state);
    await hideOverlays(page);

    if (nav) {
      await page.click(`button.nav-item:has-text("${nav}")`, { timeout: 8000 });
      await page.waitForTimeout(700);
    }

    const target = clip ? page.locator(clip).first() : page;
    const file = outFor(state);
    await target.screenshot({ path: file, fullPage: clip ? undefined : !!args.full });

    const label = state ? `state=${state}` : `title="${await page.title()}"`;
    console.log(`OK  nav=${nav ?? '-'}  ${label}  ->  ${file}`);
    await page.close();
  }
} catch (e) {
  console.error('DRIVER ERROR:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
