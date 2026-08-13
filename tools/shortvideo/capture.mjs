/* capture.mjs — HTML ฉาก → เฟรม PNG ทีละเฟรม (deterministic)
 *
 * ไม่ได้ "อัดหน้าจอ" แต่หยุดแอนิเมชันแล้วตั้ง currentTime ทีละเฟรม
 * → รันกี่ครั้งก็ได้ไฟล์เหมือนเดิม และไม่มีเฟรมตกหล่นเวลาเครื่องช้า
 *
 * ใช้: node tools/shortvideo/capture.mjs <html> <outdir> [duration=15] [fps=25]
 */
import { chromium } from 'playwright';
import { mkdirSync, rmSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

const [html, outDir, durArg, fpsArg] = process.argv.slice(2);
if (!html || !outDir) {
  console.error('ใช้: node tools/shortvideo/capture.mjs <html> <outdir> [duration] [fps]');
  process.exit(1);
}
const DURATION = Number(durArg ?? 15);
const FPS = Number(fpsArg ?? 25);

/* Playwright แต่ละเวอร์ชันเก็บ Chromium คนละโฟลเดอร์ — หาให้เองแทนที่จะ hardcode
   (เดิม hardcode ไว้แล้วพังทุกครั้งที่อัปเดต playwright) */
function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(root)) return undefined;
  const direct = resolve(root, 'chromium');
  if (existsSync(direct)) return direct;
  const dir = readdirSync(root).filter((d) => d.startsWith('chromium')).sort().pop();
  if (!dir) return undefined;
  const p = resolve(root, dir, 'chrome-linux', 'chrome');
  return existsSync(p) ? p : undefined;
}

const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await page.goto(`file://${resolve(html)}`);
await page.waitForTimeout(400); // ให้ฟอนต์ที่ฝัง base64 โหลดจบก่อน ไม่งั้นเฟรมแรกฟอนต์ผิด

const total = Math.round(FPS * DURATION);
for (let i = 0; i < total; i++) {
  await page.evaluate((ms) => {
    document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; });
  }, (i / FPS) * 1000);
  await page.screenshot({ path: `${outDir}/f${String(i).padStart(4, '0')}.png` });
}

await browser.close();
console.log(`✓ ${total} เฟรม → ${outDir}`);
