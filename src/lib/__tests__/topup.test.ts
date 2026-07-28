import { describe, it, expect } from 'vitest';
import { TOPUP_PACKS, packById, pricePerCall, shouldOfferTopup, recommendPack } from '../topup';

describe('topup packs', () => {
  it('มี 3 แพ็ก + แพ็กแนะนำ 1 อัน', () => {
    expect(TOPUP_PACKS).toHaveLength(3);
    expect(TOPUP_PACKS.filter(p => p.best)).toHaveLength(1);
  });

  it('ทุกแพ็กกำไร > 20% แม้ทุก call เป็นงานหนักสุด (฿0.75/call)', () => {
    for (const p of TOPUP_PACKS) {
      const worstCost = p.calls * 0.75;
      const margin = (p.price - worstCost) / p.price;
      expect(margin).toBeGreaterThan(0.20);
    }
  });

  it('packById หา/ไม่เจอ', () => {
    expect(packById('topup_1000')?.calls).toBe(1000);
    expect(packById('nope')).toBeUndefined();
  });

  it('pricePerCall ถูกต้อง', () => {
    expect(pricePerCall({ id: 'x', calls: 1000, price: 990, label: '' })).toBe(0.99);
    expect(pricePerCall({ id: 'x', calls: 0, price: 100, label: '' })).toBe(0);
  });

  it('shouldOfferTopup เมื่อใช้ ≥ 80%', () => {
    expect(shouldOfferTopup(80, 100)).toBe(true);
    expect(shouldOfferTopup(79, 100)).toBe(false);
    expect(shouldOfferTopup(300, 300)).toBe(true);
    expect(shouldOfferTopup(0, 0)).toBe(false);   // กันหารศูนย์
  });

  it('recommendPack เลือกเล็กสุดที่ครอบคลุม / เกินสุด → ใหญ่สุด', () => {
    expect(recommendPack(300).calls).toBe(500);
    expect(recommendPack(500).calls).toBe(500);
    expect(recommendPack(700).calls).toBe(1000);
    expect(recommendPack(99999).calls).toBe(3000); // เกินทุกแพ็ก → ใหญ่สุด
  });
});
