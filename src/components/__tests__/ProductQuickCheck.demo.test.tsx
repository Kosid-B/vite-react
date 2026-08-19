import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

/* "ให้ก่อน ขอทีหลัง" — กฎ PLG ของโปรเจกต์ (CLAUDE.md: ผู้ใช้ต้องได้คุณค่าเองโดยไม่ต้องผ่านคน)
 *
 * ทำไมต้องมีเทสต์นี้ (ข้อมูลจริง 11–18 ส.ค. 2569):
 *   ผู้เข้าชม Landing 70 คน · กรอก "ตรวจสินค้าเร็ว" สำเร็จ **0 คน**
 *   เพราะสิ่งแรกที่เห็นคือฟอร์มเปล่า 6 ช่อง + ปุ่มสีเทากดไม่ได้ "กรอกราคาขายและต้นทุนก่อน"
 *   = ขอแรงงานก่อนให้คุณค่า ซึ่งตรงข้ามกับ PLG
 *
 * และล็อกกฎความสะอาดของข้อมูลไว้ด้วย: ตัวเลขตัวอย่างของเรา **ห้าม**ขึ้นตาราง
 *   ไม่งั้น quickcheck_submissions จะเต็มไปด้วยเลขที่ไม่มีผู้ใช้คนไหนกรอก
 *   (ตัวเลขที่ดูเหมือนจริงแต่ไม่จริง อันตรายกว่าไม่มีข้อมูล — LESSONS-LEDGER ข้อ 11)
 */

const rpc = vi.fn((..._a: unknown[]) => ({ then: () => {} }));
vi.mock('../../lib/supabase', () => ({
  isSupabaseEnabled: true,
  supabase: { rpc: (...a: unknown[]) => rpc(...a) },
}));
vi.mock('../../lib/analytics', () => ({ track: vi.fn() }));
// landingFunnel มี state + timer ระดับโมดูล — ตัดออกเพื่อให้เทสต์ไม่ค้างรอ flush
vi.mock('../../lib/landingFunnel', () => ({
  currentFunnelSession: () => '00000000-0000-4000-8000-000000000000',
}));

import ProductQuickCheck from '../ProductQuickCheck';

afterEach(cleanup);
beforeEach(() => { rpc.mockClear(); });  // ต้องเป็น block — ถ้า return ค่า vitest จะตีว่าเป็น teardown แล้วค้าง

describe('ProductQuickCheck — ให้ก่อน ขอทีหลัง', () => {
  it('เปิดมาต้องเห็นคำตอบที่คำนวณแล้วทันที ไม่ใช่ฟอร์มเปล่า', () => {
    render(<ProductQuickCheck onGetStarted={() => {}} />);
    // ผลลัพธ์ต้องโผล่โดยที่ผู้ใช้ยังไม่พิมพ์อะไรเลย
    expect(screen.getAllByText(/กำไรต่อหน่วย/).length).toBeGreaterThan(0);
  });

  it('ต้องบอกตรง ๆ ว่านี่คือตัวอย่าง และชวนแก้เป็นตัวเลขของเขา', () => {
    render(<ProductQuickCheck onGetStarted={() => {}} />);
    expect(screen.getByText(/ตัวอย่างที่คำนวณเสร็จแล้ว/)).toBeTruthy();
  });

  it('ปุ่มแรกต้องกดได้ ไม่ใช่ปุ่มสีเทาที่บอกให้ไปกรอกก่อน', () => {
    render(<ProductQuickCheck onGetStarted={() => {}} />);
    expect(screen.queryByText('กรอกราคาขายและต้นทุนก่อน')).toBeNull();
  });

  it('ยังไม่แก้อะไร = ห้ามส่งตัวเลขตัวอย่างขึ้นฐานข้อมูล', () => {
    render(<ProductQuickCheck onGetStarted={() => {}} />);
    fireEvent.click(screen.getByText(/คำนวณใหม่ด้วยตัวเลขของผม/));
    expect(rpc).not.toHaveBeenCalled();
  });

  it('พอผู้ใช้แก้ตัวเลขจริง → เริ่มนับเป็นข้อมูลจริง', () => {
    render(<ProductQuickCheck onGetStarted={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('50'), { target: { value: '250' } });
    fireEvent.click(screen.getByText(/ดูกำไรจริงของผม/));
    expect(rpc).toHaveBeenCalledWith('track_quickcheck', expect.anything());
  });
});
