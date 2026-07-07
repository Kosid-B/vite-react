import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { AppData, CaseStudy } from '../../types';
import CaseStudies from '../CaseStudies';

afterEach(cleanup);

const custom: CaseStudy = {
  id: 'cs-demo',
  title: 'จากร้านเล็กสู่แบรนด์',
  company: 'Growth First Digital',
  tag: 'เอเจนซีการตลาด',
  lessons: [{ icon: '💡', body: 'เริ่มจากรู้จักลูกค้าก่อน' }],
  color: '#06b6d4',
};

describe('CaseStudies — รวม built-in + ที่แอดมินนำเข้า', () => {
  it('แสดงเคสในตัว (Tencent) เสมอ แม้ไม่มี data', () => {
    render(<CaseStudies />);
    expect(screen.getByText('Tencent Gaming')).toBeInTheDocument();
  });

  it('แสดงทั้งเคสในตัว + เคสที่นำเข้า (caseStudies) พร้อมกัน', () => {
    render(<CaseStudies data={{ caseStudies: [custom] } as AppData} />);
    expect(screen.getByText('Tencent Gaming')).toBeInTheDocument();       // built-in
    expect(screen.getByText('Growth First Digital')).toBeInTheDocument(); // imported
  });
});
