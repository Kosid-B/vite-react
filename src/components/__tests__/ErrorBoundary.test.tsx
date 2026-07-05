import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

afterEach(cleanup);

function Boom(): never {
  throw new Error('ระเบิดตอน render');
}

describe('ErrorBoundary — ตาข่ายกันจอดำ', () => {
  it('render children ปกติเมื่อไม่มี error', () => {
    render(<ErrorBoundary><p>เนื้อหาปกติ</p></ErrorBoundary>);
    expect(screen.getByText('เนื้อหาปกติ')).toBeInTheDocument();
  });

  it('จับ error ที่ลูก throw แล้วแสดงหน้ากู้คืน (ไม่ปล่อยจอดำ)', () => {
    // เงียบ console.error ของ React error boundary ระหว่างเทสต์
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    // แสดงหน้ากู้คืน + ปุ่มโหลดใหม่ แทนที่จะเป็นจอดำเปล่า
    expect(screen.getByText('เกิดข้อผิดพลาดชั่วคราว')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'โหลดหน้าใหม่' })).toBeInTheDocument();
    spy.mockRestore();
  });
});
