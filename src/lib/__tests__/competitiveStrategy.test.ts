import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  POP, POD, VRIO_LADDER, CATEGORY, MOAT_CLAIM, MEASUREMENT_SAFETY_GUARDS,
  moatReadiness, strategyBlock, WHY_POP_CANT_WIN,
} from '../competitiveStrategy';
import { CUSTOMER_JOURNEY } from '../brandBrief';

const read = (rel: string) => readFileSync(resolve(__dirname, '../..', rel), 'utf8');

describe('POP — ของที่ต้องมีแต่ชนะไม่ได้', () => {
  it('ต้องมีเหตุผลกำกับว่าทำไมชนะไม่ได้ ไม่ใช่รายการลอย ๆ', () => {
    expect(POP.length).toBeGreaterThan(5);
    expect(WHY_POP_CANT_WIN).toMatch(/AIS|Microsoft|ChatGPT/);
  });

  it('🔴 POP ห้ามซ้ำกับ POD — ถ้าซ้ำแปลว่าเราคิดว่าของธรรมดาคือจุดขาย', () => {
    const podText = POD.map((p) => `${p.name} ${p.claim}`).join(' ').toLowerCase();
    for (const item of POP) {
      // POP ที่เป็นคำเดี่ยวชัดเจน ต้องไม่ถูกยกเป็น "เหตุผลที่ต้องเลือกเรา"
      if (item === 'AI Chat' || item === 'AI Agent' || item === 'Dashboard') {
        expect(podText.includes(item.toLowerCase()), `POD ยก "${item}" ซึ่งเป็น POP มาเป็นจุดขาย`).toBe(false);
      }
    }
  });
});

describe('POD — 5 ชั้นที่ชนะได้', () => {
  it('ต้องมี 5 ชั้น เรียงลำดับไม่ข้าม', () => {
    expect(POD).toHaveLength(5);
    POD.forEach((p, i) => expect(p.layer).toBe(i + 1));
  });

  it('ชั้นที่ 3 ต้องเป็น Journey เดียวกับ brandBrief — ห้ามมีสองแหล่งความจริง', () => {
    const os = POD.find((p) => p.name === 'Business Operating System')!;
    // ปลายทั้งสองของ Journey ต้องตรงกัน (ต้นน้ำ = Idea · ปลายน้ำ = Scale)
    expect(os.claim).toContain('Idea');
    expect(os.claim).toContain('Scale');
    expect(CUSTOMER_JOURNEY[0].name).toBe('Idea');
    expect(CUSTOMER_JOURNEY[CUSTOMER_JOURNEY.length - 1].name).toBe('Scale');
  });

  it('ชั้น Evidence-Based AI ต้องบังคับให้แยกระดับความแน่นอน', () => {
    const ev = POD.find((p) => p.name === 'Evidence-Based AI')!;
    expect(ev.claim).toMatch(/สมมติฐาน/);
    expect(ev.claim).toMatch(/พิสูจน์แล้ว/);
  });
});

describe('VRIO_LADDER — ต้องแยก "ทำตอนนี้" ออกจาก "ต้องมีผู้ใช้ก่อน"', () => {
  it('ทุกรายการต้องบอกจำนวนผู้ใช้ที่ปลดล็อก + เหตุผล — ห้ามเขียนว่า "เมื่อโตกว่านี้"', () => {
    for (const v of VRIO_LADDER) {
      expect(typeof v.needsUsers, `${v.id} ไม่มีตัวเลขปลดล็อก`).toBe('number');
      expect(v.whyNow.length, `${v.id} ไม่มีเหตุผล`).toBeGreaterThan(20);
      expect(v.whyNow).not.toMatch(/เมื่อโตกว่านี้|ค่อยว่ากัน|ในอนาคต$/);
    }
  });

  it('🔴 ของที่ทำได้ตอนนี้ต้องเป็น "โครงข้อมูล" ไม่ใช่ฟีเจอร์ใหม่ (ผู้ใช้จริง 0 ราย)', () => {
    const { now, later } = moatReadiness(0);
    expect(now.map((v) => v.id)).toEqual(['business-genome', 'thai-playbook']);
    // Decision Engine / Benchmark ต้องรอ — ไม่งั้นชนกฎ "ห้ามสร้างฟีเจอร์ใหม่จนกว่าจะมีผู้ใช้จริง"
    expect(later.map((v) => v.id)).toContain('decision-engine');
    expect(later.map((v) => v.id)).toContain('benchmark-network');
  });

  it('ยิ่งขั้นสูง ยิ่งต้องการผู้ใช้มากขึ้น (บันไดห้ามสลับ)', () => {
    const need = VRIO_LADDER.map((v) => v.needsUsers);
    expect([...need].sort((a, b) => a - b)).toEqual(need);
  });

  it('benchmark ต้องรอจนมีตัวอย่างพอ และต้องพูดถึงความยินยอม', () => {
    const bm = VRIO_LADDER.find((v) => v.id === 'benchmark-network')!;
    expect(bm.needsUsers).toBeGreaterThanOrEqual(30);
    expect(bm.whyNow).toMatch(/ยินยอม|PDPA/);
  });
});

describe('🔴 หมวดหมู่: ป้ายภายใน ≠ คำที่พูดกับลูกค้า', () => {
  it('คำที่พูดกับลูกค้าต้องเป็น "ปัญหา" ไม่ใช่ชื่อหมวดหมู่', () => {
    expect(CATEGORY.publicHook).not.toMatch(/System|Builder|Platform|OS\b/);
    expect(CATEGORY.publicHook).toMatch(/ธุรกิจ/);
    expect(CATEGORY.whyNotLeadWithCategory).toMatch(/ไม่ค้นหา/);
  });

  it('ป้ายภายในเก็บไว้ได้ แต่ต้องไม่ใช่ hook', () => {
    expect(CATEGORY.internal).not.toBe(CATEGORY.publicHook);
    expect(CATEGORY.external).toMatch(/คนไทย/);
  });
});

describe('🔴 ห้ามประกาศ moat ที่ยังไม่มี', () => {
  it('รายการห้ามอ้างต้องครอบคำที่ฟังดูเป็นมืออาชีพที่สุด', () => {
    const banned = MOAT_CLAIM.mustNotClaim.join(' ');
    expect(banned).toMatch(/ยั่งยืน/);
    expect(banned).toMatch(/network effect/i);
    expect(MOAT_CLAIM.whyNot).toMatch(/0 ราย/);
  });

  it('สิ่งที่อ้างได้ ต้องเป็นของที่มีอยู่จริงในโค้ดแล้ว', () => {
    expect(MOAT_CLAIM.mayClaim.join(' ')).toMatch(/เกณฑ์ขั้นต่ำ/);
    // ต้องมีตัวกันจริงในโค้ด ไม่ใช่คำพูด
    expect(MEASUREMENT_SAFETY_GUARDS.length).toBeGreaterThanOrEqual(5);
  });

  it('ตัวกันข้อมูลน้อยทุกตัวที่อ้าง ต้องมีอยู่จริง (export จริงในไฟล์จริง)', () => {
    for (const g of MEASUREMENT_SAFETY_GUARDS) {
      const [file, name] = g.split('.');
      const src = read(`lib/${file}.ts`);
      expect(src.includes(`export const ${name}`), `${g} ไม่มีอยู่จริง`).toBe(true);
    }
  });
});

describe('strategyBlock — บล็อกที่ส่งเข้า prompt', () => {
  it('ต้องมีทั้ง POP · POD · ข้อห้ามอ้าง moat', () => {
    const b = strategyBlock();
    expect(b).toContain('POP');
    expect(b).toContain('POD');
    expect(b).toContain(CATEGORY.publicHook);
    for (const c of MOAT_CLAIM.mustNotClaim) expect(b).toContain(c);
  });
});
