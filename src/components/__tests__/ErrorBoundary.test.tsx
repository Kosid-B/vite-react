import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

const reportErrorMock = vi.fn();
vi.mock('../../lib/errorReport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/errorReport')>()),
  reportError: (...a: unknown[]) => reportErrorMock(...a),
}));

const reloadMock = vi.fn();
Object.defineProperty(window, 'location', {
  writable: true,
  value: { ...window.location, reload: reloadMock },
});

afterEach(cleanup);
beforeEach(() => {
  reportErrorMock.mockClear();
  reloadMock.mockClear();
  sessionStorage.clear();
});

function Boom(): never {
  throw new Error('ระเบิดตอน render');
}

function ChunkBoom(): never {
  // ข้อความจริงที่ Vite/เบราว์เซอร์โยนเมื่อ deploy ทับแล้ว asset hash เดิมหาย
  throw new Error('Failed to fetch dynamically imported module: /assets/Admin-abc123.js');
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
    expect(reportErrorMock).toHaveBeenCalledWith(expect.any(Error), 'react.ErrorBoundary');
    spy.mockRestore();
  });

  /* ── เทสต์ 2 ตัวนี้มีเพราะเคยอ่านโค้ดผิดมาแล้ว (17 ส.ค. 2569) ──
   * เคยสรุปให้เจ้าของว่า "react.ErrorBoundary 35 เซสชันใน GA = chunk error จากการ deploy บ่อย"
   * ซึ่งผิด — chunk error ครั้งแรกจะ reload แล้ว return ออกก่อนถึง reportError
   * แปลว่าเลขใน GA คือบั๊กจริง ไม่ใช่ผลข้างเคียงของ deploy
   * ล็อกพฤติกรรมนี้ไว้ เพราะถ้ามันเปลี่ยนโดยไม่มีใครรู้ ตัวเลขในรายงานจะถูกตีความผิดอีก */

  it('chunk error ครั้งแรก → reload อย่างเดียว ต้องไม่รายงาน (ไม่งั้นเลข error พองจากการ deploy)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><ChunkBoom /></ErrorBoundary>);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(reportErrorMock).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('chunk error ซ้ำหลัง reload (flag ค้าง) → reload แก้ไม่ได้จริง จึงต้องรายงาน', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sessionStorage.setItem('ceo_ai_chunk_reload', '1');
    render(<ErrorBoundary><ChunkBoom /></ErrorBoundary>);
    expect(reloadMock).not.toHaveBeenCalled();
    expect(reportErrorMock).toHaveBeenCalledWith(expect.any(Error), 'react.ErrorBoundary');
    expect(screen.getByText('มีเวอร์ชันใหม่ของระบบ')).toBeInTheDocument();
    spy.mockRestore();
  });
});
