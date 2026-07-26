import { describe, it, expect, afterEach } from 'vitest';
import type { AppData, PlanId, SubStatus } from '../../types';
import { canAccess, effectiveRank, isExpired, planLabel, setAdminFullAccess } from '../access';

// สร้าง AppData จำลองที่มีแค่ subscription (canAccess/effectiveRank อ่านเฉพาะส่วนนี้)
function withSub(plan: PlanId, status: SubStatus, opts: { trialEndDate?: string; currentPeriodEnd?: string } = {}): AppData {
  return {
    subscription: {
      plan, status,
      trialEndDate: opts.trialEndDate ?? null,
      currentPeriodEnd: opts.currentPeriodEnd ?? null,
      promptpayId: '', autoRenew: true, invoices: [],
    },
  } as unknown as AppData;
}

const future = '2999-01-01';
const past = '2000-01-01';

afterEach(() => setAdminFullAccess(false)); // reset module-level admin state

describe('access control — เมทริกซ์แพ็กเกจ x หน้า', () => {
  it('trial ที่ยังไม่หมดอายุ = ปลดล็อกทุกฟีเจอร์ (rank = scale)', () => {
    const d = withSub('free', 'trial', { trialEndDate: future });
    expect(effectiveRank(d)).toBe(3); // scale
    expect(canAccess(d, 'analytics')).toBe(true); // growth-gated
    expect(canAccess(d, 'admin')).toBe(true);     // scale-gated
    expect(canAccess(d, 'trade')).toBe(true);     // starter-gated
    expect(isExpired(d)).toBe(false);
  });

  it('trial ที่หมดอายุแล้ว = ล็อกหมด (rank = -1)', () => {
    const d = withSub('free', 'trial', { trialEndDate: past });
    expect(effectiveRank(d)).toBe(-1);
    expect(canAccess(d, 'dashboard')).toBe(false);
    expect(canAccess(d, 'analytics')).toBe(false);
    expect(isExpired(d)).toBe(true);
  });

  it('active growth = เข้าหน้า growth ได้ แต่ scale (admin) ไม่ได้', () => {
    const d = withSub('growth', 'active', { currentPeriodEnd: future });
    expect(effectiveRank(d)).toBe(2);
    expect(canAccess(d, 'analytics')).toBe(true);
    expect(canAccess(d, 'market')).toBe(true);
    expect(canAccess(d, 'admin')).toBe(false);
  });

  it('active starter = เข้า trade ได้ แต่ growth ไม่ได้', () => {
    const d = withSub('starter', 'active', { currentPeriodEnd: future });
    expect(canAccess(d, 'trade')).toBe(true);
    expect(canAccess(d, 'analytics')).toBe(false);
  });

  it('active scale = เข้าได้ทุกหน้า', () => {
    const d = withSub('scale', 'active', { currentPeriodEnd: future });
    expect(canAccess(d, 'admin')).toBe(true);
    expect(canAccess(d, 'analytics')).toBe(true);
    expect(canAccess(d, 'trade')).toBe(true);
  });

  it('active ที่หมดรอบชำระ = ล็อก (rank = -1) + isExpired', () => {
    const d = withSub('growth', 'active', { currentPeriodEnd: past });
    expect(effectiveRank(d)).toBe(-1);
    expect(isExpired(d)).toBe(true);
  });

  it('active หมดรอบแต่ยังอยู่ใน grace (2 วัน) = ใช้งานต่อได้ (ผ่อนผัน)', () => {
    const recent = new Date(Date.now() - 2 * 86400000).toISOString(); // 2 วันก่อน < grace 7 วัน
    const d = withSub('growth', 'active', { currentPeriodEnd: recent });
    expect(effectiveRank(d)).toBe(2);          // ยังคงสิทธิ์ growth
    expect(canAccess(d, 'analytics')).toBe(true);
    expect(isExpired(d)).toBe(false);          // ยังไม่นับหมดอายุระหว่างผ่อนผัน
  });

  it('past_due ภายใน grace = ใช้งานแพ็กเดิมต่อได้ (เตือน + ผ่อนผัน)', () => {
    const recent = new Date(Date.now() - 3 * 86400000).toISOString(); // 3 วันก่อน < grace 7 วัน
    const d = withSub('growth', 'past_due', { currentPeriodEnd: recent });
    expect(effectiveRank(d)).toBe(2);
    expect(canAccess(d, 'analytics')).toBe(true);
    expect(isExpired(d)).toBe(false);
  });

  it('past_due พ้น grace (10 วัน) = ตัดสิทธิ์ (rank = -1) + isExpired', () => {
    const old = new Date(Date.now() - 10 * 86400000).toISOString(); // 10 วันก่อน > grace 7 วัน
    const d = withSub('growth', 'past_due', { currentPeriodEnd: old });
    expect(effectiveRank(d)).toBe(-1);
    expect(canAccess(d, 'dashboard')).toBe(false);
    expect(isExpired(d)).toBe(true);
  });

  it('setAdminFullAccess(true) = Scale ฟรีเสมอ ไม่ว่า plan อะไร', () => {
    const d = withSub('free', 'none');
    setAdminFullAccess(true);
    expect(effectiveRank(d)).toBe(3);
    expect(canAccess(d, 'admin')).toBe(true);
    expect(isExpired(d)).toBe(false);
    expect(planLabel(d)).toContain('แอดมิน');
  });

  it('planLabel ของ trial แสดงจำนวนวันคงเหลือ', () => {
    const d = withSub('free', 'trial', { trialEndDate: future });
    expect(planLabel(d)).toMatch(/ทดลอง/);
  });
});
