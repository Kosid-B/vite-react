import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StartLanding from '../StartLanding';

/* พิสูจน์ "ปลายทางใช้บริบทจริง" ไม่ใช่แค่ CTA ส่ง seg ไป
 * เคยพลาดจริง: เติม ?seg= ให้ CTA แล้ว แต่ /start ไม่ได้อ่านค่านั้นเลย
 * เทสต์ระดับข้อมูลผ่านหมดทั้งที่หน้าจอไม่เปลี่ยนอะไร → ต้องเรนเดอร์จริงถึงจะจับได้ */

const go = (search: string) => window.history.replaceState({}, '', '/start' + search);

describe('/start เปลี่ยนพาดหัวตามคนที่พามา', () => {
  beforeEach(() => go(''));

  it('มาจากบทความราคา (seg=seller) → พาดหัวเรื่องกำไรต่อชิ้น', () => {
    go('?seg=seller&from=blog_pricing-no-loss');
    render(<StartLanding />);
    expect(screen.getByText(/ขายได้ทุกวัน แต่สิ้นเดือนเงินไม่เหลือ/)).toBeTruthy();
    expect(screen.queryByText(/ไม่มีใครจ้าง/)).toBeNull();
  });

  it('มาจากบทความทุน (seg=newbie) → พาดหัวเรื่องเริ่มโดยไม่ลงเงินก้อน', () => {
    go('?seg=newbie&from=blog_start-business-no-capital');
    render(<StartLanding />);
    expect(screen.getByText(/อยากเริ่มธุรกิจ แต่ไม่รู้จะเริ่มตรงไหน/)).toBeTruthy();
  });

  it('ไม่มี seg → พาดหัวค่าตั้งต้นพูดกับเจ้าของธุรกิจที่ขายอยู่แล้ว (ตามผู้ชมที่วัดได้จริง)', () => {
    render(<StartLanding />);
    expect(screen.getByText(/ขายได้ทุกวัน แต่สิ้นเดือนเงินไม่เหลือ/)).toBeTruthy();
    // ข้อความเดิมพูดกับคนจบใหม่/คนหางาน ซึ่งผู้ชมจริงอายุ 18-24 = 0.0%
    expect(screen.queryByText(/ไม่มีใครจ้าง/)).toBeNull();
    expect(screen.queryByText(/คนจบใหม่/)).toBeNull();
  });

  it('ไม่ตัดคนเพิ่งเริ่มทิ้ง — seg=newbie ยังได้พาดหัวของตัวเอง', () => {
    go('?seg=newbie');
    render(<StartLanding />);
    expect(screen.getByText(/อยากเริ่มธุรกิจ แต่ไม่รู้จะเริ่มตรงไหน/)).toBeTruthy();
  });

  it('สะพานจากเว็บบริษัท (ref=btctraining) ชนะ seg เสมอ — คนละกลุ่มกัน', () => {
    go('?seg=seller&ref=btctraining');
    render(<StartLanding />);
    expect(screen.getByText(/ทำ ISO เสียเวลาเป็นอาทิตย์/)).toBeTruthy();
  });
});
