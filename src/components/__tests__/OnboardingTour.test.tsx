import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import OnboardingTour from '../OnboardingTour';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('OnboardingTour — ทัวร์ต้อนรับครั้งแรก', () => {
  it('แสดงขั้นแรกเมื่อยังไม่เคยดู (localStorage ว่าง)', () => {
    render(<OnboardingTour onNavigate={() => {}} />);
    expect(screen.getByText(/ยินดีต้อนรับ/)).toBeInTheDocument();
  });

  it('ไม่แสดงถ้าเคยดูแล้ว (ceo_ai_onboarded=1)', () => {
    localStorage.setItem('ceo_ai_onboarded', '1');
    const { container } = render(<OnboardingTour onNavigate={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('กด "ข้าม" แล้วปิด + จำสถานะไว้ (ไม่โผล่อีก)', () => {
    render(<OnboardingTour onNavigate={() => {}} />);
    fireEvent.click(screen.getByText('ข้าม'));
    expect(localStorage.getItem('ceo_ai_onboarded')).toBe('1');
    expect(screen.queryByText(/ยินดีต้อนรับ/)).not.toBeInTheDocument();
  });

  it('เดินจนขั้นสุดท้ายแล้วกดปุ่ม → นำทางไปหน้า บริษัท AI + ปิด', () => {
    const onNavigate = vi.fn();
    render(<OnboardingTour onNavigate={onNavigate} />);
    // 5 ขั้น → กด "ถัดไป" 4 ครั้ง
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: /ถัดไป/ }));
    // ขั้นสุดท้ายมีปุ่ม CTA ไป บริษัท AI (เจาะจง button กันชนกับข้อความในเนื้อหา)
    fireEvent.click(screen.getByRole('button', { name: /บริษัท AI/ }));
    expect(onNavigate).toHaveBeenCalledWith('aicompany');
    expect(localStorage.getItem('ceo_ai_onboarded')).toBe('1');
  });
});
