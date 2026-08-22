import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/* ══════════════════════════════════════════════════════════════════════
 * ความรู้ที่ "มีอยู่แต่ไม่มีวันถูกหยิบมาใช้" = เท่ากับไม่มี
 *
 * 🔴 เหตุการณ์จริง 21 ส.ค. 2569: ผู้ช่วยอ้าง "MIT 24 Steps" จากความจำแล้วผิด
 *    ทั้งที่ `.claude/skills/business-building-24-step/SKILL.md` มีคำตอบครบ (53KB)
 *    และอยู่ในเครื่องมาตั้งแต่ ก.ค. — บรรทัดที่ 20 เขียนเกณฑ์หัวหาด 3 ข้อไว้ชัดเจน
 *
 *    ต้นเหตุ: skill ถูกเลือกใช้จาก `description` แต่ไฟล์นั้นเขียนไว้ว่า  description: "MIT"
 *    สามตัวอักษร ⇒ ไม่มีทางถูกจับคู่กับคำถามเรื่องกลุ่มเป้าหมาย/beachhead/persona ได้เลย
 *    ตอนตรวจพบว่ามี 9 skill ที่ description สั้นกว่า 40 ตัวอักษร และเป็นความรู้แกนทั้งนั้น
 *    (24 ขั้น · ISO 9001 · PDPA · BCMS · VRIO)
 * ══════════════════════════════════════════════════════════════════════ */

const SKILLS = resolve(__dirname, '../../../.claude/skills');

/** ความยาวขั้นต่ำที่พอจะถูกจับคู่กับงานจริงได้ — สั้นกว่านี้คือความรู้ที่ถูกฝังทั้งเป็น */
const MIN_DESCRIPTION = 40;

interface Skill { name: string; description: string | null; raw: string | null }

function readSkills(): Skill[] {
  return readdirSync(SKILLS)
    .filter((d) => statSync(join(SKILLS, d)).isDirectory())
    .map((name) => {
      let text: string;
      // ⚠️ skill ที่มากับ Anthropic ใช้ CRLF — ถ้าไม่แปลงก่อน regex จะไม่แมตช์แล้วรายงานผิดว่า
      //    "ไม่มี description" ทั้งที่มี (เจอจริงตอนเขียนเทสต์นี้ 2 ไฟล์)
      try { text = readFileSync(join(SKILLS, name, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n'); }
      catch { return { name, description: null, raw: null }; }
      const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
      if (!fm) return { name, description: null, raw: null };
      const line = fm[1].match(/^description:[ \t]*(.*)$/m);
      if (!line) return { name, description: null, raw: null };
      let value = line[1].trim();
      if (['>', '>-', '|', '|-', ''].includes(value)) {
        // YAML หลายบรรทัด — เก็บบรรทัดที่ย่อหน้าต่อจากนี้
        const after = fm[1].slice(fm[1].indexOf(line[0]) + line[0].length).split('\n').slice(1);
        const buf: string[] = [];
        for (const ln of after) { if (/^\S/.test(ln)) break; buf.push(ln.trim()); }
        value = buf.join(' ').trim();
      }
      return { name, description: value.replace(/^["']|["']$/g, ''), raw: line[1].trim() };
    });
}

const skills = readSkills();

describe('frontmatter ของทุก skill', () => {
  it('อ่านเจอ skill จริง (กันเทสต์ผ่านเพราะไม่เจอไฟล์)', () => {
    expect(skills.length).toBeGreaterThan(100);
  });

  it('ทุก skill ต้องมี description', () => {
    expect(skills.filter((s) => s.description === null).map((s) => s.name)).toEqual([]);
  });

  it(`🔴 description ต้องยาวพอจะถูกหยิบมาใช้ได้จริง (≥ ${MIN_DESCRIPTION} ตัวอักษร)`, () => {
    const thin = skills
      .filter((s) => (s.description ?? '').length < MIN_DESCRIPTION)
      .map((s) => `${s.name} = ${JSON.stringify(s.description)} (${(s.description ?? '').length})`);
    expect(
      thin,
      'skill ที่บอกไม่ได้ว่าตัวเองใช้ตอนไหน จะไม่มีวันถูกเรียกใช้ — เท่ากับความรู้นั้นไม่มีอยู่',
    ).toEqual([]);
  });

  it('description ที่ครอบด้วย " ต้องไม่มี " ซ้อนแบบไม่ escape (ไม่งั้น YAML พังเงียบ)', () => {
    // เจอจริงตอนเขียนเทสต์นี้: ใส่ "MIT 24 Steps" ในเครื่องหมายคำพูดซ้อน
    // ⇒ frontmatter พัง ระบบไปหยิบบรรทัดแรกของเนื้อไฟล์มาเป็น description แทน โดยไม่มี error
    const broken = skills.filter((s) => {
      const raw = s.raw ?? '';
      if (!/^".*"$/.test(raw)) return false;
      try { JSON.parse(raw); return false; } catch { return true; }
    }).map((s) => s.name);
    expect(broken).toEqual([]);
  });

  it('ความรู้แกนที่เคยถูกฝังทั้งเป็น ต้องบอกได้ว่าใช้ตอนไหน', () => {
    const core = ['business-building-24-step', 'iso-9001', 'pdpa', 'bcms', 'rbv'];
    for (const name of core) {
      const s = skills.find((x) => x.name === name);
      expect(s, name).toBeTruthy();
      expect((s!.description ?? '').length, `${name} description สั้นเกินไป`).toBeGreaterThanOrEqual(120);
    }
  });
});
