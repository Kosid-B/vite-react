import { describe, it, expect } from 'vitest';
import {
  suggestSkillFromCase, guessCategory, estimateTier,
  TIER_PRICE, TIER_CONSULTANT_EQUIV,
} from '../skillValuation';
import type { CaseStudy } from '../../types';

const richCase: CaseStudy = {
  id: 'c1',
  title: 'ซามูไรเชือดม้าลำพอง — Honda NSX ตบหน้า Ferrari',
  company: 'Honda NSX',
  tag: 'Customer-Centric Disruption',
  industry: 'Automotive',
  result: 'สร้างหมวดหมู่ Everyday Super Car',
  keyLesson: 'อย่าหยิ่งจนมองข้าม pain point ของลูกค้า',
  lessons: [
    { icon: '🩹', title: 'คาแรคเตอร์ = pain point', body: 'ลูกค้าถูกสั่งให้ทน' },
    { icon: '🏎️', title: 'ได้ทั้งคู่', body: 'เร็วกว่าและขับง่ายกว่า' },
    { icon: '🏆', title: 'insider', body: 'ดึง Senna มาจูน' },
  ],
  applyTo: ['ฟังเสียงบ่นที่วงการบอกว่าปกติ', 'อย่าลดคุณภาพหลัก', 'ดึงผู้เชี่ยวชาญตัวจริง'],
};

const thinCase: CaseStudy = {
  id: 'c2',
  title: 'ร้านกาแฟเล็ก',
  lessons: [{ icon: '💡', body: 'บริการดีลูกค้ากลับมา' }],
};

describe('estimateTier — ยิ่งลึกยิ่ง tier สูง', () => {
  it('เคสเนื้อหาครบ (3 บทเรียน + 3 แนวใช้ + key) → Tier 3', () => {
    expect(estimateTier(richCase)).toBe(3);
  });
  it('เคสบาง(1 บทเรียน ไม่มี applyTo/key) → Tier 1', () => {
    expect(estimateTier(thinCase)).toBe(1);
  });
  it('เคสปานกลาง (depth>=4) → Tier 2', () => {
    const mid: CaseStudy = {
      id: 'm', title: 'x',
      lessons: [{ icon: '💡', body: 'a' }, { icon: '💡', body: 'b' }],
      applyTo: ['x', 'y'],
    };
    expect(estimateTier(mid)).toBe(2);
  });
});

describe('guessCategory — เดาหมวดจากคีย์เวิร์ด', () => {
  it('เคส disruption/หมวดหมู่/pain point → strategy', () => {
    expect(guessCategory(richCase)).toBe('strategy');
  });
  it('เคสที่พูดเรื่องแบรนด์/เรื่องราว/ads → marketing', () => {
    const mk: CaseStudy = {
      id: 'mk', title: 'สร้างแบรนด์ด้วยเรื่องราว',
      tag: 'brand storytelling',
      lessons: [{ icon: '📣', body: 'ใช้ content และ ambassador ดันแบรนด์' }],
    };
    expect(guessCategory(mk)).toBe('marketing');
  });
  it('เสมอ/ไม่เจอคีย์เวิร์ด → strategy (ค่าปริยาย)', () => {
    expect(guessCategory(thinCase)).toBe('strategy');
  });
});

describe('suggestSkillFromCase — ข้อเสนอ Skill + มูลค่า', () => {
  it('ราคาตรงกับ tier ที่ประเมิน', () => {
    const p = suggestSkillFromCase(richCase);
    expect(p.tier).toBe(3);
    expect(p.price).toBe(TIER_PRICE[3]);
    expect(p.category).toBe('strategy');
  });
  it('name ไม่ยาวเกิน 48 ตัว และมี icon จากหมวด', () => {
    const p = suggestSkillFromCase(richCase);
    expect(p.name.length).toBeLessThanOrEqual(48);
    expect(p.icon).toBeTruthy();
  });
  it('desc มาจาก keyLesson และไม่เกิน 180 ตัว', () => {
    const p = suggestSkillFromCase(richCase);
    expect(p.desc).toContain('pain point');
    expect(p.desc.length).toBeLessThanOrEqual(180);
  });
  it('valueNote อ้างมูลค่าที่ปรึกษาตาม tier', () => {
    const p = suggestSkillFromCase(richCase);
    expect(p.valueNote).toContain(TIER_CONSULTANT_EQUIV[3].toLocaleString('en-US'));
  });
  it('rationale โปร่งใส — อธิบายเหตุผลอย่างน้อย 3 ข้อ', () => {
    const p = suggestSkillFromCase(richCase);
    expect(p.rationale.length).toBeGreaterThanOrEqual(3);
  });
  it('tags ไม่เกิน 3 และไม่ซ้ำ', () => {
    const p = suggestSkillFromCase(richCase);
    expect(p.tags.length).toBeLessThanOrEqual(3);
    expect(new Set(p.tags).size).toBe(p.tags.length);
  });
  it('เคสบาง → Tier 1 ราคา ต่ำสุด', () => {
    const p = suggestSkillFromCase(thinCase);
    expect(p.tier).toBe(1);
    expect(p.price).toBe(TIER_PRICE[1]);
  });
});
