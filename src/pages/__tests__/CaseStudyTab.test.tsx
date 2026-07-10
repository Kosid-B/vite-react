import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { AppData, CaseStudy } from '../../types';
import CaseStudyTab from '../AdminTabs/CaseStudyTab';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const honda: CaseStudy = {
  id: 'cs-honda',
  title: 'Honda NSX ตบหน้า Ferrari',
  company: 'Honda NSX',
  tag: 'Customer-Centric Disruption',
  industry: 'Automotive',
  keyLesson: 'อย่าหยิ่งจนมองข้าม pain point ของลูกค้า',
  lessons: [
    { icon: '🩹', title: 'a', body: 'ลูกค้าถูกสั่งให้ทน' },
    { icon: '🏎️', title: 'b', body: 'ได้ทั้งคู่' },
    { icon: '🏆', title: 'c', body: 'ดึง Senna มาจูน' },
  ],
  applyTo: ['ฟังเสียงบ่น', 'อย่าลดคุณภาพหลัก', 'ดึงผู้เชี่ยวชาญ'],
  source: 'form',
};

function renderTab() {
  const data = { caseStudies: [honda] } as AppData;
  const onUpdate = () => {};
  render(<CaseStudyTab data={data} onUpdate={onUpdate} />);
}

describe('CaseStudyTab — Content Studio: Case → Skill', () => {
  it('แสดงเคสที่นำเข้าแล้ว พร้อมปุ่มเสนอเป็น Skill', () => {
    renderTab();
    expect(screen.getByText('Honda NSX ตบหน้า Ferrari')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '💰 เสนอเป็น Skill' })).toBeInTheDocument();
  });

  it('กดเสนอเป็น Skill → เปิดตัวแก้ไขพร้อมประเมินมูลค่า (valueNote + เหตุผล)', () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: '💰 เสนอเป็น Skill' }));
    expect(screen.getByText('💰 ข้อเสนอ Skill + ประเมินมูลค่า')).toBeInTheDocument();
    // value estimate อ้างมูลค่าที่ปรึกษา
    expect(screen.getByText(/เทียบจ้างที่ปรึกษา/)).toBeInTheDocument();
    // เหตุผลโปร่งใส (rationale) อธิบายที่มาของระดับ
    expect(screen.getByText(/อิงความลึก/)).toBeInTheDocument();
  });

  it('กดสร้าง Skill ขาย → บันทึกลง marketplace (local → localStorage)', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: '💰 เสนอเป็น Skill' }));
    fireEvent.click(screen.getByText('+ สร้าง Skill ขาย'));
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('ceo_ai_admin_skills') ?? '[]');
      expect(stored.length).toBe(1);
      expect(stored[0].tier).toBe(3);
      expect(stored[0].price).toBeGreaterThan(0);
      expect(stored[0].name).toBeTruthy();
    });
  });

  it('ปิดตัวแก้ไขได้ด้วยปุ่ม ปิด', () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: '💰 เสนอเป็น Skill' }));
    expect(screen.getByText('💰 ข้อเสนอ Skill + ประเมินมูลค่า')).toBeInTheDocument();
    fireEvent.click(screen.getByText('ปิด'));
    expect(screen.queryByText('💰 ข้อเสนอ Skill + ประเมินมูลค่า')).not.toBeInTheDocument();
  });
});
