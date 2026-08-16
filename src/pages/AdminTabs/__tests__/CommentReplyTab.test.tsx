import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommentReplyTab from '../CommentReplyTab';

/* เทสต์นี้มีอยู่เพราะแท็บนี้ทดสอบด้วยมือใน local dev ไม่ได้ —
 * เมนู "ผู้ดูแลระบบ" โผล่เฉพาะเมื่อล็อกอินด้วยอีเมลแอดมิน ซึ่งโหมด local ไม่มี session
 * (กับดักเดียวกับ GOTCHA #1 ใน CLAUDE.md: UI ที่เป็น prod-only reproduce ไม่ได้)
 * จึงเรนเดอร์คอมโพเนนต์ตรง ๆ แทนการไล่คลิกในเบราว์เซอร์ */

describe('แท็บตอบคอมเมนต์ — เรนเดอร์และคำนวณถูกจริง', () => {
  it('ยังไม่พิมพ์อะไร → ขึ้นข้อความถามกลับ ไม่ใช่ตัวเลขมั่ว', () => {
    render(<CommentReplyTab />);
    expect(screen.getByText(/ขอ 2 ตัวเลขครับ/)).toBeTruthy();
  });

  it('พิมพ์ "1,500/900" → คำนวณถูก (เคสจุลภาคที่เคยพลาด)', () => {
    render(<CommentReplyTab />);
    fireEvent.change(screen.getByPlaceholderText('50/30'), { target: { value: 'ขาย 1,500 ทุน 900' } });
    const out = screen.getByText(/กำไรต่อชิ้น/).textContent ?? '';
    expect(out).toContain('ราคา 1,500 ต้นทุน 900');
    expect(out).toContain('กำไรต่อชิ้น 600 บาท (40%)');
    expect(out).toContain('เสียลูกค้าได้ถึง 20%');
  });

  it('โหมดคอมเมนต์ต้องไม่มีลิงก์ · สลับเป็นแชทแล้วมีลิงก์', () => {
    render(<CommentReplyTab />);
    fireEvent.change(screen.getByPlaceholderText('50/30'), { target: { value: '50/30' } });
    expect(screen.getByText(/กำไรต่อชิ้น/).textContent).not.toContain('http');

    fireEvent.click(screen.getByText(/FB แชท/));
    expect(screen.getByText(/กำไรต่อชิ้น/).textContent).toContain('https://ceoaithailand.org');
  });

  it('ช่อง TikTok → ลิงก์แบบพิมพ์ตาม ไม่มี https:// (คอมเมนต์ TikTok กดลิงก์ไม่ได้)', () => {
    render(<CommentReplyTab />);
    fireEvent.change(screen.getByPlaceholderText('50/30'), { target: { value: '50/30' } });
    fireEvent.click(screen.getByText(/TikTok คอมเมนต์/));
    const out = screen.getByText(/กำไรต่อชิ้น/).textContent ?? '';
    expect(out).toContain('ceoaithailand.org/ราคา');
    expect(out).not.toContain('https://');
  });

  it('มีคอมเมนต์ปักหมุด TikTok ครบ 3 คำที่โฟกัส พร้อมเหตุผลว่าทำไมต้องใช้', () => {
    render(<CommentReplyTab />);
    expect(screen.getByText(/คอมเมนต์ปักหมุดใต้คลิป TikTok/)).toBeTruthy();
    expect(screen.getByText(/15,900 วิว/)).toBeTruthy();
    for (const kw of ['ราคา', 'ทุน', 'ลูกค้า']) {
      expect(screen.getByText(`คลิปเรื่อง${kw}`), kw).toBeTruthy();
    }
  });

  it('ต้นทุนมากกว่าราคา → ขึ้นคำเตือน และถามกลับแทนการคำนวณ', () => {
    render(<CommentReplyTab />);
    fireEvent.change(screen.getByPlaceholderText('50/30'), { target: { value: '30/50' } });
    expect(screen.getByText(/อาจพิมพ์สลับ/)).toBeTruthy();
    expect(screen.getByText(/ใช่ไหมครับ/)).toBeTruthy();
  });

  it('มีข้อความทักกลับครบทุกคำสำคัญ พร้อมลิงก์ติด ?s=fb', () => {
    render(<CommentReplyTab />);
    for (const kw of ['ราคา', 'ทุน', 'ลูกค้า', 'ระบบ']) {
      expect(screen.getByText(new RegExp(`พิมพ์ว่า “${kw}”`)), kw).toBeTruthy();
    }
    expect(screen.getAllByText(/\?s=fb/).length).toBeGreaterThanOrEqual(4);
  });

  it('คำที่ยังไม่โฟกัสถูกพับเก็บ ไม่ปนกับคำที่โพสต์รอบนี้', () => {
    render(<CommentReplyTab />);
    // 'ระบบ' ต้องอยู่ใน <details> ที่พับไว้ ส่วน 3 คำแรกต้องไม่อยู่
    const later = screen.getByText(/เก็บไว้รอบถัดไป/).closest('details');
    expect(later).toBeTruthy();
    expect(later!.textContent).toContain('พิมพ์ว่า “ระบบ”');
    for (const kw of ['ราคา', 'ทุน', 'ลูกค้า']) {
      expect(later!.textContent, kw).not.toContain(`พิมพ์ว่า “${kw}”`);
    }
    expect(later!.open).toBe(false);
  });
});
