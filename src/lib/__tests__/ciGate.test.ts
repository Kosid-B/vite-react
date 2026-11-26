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
/** 🔴 workflow ที่ "ขึ้น production จริง" — ต้องถูกเฝ้าด้วย ไม่ใช่แค่ ci.yml
 *  เดิม deploy รันแค่ `npm run build` ⇒ ของที่ lint ไม่ผ่านขึ้น production ได้
 *  ทำให้ CI แดง 54 รอบโดยไม่มีอาการ (ledger #36–37) — เจ้าของสั่งปิดช่อง 22 ส.ค. 2569 */
const deployYml = readFileSync(resolve(root, '.github/workflows/cloudflare-deploy.yml'), 'utf8');
/** 🔴 เพิ่ม 20 พ.ย. 2569 — workflow ที่ deploy Edge Function ขึ้น production เช่นกัน (ledger #87)
 *  ของที่ขึ้น production ทุกเส้นทางต้องผ่านด่านเดียวกัน ไม่ใช่เฉพาะเส้นที่เราจำได้ */
const fnDeployYml = readFileSync(resolve(root, '.github/workflows/supabase-functions-deploy.yml'), 'utf8');
/** ทุกเส้นทางที่ "ขึ้น production จริง" — เพิ่มเส้นใหม่ต้องมาต่อที่นี่ */
const PROD_DEPLOYS: ReadonlyArray<readonly [string, string]> = [
  ['cloudflare-deploy.yml', deployYml],
  ['supabase-functions-deploy.yml', fnDeployYml],
];

/** ตัดคอมเมนต์ YAML ออกก่อนตรวจ — ไม่งั้นคำที่เราเขียน "อธิบาย" ในคอมเมนต์
 *  จะถูกนับเป็นขั้นจริง (เจอจริงตอนเขียนเทสต์นี้: คอมเมนต์พูดถึง `npm run build`
 *  แล้วทำให้การตรวจ "lint มาก่อน build ไหม" อ่านตำแหน่งผิด) */
function stripComments(yml: string): string {
  return yml.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
}

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
    const missing = npmRunStepsIn(stripComments(ciYml)).filter((s) => !ciScript.includes(`npm run ${s}`));
    expect(missing, `ขั้นที่ CI รันแต่ \`npm run ci\` ไม่ได้รัน: ${missing.join(', ')}`).toEqual([]);
  });

  /** 🔴 ledger #114 — push สาขาฟีเจอร์ก่อนเปิด PR = ไม่มี `pull_request` event
   *  ⇒ CI ไม่รันกับ head นั้นเลย และ GitHub ผูก run ของ head เก่าเข้า PR ใหม่
   *     ⇒ หน้า PR ดูเหมือนมีด่านแล้ว ทั้งที่ยังไม่ได้ตรวจคอมมิตจริง
   *  ⇒ ต้องมีทางสั่งรันเอง ไม่งั้นทางออกที่เหลือคือท่าที่ห้าม (คอมมิตว่าง / ปิด-เปิด PR) */
  it('🔴 ci.yml ต้องสั่งรันเองได้ (`workflow_dispatch`) — ไม่งั้น head ที่ CI ไม่แตะจะไม่มีทางตรวจ', () => {
    expect(/^\s*workflow_dispatch:/m.test(stripComments(ciYml))).toBe(true);
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

describe('deploy ที่ขึ้น production จริง ต้องกั้นด้วยด่านเดียวกับ CI', () => {
  it('cloudflare-deploy.yml ต้องมีขั้น lint', () => {
    expect(stripComments(deployYml), 'ของที่ lint ไม่ผ่านต้องขึ้น production ไม่ได้')
      .toContain('npm run lint');
  });

  it('lint ต้องอยู่ "ก่อน" build — ล้มเร็วก่อนเผาเวลา build', () => {
    const steps = stripComments(deployYml);
    const lintAt = steps.indexOf('npm run lint');
    const buildAt = steps.indexOf('npm run build');
    expect(lintAt).toBeGreaterThan(-1);
    expect(buildAt).toBeGreaterThan(-1);
    expect(lintAt).toBeLessThan(buildAt);
  });

  it('ทุกขั้น npm run ของ deploy ต้องอยู่ใน `npm run ci` ด้วย', () => {
    // ⇒ ถ้ามีคนเพิ่มขั้นใหม่เข้า deploy แล้วเรารันในเครื่องไม่ได้ = รู้ตัวทันที
    const ciScript = pkg.scripts.ci ?? '';
    const missing = npmRunStepsIn(stripComments(deployYml))
      .filter((s) => s !== 'ci')
      .filter((s) => !ciScript.includes(`npm run ${s}`));
    expect(missing, `ขั้นที่ deploy รันแต่ \`npm run ci\` ไม่ได้รัน: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('ทุกเส้นทางที่ขึ้น production ต้องผ่านด่านเดียวกัน', () => {
  it('อ่านเจอครบทุกเส้น (กันเทสต์ผ่านเพราะหาไฟล์ไม่เจอ)', () => {
    expect(PROD_DEPLOYS.length).toBeGreaterThanOrEqual(2);
    for (const [name, yml] of PROD_DEPLOYS) expect(yml.length, name).toBeGreaterThan(200);
  });

  it.each(PROD_DEPLOYS.map(([n]) => n))('%s ต้องมีขั้น lint', (name) => {
    const yml = PROD_DEPLOYS.find(([n]) => n === name)![1];
    expect(stripComments(yml), 'ของที่ lint ไม่ผ่านต้องขึ้น production ไม่ได้').toContain('npm run lint');
  });

  it.each(PROD_DEPLOYS.map(([n]) => n))('ทุกขั้น npm run ของ %s ต้องอยู่ใน `npm run ci`', (name) => {
    const yml = PROD_DEPLOYS.find(([n]) => n === name)![1];
    const ciScript = pkg.scripts.ci ?? '';
    const missing = npmRunStepsIn(stripComments(yml))
      .filter((x) => x !== 'ci')
      .filter((x) => !ciScript.includes(`npm run ${x}`));
    expect(missing, `ขั้นที่ deploy รันแต่ \`npm run ci\` ไม่ได้รัน: ${missing.join(', ')}`).toEqual([]);
  });

  it('🔴 deploy edge function ต้องยิงไป project production ตัวจริงเท่านั้น', () => {
    const yml = stripComments(fnDeployYml);
    expect(yml, 'ต้องระบุ project ref').toContain('waigsnxhrlwtiotspaim');
    expect(yml, 'ห้ามยิงไป project dev/TIS').not.toMatch(/oudykxmtrnjeskglaluh|galtbbkcddugnsfkgyqm|bjozpwdtqbpwcxnqguka/);
    expect(yml, 'ต้องล้มทันทีถ้าไม่มี token แทนที่จะเงียบ').toContain('SUPABASE_ACCESS_TOKEN');
  });
});

/* ══════════════════════════════════════════════════════════════════════
 * ด่าน: workflow deploy edge function **ห้ามยิงรวดเดียวทั้งรีโป** (ledger #104)
 *
 * 26 พ.ย. 2569 — ตั้ง `SUPABASE_ACCESS_TOKEN` สำเร็จ รันจริงครั้งแรก CLI ตอบว่า
 * "Deploy 31 Functions" ⇒ นับสดเทียบ production พบว่า **9 ตัวในรีโปไม่เคยขึ้นเลย**
 * และ 3 ใน 9 เป็น endpoint สาธารณะ (handoff-import · line-login · recurring-webhook)
 * ⇒ เติม `--yes` เฉย ๆ เพื่อให้ CI เขียว = ปล่อยท่อรับเงินที่ค้างมา 3 เดือน
 *   ขึ้น production โดยไม่มีใครสั่ง · "ของที่ยังไม่เคยขึ้น" ต้องเป็นการตัดสินใจ
 * ══════════════════════════════════════════════════════════════════════ */

/** คำสั่ง deploy ที่ **ไม่ได้ระบุชื่อฟังก์ชัน** (ตามด้วย flag ล้วน หรือไม่ตามด้วยอะไรเลย) */
function bulkDeployCommands(yml: string): string[] {
  return [...yml.matchAll(/supabase functions deploy([^\n]*)/g)]
    .map((m) => m[1].trim())
    .filter((rest) => rest === '' || rest.startsWith('-'));
}

describe('🔴 deploy edge function ต้องระบุชื่อเสมอ (ledger #104)', () => {
  const body = stripComments(fnDeployYml);

  it('ไม่มีคำสั่ง deploy ที่ปล่อยให้ CLI เลือกเองทั้งโฟลเดอร์', () => {
    expect(bulkDeployCommands(body), 'เจอ bulk deploy = ของที่ไม่เคยขึ้น production จะขึ้นเอง').toEqual([]);
  });

  it('ด่านนี้จับของผิดได้จริง (ตัวอย่างสังเคราะห์ — กันเทสต์ที่ผ่านเพราะไม่ได้ตรวจอะไร)', () => {
    expect(bulkDeployCommands('run: supabase functions deploy\n')).toHaveLength(1);
    expect(bulkDeployCommands('run: supabase functions deploy --project-ref abc\n')).toHaveLength(1);
    expect(bulkDeployCommands('run: supabase functions deploy --yes\n')).toHaveLength(1);
    expect(bulkDeployCommands('run: supabase functions deploy "$fn" --remote=x --yes\n')).toHaveLength(0);
  });

  it('ต้องสั่งแบบไม่ถามยืนยัน — stdout ของ CI ไม่ใช่ terminal ⇒ ถามแล้วล้ม', () => {
    expect(body).toMatch(/supabase functions deploy[^\n]*--yes/);
  });

  it('ห้ามใช้ --project-ref ที่ถูกประกาศเลิกใช้ (จะถูกถอดใน CLI v4 · เราปัก version: latest)', () => {
    expect(body, 'ปัก latest + ใช้ flag ที่จะถูกถอด = พังเองวันหนึ่งโดยไม่มีใครแตะอะไร')
      .not.toContain('--project-ref');
  });

  it('ต้อง checkout ลึกพอจะเทียบคอมมิตก่อนหน้าได้ (ไม่งั้นหา "อะไรเปลี่ยน" ไม่ได้)', () => {
    expect(body).toMatch(/fetch-depth:\s*0/);
  });
});
