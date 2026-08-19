import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SHORT_LINKS, SOURCE_PRESETS } from '../shortLinks';

/* สัญญาระหว่าง wrangler.jsonc กับโค้ดใน src/server.ts
 *
 * ทำไมต้องมี (บั๊กจริงที่ซ่อนอยู่นานมาก — พบ 17 ส.ค. 2569):
 *   Cloudflare Workers ที่มี static assets จะ "เสิร์ฟไฟล์ก่อน โดยไม่เรียก Worker"
 *   และตั้งแต่ compatibility_date >= 2025-04-01 flag `assets_navigation_prefers_asset_serving`
 *   เปิดเอง → navigation request (Sec-Fetch-Mode: navigate) ที่ไม่ตรงไฟล์ไหน
 *   จะได้ index.html (200) **ก่อนที่ Worker จะได้รัน**
 *   ของเราตั้ง compatibility_date 2026-06-11 แต่ไม่เคยตั้ง run_worker_first
 *   ⇒ ลิงก์สั้น /ราคา /ทุน /ลูกค้า ไม่เคย redirect · SEO ฝั่ง server ไม่เคยทำงาน
 *   ⇒ `npm run build`, `tsc`, `wrangler deploy --dry-run` ผ่านหมด เพราะโค้ด "ถูก" —
 *      แต่ไม่มีใครเรียกมัน · เทสต์นี้คือชั้นเดียวที่จับเรื่องแบบนี้ได้
 */

interface WranglerAssets {
  directory?: string;
  binding?: string;
  not_found_handling?: string;
  run_worker_first?: boolean | string[];
}

function readWrangler(): { assets?: WranglerAssets; compatibility_date?: string } {
  const raw = readFileSync(join(process.cwd(), 'wrangler.jsonc'), 'utf8');
  // ตัดคอมเมนต์ // ท้ายบรรทัด (ไฟล์นี้ไม่มีสตริงที่มี // อยู่ข้างใน)
  const json = raw.replace(/^\s*\/\/.*$/gm, '').replace(/\s+\/\/.*$/gm, '');
  return JSON.parse(json);
}

/** แปลง pattern ของ Cloudflare (`*` = อะไรก็ได้) เป็น RegExp เต็มสตริง */
function toRegExp(pattern: string): RegExp {
  const body = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${body}$`);
}

/** Worker จะได้รันกับ path นี้ไหม — ตรง positive อย่างน้อย 1 และไม่ตรง negative เลย */
function workerRuns(path: string, rule: boolean | string[] | undefined): boolean {
  if (rule === true) return true;
  if (!Array.isArray(rule)) return false; // undefined / false = asset serving ชนะ
  const positives = rule.filter(p => !p.startsWith('!'));
  const negatives = rule.filter(p => p.startsWith('!')).map(p => p.slice(1));
  if (!positives.some(p => toRegExp(p).test(path))) return false;
  return !negatives.some(p => toRegExp(p).test(path));
}

/** เส้นทางที่ src/server.ts รับผิดชอบจริง — ถ้า Worker ไม่รัน = ฟีเจอร์นั้นตายเงียบ */
const WORKER_ROUTES = [
  '/api/guest-ask', '/api/client-error', '/api/health', '/api/checkup-lead',
  '/sitemap.xml',
  '/b', '/b/some-shop', '/b/some-shop/logo.svg',
  '/blog', '/blog/pricing-no-loss',
  '/start', '/sale', '/shop', '/legal',
  '/',
];

describe('wrangler.jsonc ↔ src/server.ts — Worker ต้องได้รันจริง', () => {
  const cfg = readWrangler();
  const rule = cfg.assets?.run_worker_first;

  it('ต้องตั้ง run_worker_first ไว้ (ไม่ตั้ง = Worker ไม่ถูกเรียกตอนคนเปิดหน้าเว็บ)', () => {
    expect(rule, 'wrangler.jsonc: assets.run_worker_first หายไป').toBeDefined();
    expect(rule).not.toBe(false);
  });

  it.each(WORKER_ROUTES)('Worker ต้องรันกับ %s', (path) => {
    expect(workerRuns(path, rule), `${path} จะถูกเสิร์ฟเป็น index.html โดยไม่ผ่าน Worker`).toBe(true);
  });

  it.each(Object.keys(SHORT_LINKS))('ลิงก์สั้น %s ต้องถึง Worker (ไม่งั้นไม่ redirect)', (key) => {
    expect(workerRuns(key, rule), `${key} ไม่ถึง Worker`).toBe(true);
    // path ไทยเดินทางจริงในรูป percent-encoded — ต้องครอบคลุมด้วย
    expect(workerRuns(encodeURI(key), rule), `${encodeURI(key)} ไม่ถึง Worker`).toBe(true);
  });

  // รูปแบบ `/ราคา/tt` (ตัวย่อแพลตฟอร์มท้าย path) — สำหรับคอมเมนต์ที่คนต้องพิมพ์เอง
  // ถ้ารูปแบบนี้ไม่ถึง Worker จะโดนเสิร์ฟเป็น index.html แล้วไม่ redirect เลย
  it.each(Object.keys(SHORT_LINKS).flatMap((k) => Object.keys(SOURCE_PRESETS).map((s) => `${k}/${s}`)))(
    'ลิงก์สั้นพร้อมตัวย่อ %s ต้องถึง Worker',
    (path) => {
      expect(workerRuns(path, rule), `${path} ไม่ถึง Worker`).toBe(true);
      expect(workerRuns(encodeURI(path), rule), `${encodeURI(path)} ไม่ถึง Worker`).toBe(true);
    },
  );

  it('ไฟล์ bundle ต้อง "ไม่" ผ่าน Worker (ประหยัด invocation)', () => {
    expect(workerRuns('/assets/index-abc123.js', rule)).toBe(false);
    expect(workerRuns('/assets/index-abc123.css', rule)).toBe(false);
  });

  it('เตือนเมื่อ compatibility_date ใหม่กว่า 2025-04-01 (flag ที่ทำให้ Worker ถูกข้าม)', () => {
    // ไม่ได้ห้ามใช้วันที่ใหม่ — แค่ยืนยันว่าถ้าใหม่จริง ต้องมี run_worker_first คู่กันเสมอ
    const date = cfg.compatibility_date ?? '';
    if (date >= '2025-04-01') expect(rule).toBeDefined();
  });
});
