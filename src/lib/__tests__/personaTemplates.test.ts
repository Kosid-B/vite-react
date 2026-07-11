import { describe, it, expect } from 'vitest';
import {
  THAI_SEGMENTS, GUIDED_STEPS, personaFromSegment, blankPersona,
  personaFromResearch, initialsOf,
} from '../personaTemplates';

describe('THAI_SEGMENTS — market-research templates', () => {
  it('มี 5 segment และ id ไม่ซ้ำ', () => {
    expect(THAI_SEGMENTS.length).toBe(5);
    expect(new Set(THAI_SEGMENTS.map((s) => s.id)).size).toBe(5);
  });
  it('ทุก segment มี search channel (จุดเชื่อม SEO/Ads) อย่างน้อย 3 ช่อง', () => {
    for (const s of THAI_SEGMENTS) {
      expect(s.search.length).toBeGreaterThanOrEqual(3);
      expect(s.pains.length).toBeGreaterThan(0);
      expect(s.gains.length).toBeGreaterThan(0);
    }
  });
});

describe('GUIDED_STEPS — ขั้นตอนย่อยนำทาง', () => {
  it('เรียง goal→pains→gains→fear→search→action', () => {
    expect(GUIDED_STEPS.map((s) => s.key)).toEqual(['goal', 'pains', 'gains', 'fear', 'search', 'action']);
  });
});

describe('initialsOf', () => {
  it('เอาอักษรแรกของ ≤2 คำแรก', () => {
    expect(initialsOf('Gen Z')).toBe('GZ');
    expect(initialsOf('แม่ค้า ออนไลน์')).toBe('แอ');
  });
  it('ชื่อว่าง → NP', () => {
    expect(initialsOf('   ')).toBe('NP');
  });
});

describe('personaFromSegment', () => {
  it('สร้าง persona เต็มจาก segment + สีตาม index', () => {
    const p = personaFromSegment(THAI_SEGMENTS[0], 0);
    expect(p.name).toBe(THAI_SEGMENTS[0].segment);
    expect(p.search).toEqual(THAI_SEGMENTS[0].search);
    expect(p.bg).toBeTruthy();
    expect(p.initials.length).toBeGreaterThan(0);
  });
  it('คัดลอก array (ไม่แชร์ reference กับ template)', () => {
    const p = personaFromSegment(THAI_SEGMENTS[0], 0);
    p.pains!.push('x');
    expect(THAI_SEGMENTS[0].pains).not.toContain('x');
  });
});

describe('personaFromResearch — รวมผล AI เข้าฐาน', () => {
  it('quote จาก summary, pains จาก suggestions; คง gains/search จากฐาน', () => {
    const base = personaFromSegment(THAI_SEGMENTS[2], 2);
    const merged = personaFromResearch(base, { quote: 'ลูกค้าบอกว่าเหนื่อยมาก', pains: ['ตอบแชทไม่ทัน', ' ', 'สต๊อกพัง'] });
    expect(merged.quote).toBe('ลูกค้าบอกว่าเหนื่อยมาก');
    expect(merged.pains).toEqual(['ตอบแชทไม่ทัน', 'สต๊อกพัง']); // trim + กรองว่าง
    expect(merged.search).toEqual(base.search); // ช่องทางจาก segment คงไว้
  });
  it('ถ้า AI ไม่คืนอะไร → คงฐานเดิม', () => {
    const base = blankPersona(0);
    const merged = personaFromResearch(base, {});
    expect(merged.pains).toEqual(base.pains);
    expect(merged.quote).toBe(base.quote);
  });
});
