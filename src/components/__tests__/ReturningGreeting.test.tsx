import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReturningGreeting from '../ReturningGreeting';

/* คนที่เคยกรอกแล้วกลับมา ต้องเจอตัวเลขของตัวเอง ไม่ใช่หน้าเดิมเหมือนไม่เคยรู้จักกัน */

const DRAFT_KEY = 'ceo_ai_quick_draft';
const setDraft = (o: unknown) => localStorage.setItem(DRAFT_KEY, JSON.stringify(o));
const today = new Date().toISOString().slice(0, 10);

describe('ทักกลับคนที่เคยกรอกตรวจสินค้าเร็ว', () => {
  beforeEach(() => localStorage.clear());

  it('ไม่มีร่าง → ไม่แสดงอะไรเลย (ไม่รบกวนคนใหม่)', () => {
    const { container } = render(<ReturningGreeting onGetStarted={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('มีร่าง → แสดงตัวเลขของเขาเอง ไม่ใช่ตัวเลขตัวอย่าง', () => {
    setDraft({ input: { biz: 'all', price: 1500, cost: 900 }, topics: [], at: today });
    render(<ReturningGreeting onGetStarted={() => {}} />);
    const t = screen.getByText(/กำไรต่อชิ้น/).textContent ?? '';
    expect(t).toContain('1,500');
    expect(t).toContain('900');
    expect(t).toContain('600');   // 1500 - 900
    expect(t).toContain('40%');
  });

  it('ร่างเก่าเกินกำหนด → ไม่แสดง (คนอาจเปิดทิ้งไว้เป็นเดือน)', () => {
    setDraft({ input: { biz: 'all', price: 100, cost: 50 }, topics: [], at: '2020-01-01' });
    const { container } = render(<ReturningGreeting onGetStarted={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('กด "ดูต่อ" → เรียก onGetStarted', () => {
    setDraft({ input: { biz: 'all', price: 100, cost: 60 }, topics: [], at: today });
    const go = vi.fn();
    render(<ReturningGreeting onGetStarted={go} />);
    fireEvent.click(screen.getByText(/ดูต่อจากตรงนี้/));
    expect(go).toHaveBeenCalled();
  });

  it('กด "เริ่มใหม่" → ซ่อนไป ไม่บังคับให้เขาต้องใช้ข้อมูลเก่า', () => {
    setDraft({ input: { biz: 'all', price: 100, cost: 60 }, topics: [], at: today });
    const { container } = render(<ReturningGreeting onGetStarted={() => {}} />);
    fireEvent.click(screen.getByText('เริ่มใหม่'));
    expect(container.firstChild).toBeNull();
  });

  it('ขาดทุน → ไม่ปลอบว่าดี แต่บอกว่ามีจุดต้องดูต่อ', () => {
    setDraft({ input: { biz: 'all', price: 100, cost: 95 }, topics: [], at: today });
    render(<ReturningGreeting onGetStarted={() => {}} />);
    expect(screen.getByText(/ยังมีจุดที่ควรดูต่อ/)).toBeTruthy();
  });
});
