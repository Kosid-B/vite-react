import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
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

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 สคริปต์ที่รันด้วย `vite-node` ห้ามมี shebang
 *
 * บั๊กจริง (17 พ.ย. 2569 · ledger #80): ผมเขียน `#!/usr/bin/env node` ไว้บรรทัดแรก
 *   ของ `scripts/marketing-export.mjs` ตามนิสัยสคริปต์ CLI
 *   แต่ vite ทำ SSR transform **ยกทุก import ขึ้นไปไว้บนสุด** ⇒ shebang ไหลไปอยู่กลางไฟล์:
 *       ...__vite_ssr_import__("node:fs", {...});#!/usr/bin/env node
 *                                                ^ SyntaxError
 *   เครื่องมือทุกตัวผ่านหมด (lint/tsc/vitest) เพราะไม่มีตัวไหนรันสคริปต์จริง
 *   หลักฐานยืนยัน: `prerender-seo.mjs` ที่ใช้ท่าเดียวกันและทำงานดีมาตลอด **ไม่มี shebang**
 *
 * ⚠️ สคริปต์ที่รันด้วย `node` เปล่า (contrast-audit · md-to-pdf · typhoon-eval) มี shebang ได้
 *    ⇒ เทสต์นี้อ่าน package.json เพื่อหาว่า "ตัวไหนรันด้วย vite-node" ไม่ใช่เหวี่ยงแหทั้งโฟลเดอร์
 * ══════════════════════════════════════════════════════════════════════════ */
describe('🔴 สคริปต์ที่รันผ่าน vite-node ห้ามมี shebang', () => {
  const scripts: Record<string, string> = readJson('package.json').scripts ?? {};
  /** ดึงไฟล์ที่ถูกเรียกด้วย vite-node จาก npm script ตัวจริง — ไม่ใช่รายการที่พิมพ์มือ */
  const viteNodeTargets = [...new Set(
    Object.values(scripts).flatMap((cmd) => [...cmd.matchAll(/vite-node\s+(\S+)/g)].map((m) => m[1])),
  )].sort();

  it('ต้องหาเป้าหมายเจอจริง — หาไม่เจอ = ตัวตรวจพัง ไม่ใช่ "ไม่มีปัญหา"', () => {
    // fail-closed: ถ้าชื่อคำสั่งเปลี่ยน (เช่นย้ายไป tsx) regex จะหาไม่เจอแล้วเทสต์ผ่านฟรี
    expect(viteNodeTargets.length, 'ไม่เจอ npm script ที่เรียก vite-node เลย — regex หรือ toolchain เปลี่ยน').toBeGreaterThanOrEqual(3);
  });

  it.each(viteNodeTargets)('%s ต้องไม่ขึ้นต้นด้วย #!', (file) => {
    const head = readFileSync(join(root, file), 'utf8').slice(0, 2);
    expect(head, `${file} มี shebang — vite จะยกมันไปกลางไฟล์แล้วพังตอนรัน (ไม่ใช่ตอน build)`).not.toBe('#!');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
 * เวอร์ชัน Node ของ dev ต้องเท่ากับของ CI
 *
 * ทำไม: เครื่องเจ้าของรัน Node 25 · CI รัน 22 ⇒ "รันผ่านบนเครื่อง" ไม่ได้แปลว่าผ่านบน CI
 *   (หลักเดียวกับ wrangler ด้านบน — เครื่องมือที่ตรวจต้องเป็นตัวเดียวกับที่ deploy จริง)
 * กลไก: `engines.node` + `.nvmrc` + ทุก `node-version:` ใน workflow ต้องชี้ major ตัวเดียวกัน
 *   ⇒ วันไหน CI ขยับแล้วลืมขยับฝั่ง dev (หรือกลับกัน) = แดงทันที
 * ══════════════════════════════════════════════════════════════════════════ */
describe('เวอร์ชัน Node — dev ต้องเท่ากับ CI', () => {
  const engines: string = readJson('package.json').engines?.node ?? '';
  const major = engines.match(/>=\s*(\d+)/)?.[1] ?? '';

  it('package.json ต้องประกาศ engines.node เป็นช่วงที่ล็อก major เดียว', () => {
    expect(engines, 'engines.node หายไป — npm install จะไม่เตือนเมื่อเวอร์ชันไม่ตรง').toMatch(/^>=\d+ <\d+$/);
    const [lo, hi] = [...engines.matchAll(/(\d+)/g)].map((m) => Number(m[1]));
    expect(hi, `ช่วง ${engines} กว้างกว่า 1 major ⇒ ล็อกไม่อยู่`).toBe(lo + 1);
  });

  it('.nvmrc ต้องตรงกับ engines (nvm use แล้วได้เวอร์ชันที่ CI ใช้)', () => {
    expect(readFileSync(join(root, '.nvmrc'), 'utf8').trim()).toBe(major);
  });

  it('ทุก workflow ต้องใช้ node-version เดียวกับ engines', () => {
    const files = readdirSync(join(root, '.github/workflows')).filter((f) => /\.ya?ml$/.test(f)).sort();
    // fail-closed เหมือนกัน: โฟลเดอร์ว่าง/อ่านไม่เจอ ต้องแดง ไม่ใช่ผ่าน
    expect(files.length, 'อ่าน .github/workflows ไม่เจอไฟล์ yml เลย').toBeGreaterThanOrEqual(3);

    const found: string[] = [];
    for (const f of files) {
      const yml = readFileSync(join(root, '.github/workflows', f), 'utf8');
      for (const m of yml.matchAll(/node-version:\s*'?"?(\d+)/g)) found.push(`${f}=${m[1]}`);
    }
    expect(found.length, 'ไม่เจอ node-version ใน workflow เลย — regex พัง').toBeGreaterThanOrEqual(3);
    const wrong = found.filter((x) => !x.endsWith(`=${major}`));
    expect(wrong, `workflow ใช้ Node คนละตัวกับ engines (${major}): ${wrong.join(', ')}`).toEqual([]);
  });
});
