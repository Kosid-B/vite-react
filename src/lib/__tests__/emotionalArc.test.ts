import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BEATS, FORBIDDEN_TRIGGERS, arcIssues, emotionalArcBlock, type Phase } from '../emotionalArc';

/* ══════════════════════════════════════════════════════════════════════════
 * ⚠️ ที่มาของหลักการ: skill `ai-dark-marketing` ที่ sync มา **ไม่มีเนื้อหาฮอร์โมน**
 *    ⇒ ไฟล์นี้เป็นการออกแบบของเรา ไม่ใช่การถอดจาก skill นั้น (เขียนไว้ในหัวไฟล์ด้วย)
 *
 * 🔴 สิ่งที่เทสต์นี้กัน: จังหวะอารมณ์ถูกใช้เป็นข้ออ้างให้ทำ dark pattern
 *    ⇒ ทุกจังหวะต้องบอกได้ว่า "ซื่อสัตย์ได้เพราะอะไร" และทุกข้อห้ามต้องมีของแทนที่
 * ══════════════════════════════════════════════════════════════════════════ */

/** ลำดับ section จริงบนหน้า Landing — อ่านจากไฟล์ ไม่ใช่จากความจำ */
function realOrder(): string[] {
  const tsx = readFileSync(resolve(__dirname, '../../pages/LandingPage.tsx'), 'utf8');
  return [...tsx.matchAll(/data-sec="([a-z_]+)"/g)].map((m) => m[1]);
}

/** ป้ายว่าแต่ละ section เป็นความตึงหรือความโล่ง (ตัดสินจากหน้าที่ของมัน) */
const PHASE: Record<string, Phase> = {
  hero: 'tension',            // คำถามที่เขาตอบไม่ได้
  quickcheck: 'relief',       // ได้ตัวเลขของตัวเองกลับไป = รางวัล
  positioning: 'relief',
  roadmap: 'relief',
  why_not_chatgpt: 'tension', // เทียบกับของที่เขาใช้อยู่ แล้วเห็นช่องว่าง
  try_ai: 'relief',
  skills: 'relief',
  credibility_bar: 'relief',
  consultant_proof: 'relief',
  testimonials: 'relief',
  how_it_works: 'relief',
  features: 'relief',
  compare: 'tension',         // เทียบแล้วเห็นว่าของเดิมไม่พอ
  team: 'relief',
  self_serve: 'relief',
  outcomes: 'relief',
  case_studies: 'relief',
  trust: 'relief',
  pricing: 'tension',         // ต้องตัดสินใจ
  final_cta: 'relief',
};

describe('จังหวะอารมณ์ — โครงสร้าง', () => {
  it('ต้องสลับตึง/โล่ง และเริ่มด้วยความตึง', () => {
    expect(BEATS[0].phase).toBe('tension');
    expect(BEATS.filter((b) => b.phase === 'tension').length).toBeGreaterThanOrEqual(3);
    expect(BEATS.filter((b) => b.phase === 'relief').length).toBeGreaterThanOrEqual(3);
  });

  it('🔴 ทุกจังหวะต้องมีของจริงในระบบทำหน้าที่ — ห้ามอ้างของที่ยังไม่ได้สร้าง', () => {
    for (const b of BEATS) {
      expect(b.deliveredBy.length, b.key).toBeGreaterThan(10);
      expect(b.honestBecause.length, `${b.key} ไม่ได้บอกว่าซื่อสัตย์ได้เพราะอะไร`).toBeGreaterThan(25);
    }
  });

  it('ของที่อ้างว่าทำหน้าที่แต่ละจังหวะ ต้องมีอยู่จริงในโค้ด', () => {
    const src = (f: string) => readFileSync(resolve(__dirname, '..', f), 'utf8');
    expect(src('productQuickCheck.ts')).toMatch(/verdictOf/);
    expect(src('nextProblems.ts')).toMatch(/nextProblemsFor/);
    expect(src('trialRoadmap.ts')).toMatch(/nextStep/);
    expect(src('brandBrief.ts')).toMatch(/CUSTOMER_JOURNEY/);
  });

  it('🔴 ทุกข้อห้ามต้องมี "ใช้อะไรแทน" — กฎที่ห้ามเฉย ๆ จะถูกละเมิดตอนยอดไม่เข้าเป้า', () => {
    expect(FORBIDDEN_TRIGGERS.length).toBeGreaterThanOrEqual(4);
    for (const f of FORBIDDEN_TRIGGERS) {
      expect(f.insteadUse.length, f.trick).toBeGreaterThan(25);
      expect(f.why.length, f.trick).toBeGreaterThan(20);
    }
  });

  it('ข้อห้ามต้องตรงกับกฎแบรนด์ที่มีอยู่แล้ว ไม่ใช่กฎชุดใหม่', () => {
    const brand = readFileSync(resolve(__dirname, '../brandBrief.ts'), 'utf8');
    expect(brand).toMatch(/นับถอยคน?ปลอม|นับถอยหลังปลอม/);
    expect(FORBIDDEN_TRIGGERS.map((f) => f.trick).join(' ')).toMatch(/นับถอยหลัง/);
    expect(FORBIDDEN_TRIGGERS.map((f) => f.trick).join(' ')).toMatch(/รีวิว/);
  });
});

describe('ตัวตรวจจังหวะ', () => {
  it('ให้ความมั่นใจก่อนสร้างความตึง = blocker', () => {
    const issues = arcIssues([
      { sec: 'proof', phase: 'relief' }, { sec: 'team', phase: 'relief' }, { sec: 'hero', phase: 'tension' },
    ]);
    expect(issues.some((i) => i.level === 'blocker')).toBe(true);
  });

  it('ไม่มีความตึงเลย = blocker', () => {
    expect(arcIssues([{ sec: 'a', phase: 'relief' }]).some((i) => i.what.match(/ไม่มีจังหวะตึง/))).toBe(true);
  });

  it('เริ่มด้วยความตึงแล้วสลับ = ผ่าน', () => {
    expect(arcIssues([
      { sec: 'hero', phase: 'tension' }, { sec: 'calc', phase: 'relief' },
      { sec: 'next', phase: 'tension' }, { sec: 'cta', phase: 'relief' },
    ])).toEqual([]);
  });
});

describe('🔴 หน้า Landing ของเราเองผ่านจังหวะนี้ไหม', () => {
  it('อ่านลำดับ section จริงได้ (กันเทสต์ผ่านเพราะ regex พัง)', () => {
    expect(realOrder().length).toBeGreaterThanOrEqual(12);
  });

  it('ทุก section ต้องถูกจัดว่าเป็นตึงหรือโล่ง — เพิ่ม section ใหม่แล้วไม่จัด = แดง', () => {
    const un = realOrder().filter((s) => !(s in PHASE));
    expect(un, `section ที่ยังไม่ถูกจัดจังหวะ: ${un.join(', ')}`).toEqual([]);
  });

  /* 🟢 จัดลำดับใหม่แล้ว 24 ส.ค. 2569 — ย้าย 2 บล็อกเท่านั้น
   *   `compare` 12 → 9 · `pricing` 18 → 17
   * ⚠️ ไม่รื้อทั้งหน้าโดยตั้งใจ: หลายตำแหน่งมีเหตุผลบันทึกไว้ในคอมเมนต์
   *   และ `try_ai` อยู่ใน A/B holdout ที่กำลังรัน — ย้ายแล้วผลการทดลองเสีย
   * ⚠️ เหลือ warn 1 ข้อ (โล่งติดกัน 4 กลางหน้า) — ด้วย 4 จังหวะตึงบน 19 บล็อก
   *   นี่คือผลที่ดีที่สุดที่เป็นไปได้ (คำนวณครบทุกตำแหน่งแล้ว) · ต่ำกว่านี้ต้องเพิ่มจังหวะตึง
   * 🔴 ห้ามอ้างว่าดีขึ้นจนกว่าจะวัดใหม่ — ผลเก่า (85% ไม่เลื่อน) เกิดจากสภาพที่พังของเราเอง */
  it('ต้องไม่มี blocker และเหลือ warn ไม่เกิน 1', () => {
    const issues = arcIssues(realOrder().map((sec) => ({ sec, phase: PHASE[sec] })));
    expect(issues.filter((i) => i.level === 'blocker'), JSON.stringify(issues)).toEqual([]);
    expect(issues.length, JSON.stringify(issues)).toBeLessThanOrEqual(1);
  });

  it('จังหวะตึงต้องกระจาย ไม่กระจุกหัวหน้า', () => {
    const order = realOrder();
    const at = order.map((s, i) => (PHASE[s] === 'tension' ? i + 1 : 0)).filter(Boolean);
    expect(at[0]).toBe(1);                                   // hero เปิดด้วยความตึง
    expect(at[at.length - 1]).toBeGreaterThan(order.length * 0.7);  // มีความตึงช่วงท้ายก่อนปิด
    expect(at.length).toBeGreaterThanOrEqual(4);
  });
});

describe('จังหวะต้องเดินทางไปกับ prompt', () => {
  it('emotionalArcBlock มีทั้งจังหวะและของแทนที่', () => {
    const b = emotionalArcBlock();
    for (const beat of BEATS) expect(b).toContain(beat.key);
    for (const f of FORBIDDEN_TRIGGERS) expect(b).toContain(f.insteadUse);
    expect(b).toMatch(/ตัวเลขของผู้ใช้เองที่เขาตอบไม่ได้/);
  });
});
