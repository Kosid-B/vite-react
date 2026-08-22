import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * ล็อกว่า "ด่านที่รันในเครื่อง" = "ด่านที่ CI รันจริง"
 *
 * ที่มา (LESSONS-LEDGER #36): CI แดงติดกัน 54 รอบ 3 วัน (#869→#922)
 * เพราะผมรัน `typecheck` + `vitest` ในเครื่องแล้วบอกผู้ใช้ว่า "เทสต์ผ่าน 2,197 ตัว"
 * แต่ **ไม่เคยรัน `npm run lint` เลยสักครั้ง** ทั้งที่ CI รันเป็นขั้นที่ 2
 * ⇒ ตรงกับ skill `shipped-not-written`: "เครื่องมือที่ตรวจ = ตัวที่ใช้จริงไหม"
 *
 * เทสต์นี้อ่าน ci.yml **ตัวจริง** แล้วบังคับว่าทุกขั้น `npm run <x>` ในนั้น
 * ต้องอยู่ใน `npm run ci` ของ package.json ด้วย
 * ⇒ ใครเพิ่มขั้นใหม่เข้า CI แล้วไม่ใส่ใน `npm run ci` = เทสต์แดงทันที
 *   (ไม่ใช่ "รอให้ CI แดงแล้วค่อยรู้" ซึ่งเป็นสิ่งที่ทำให้พลาดรอบนี้)
 */

const root = resolve(__dirname, '../../..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const ciYml = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8');

/** ดึงชื่อ script ทุกตัวที่ CI สั่งด้วย `npm run <name>` */
function npmRunStepsIn(yml: string): string[] {
  const out: string[] = [];
  for (const m of yml.matchAll(/npm run ([a-z][\w:-]*)/g)) out.push(m[1]);
  return [...new Set(out)];
}

describe('ci gate — เครื่องมือที่ตรวจในเครื่อง ต้องเป็นตัวเดียวกับที่ CI ใช้', () => {
  it('มี script `ci` ใน package.json', () => {
    expect(pkg.scripts.ci, 'ต้องมี `npm run ci` เป็นด่านเดียวที่รันก่อน commit ทุกครั้ง').toBeTruthy();
  });

  it('ทุกขั้นของ ci.yml ถูกครอบด้วย `npm run ci`', () => {
    const ciScript = pkg.scripts.ci ?? '';
    const missing = npmRunStepsIn(ciYml).filter((s) => !ciScript.includes(`npm run ${s}`));
    expect(missing, `ขั้นที่ CI รันแต่ \`npm run ci\` ไม่ได้รัน: ${missing.join(', ')}`).toEqual([]);
  });

  it('`npm run ci` ต้องมี lint (ขั้นที่ถูกลืมจนแดง 54 รอบ)', () => {
    expect(pkg.scripts.ci).toContain('npm run lint');
  });

  it('ทุก script ที่ `npm run ci` เรียก ต้องมีอยู่จริงใน package.json', () => {
    const called = npmRunStepsIn(pkg.scripts.ci ?? '');
    const ghost = called.filter((s) => !(s in pkg.scripts));
    expect(ghost, `เรียก script ที่ไม่มีอยู่: ${ghost.join(', ')}`).toEqual([]);
  });

  it('`npm run ci` ต่อด้วย && ไม่ใช่ท่อ — ท่อทำให้ exit code เป็นของคำสั่งท้ายสุด (ledger #33)', () => {
    expect(pkg.scripts.ci).not.toContain('|');
  });
});
