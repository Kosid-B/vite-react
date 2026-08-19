import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

/* สัญญาระหว่าง "ตัวแปร env ที่โค้ดอ่าน" กับ "ตัวแปรที่ workflow ส่งเข้า build"
 *
 * ⚠️ เทสต์นี้มีเพราะเสียหายจริง (พบ 19 ส.ค. 2569):
 *   Amplitude เขียนครบทั้ง sink + session replay + connector ต่อแล้ว + เทสต์ผ่าน
 *   แต่ `VITE_AMPLITUDE_KEY` ไม่เคยถูกใส่ใน cloudflare-deploy.yml
 *   → Vite แทนค่าเป็นสตริงว่างตอน build → `isAmplitudeEnabled=false`
 *   → SDK ไม่เคยโหลดบน production → Amplitude ได้ข้อมูล **0 event** ตั้งแต่วันแรก
 *
 *   ไม่มีเครื่องมือไหนจับได้เลย: tsc ผ่าน (โค้ดถูก) · vitest ผ่าน (ฟังก์ชันถูก)
 *   · build ผ่าน (ไม่มีคีย์ = ตั้งใจให้เงียบ) · deploy success (ไม่เกี่ยวกัน)
 *   นี่คือชั้นที่ 1 ของ `shipped-not-written`: **โค้ดถูกเรียกใช้จริงไหม**
 *
 * กติกา: ตัวแปร `import.meta.env.VITE_*` ทุกตัวที่โค้ดใน src/ อ่าน ต้องอยู่ใน
 *   build step ของ workflow production — หรืออยู่ใน INTENTIONALLY_UNSET พร้อมเหตุผท
 */

const WORKFLOW = join(process.cwd(), '.github', 'workflows', 'cloudflare-deploy.yml');

/** ตัวแปรที่ "ตั้งใจไม่ส่งเข้า production build" — ต้องมีเหตุผลกำกับเสมอ */
const INTENTIONALLY_UNSET: Record<string, string> = {
  VITE_ANTHROPIC_API_KEY:
    'คีย์ลับ — ถ้าใส่ตอน build มันจะถูกฝังลงบันเดิลที่ใครก็ดาวน์โหลดอ่านได้ ' +
    '(หน้า AIResearch ใช้เฉพาะตอน dev เครื่องตัวเอง · production เรียกผ่าน Edge Function แทน)',
};

/** ชื่อ VITE_* ทุกตัวที่ถูกอ่านผ่าน import.meta.env ในโค้ดจริง (ไม่รวมคอมเมนต์/เทสต์) */
function varsReadByCode(): string[] {
  // ใช้ git grep เพื่อไม่ต้องเดินโฟลเดอร์เอง และไม่โดน node_modules
  const out = execSync(
    `git grep -hoE 'import\\.meta\\.env\\.VITE_[A-Z0-9_]+' -- 'src/*.ts' 'src/*.tsx' ':!src/**/__tests__/**' || true`,
    { encoding: 'utf8' },
  );
  const found = new Set<string>();
  for (const m of out.matchAll(/VITE_[A-Z0-9_]+/g)) found.add(m[0]);
  return [...found].sort();
}

describe('สัญญา env — ตัวแปรที่โค้ดอ่าน ต้องถูกส่งเข้า build จริง', () => {
  const workflow = readFileSync(WORKFLOW, 'utf8');
  const names = varsReadByCode();

  it('อ่านชื่อตัวแปรจากโค้ดได้จริง (กันเทสต์เขียวเพราะหาไม่เจอ)', () => {
    // เทสต์ที่หาอะไรไม่เจอแล้วผ่าน = เทสต์ที่ไม่ได้ตรวจอะไรเลย — ล็อกไว้ก่อน
    expect(names.length).toBeGreaterThanOrEqual(3);
    expect(names).toContain('VITE_SUPABASE_URL');
    expect(names).toContain('VITE_AMPLITUDE_KEY');
  });

  it.each(varsReadByCode())('%s ถูกส่งเข้า build ของ production (หรือมีเหตุผลว่าทำไมไม่ส่ง)', (name) => {
    const reason = INTENTIONALLY_UNSET[name];
    if (reason) {
      expect(reason.length, `${name} อยู่ในรายการยกเว้น ต้องเขียนเหตุผลให้ชัด`).toBeGreaterThan(20);
      expect(
        new RegExp(`^\\s*${name}\\s*:`, 'm').test(workflow),
        `${name} ถูกประกาศว่า "ตั้งใจไม่ส่ง" แต่กลับโผล่ใน workflow — ขัดกันเอง`,
      ).toBe(false);
      return;
    }
    expect(
      new RegExp(`^\\s*${name}\\s*:\\s*\\$\\{\\{`, 'm').test(workflow),
      `โค้ดอ่าน ${name} แต่ cloudflare-deploy.yml ไม่ได้ส่งเข้า build\n` +
        `→ บน production ค่านี้จะเป็นสตริงว่าง และฟีเจอร์ที่พึ่งมันจะ "เงียบ" โดยไม่มีใครรู้\n` +
        `แก้: เพิ่มใต้ env ของ step "Build" หรือใส่ใน INTENTIONALLY_UNSET พร้อมเหตุผล`,
    ).toBe(true);
  });

  it('คีย์ลับต้องไม่หลุดเข้า build ฝั่ง client', () => {
    // กันพลาดซ้ำแบบทั่วไป ไม่ใช่แค่ตัวที่รู้จัก: ห้ามมี VITE_*SECRET/*API_KEY* ใน workflow
    const risky = [...workflow.matchAll(/^\s*(VITE_[A-Z0-9_]*(?:SECRET|PRIVATE)[A-Z0-9_]*)\s*:/gm)];
    expect(risky.map((m) => m[1]), 'ตัวแปร VITE_* ถูกฝังลงบันเดิลสาธารณะเสมอ — ห้ามใส่ค่าลับ').toEqual([]);
  });
});
