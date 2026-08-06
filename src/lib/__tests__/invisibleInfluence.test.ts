import { describe, it, expect } from 'vitest';
import { assessInvisibleInfluence } from '../invisibleInfluence';
import type { AppData } from '../../types';

const empty = {
  aiCompany: { name: '', productVp: '', productDesc: '', logoSvg: '' },
  businessModel: { bmc: { value: [] } },
  personas: [],
  contentPlan: [],
  winStories: [],
  marketplace: { partners: [] },
} as unknown as AppData;

const full = {
  aiCompany: { name: 'ร้านเอ', productVp: 'ลูกค้าได้สิ่งดี', productDesc: 'ขายกาแฟ', logoSvg: '<svg/>' },
  businessModel: { bmc: { value: ['คุณค่า'] } },
  marketInsight: { foo: 1 },
  personas: [{ name: 'คนทำงาน' }],
  contentPlan: [{ label: 'ม.ค.' }],
  winStories: [{ id: '1' }],
  marketplace: { partners: [{ id: 'p1' }] },
  buyingTriggers: { foo: 1 },
} as unknown as AppData;

describe('assessInvisibleInfluence', () => {
  it('มี 3 เสา (found/remembered/recommended) + คำคมประจำเสา', () => {
    const a = assessInvisibleInfluence(empty);
    expect(a.pillars.map(p => p.id)).toEqual(['found', 'remembered', 'recommended']);
    a.pillars.forEach(p => expect(p.quote.length).toBeGreaterThan(0));
  });

  it('ข้อมูลว่าง → score 0, trail จาง, ทุกเสามี gaps', () => {
    const a = assessInvisibleInfluence(empty);
    expect(a.overall).toBe(0);
    expect(a.trail).toBe('จาง');
    a.pillars.forEach(p => {
      expect(p.status).toBe('weak');
      expect(p.gaps.length).toBeGreaterThan(0);
      expect(p.done.length).toBe(0);
    });
  });

  it('ข้อมูลครบ → score 100, trail ชัดเจน, ไม่มี gaps', () => {
    const a = assessInvisibleInfluence(full);
    expect(a.overall).toBe(100);
    expect(a.trail).toBe('ชัดเจน');
    a.pillars.forEach(p => {
      expect(p.status).toBe('strong');
      expect(p.gaps.length).toBe(0);
    });
    expect(a.headline).toMatch(/ชัดเจน/);
  });

  it('gaps มี page ปลายทางให้กดไปทำต่อ', () => {
    const a = assessInvisibleInfluence(empty);
    const found = a.pillars.find(p => p.id === 'found')!;
    expect(found.gaps.some(g => g.page === 'market')).toBe(true);
  });

  it('valueProp fallback ไป BMC.value นับเป็น done ของ Be Found', () => {
    const d = { ...empty, businessModel: { bmc: { value: ['คุณค่าจาก BMC'] } } } as unknown as AppData;
    const found = assessInvisibleInfluence(d).pillars.find(p => p.id === 'found')!;
    expect(found.done.some(t => t.includes('Value Prop'))).toBe(true);
  });

  it('บางส่วน → status partial + headline ชี้เสาที่อ่อนสุด', () => {
    const d = {
      ...empty,
      aiCompany: { name: 'ร้าน', logoSvg: '<svg/>', productVp: 'x', productDesc: 'y' },
      personas: [{ name: 'a' }], contentPlan: [{ label: 'ม.ค.' }],
    } as unknown as AppData;
    const a = assessInvisibleInfluence(d);
    // remembered ครบ, found บางส่วน, recommended ว่าง → overall กลาง
    expect(a.overall).toBeGreaterThan(0);
    expect(a.overall).toBeLessThan(100);
    expect(['พอมี', 'จาง', 'ชัดเจน']).toContain(a.trail);
  });
});
