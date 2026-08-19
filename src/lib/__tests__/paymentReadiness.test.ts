import { describe, it, expect } from 'vitest';
import { paymentReadiness, QUOTA_LOW, type PaymentReadinessInput } from '../paymentReadiness';

const base = (o: Partial<PaymentReadinessInput> = {}): PaymentReadinessInput => ({
  slipOkLive: true, slipsTotal: 0, slipsVerified: 0,
  quotaLeft: 99, quotaExpiresAt: null, now: '2026-08-19T00:00:00Z', ...o,
});

describe('paymentReadiness — "ยังไม่เคยพิสูจน์" ต้องดังกว่า "ไม่มีข้อผิดพลาด"', () => {
  it('🔴 สถานะจริงตอนนี้: 0 สลิป + slipOkLive → blocked ไม่ใช่ ok', () => {
    const r = paymentReadiness(base());
    expect(r.proven).toBe(false);
    expect(r.state).toBe('blocked');
    expect(r.risks[0]).toContain('🔴');
    expect(r.nextAction).toContain('฿1');
  });

  it('ไม่ live = เปิดแพ็กก่อนตรวจทีหลัง → เตือนเบา ไม่บล็อกลูกค้า', () => {
    const r = paymentReadiness(base({ slipOkLive: false }));
    expect(r.state).toBe('unproven');
    expect(r.risks.some(x => x.startsWith('🔴'))).toBe(false);
  });

  it('มีสลิปเข้ามาแต่ไม่ผ่านสักใบ = เส้นทางเงินพัง ไม่ใช่ "ยังไม่มีลูกค้า"', () => {
    const r = paymentReadiness(base({ slipsTotal: 4, slipsVerified: 0 }));
    expect(r.risks.some(x => x.includes('พังอยู่'))).toBe(true);
    expect(r.state).toBe('blocked');
  });

  it('ผ่านจริงแล้ว + ไม่มีความเสี่ยง = ok และเลิกกวนให้ไปโฟกัสหาคน', () => {
    const r = paymentReadiness(base({ slipsTotal: 3, slipsVerified: 3 }));
    expect(r.state).toBe('ok');
    expect(r.proven).toBe(true);
    expect(r.nextAction).toContain('พาคนเข้ามา');
  });

  it('ผ่านแล้วแต่โควตาหมด = at_risk (ไม่ใช่ ok และไม่ใช่ blocked)', () => {
    const r = paymentReadiness(base({ slipsVerified: 2, quotaLeft: 0 }));
    expect(r.state).toBe('at_risk');
  });

  it('🟡 โควตาตรวจไม่ได้ ต้องประกาศเป็นจุดบอด ห้ามเงียบ', () => {
    const r = paymentReadiness(base({ slipsVerified: 1, quotaLeft: null }));
    expect(r.risks.some(x => x.startsWith('🟡') && x.includes('slipok-quota-check'))).toBe(true);
  });

  it('โควตาใกล้หมดเตือนก่อน — ไม่ใช่รู้ตอนลูกค้ากำลังจ่าย', () => {
    const r = paymentReadiness(base({ slipsVerified: 1, quotaLeft: QUOTA_LOW - 1 }));
    expect(r.risks.some(x => x.includes('เติมก่อน'))).toBe(true);
  });

  it('แพ็กใกล้หมดอายุ / หมดอายุแล้ว', () => {
    const soon = paymentReadiness(base({ slipsVerified: 1, quotaExpiresAt: '2026-08-27T00:00:00Z' }));
    expect(soon.risks.some(x => x.includes('อีก 8 วัน'))).toBe(true);
    const gone = paymentReadiness(base({ slipsVerified: 1, quotaExpiresAt: '2026-08-01T00:00:00Z' }));
    expect(gone.state).toBe('at_risk');
    expect(gone.risks.some(x => x.includes('หมดอายุแล้ว'))).toBe(true);
  });

  it('วันที่พังต้องไม่ throw และต้องไม่แกล้งเตือน', () => {
    const r = paymentReadiness(base({ slipsVerified: 1, quotaExpiresAt: 'ไม่ใช่วันที่' }));
    expect(r.state).toBe('ok');
  });
});
