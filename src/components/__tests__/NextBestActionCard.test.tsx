import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import NextBestActionCard from '../NextBestActionCard';
import { OPEN_LOOP_QUESTIONS, CLOSED_STORE_KEY, gapProgress } from '../../lib/appArc';
import { DEFAULT_DATA } from '../../data';
import type { AppData } from '../../types';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 สิ่งที่เทสต์นี้กัน: "เขียนถูก ≠ ถูกเรียกใช้"
 *   จุดตึงในระบบ (appArc) จะไร้ความหมายถ้า ① ไม่ถูกแสดง หรือ ② ไม่มีอะไรวัดว่ามันพาคนเดินต่อ
 *   ⇒ ตรวจทั้งการแสดงผล ลำดับ (ตึงมาก่อนสถานะ) และเหตุการณ์ที่ต้องยิง
 *   ยืนยันในเบราว์เซอร์จริงแล้วด้วย (27 ส.ค. 2569) ว่าทั้ง 3 เหตุการณ์ยิงจริงผ่าน dataLayer
 * ══════════════════════════════════════════════════════════════════════════ */

const trackMock = vi.fn();
vi.mock('../../lib/analytics', () => ({ track: (...a: unknown[]) => trackMock(...a) }));

afterEach(cleanup);
beforeEach(() => trackMock.mockClear());

const data = DEFAULT_DATA as AppData;
const names = () => trackMock.mock.calls.map((c) => c[0] as string);

describe('การ์ด "ควรทำอะไรต่อ" — จุดตึงต้องถูกแสดงและถูกวัด', () => {
  it('แสดงคำถามที่มาจากตาราง ไม่ใช่ข้อความที่ประกอบขึ้นมาสด ๆ', () => {
    render(<NextBestActionCard data={data} onNavigate={() => {}} />);
    const q = document.querySelector('.nba-q')?.textContent ?? '';
    expect(Object.values(OPEN_LOOP_QUESTIONS).some((v) => q.includes(v)), q).toBe(true);
  });

  it('🔴 คำถามต้องอยู่ก่อนสถานะและก่อนข้อเสนอในลำดับ DOM จริง', () => {
    render(<NextBestActionCard data={data} onNavigate={() => {}} />);
    const nodes = [...document.querySelectorAll('.nba-loop, .nba-hd, .nba-action')]
      .map((e) => e.className.split(' ')[0]);
    expect(nodes[0], `ลำดับจริง: ${nodes.join(' → ')}`).toBe('nba-loop');
  });

  it('ยิง nba_loop_shown พร้อมคีย์ของด่าน (= ตัวหารที่ถูกต้อง)', () => {
    render(<NextBestActionCard data={data} onNavigate={() => {}} />);
    const call = trackMock.mock.calls.find((c) => c[0] === 'nba_loop_shown');
    expect(call, `ยิงแค่: ${names().join(', ')}`).toBeTruthy();
    expect(call![1]).toHaveProperty('gap');
  });

  /* 🔴 ต้องส่ง "ออบเจกต์ใหม่ที่เนื้อหาเหมือนเดิม" ไม่ใช่ตัวเดิม
   *    ถ้าส่งตัวเดิม `useMemo` จะกันให้อยู่แล้ว ⇒ เทสต์จะเขียวแม้ถอดกลไกกันซ้ำออก = เทสต์หลอกตัวเอง
   *    (พบจริงตอนยืนยันแดง 27 ส.ค. 2569 — เทสต์เวอร์ชันแรกไม่แดงเลยเมื่อถอดกลไกออก)
   *    ของจริง: พ่อ re-render แล้วสร้าง object ใหม่ทุกครั้ง = สถานการณ์ปกติที่สุดใน React */
  it('🔴 พ่อเรนเดอร์ซ้ำด้วยออบเจกต์ใหม่ ต้องไม่ยิงซ้ำ — ไม่งั้นตัวหารพองจนอัตราไร้ความหมาย', () => {
    const { rerender } = render(<NextBestActionCard data={{ ...data }} onNavigate={() => {}} />);
    rerender(<NextBestActionCard data={{ ...data }} onNavigate={() => {}} />);
    rerender(<NextBestActionCard data={{ ...data }} onNavigate={() => {}} />);
    expect(names().filter((n) => n === 'nba_loop_shown')).toHaveLength(1);
  });

  it('กดปุ่มแล้วต้องทั้งยิงเหตุการณ์และพาไปหน้าที่มีอยู่จริง', () => {
    const nav = vi.fn();
    render(<NextBestActionCard data={data} onNavigate={nav} />);
    const btn = document.querySelector('.nba-go') as HTMLButtonElement | null;
    expect(btn, 'ไม่มีปุ่มไปต่อ').toBeTruthy();
    fireEvent.click(btn!);
    expect(nav).toHaveBeenCalledTimes(1);
    const call = trackMock.mock.calls.find((c) => c[0] === 'nba_go_click');
    expect(call).toBeTruthy();
    expect(call![1]).toHaveProperty('to', nav.mock.calls[0][0]);
  });

  it('เปิด "ทำไมถึงเป็นข้อนี้" แล้วยิง nba_why_open', () => {
    render(<NextBestActionCard data={data} onNavigate={() => {}} />);
    const d = document.querySelector('.nba-why') as HTMLDetailsElement;
    d.open = true;
    fireEvent(d, new Event('toggle', { bubbles: false }));
    expect(names()).toContain('nba_why_open');
  });

  it('ข้อเสนอต้องมีข้อเดียว (กฎ DMAIC: ขึ้นต้นด้วยข้อเสนอ ไม่ใช่รายการ)', () => {
    render(<NextBestActionCard data={data} onNavigate={() => {}} />);
    expect(document.querySelectorAll('.nba-action')).toHaveLength(1);
    expect(screen.getByText(/ทำไมถึงเป็นข้อนี้/)).toBeTruthy();
  });
});


/* ══════════════════════════════════════════════════════════════════════════
 * จังหวะ "ปิดได้แล้ว → ยังเหลืออีก" — ต้องโผล่เฉพาะตอนที่จริงเท่านั้น
 * 🔴 ป้ายที่โผล่ทั้งที่ไม่มีอะไรเกิดขึ้น = ความโล่งปลอม (appArc.FAKE_RELIEF)
 * ══════════════════════════════════════════════════════════════════════════ */
describe('จังหวะ next-gap บนการ์ด', () => {
  const now = () => gapProgress(data, null).closed;

  it('🔴 เปิดครั้งแรก (ยังไม่เคยจำ) ต้องไม่ขึ้นป้าย "ปิดเพิ่ม" — เราแค่ไม่มีค่าเทียบ', () => {
    localStorage.removeItem(CLOSED_STORE_KEY);
    render(<NextBestActionCard data={data} onNavigate={() => {}} />);
    expect(document.querySelector('.nba-closed')).toBeNull();
    expect(names()).not.toContain('nba_gap_closed');
  });

  it('ผ่านด่านเพิ่มจริง → ขึ้นป้าย + ยิง nba_gap_closed', () => {
    localStorage.setItem(CLOSED_STORE_KEY, String(now() - 1));
    render(<NextBestActionCard data={data} onNavigate={() => {}} />);
    const el = document.querySelector('.nba-closed');
    expect(el, 'ผ่านเพิ่มแล้วแต่ไม่ขึ้นป้าย').toBeTruthy();
    expect(el!.textContent).toMatch(/ผ่านเพิ่มอีก 1 ด่าน/);
    expect(names()).toContain('nba_gap_closed');
  });

  it('🔴 ป้ายต้องอยู่ในก้อนจุดตึง ไม่ใช่ก้อนใหม่ที่แทรกก่อนคำถาม', () => {
    localStorage.setItem(CLOSED_STORE_KEY, String(now() - 1));
    render(<NextBestActionCard data={data} onNavigate={() => {}} />);
    expect(document.querySelector('.nba-loop > .nba-closed'), 'ป้ายหลุดออกนอกก้อนจุดตึง').toBeTruthy();
    const nodes = [...document.querySelectorAll('.nba-loop, .nba-hd, .nba-action')].map((e) => e.className.split(' ')[0]);
    expect(nodes[0], `ลำดับจริง: ${nodes.join(' → ')}`).toBe('nba-loop');
  });

  it('🔴 จำค่าใหม่แล้วต้องไม่ขึ้นซ้ำรอบหน้า (ไม่งั้นป้ายค้างถาวร = ความโล่งปลอม)', () => {
    localStorage.setItem(CLOSED_STORE_KEY, String(now() - 1));
    render(<NextBestActionCard data={data} onNavigate={() => {}} />);
    expect(localStorage.getItem(CLOSED_STORE_KEY)).toBe(String(now()));
    cleanup();
    trackMock.mockClear();
    render(<NextBestActionCard data={data} onNavigate={() => {}} />);
    expect(document.querySelector('.nba-closed'), 'ป้ายยังค้างอยู่รอบถัดไป').toBeNull();
  });

  it('อ่าน localStorage ไม่ได้ (โหมดส่วนตัว) ต้องไม่พังและไม่อ้างอะไร', () => {
    const orig = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new Error('blocked'); },
    });
    try {
      render(<NextBestActionCard data={data} onNavigate={() => {}} />);
      expect(document.querySelector('.nba-closed')).toBeNull();
      expect(document.querySelector('.nba-q'), 'การ์ดต้องยังทำงานได้').toBeTruthy();
    } finally {
      Object.defineProperty(window, 'localStorage', orig);
    }
  });
});
