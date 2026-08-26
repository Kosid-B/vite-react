import { describe, it, expect } from 'vitest';
import {
  CORPORATE, PRODUCT, DIRECTION, NOT_THIS, LAYERS, ENDORSEMENT, HERO_PROMISE,
  DISTRIBUTION_JOURNEY, DISTRIBUTION_SEG, brandIssues, brandArchitectureBlock,
} from '../brandArchitecture';
import { START_HEROES } from '../startHero';
import { segmentFor } from '../heroVariant';

/* ══════════════════════════════════════════════════════════════════════════
 * โครงสร้างแบรนด์ (เจ้าของกำหนด 26 ส.ค. 2569)
 *   B.TC = Credibility Engine (บริษัทแม่) · CEO AI Thailand = Growth Engine (ผลิตภัณฑ์)
 *
 * 🔴 ความผิดที่กัน 2 ข้อ:
 *   ① นำด้วย ISO → ระบบดูเป็น "ISO SaaS" และแข่งกับงานที่ปรึกษาของบริษัทแม่เอง
 *   ② เขียนให้เข้าใจว่า CEO AI Thailand = B.TC เปลี่ยนชื่อ → เสียทั้งสองแบรนด์
 * ══════════════════════════════════════════════════════════════════════════ */

describe('หน้าที่ของสองแบรนด์ ห้ามสลับ', () => {
  it('บริษัทแม่ตอบเรื่องความน่าเชื่อถือ · ผลิตภัณฑ์ตอบเรื่องการเติบโต', () => {
    expect(CORPORATE.role).toBe('Credibility Engine');
    expect(PRODUCT.role).toBe('Growth & Technology Engine');
    expect(CORPORATE.answers).toMatch(/สิทธิ์สอน|ทำไมเรา/);
    expect(PRODUCT.answers).toMatch(/AI.*SME|เริ่ม.*Scale/);
  });

  it('สิ่งที่แต่ละแบรนด์เป็นเจ้าของ ต้องไม่ทับกัน', () => {
    const overlap = CORPORATE.owns.filter((x) => PRODUCT.owns.includes(x));
    expect(overlap, `ทับกัน: ${overlap.join(', ')}`).toEqual([]);
  });

  it('🔴 ทิศทางต้องระบุทั้งสิ่งที่ใช่และสิ่งที่ไม่ใช่', () => {
    expect(DIRECTION).toMatch(/AI Growth Platform/);
    expect(DIRECTION).toMatch(/B\.TC/);
    expect(NOT_THIS).toMatch(/ISO SaaS/);
  });
});

describe('🔴 ISO เป็นชั้นสุดท้าย ไม่ใช่พาดหัว', () => {
  it('GOVERN ต้องเป็นชั้นท้ายสุดของผลิตภัณฑ์', () => {
    expect(LAYERS[LAYERS.length - 1].key).toBe('govern');
    expect(LAYERS[LAYERS.length - 1].what).toMatch(/ISO/);
    expect(LAYERS[0].key).toBe('start');
  });

  it('พาดหัวหลักต้องเป็นเส้นทางการเติบโต ไม่ใช่ความเชี่ยวชาญของเรา', () => {
    expect(HERO_PROMISE).toMatch(/เริ่มธุรกิจ/);
    expect(HERO_PROMISE).toMatch(/Scale/);
    expect(HERO_PROMISE).not.toMatch(/ISO|PDPA|มอก/);
  });

  it('พาดหัวที่นำด้วย ISO = blocker', () => {
    const i = brandIssues('ผู้เชี่ยวชาญ ISO 9001 สำหรับ SME ไทย');
    expect(i.some((x) => x.level === 'blocker')).toBe(true);
    expect(i[0].why).toMatch(/GOVERN|แข่งกับ/);
  });

  it('พาดหัวที่เป็นเส้นทางการเติบโต = ผ่าน', () => {
    expect(brandIssues('อยากมีธุรกิจ แต่ไม่รู้จะเริ่มจากอะไร')).toEqual([]);
  });

  it('🔴 ห้ามเขียนให้เข้าใจว่าเป็นแบรนด์เดียวกัน', () => {
    expect(brandIssues('B.TC เปลี่ยนชื่อเป็น CEO AI Thailand').some((x) => x.level === 'blocker')).toBe(true);
  });
});

describe('ข้อความรับรอง — หนุนหลัง ไม่ใช่พาดหัว', () => {
  it('ต้องเป็นข้อความที่เจ้าของอนุมัติคำต่อคำ', () => {
    expect(ENDORSEMENT).toContain('B.TC');
    expect(ENDORSEMENT).toMatch(/20 ปี/);
    expect(ENDORSEMENT).toMatch(/ที่ปรึกษาธุรกิจและระบบบริหาร/);
  });

  it('ข้อความรับรองต้องผ่านด่านของตัวเอง (ไม่ได้นำด้วย ISO)', () => {
    expect(brandIssues(ENDORSEMENT)).toEqual([]);
  });
});

describe('🔴 B.TC เป็นช่องทาง ไม่ใช่จุดยืน', () => {
  it('เส้นทางจากบริษัทแม่ต้องเริ่มที่ Training และจบที่การพัฒนาต่อเนื่อง', () => {
    expect(DISTRIBUTION_JOURNEY[0]).toMatch(/B\.TC/);
    expect(DISTRIBUTION_JOURNEY).toContain('CEO AI Thailand');
    // ISO ต้องอยู่ท้าย ๆ ของเส้นทาง ไม่ใช่ประตูแรก
    const isoAt = DISTRIBUTION_JOURNEY.findIndex((s) => /ISO/.test(s));
    expect(isoAt).toBeGreaterThan(DISTRIBUTION_JOURNEY.indexOf('CEO AI Thailand'));
  });

  it(`seg=${DISTRIBUTION_SEG} ต้องมีจริงและถูกจับได้`, () => {
    expect(segmentFor(`?seg=${DISTRIBUTION_SEG}`)).toBe(DISTRIBUTION_SEG);
    expect(START_HEROES[DISTRIBUTION_SEG]).toBeTruthy();
  });

  it('🔴 คนที่มาจากบริษัทแม่ ต้องเจอสารการเติบโต ไม่ใช่สาร ISO', () => {
    const h = START_HEROES[DISTRIBUTION_SEG]!;
    const all = [h.h1, h.h1hl, ...h.sub, ...h.chips].join(' ');
    expect(all).not.toMatch(/ISO|PDPA|มอก|ใบรับรอง|ผู้ตรวจ/);
    expect(brandIssues(all)).toEqual([]);
  });

  it('hero ของ seg นี้ต้องพูดถึงตัวเลข/ขั้นต่อไป (คุณค่าของผลิตภัณฑ์) ไม่ใช่เอกสาร', () => {
    const h = START_HEROES[DISTRIBUTION_SEG]!;
    expect([h.h1hl, ...h.sub, ...h.chips].join(' ')).toMatch(/ตัวเลข|ขั้นต่อไป/);
  });
});

describe('โครงสร้างแบรนด์ต้องเดินทางไปกับ prompt', () => {
  it('บล็อกมีทั้งหน้าที่ · ทิศทาง · สิ่งที่ไม่ใช่ · และข้อห้าม', () => {
    const b = brandArchitectureBlock();
    expect(b).toContain(CORPORATE.role);
    expect(b).toContain(PRODUCT.role);
    expect(b).toContain(DIRECTION);
    expect(b).toContain(NOT_THIS);
    expect(b).toContain(ENDORSEMENT);
    expect(b).toMatch(/ห้ามขึ้นพาดหัวด้วย ISO/);
    expect(b).toMatch(/ห้ามเขียนให้เข้าใจว่า CEO AI Thailand คือ B\.TC เปลี่ยนชื่อ/);
  });

  it('brandBriefBlock() ต้องพาโครงสร้างแบรนด์ติดไปด้วย', async () => {
    const { brandBriefBlock } = await import('../brandBrief');
    expect(brandBriefBlock({ forPublicCopy: true })).toContain(DIRECTION);
  });

  it('🔴 พาดหัวจริงบนหน้า /start ทุก seg ต้องไม่นำด้วย ISO (ยกเว้น seg=audit ที่เขาค้นเอง)', () => {
    for (const [seg, h] of Object.entries(START_HEROES)) {
      if (seg === 'audit') continue;   // ประตูข้าง — คนพิมพ์คำนั้นค้นเอง
      const issues = brandIssues([h.h1, h.h1hl].join(' '));
      expect(issues, `seg=${seg}: ${JSON.stringify(issues)}`).toEqual([]);
    }
  });
});
