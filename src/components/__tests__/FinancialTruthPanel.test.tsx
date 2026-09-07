import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import FinancialTruthPanel from '../FinancialTruthPanel';

/* 🔴 ปิดช่องที่ `enforcedGates.test.ts` ตรวจไม่ได้:
 *   ตัวนั้นตรวจได้แค่ "มีโค้ดเรียก" — คอมโพเนนต์ที่มีอยู่แต่ไม่ถูกวางบนหน้า ก็ยังนับว่ามีผู้เรียก
 *   ⇒ เทสต์นี้ยืนยันว่ามันถูก **render จริง** บนหน้าจริง */

vi.mock('../../lib/payments', () => ({ payingCustomerCount: () => Promise.resolve(0) }));

const DASH = readFileSync(join(process.cwd(), 'src/pages/AdminTabs/GrowthDashboard.tsx'), 'utf8');

afterEach(cleanup);
beforeEach(() => localStorage.clear());

describe('FinancialTruthPanel — ถูกวางบนหน้าจริง', () => {
  it('ถูก import และ render ใน GrowthDashboard (ไม่ใช่ไฟล์ลอย)', () => {
    expect(DASH).toMatch(/import\s+FinancialTruthPanel\s+from/);
    expect(DASH).toMatch(/<FinancialTruthPanel\s*\/>/);
  });
});

describe('FinancialTruthPanel — ห้ามแสดงค่าสมมติเป็นตัวเลขจริง', () => {
  it('ยังไม่มีข้อมูล ⇒ ประกาศว่ายังไม่มี ไม่ใช่แสดง 0', () => {
    render(<FinancialTruthPanel />);
    expect(screen.getAllByText(/ยังไม่มีข้อมูล/).length).toBeGreaterThan(0);
  });

  it('แสดงด่านลงทุนที่ค้างอยู่ พร้อมย้ำว่าปล่อยเงินเองไม่ได้', () => {
    render(<FinancialTruthPanel />);
    expect(screen.getByText(/ค้างที่ด่านลงทุน/)).toBeTruthy();
    expect(screen.getByText(/ปล่อยเงินเองไม่ได้/)).toBeTruthy();
  });

  it('เตือนว่า 2% เป็นเส้นรอด ห้ามเป็นเป้าหมาย', () => {
    render(<FinancialTruthPanel />);
    expect(screen.getByText(/ห้ามใช้เป็นเป้าหมาย/)).toBeTruthy();
  });

  it('กรอกแล้วลบออก ต้องกลับเป็น "ยังไม่ได้วัด" ไม่ใช่ 0', () => {
    render(<FinancialTruthPanel />);
    const input = screen.getByLabelText('งบหาลูกค้าในช่วงที่ดู (บาท)') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '70000' } });
    expect(JSON.parse(localStorage.getItem('ceoai_econ_input') || '{}')).toHaveProperty('acquisitionSpend', 70000);
    fireEvent.change(input, { target: { value: '' } });
    expect('acquisitionSpend' in JSON.parse(localStorage.getItem('ceoai_econ_input') || '{}')).toBe(false);
  });

  it('🔴 ลูกค้าที่จ่ายจริงดึงจากฐานข้อมูล — ไม่มีช่องให้กรอกมือ', () => {
    render(<FinancialTruthPanel />);
    expect(screen.queryByLabelText(/ลูกค้าที่จ่าย.*\(ราย\)/)).toBeNull();
    expect(screen.getByText(/แก้มือไม่ได้โดยตั้งใจ/)).toBeTruthy();
  });
});
