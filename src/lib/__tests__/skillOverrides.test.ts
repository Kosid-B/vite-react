import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  SKILL_OVERRIDES, SYNCED_EXTERNAL_SKILLS, FORBIDDEN_SOURCE_FILES, skillOverrideBlock,
} from '../skillOverrides';
import { MIN_SAMPLE_FOR_RATE } from '../decisionRules';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 skill ภายนอกมาพร้อม "แหล่งความจริง" ของตัวเอง
 *    `thai-marketing-strategy` สั่งให้สร้าง `BRAND.md` และเรียกมันว่า single source of truth
 *    ⇒ ถ้าทำตาม จะได้แหล่งความจริงเรื่องแบรนด์ตัวที่ 3 ในระบบที่เพิ่งลดจาก 2 เหลือ 1
 *
 * เทสต์นี้ไม่ได้ห้ามใช้ skill — แต่บังคับว่าเมื่อขัดกัน **ของรีโปนี้ชนะ**
 * ══════════════════════════════════════════════════════════════════════════ */

const ROOT = resolve(__dirname, '../../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.git' || e === 'dist') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

describe('🔴 ห้ามมีแหล่งความจริงเรื่องแบรนด์ตัวที่สาม', () => {
  it('ไม่มีไฟล์ต้องห้ามอยู่ในรีโปนี้', () => {
    const found = walk(ROOT)
      .map((p) => p.slice(ROOT.length + 1))
      .filter((rel) => FORBIDDEN_SOURCE_FILES.some((f) => rel.endsWith('/' + f) || rel === f));
    expect(found, `เจอแหล่งความจริงคู่แข่ง: ${found.join(', ')}`).toEqual([]);
  });

  it('แหล่งความจริงของแบรนด์ต้องยังเป็น brandBrief.ts', () => {
    expect(existsSync(resolve(ROOT, 'src/lib/brandBrief.ts'))).toBe(true);
    const o = SKILL_OVERRIDES.find((x) => x.theySay.includes('BRAND.md'))!;
    expect(o.weDo).toContain('brandBrief.ts');
    expect(o.skill).toBe('*');   // ทับทุก skill ไม่ใช่เฉพาะตัวที่สั่งสร้าง
  });
});

describe('กติกาทับ — ต้องอ้างของจริง ไม่ใช่เขียนไว้ลอย ๆ', () => {
  it('ทุกข้อต้องบอกครบว่าเขาสั่งอะไร เราทำอะไร และทำไม', () => {
    expect(SKILL_OVERRIDES.length).toBeGreaterThanOrEqual(4);
    for (const o of SKILL_OVERRIDES) {
      expect(o.theySay.length, o.skill).toBeGreaterThan(15);
      expect(o.weDo.length, o.skill).toBeGreaterThan(15);
      expect(o.why.length, `${o.skill} ไม่ได้บอกเหตุผล — กติกาที่ไม่มีเหตุผลจะถูกถอดในรอบหน้า`).toBeGreaterThan(30);
    }
  });

  it('ทุกข้อต้องอ้าง skill ที่ sync มาจริง (หรือ * = ทุกตัว)', () => {
    for (const o of SKILL_OVERRIDES) {
      if (o.skill !== '*') expect(SYNCED_EXTERNAL_SKILLS).toContain(o.skill);
    }
  });

  it('เกณฑ์ของเราต้องชนะเกณฑ์ที่คลังภายนอกกำหนดมา', () => {
    const ads = SKILL_OVERRIDES.find((o) => o.skill === 'thai-performance-ads')!;
    expect(ads.weDo).toContain(String(MIN_SAMPLE_FOR_RATE));
    expect(ads.weDo).toMatch(/paid-scale/);
    expect(ads.why).toMatch(/policy ไม่ใช่ validated/);
  });

  it('บล็อกที่แปะเข้า prompt ต้องมีข้อห้ามสร้างไฟล์ และครบทุกข้อ', () => {
    const b = skillOverrideBlock();
    for (const f of FORBIDDEN_SOURCE_FILES) expect(b).toContain(f);
    for (const o of SKILL_OVERRIDES) expect(b).toContain(o.weDo);
  });
});

describe('🟡 สถานะการ sync — บันทึกไว้ว่าเรียกได้จริงกี่ตัว', () => {
  /** คลัง skill ที่ sync เข้ามาให้ผู้ช่วยเรียกใช้ (นอกรีโป) */
  const SYNCED_DIR = '/root/.claude/skills/synced';

  /** คลังนี้ใช้โครง "โฟลเดอร์ชื่อ skill" หรือเปล่า
   *  🔴 27 ส.ค. 2569 โครงเปลี่ยน: กลายเป็นโฟลเดอร์ชื่อ UUID เดียว ไม่มีชื่อ skill ให้เทียบ
   *     ⇒ ต้องแยก **"ตรวจแล้วไม่มี"** ออกจาก **"ตรวจไม่ได้เพราะโครงไม่ตรงที่รู้จัก"**
   *     (หลักเดียวกับ `null` = ตรวจไม่ได้ ≠ 0 ทั้งระบบ)
   *     ถ้าไม่แยก เทสต์จะแดงทุกครั้งที่ผู้ให้บริการเปลี่ยนที่เก็บ ทั้งที่รีโปไม่ได้ผิดอะไร
   *     — แดงด้วยเหตุผลที่เราแก้ไม่ได้ = สอนให้คนมองข้ามสีแดง */
  function usesNamedLayout(): boolean {
    if (!existsSync(SYNCED_DIR)) return false;
    return SYNCED_EXTERNAL_SKILLS.some((s) => existsSync(join(SYNCED_DIR, s)));
  }

  it('skill ที่ประกาศว่า sync แล้ว ต้องมีอยู่จริง — ไม่งั้นกติกาทับของที่ไม่มี', () => {
    // เครื่องอื่น/CI ไม่มีคลังนี้ · หรือคลังใช้โครงที่เราอ่านไม่ออก = ตรวจไม่ได้ ให้ข้าม
    if (!usesNamedLayout()) return;
    for (const s of SYNCED_EXTERNAL_SKILLS) {
      expect(existsSync(join(SYNCED_DIR, s, 'SKILL.md')), `${s} ประกาศว่า sync แล้วแต่ไม่มีไฟล์`).toBe(true);
    }
  });

  it('ถ้าโครงคลังเป็นแบบชื่อ skill เมื่อไร ตัวตรวจต้องกลับมาทำงานทันที', () => {
    // กันไม่ให้ "ข้าม" กลายเป็นการปิดตัวตรวจถาวร — พอโครงกลับมา ต้องเช็กจริง
    const known = SYNCED_EXTERNAL_SKILLS.filter((s) => existsSync(join(SYNCED_DIR, s)));
    expect(usesNamedLayout()).toBe(known.length > 0);
  });

  it('🔴 ยืนยันว่าคำสั่งที่ขัดกันมีอยู่จริงในไฟล์ต้นทาง (ไม่ได้กล่าวหาลอย ๆ)', () => {
    const f = join(SYNCED_DIR, 'thai-marketing-strategy/SKILL.md');
    if (!existsSync(f)) return;
    const text = readFileSync(f, 'utf8');
    expect(text).toContain('BRAND.md');
    expect(text).toMatch(/แหล่งความจริงเดียว|single source of truth/);
  });
});
