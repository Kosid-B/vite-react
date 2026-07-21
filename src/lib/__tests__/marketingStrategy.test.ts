import { describe, it, expect } from 'vitest';
import { marketingFromDe24, MKT_STEP_LINKS } from '../marketingStrategy';
import type { AppData } from '../../types';

const mk = (de24: Array<{ done: boolean; notes: string }>): AppData =>
  ({ businessModel: { de24 } } as unknown as AppData);

const blank = () => Array.from({ length: 24 }, () => ({ done: false, notes: '' }));

describe('marketingFromDe24', () => {
  it('ยังไม่ทำอะไร → readiness 0, gaps = 10 ขั้นการตลาด, channels ว่าง', () => {
    const r = marketingFromDe24(mk(blank()));
    expect(r.readiness).toBe(0);
    expect(r.gaps).toHaveLength(MKT_STEP_LINKS.length);
    expect(r.channels).toHaveLength(0);
    expect(r.campaigns).toHaveLength(0);
    // เป้าหมายพื้นฐาน (leads/เดือน) มีเสมอ
    expect(r.goals.some(g => g.metric.includes('Leads'))).toBe(true);
  });

  it('ทำ Persona (ขั้น 4) → เสนอ content + social', () => {
    const d = blank(); d[4] = { done: true, notes: 'SME เจ้าของธุรกิจ' };
    const r = marketingFromDe24(mk(d));
    expect(r.channels.some(c => c.type === 'content')).toBe(true);
    expect(r.channels.some(c => c.type === 'social')).toBe(true);
    expect(r.readiness).toBeGreaterThan(0);
  });

  it('ทำคุณค่าเป็นตัวเลข (ขั้น 7) → มีแคมเปญที่อิงโน้ต', () => {
    const d = blank(); d[7] = { done: true, notes: 'ประหยัดเวลา 40 ชม./เดือน' };
    const r = marketingFromDe24(mk(d));
    const c = r.campaigns.find(x => x.name.includes('คุณค่าเป็นตัวเลข'));
    expect(c).toBeDefined();
    expect(c?.goal).toContain('ประหยัดเวลา');
  });

  it('ทำ LTV + COCA (16,18) → เสนอเป้าหมาย LTV และ COCA', () => {
    const d = blank(); d[16] = { done: true, notes: '' }; d[18] = { done: true, notes: '' };
    const r = marketingFromDe24(mk(d));
    expect(r.goals.some(g => g.metric.includes('LTV'))).toBe(true);
    expect(r.goals.some(g => g.metric.includes('COCA'))).toBe(true);
  });

  it('de24 ว่าง/ไม่มี → ไม่ throw', () => {
    expect(() => marketingFromDe24({ businessModel: {} } as unknown as AppData)).not.toThrow();
  });
});
