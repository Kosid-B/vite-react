import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DEFAULT_DATA } from '../../data';
import Dashboard from '../Dashboard';
import Billing from '../Billing';
import Personas from '../Personas';

/**
 * Smoke test — หน้าหลัก mount ได้จริงโดยไม่ crash (ป้องกัน regression "จอดำ")
 * รันในชุด vitest เดียวกับ CI build-test → บล็อก merge อัตโนมัติถ้าหน้าใด render พัง
 */
afterEach(cleanup);
const noop = () => {};

describe('page render smoke', () => {
  it('Dashboard render ได้ (ไม่ throw + มีเนื้อหา)', () => {
    const { container } = render(<Dashboard data={DEFAULT_DATA} onNavigate={noop} onUpdate={noop} wsId={null} />);
    expect((container.textContent ?? '').length).toBeGreaterThan(50);
  });

  it('Billing render ได้', () => {
    const { container } = render(<Billing data={DEFAULT_DATA} onUpdate={noop} wsId={null} />);
    expect((container.textContent ?? '').length).toBeGreaterThan(30);
  });

  it('Personas render ได้', () => {
    const { container } = render(<Personas data={DEFAULT_DATA} onUpdate={noop} />);
    expect((container.textContent ?? '').length).toBeGreaterThan(20);
  });
});
