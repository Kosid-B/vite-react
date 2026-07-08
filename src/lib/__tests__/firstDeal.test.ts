import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { draftVpLocal, journeyDaysLeft } from '../firstDeal';

/* First Revenue Engine — draft VP (local fallback) + นับถอยหลังภารกิจ 30 วัน */

describe('draftVpLocal — value proposition แบบ template', () => {
  it('ใส่ชื่อบริษัท + บริการแรกลงในประโยค', () => {
    const vp = draftVpLocal('ร้านกาแฟดี', '[I] ที่พักแรมและบริการอาหาร', 'ขายกาแฟสด', ['บริการจัดเลี้ยง']);
    expect(vp).toContain('ร้านกาแฟดี');
    expect(vp).toContain('บริการจัดเลี้ยง');
  });

  it('ไม่มีชื่อ/บริการ → ยัง fallback ได้ (ไม่ throw, ไม่ว่าง)', () => {
    const vp = draftVpLocal('', '', '', []);
    expect(vp.length).toBeGreaterThan(0);
    expect(vp).toContain('เรา');
  });
});

describe('journeyDaysLeft — ภารกิจ 30 วัน', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T00:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); localStorage.clear(); });

  it('ครั้งแรก = 30 วันเต็ม + บันทึกวันเริ่ม', () => {
    expect(journeyDaysLeft()).toBe(30);
    expect(localStorage.getItem('ceo_ai_journey_start')).toBeTruthy();
  });

  it('เริ่มไปแล้ว 10 วัน → เหลือ ~20', () => {
    localStorage.setItem('ceo_ai_journey_start', new Date('2026-06-28T00:00:00Z').toISOString());
    expect(journeyDaysLeft()).toBe(20);
  });

  it('เลย 30 วันแล้ว → ไม่ติดลบ (0)', () => {
    localStorage.setItem('ceo_ai_journey_start', new Date('2026-05-01T00:00:00Z').toISOString());
    expect(journeyDaysLeft()).toBe(0);
  });
});
