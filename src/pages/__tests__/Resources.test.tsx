import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { AppData } from '../../types';
import type { ResourcesState } from '../../lib/resources';
import Resources from '../Resources';

afterEach(cleanup);

function setup(resources: ResourcesState) {
  const data = {
    resources,
    aiCompany: { agents: [{ id: 'cfo', role: 'CFO', name: 'ฟินโบ', avatar: '💰', color: '#a05c1a', mandate: '', model: 'm', status: 'idle', reportsTo: null }] },
  } as unknown as AppData;
  const onUpdate = vi.fn();
  render(<Resources data={data} onUpdate={onUpdate} />);
  return { onUpdate };
}

const base: ResourcesState = {
  items: [{ id: 'r1', name: 'เงินทุนหมุนเวียน', category: 'capital', unit: 'บาท', quantity: 50000, ownerAgentId: 'cfo', createdAt: '2026-07-11' }],
  requests: [],
};

describe('Resources — บริหารทรัพยากร + คำขอ + อนุมัติ', () => {
  it('แสดงหน้าทรัพยากร + รายการ + ปุ่มขอเพิ่ม/ขอลด', () => {
    setup(base);
    expect(screen.getByText('📦 บริหารทรัพยากร')).toBeInTheDocument();
    expect(screen.getByText('เงินทุนหมุนเวียน')).toBeInTheDocument();
    expect(screen.getByText('＋ ขอเพิ่ม')).toBeInTheDocument();
  });

  it('ยื่นคำขอเพิ่ม → บันทึกคำขอ pending (โดย C-Level เจ้าของ)', () => {
    const { onUpdate } = setup(base);
    fireEvent.click(screen.getByText('＋ ขอเพิ่ม'));
    fireEvent.click(screen.getByText('ยื่นคำขอ'));
    const next = onUpdate.mock.calls[0][0] as AppData;
    const reqs = next.resources!.requests;
    expect(reqs.length).toBe(1);
    expect(reqs[0].type).toBe('add');
    expect(reqs[0].status).toBe('pending');
    expect(reqs[0].agentId).toBe('cfo');
  });

  it('CEO อนุมัติคำขอเพิ่ม → จำนวนทรัพยากรเพิ่มจริง', () => {
    const withReq: ResourcesState = {
      items: base.items,
      requests: [{ id: 'q1', type: 'add', resourceId: 'r1', amount: 20000, reason: 'ขยาย', status: 'pending', at: '2026-07-11', agentId: 'cfo' }],
    };
    const { onUpdate } = setup(withReq);
    fireEvent.click(screen.getByText('✓ อนุมัติ'));
    const next = onUpdate.mock.calls[0][0] as AppData;
    expect(next.resources!.items[0].quantity).toBe(70000);      // 50000 + 20000
    expect(next.resources!.requests[0].status).toBe('approved');
  });

  it('ปุ่ม AI จัดสรร เสนอคำขอเมื่อมีทรัพยากรจำนวน 0', () => {
    const withGap: ResourcesState = {
      items: [{ id: 'd', name: 'Lead', category: 'data', unit: 'ราย', quantity: 0, createdAt: '2026-07-11' }],
      requests: [],
    };
    const { onUpdate } = setup(withGap);
    fireEvent.click(screen.getByText(/ให้ AI จัดสรร/));
    const next = onUpdate.mock.calls[0][0] as AppData;
    expect(next.resources!.requests.length).toBeGreaterThan(0);
    expect(next.resources!.requests[0].reason).toContain('AI');
  });
});
