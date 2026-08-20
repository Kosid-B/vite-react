import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CookieConsent from '../CookieConsent';

/* แถบคุกกี้ย่อให้เตี้ยลงบนมือถือ (20 ส.ค. 2569 — วัดจริง 130px → 86px)
 * เหตุผล: แถบเดิมทับ "ช่องกรอกต้นทุน" ของเครื่องคำนวณพอดีบน iPhone 390px
 *
 * ⚠️ ย่อได้ แต่ห้ามย่อจนเสีย PDPA — เทสต์นี้ล็อกสิ่งที่ห้ามหายไป:
 *   ① ต้องเลือก "ปฏิเสธ" ได้ และเห็นง่ายเท่ากับ "ยอมรับ" (ห้าม dark pattern)
 *   ② ต้องมีลิงก์นโยบายคุกกี้เสมอ (ย่อข้อความได้ เพราะรายละเอียดเต็มอยู่ปลายลิงก์)
 *   ③ ห้ามยอมรับให้เองโดยผู้ใช้ไม่ได้กด
 */

beforeEach(() => { localStorage.clear(); });

describe('แถบคุกกี้ — ย่อได้ แต่สิทธิ์ต้องครบ', () => {
  it('ยังไม่เคยเลือก → ต้องขึ้นถาม', () => {
    render(<CookieConsent />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('① มีทั้งปุ่มปฏิเสธและยอมรับ — ปฏิเสธต้องไม่ถูกซ่อน', () => {
    render(<CookieConsent />);
    expect(screen.getByText('เฉพาะที่จำเป็น')).toBeTruthy();
    expect(screen.getByText('ยอมรับทั้งหมด')).toBeTruthy();
  });

  it('② ต้องมีลิงก์นโยบายคุกกี้ (รายละเอียดเต็มอยู่ปลายลิงก์ จึงย่อข้อความบนแถบได้)', () => {
    const { container } = render(<CookieConsent />);
    const a = container.querySelector('a[href*="legal"]');
    expect(a, 'ไม่มีลิงก์นโยบาย = ย่อจนเสียสิทธิ์ผู้ใช้').toBeTruthy();
  });

  it('③ ห้ามยอมรับให้เอง — ยังไม่กด ต้องไม่มีค่าใน localStorage', () => {
    render(<CookieConsent />);
    expect(localStorage.getItem('ceo_ai_cookie_consent')).toBeNull();
  });

  it('กด "เฉพาะที่จำเป็น" → บันทึก necessary + แถบหายไป (ไม่ต้องรีโหลด)', () => {
    render(<CookieConsent />);
    fireEvent.click(screen.getByText('เฉพาะที่จำเป็น'));
    expect(localStorage.getItem('ceo_ai_cookie_consent')).toBe('necessary');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('เลือกไปแล้ว → ไม่ถามซ้ำ (ไม่ตื๊อ)', () => {
    localStorage.setItem('ceo_ai_cookie_consent', 'necessary');
    render(<CookieConsent />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('มีข้อความทั้งฉบับย่อและฉบับเต็มในโค้ด (สลับด้วย CSS ตามขนาดจอ)', () => {
    const { container } = render(<CookieConsent />);
    expect(container.querySelector('.cc-short'), 'ขาดข้อความฉบับย่อสำหรับมือถือ').toBeTruthy();
    expect(container.querySelector('.cc-full'), 'ขาดข้อความฉบับเต็มสำหรับจอใหญ่').toBeTruthy();
  });
});
