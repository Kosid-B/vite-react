import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import HandoffLanding from '../HandoffLanding';

/* co-brand: หน้า /handoff แสดง lockup theossphere ✦ CEO AI Thailand ทุกสถานะ (ต่อเนื่องไม่สะดุด) */

afterEach(cleanup);

describe('HandoffLanding co-brand', () => {
  it('render ได้ + แสดง co-brand lockup (theossphereLive=false → off state)', () => {
    const { container } = render(<HandoffLanding />);
    const txt = container.textContent ?? '';
    expect(txt).toContain('theossphere');
    expect(txt).toContain('CEO AI Thailand');
  });
});
