import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SHORT_LINKS } from '../shortLinks';

/* ══════════════════════════════════════════════════════════════════════
 * กันเอกสาร skill `beachhead-who-not-what` เน่า
 *
 * 🔴 ที่มา (21 ส.ค. 2569): ผู้ช่วยอ้าง "MIT 24 Steps ขั้นที่ 1–6 บังคับให้เลือก pain เดียว"
 *    เพื่อสนับสนุนข้อเสนอให้ลดหัวข้อคอนเทนต์ — เจ้าของค้าน และพอเปิดกรอบอ่านจริง
 *    ขั้นที่ 1–6 พูดถึง "คน" ทั้งหมด และขั้นที่ 6 บังคับให้ครอบคลุม "ทั้งวงจร" ซึ่งตรงข้าม
 *
 * เอกสารที่อ้างชื่อขั้นและลิงก์เอาไว้ จะผิดเงียบ ๆ ทันทีที่โค้ดเปลี่ยนชื่อ
 * เทสต์นี้จึงผูกเอกสารเข้ากับแหล่งความจริงในโค้ดโดยตรง
 * ══════════════════════════════════════════════════════════════════════ */

const root = resolve(__dirname, '../../..');
const skill = readFileSync(resolve(root, '.claude/skills/beachhead-who-not-what/SKILL.md'), 'utf8');
const bmc = readFileSync(resolve(root, 'src/pages/BusinessModel.tsx'), 'utf8');

describe('skill beachhead-who-not-what', () => {
  it('มีหัวใจของกฎอยู่จริง — แคบที่คน กว้างที่ปัญหา', () => {
    expect(skill).toContain('แคบที่');
    expect(skill).toContain('กว้างที่');
    expect(skill, 'ต้องระบุชัดว่าหัวหาดคือกลุ่มคน ไม่ใช่ปัญหา').toMatch(/หัวหาด.*["“]?ใคร/);
  });

  it('ชื่อขั้น DE ที่ยกมาอ้าง ต้องตรงกับที่โค้ดประกาศจริง (กันอ้างจากความจำ)', () => {
    // ขั้นที่ 6 คือหัวใจของข้อโต้แย้ง — ถ้าชื่อนี้เปลี่ยน เอกสารต้องถูกแก้ตาม
    for (const step of ['Market Segmentation', 'Select Beachhead Market', 'Full Life Cycle Use Case']) {
      expect(bmc, `${step} ต้องมีอยู่ใน DE24 ของโค้ด`).toContain(`'${step}'`);
      expect(skill, `${step} ถูกอ้างใน skill ต้องสะกดตรงกับโค้ด`).toContain(step);
    }
  });

  it('ลิงก์สั้นทุกตัวที่ตารางหัวข้อยกมา ต้องมีอยู่จริงใน SHORT_LINKS', () => {
    // ตารางนี้คือ "ความกว้าง" ที่ skill บอกว่าห้ามตัด — ถ้าลิงก์ตาย ข้อเสนอก็กลวง
    const cited = [...skill.matchAll(/`(\/[^\s`|]+)`/g)].map((m) => m[1]);
    const shortLinkish = cited.filter((p) => !p.includes('.') && !p.includes('/', 1));
    expect(shortLinkish.length, 'ต้องมีลิงก์ให้ตรวจ').toBeGreaterThanOrEqual(8);
    const missing = [...new Set(shortLinkish)].filter((p) => !SHORT_LINKS[p]);
    expect(missing, 'ลิงก์ที่ skill อ้างแต่ไม่มีใน SHORT_LINKS').toEqual([]);
  });

  it('ต้องเตือนเรื่องประโยคอ้างอำนาจ — จุดที่ทำให้ผู้ใช้โต้ยากขึ้น', () => {
    expect(skill).toContain('นี่ไม่ใช่ความเห็นผม');
    expect(skill, 'ต้องบอกทางออกด้วย ไม่ใช่แค่ห้าม').toContain('ผมคิดว่า');
  });

  it('ต้องมีกฎ "ตรวจตำแหน่งก่อนโทษกลยุทธ์" — ห้ามเสนอตัดเนื้อหาที่ยังไม่เคยถูกเห็น', () => {
    expect(skill).toMatch(/ตำแหน่ง/);
    expect(skill).toMatch(/0 คน|ไม่มีใครเห็น/);
  });

  it('CLAUDE.md ต้องชี้มาที่ skill นี้ (ไม่งั้นไม่มีใครรู้ว่ามีอยู่)', () => {
    const claude = readFileSync(resolve(root, 'CLAUDE.md'), 'utf8');
    expect(claude).toContain('beachhead-who-not-what');
  });
});
