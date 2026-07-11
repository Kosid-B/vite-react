import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { AppData, Persona } from '../../types';
import BoardRoom from '../BoardRoom';

afterEach(cleanup);

const persona = (): Persona => ({
  name: 'x', role: 'y', initials: 'XY', bg: '#fff', tc: '#000', quote: 'q',
  pains: ['p'], gains: ['g'], goal: ['go'], fear: ['f'], search: ['s'], action: ['a'],
});

function setup(over: Partial<AppData> = {}) {
  const data = { personas: [persona()], boardRoom: { decisions: [] }, ...over } as AppData;
  const onUpdate = vi.fn();
  render(<BoardRoom data={data} onUpdate={onUpdate} onNavigate={() => {}} />);
  return { data, onUpdate };
}

describe('BoardRoom — CEO เสนอ → บอร์ดอนุมัติ + สะสมทักษะ', () => {
  it('แสดงห้องบอร์ด + ทักษะ 2 สาย + วาระที่ CEO เสนอ', () => {
    setup();
    expect(screen.getByText('🏛️ ห้องบอร์ด')).toBeInTheDocument();
    expect(screen.getByText('บริหารธุรกิจ')).toBeInTheDocument();
    expect(screen.getByText('การตลาด')).toBeInTheDocument();
    // gate WHO เสนอได้เพราะ persona มี pains+search
    expect(screen.getAllByText(/Gate 1 · WHO/).length).toBeGreaterThanOrEqual(1);
  });

  it('กดอนุมัติ → บันทึก decision (approved) ผ่าน onUpdate', () => {
    const { onUpdate } = setup();
    const btn = screen.getAllByText(/✓ อนุมัติ/)[0];
    fireEvent.click(btn);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    const next = onUpdate.mock.calls[0][0] as AppData;
    const decs = next.boardRoom?.decisions ?? [];
    expect(decs.length).toBe(1);
    expect(decs[0].status).toBe('approved');
  });

  it('เมื่ออนุมัติ gate-who แล้ว → ทักษะบริหารมี XP + gate-value ปลดล็อก', () => {
    // ส่ง data ที่อนุมัติ gate-who ไว้แล้ว
    setup({ boardRoom: { decisions: [{ itemId: 'gate-who', status: 'approved', at: '2026-07-11' }] } });
    // อนุมัติแล้วโผล่ในส่วน "อนุมัติแล้ว"
    expect(screen.getByText('✅ อนุมัติแล้ว (1)')).toBeInTheDocument();
    // XP บริหาร = 50 (gate-who)
    expect(screen.getByText('50 XP')).toBeInTheDocument();
    // gate-value (VALUE) ปลดล็อกเป็นวาระเสนอ
    expect(screen.getAllByText(/Gate 2 · VALUE/).length).toBeGreaterThanOrEqual(1);
  });

  it('กด "ขอแก้ไข" (reject) → บันทึก status rejected', () => {
    const { onUpdate } = setup();
    fireEvent.click(screen.getAllByText('ขอแก้ไข')[0]);
    const next = onUpdate.mock.calls[0][0] as AppData;
    expect(next.boardRoom?.decisions[0].status).toBe('rejected');
  });
});
