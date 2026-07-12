import { describe, it, expect } from 'vitest';
import { ecosystemFlow } from '../ecosystemFlow';
import type { AppData } from '../../types';

const base = (over: Partial<AppData> = {}): AppData => ({
  businessModel: { de24: Array.from({ length: 24 }, () => ({ done: false, notes: '' })), bmc: { partners: [], activities: [], value: [], relationships: [], segments: [], resources: [], channels: [], costs: [], revenue: [] } },
  marketing: { channels: [] },
  resources: { items: [], requests: [] },
  finance: [],
  aiCompany: { agents: [], tasks: [], skillXP: 0 },
  ...over,
} as unknown as AppData);

describe('ecosystemFlow — 7 ด่านวงจร', () => {
  it('ว่างเปล่า → 7 ด่าน, doneCount 0, nextStage = 24-Step', () => {
    const f = ecosystemFlow(base());
    expect(f.stages).toHaveLength(7);
    expect(f.total).toBe(7);
    expect(f.doneCount).toBe(0);
    expect(f.nextStage?.id).toBe('de24');
  });

  it('ทำ 24-Step ครบ 12 → ด่าน de24 = done, next ขยับไป bmc', () => {
    const bm = base();
    for (let i = 0; i < 12; i++) bm.businessModel.de24[i].done = true;
    const f = ecosystemFlow(bm);
    expect(f.stages.find(s => s.id === 'de24')?.status).toBe('done');
    expect(f.nextStage?.id).toBe('bmc');
  });

  it('BMC core ครบ 3 ช่อง → bmc done', () => {
    const bm = base();
    bm.businessModel.bmc.segments = ['SME'];
    bm.businessModel.bmc.value = ['ประหยัดเวลา'];
    bm.businessModel.bmc.revenue = ['subscription'];
    expect(ecosystemFlow(bm).stages.find(s => s.id === 'bmc')?.status).toBe('done');
  });

  it('มี 1 ช่องทาง = partial, 2 ช่องทาง = done', () => {
    expect(ecosystemFlow(base({ marketing: { channels: [{}] } } as unknown as Partial<AppData>)).stages.find(s => s.id === 'marketing')?.status).toBe('partial');
    expect(ecosystemFlow(base({ marketing: { channels: [{}, {}] } } as unknown as Partial<AppData>)).stages.find(s => s.id === 'marketing')?.status).toBe('done');
  });

  it('visitedMarket → ด่าน market ไม่ empty', () => {
    const f = ecosystemFlow(base({ visitedMarket: true } as Partial<AppData>));
    expect(f.stages.find(s => s.id === 'market')?.status).not.toBe('empty');
  });
});
