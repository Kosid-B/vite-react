import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import OnboardingTour from '../OnboardingTour';
import { DEFAULT_DATA as SEED } from '../../data';
import { INDUSTRY_OPTIONS } from '../../lib/setupWizard';
import type { AppData } from '../../types';

const clone = (): AppData => JSON.parse(JSON.stringify(SEED)) as AppData;
const noop = () => {};

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('OnboardingTour — Setup Wizard อัจฉริยะ', () => {
  it('แสดงขั้นแรกเมื่อยังไม่เคยดู (localStorage ว่าง)', () => {
    render(<OnboardingTour data={clone()} onNavigate={noop} onUpdate={noop} />);
    expect(screen.getByText(/ยินดีต้อนรับ/)).toBeInTheDocument();
  });

  it('ไม่แสดงถ้าเคยดูแล้ว (ceo_ai_onboarded=1)', () => {
    localStorage.setItem('ceo_ai_onboarded', '1');
    const { container } = render(<OnboardingTour data={clone()} onNavigate={noop} onUpdate={noop} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('กด "ข้าม" แล้วปิด + จำสถานะไว้ (ไม่โผล่อีก)', () => {
    render(<OnboardingTour data={clone()} onNavigate={noop} onUpdate={noop} />);
    fireEvent.click(screen.getByText('ข้าม'));
    expect(localStorage.getItem('ceo_ai_onboarded')).toBe('1');
    expect(screen.queryByText(/ยินดีต้อนรับ/)).not.toBeInTheDocument();
  });

  it('เก็บ industry + goal อินไลน์ แล้วนำทางไป บริษัท AI (activation)', () => {
    const onNavigate = vi.fn();
    const onUpdate = vi.fn();
    render(<OnboardingTour data={clone()} onNavigate={onNavigate} onUpdate={onUpdate} />);

    // 2 สไลด์แนะนำ → กด "ถัดไป" 2 ครั้ง เข้าสู่ขั้นเก็บ industry
    fireEvent.click(screen.getByRole('button', { name: /ถัดไป/ }));
    fireEvent.click(screen.getByRole('button', { name: /ถัดไป/ }));

    // ขั้น industry — เลือกจาก dropdown แล้วบันทึก
    fireEvent.change(screen.getByRole('combobox'), { target: { value: INDUSTRY_OPTIONS[0] } });
    fireEvent.click(screen.getByRole('button', { name: /บันทึกแล้วไปต่อ/ }));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls[0][0].aiCompany.industry).toBe(INDUSTRY_OPTIONS[0]);

    // ขั้น goal — กรอกเป้าหมายของตัวเอง (ต้อง ≥ GOAL_MIN_LEN) แล้วบันทึก
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ยอดขาย ฿100,000/เดือน ภายใน 90 วัน' } });
    fireEvent.click(screen.getByRole('button', { name: /บันทึกแล้วไปต่อ/ }));
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(onUpdate.mock.calls[1][0].aiCompany.goal).toContain('฿100,000');

    // ขั้นสุดท้าย → ปุ่ม CTA ไป บริษัท AI
    fireEvent.click(screen.getByRole('button', { name: /บริษัท AI/ }));
    expect(onNavigate).toHaveBeenCalledWith('aicompany');
    expect(localStorage.getItem('ceo_ai_onboarded')).toBe('1');
  });

  it('ปุ่มบันทึกปิดอยู่จนกว่าจะกรอกครบ (กันกรอกลวก)', () => {
    render(<OnboardingTour data={clone()} onNavigate={noop} onUpdate={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /ถัดไป/ }));
    fireEvent.click(screen.getByRole('button', { name: /ถัดไป/ }));
    // ขั้น industry ยังไม่เลือก → ปุ่มบันทึก disabled
    expect(screen.getByRole('button', { name: /บันทึกแล้วไปต่อ/ })).toBeDisabled();
  });
});
