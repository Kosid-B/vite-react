import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* เครื่องมือที่ใช้ตรวจ ต้องเป็นเครื่องมือตัวเดียวกับที่ deploy จริง
 *
 * ทำไมต้องมี (18 ส.ค. 2569 — บทเรียนซ้ำรอยข้อ 2):
 *   แก้ wrangler.jsonc ใส่ `run_worker_first` แบบ array แล้วรัน `wrangler deploy --dry-run`
 *   บนเครื่องนี้ → ผ่าน ✅ · push ขึ้นไป → **CI ล้มทันที**
 *     "Expected assets.run_worker_first to be of type boolean but got [...]"
 *   เพราะเครื่องนี้ `npx wrangler` = 4.123.0 (ล่าสุด) แต่ CI ตรึงไว้ที่ 3.114.0
 *   ⇒ dry-run ที่ "ผ่าน" ไม่ได้แปลว่า deploy จะผ่าน ถ้าคนละเวอร์ชันกัน
 *   (v3 ยัง warn ว่า observability.traces/persist เป็น unexpected fields = ตัดทิ้งเงียบ ๆ ด้วย)
 *
 * เทสต์นี้บังคับให้ทั้งสองฝั่งเป็นเวอร์ชันเดียวกันเป๊ะ และตรงกับฟีเจอร์ที่ config ใช้จริง
 */

const root = process.cwd();
const readJson = (f: string) => JSON.parse(readFileSync(join(root, f), 'utf8'));
const readJsonc = (f: string) => JSON.parse(
  readFileSync(join(root, f), 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\s+\/\/.*$/gm, ''),
);

/** เทียบเวอร์ชันแบบ semver อย่างง่าย: a >= b */
function gte(a: string, b: string): boolean {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return true;
}

const pkgVersion: string = readJson('package.json').devDependencies?.wrangler ?? '';
const workflow = readFileSync(join(root, '.github/workflows/cloudflare-deploy.yml'), 'utf8');
const ciVersion = workflow.match(/wranglerVersion:\s*'([^']+)'/)?.[1] ?? '';
const cfg = readJsonc('wrangler.jsonc');

describe('เครื่องมือ deploy — เครื่องนี้ต้องเท่ากับ CI', () => {
  it('package.json ตรึงเวอร์ชัน wrangler แบบเป๊ะ (ห้าม ^ หรือ ~)', () => {
    expect(pkgVersion, 'devDependencies.wrangler หายไป').toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('เวอร์ชันใน CI ต้องตรงกับ package.json เป๊ะ ๆ', () => {
    expect(ciVersion, 'อ่าน wranglerVersion จาก workflow ไม่ได้').toMatch(/^\d+\.\d+\.\d+$/);
    expect(ciVersion, `CI=${ciVersion} แต่ package.json=${pkgVersion} — dry-run บนเครื่องจะไม่ตรงกับ deploy จริง`)
      .toBe(pkgVersion);
  });

  it('ใช้ run_worker_first แบบ array ⇒ wrangler ต้อง >= 4.20.0', () => {
    if (!Array.isArray(cfg.assets?.run_worker_first)) return;
    expect(gte(ciVersion, '4.20.0'), `wrangler ${ciVersion} ไม่รองรับ run_worker_first แบบ array`).toBe(true);
  });

  it('ใช้ observability.logs.persist / traces ⇒ wrangler ต้อง >= 4.0.0 (v3 ตัดทิ้งเงียบ ๆ)', () => {
    const o = cfg.observability ?? {};
    if (o.traces === undefined && o.logs?.persist === undefined) return;
    expect(gte(ciVersion, '4.0.0'), `wrangler ${ciVersion} จะ warn ว่าเป็น unexpected field แล้วตัดทิ้ง`).toBe(true);
  });
});
