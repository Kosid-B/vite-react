import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import BrandVisibilityPanel from '../BrandVisibilityPanel';

/* ══════════════════════════════════════════════════════════════════════════
 * 🔴 สิ่งที่เทสต์นี้กัน: "เขียนถูก ≠ ถูกเรียกใช้"
 *   brandVisibility.ts จะกันการเดาได้ก็ต่อเมื่อมันถูก **แสดงให้คนตัดสินใจเห็นจริง**
 *   ⇒ ตรวจ ① แผงถูก mount ในหน้าจริง ② ช่องว่างไม่ถูกแปลงเป็น 0 ③ จุดบอดถูกประกาศ
 * ══════════════════════════════════════════════════════════════════════════ */

const DASH = readFileSync(join(process.cwd(), 'src/pages/AdminTabs/GrowthDashboard.tsx'), 'utf8');

afterEach(cleanup);
beforeEach(() => localStorage.clear());

describe('BrandVisibilityPanel — ถูกเรียกใช้จริง', () => {
  it('ถูก import และ render ในหน้า GrowthDashboard (ไม่ใช่ไฟล์ลอย)', () => {
    expect(DASH).toMatch(/import\s+BrandVisibilityPanel\s+from/);
    expect(DASH).toMatch(/<BrandVisibilityPanel\s*\/>/);
  });
});

describe('BrandVisibilityPanel — ยังไม่ได้ตรวจ ต้องประกาศว่ายังไม่ได้ตรวจ', () => {
  it('เปิดครั้งแรก: ประกาศจุดบอด และ **ไม่** โชว์คะแนนรวม', () => {
    render(<BrandVisibilityPanel />);
    expect(screen.getByText(/ยังให้คะแนนรวมไม่ได้/)).toBeTruthy();
    expect(screen.queryByText(/คะแนนการถูกจำถูกตัว/)).toBeNull();
    expect(screen.getAllByText(/ตรวจไม่ได้/).length).toBeGreaterThan(0);
  });

  it('มีงานถัดไปเสมอ — ห้ามโชว์จุดบอดเปล่า ๆ โดยไม่บอกว่าทำอะไรต่อ', () => {
    render(<BrandVisibilityPanel />);
    expect(screen.getByText(/งานถัดไป/)).toBeTruthy();
  });

  it('กรอกแล้วลบออก ต้องกลับไปเป็น "ตรวจไม่ได้" ไม่ใช่ 0', () => {
    render(<BrandVisibilityPanel />);
    const input = screen.getByLabelText('หน้าที่จัดทำดัชนีแล้ว') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '12' } });
    expect(JSON.parse(localStorage.getItem('ceoai_brand_visibility') || '{}')).toHaveProperty('indexedPages', 12);
    fireEvent.change(input, { target: { value: '' } });
    const saved = JSON.parse(localStorage.getItem('ceoai_brand_visibility') || '{}');
    expect('indexedPages' in saved).toBe(false); // 🔴 ไม่ใช่ 0
  });

  it('กรอก 0 จริง ต้องเก็บเป็น 0 (ต่างจากเว้นว่าง)', () => {
    render(<BrandVisibilityPanel />);
    const input = screen.getByLabelText('หน้าที่จัดทำดัชนีแล้ว') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '0' } });
    expect(JSON.parse(localStorage.getItem('ceoai_brand_visibility') || '{}')).toHaveProperty('indexedPages', 0);
  });
});

describe('BrandVisibilityPanel — กฎที่เขียนไว้ต้องถูกเรียกใช้จริง (shipped-not-written)', () => {
  it('แสดง "วงที่เปิดได้ตอนนี้" — ไม่ใช่แค่มีฟังก์ชันอยู่ใน lib', () => {
    render(<BrandVisibilityPanel />);
    expect(screen.getByText(/วงที่ 1/)).toBeTruthy();
    expect(screen.getByText(/ยังไม่ถึงเวลา/)).toBeTruthy();
  });

  it('ยังไม่กรอกค่า ⇒ fail-closed อยู่วง 1 และประกาศว่าตรวจไม่ได้', () => {
    render(<BrandVisibilityPanel />);
    expect(screen.getByText(/ถือว่าอยู่วงแรกไว้ก่อน/)).toBeTruthy();
    expect(screen.getAllByText(/ตรวจไม่ได้/).length).toBeGreaterThan(0);
  });

  it('กรอกส่วนแบ่งผลค้นหาถึงเป้า ⇒ ปลดวง 2 และป้ายความสับสนเปลี่ยนเอง', () => {
    localStorage.setItem('ceoai_brand_visibility', JSON.stringify({ ownedSerpCoverage: 0.8 }));
    render(<BrandVisibilityPanel />);
    expect(screen.getByText(/วงที่ 2/)).toBeTruthy();
    expect(screen.getByText(/LOW/)).toBeTruthy();
  });

  it('ต่ำกว่าเป้า ⇒ ยังอยู่วง 1 และป้ายความสับสน = HIGH', () => {
    localStorage.setItem('ceoai_brand_visibility', JSON.stringify({ ownedSerpCoverage: 0.2 }));
    render(<BrandVisibilityPanel />);
    expect(screen.getByText(/วงที่ 1/)).toBeTruthy();
    expect(screen.getByText(/HIGH/)).toBeTruthy();
  });
});
