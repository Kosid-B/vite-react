import { describe, it, expect } from 'vitest';
import { systemOverview } from '../systemOverview';
import { DEFAULT_DATA } from '../../data';
import type { AppData } from '../../types';

describe('systemOverview — รวมทุกระบบ', () => {
  it('อ่าน DEFAULT_DATA ได้โครงครบทุกส่วน ไม่ throw', () => {
    const o = systemOverview(DEFAULT_DATA);
    expect(o.aiCompany).toBeDefined();
    expect(o.board.gatesTotal).toBe(5);
    expect(o.resources.count).toBe(0);
    expect(typeof o.finance.net).toBe('number');
    expect(typeof o.city.tier).toBe('string');
  });

  it('สะท้อนข้อมูลจริง: ทรัพยากร + คำขอรออนุมัติ + ทีม AI', () => {
    const data = {
      ...DEFAULT_DATA,
      aiCompany: {
        ...DEFAULT_DATA.aiCompany,
        agents: [{ id: 'ceo', role: 'CEO', name: 'x', avatar: '🤖', color: '#000', mandate: '', model: 'm', status: 'idle', reportsTo: null }],
        tasks: [
          { id: 't1', agentId: 'ceo', title: 'a', detail: '', status: 'queued' },
          { id: 't2', agentId: 'ceo', title: 'b', detail: '', status: 'done' },
        ],
        running: true,
      },
      resources: {
        items: [{ id: 'r', name: 'x', category: 'infra', unit: 'ระบบ', quantity: 1, unitCost: 300, createdAt: 'x' }],
        requests: [{ id: 'q', type: 'add', resourceId: 'r', amount: 1, reason: 'y', status: 'pending', at: 'x' }],
      },
    } as unknown as AppData;
    const o = systemOverview(data);
    expect(o.aiCompany.agents).toBe(1);
    expect(o.aiCompany.active).toBe(1);   // queued
    expect(o.aiCompany.done).toBe(1);
    expect(o.aiCompany.running).toBe(true);
    expect(o.resources.count).toBe(1);
    expect(o.resources.monthlyCost).toBe(300);
    expect(o.resources.pending).toBe(1);
  });

  it('board สะท้อน gate ที่อนุมัติ + skill level', () => {
    const data = {
      ...DEFAULT_DATA,
      boardRoom: { decisions: [{ itemId: 'gate-who', status: 'approved', at: 'x' }] },
    } as unknown as AppData;
    const o = systemOverview(data);
    expect(o.board.gatesApproved).toBe(1);
    expect(o.board.bizXp).toBeGreaterThan(0);   // gate-who = business
  });
});
