import { describe, it, expect } from 'vitest';
import { shopKind, recurringBuyersFor } from '../recurringDemand';
import { flashPromo, loyaltyTips } from '../slowHourBooster';

describe('shopKind', () => {
  it('จำแนกจากคำจริงในภาพ', () => {
    expect(shopKind('สเต็กลุงใหญ่ ร้านอาหาร')).toBe('food');
    expect(shopKind('Buddy Clean คาร์แคร์ ล้างรถ')).toBe('carcare');
    expect(shopKind('ร้านทำเล็บทำผม')).toBe('beauty');
    expect(shopKind('ร้านขายเสื้อผ้า')).toBe('retail');
    expect(shopKind('รับซ่อมแอร์')).toBe('service');
    expect(shopKind('อะไรก็ไม่รู้')).toBe('other');
  });
});

describe('recurringBuyersFor', () => {
  it('ร้านอาหาร → มีออฟฟิศเป็นดีมานด์ประจำ + สคริปต์แทนชื่อร้านแล้ว', () => {
    const b = recurringBuyersFor('สเต็ก ร้านอาหาร', 'สเต็กลุงใหญ่');
    expect(b.length).toBeGreaterThan(0);
    expect(b[0].buyer).toContain('ออฟฟิศ');
    expect(b[0].outreach).toContain('สเต็กลุงใหญ่');
    expect(b[0].outreach).not.toContain('{ชื่อร้าน}');
  });
  it('คาร์แคร์ → คอนโด/เต็นท์รถ/ฟลีต', () => {
    const b = recurringBuyersFor('ล้างรถ คาร์แคร์', 'Buddy Clean');
    const buyers = b.map(x => x.buyer).join(' ');
    expect(buyers).toMatch(/คอนโด|เต็นท์|ฟลีต/);
    expect(b.every(x => x.outreach.includes('Buddy Clean'))).toBe(true);
  });
  it('ทุก buyer มี offer + cadence + outreach ครบ', () => {
    for (const b of recurringBuyersFor('ร้านอาหาร')) {
      expect(b.offer.length).toBeGreaterThan(0);
      expect(b.cadence.length).toBeGreaterThan(0);
      expect(b.outreach.length).toBeGreaterThan(0);
    }
  });
});

describe('flashPromo', () => {
  it('ใส่กรอบเวลา + %ลด + ชื่อร้าน', () => {
    const p = flashPromo('สเต็กลุงใหญ่', 'ร้านอาหาร', { discountPct: 20, from: '14:00', to: '16:00' });
    expect(p.headline).toContain('สเต็กลุงใหญ่');
    expect(p.headline).toContain('20%');
    expect(p.body).toContain('14:00–16:00');
  });
  it('ไม่ใส่เวลา → default "บ่ายนี้" · %ลด clamp 5–50', () => {
    const p = flashPromo('ร้าน', 'ล้างรถ', { discountPct: 999 });
    expect(p.body).toContain('บ่ายนี้');
    expect(p.headline).toContain('50%'); // clamp
  });
});

describe('loyaltyTips', () => {
  it('คืนเคล็ด repeat ตามประเภท + common (QR/บัตรสะสม)', () => {
    const t = loyaltyTips('คาร์แคร์ ล้างรถ');
    expect(t.length).toBeGreaterThanOrEqual(2);
    expect(t.join(' ')).toContain('QR');
  });
});
