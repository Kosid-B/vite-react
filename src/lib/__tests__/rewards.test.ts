import { describe, it, expect } from 'vitest';
import { rewardViews, claimableCount, claimReward, REWARDS } from '../rewards';
import { DEFAULT_DATA } from '../../data';
import type { AppData, FinanceEntry } from '../../types';

/* รางวัลเมือง → perk จริง (คูปองส่วนลด/featured/unlock) — ปลดล็อกตามการเงินจริง + รับได้ครั้งเดียว */

// plan free = ไม่มีค่าแพ็ก auto → คุมรายรับ/จ่ายจาก finance ล้วน
const withFinance = (entries: FinanceEntry[], claimed: string[] = []): AppData => ({
  ...DEFAULT_DATA,
  subscription: { ...DEFAULT_DATA.subscription, plan: 'free' },
  finance: entries,
  claimedRewards: claimed,
});
const rev = (amount: number): FinanceEntry =>
  ({ id: 'r1', label: 'ขาย', amount, kind: 'revenue', date: '2026-07-01' });

describe('rewardViews / claimableCount', () => {
  it('มีรายได้ → ปลดล็อก first-revenue + break-even แต่ยังไม่ได้กดรับ', () => {
    const views = rewardViews(withFinance([rev(20000)]));
    const first = views.find(v => v.id === 'first-revenue')!;
    expect(first.isUnlocked).toBe(true);
    expect(first.isClaimed).toBe(false);
    expect(claimableCount(withFinance([rev(20000)]))).toBeGreaterThanOrEqual(2);
  });

  it('ไม่มีรายได้ → ไม่มีรางวัลการเงินปลดล็อก', () => {
    const views = rewardViews(withFinance([]));
    expect(views.find(v => v.id === 'first-revenue')!.isUnlocked).toBe(false);
  });
});

describe('claimReward', () => {
  it('discount (break-even) → ตั้งคูปอง 10% + บันทึกว่ารับแล้ว', () => {
    const next = claimReward(withFinance([rev(20000)]), 'break-even');
    expect(next.coupon?.pct).toBe(10);
    expect(next.claimedRewards).toContain('break-even');
  });

  it('idempotent — รับซ้ำไม่เปลี่ยนอะไร (คืน object เดิม)', () => {
    const claimed = withFinance([rev(20000)], ['break-even']);
    expect(claimReward(claimed, 'break-even')).toBe(claimed);
  });

  it('ยังไม่ปลดล็อก → รับไม่ได้ (คืนเดิม)', () => {
    const d = withFinance([]);   // ไม่มีรายได้
    expect(claimReward(d, 'break-even')).toBe(d);
  });

  it('featured (profit-10k) → เพิ่มวัน featured', () => {
    const next = claimReward(withFinance([rev(15000)]), 'profit-10k');
    expect(next.featuredVoucherDays).toBe((DEFAULT_DATA.featuredVoucherDays ?? 0) + 3);
  });

  it('unlock (first-revenue) → เพิ่มของแต่งเมือง', () => {
    const next = claimReward(withFinance([rev(5000)]), 'first-revenue');
    expect(next.cityUnlocks).toContain('first-revenue');
  });

  it('REWARDS ทุกอันมี id ไม่ซ้ำ', () => {
    const ids = REWARDS.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
