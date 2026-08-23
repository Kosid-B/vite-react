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

  /* 🔁 แก้ 23 ส.ค. 2569 — ค่าตั้งต้นเปลี่ยนกลุ่มเป้าหมายระดับโครงสร้าง
   * เดิมเทสต์ล็อกว่าค่าตั้งต้นต้องพูดกับ "เจ้าของที่ขายอยู่แล้ว" (มาจากสถิติผู้ชม YouTube
   * ซึ่งเป็น Current Audience ไม่ใช่ Target Market) · ตอนนี้ค่าตั้งต้น = Broad Market */
  it('ไม่มี seg → พาดหัวค่าตั้งต้นพูดกับคนที่อยากเริ่มธุรกิจ (Broad Market)', () => {
    render(<StartLanding />);
    expect(screen.getByText(/อยากมีธุรกิจ แต่ไม่รู้จะเริ่มจากอะไร/)).toBeTruthy();
    // คนที่ขายอยู่แล้วไม่ได้ถูกทิ้ง — เขาอยู่ seg 'seller' ซึ่งเป็นขั้นถัดไปของ Journey
    expect(screen.queryByText(/ขายได้ทุกวัน แต่สิ้นเดือนเงินไม่เหลือ/)).toBeNull();
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
