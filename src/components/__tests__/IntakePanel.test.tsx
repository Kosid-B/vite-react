import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { AppData, Agent } from '../../types';
import IntakePanel from '../IntakePanel';

afterEach(cleanup);

const ag = (over: Partial<Agent>): Agent => ({
  id: 'a', role: 'Staff', name: 'x', avatar: '🤖', color: '#000',
  mandate: '', model: 'm', status: 'idle', reportsTo: null, ...over,
});

function setup() {
  const data = {
    aiCompany: {
      agents: [ag({ id: 'ceo', role: 'CEO' }), ag({ id: 'cmo', role: 'CMO (การตลาด)' })],
      tasks: [], running: false,
    },
  } as unknown as AppData;
  const onUpdate = vi.fn();
  render(<IntakePanel data={data} onUpdate={onUpdate} />);
  return { onUpdate };
}

describe('IntakePanel — มอบงานแล้วทีมเริ่มลงมือ (แก้บั๊ก C-Level ไม่เห็นผล)', () => {
  it('ส่งข้อมูล → onUpdate เปิด running=true + เพิ่ม queued task (heartbeat จะรัน agent-run)', () => {
    const { onUpdate } = setup();
    const ta = screen.getByPlaceholderText(/ยอดขายเดือนนี้ตก/);
    fireEvent.change(ta, { target: { value: 'อยากได้แคมเปญการตลาดใหม่เพิ่มยอดขาย' } });
    fireEvent.click(screen.getByRole('button', { name: /ให้ CEO มอบหมายงาน/ }));

    expect(onUpdate).toHaveBeenCalled();
    const next = onUpdate.mock.calls[0][0] as AppData;
    expect(next.aiCompany.running).toBe(true);              // ← ทีมเริ่มลงมือ
    expect(next.aiCompany.tasks.length).toBeGreaterThan(0); // ← งานเข้าคิว
    expect(next.aiCompany.tasks[0].status).toBe('queued');
  });
});
