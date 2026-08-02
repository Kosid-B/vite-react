import { describe, it, expect } from 'vitest';
import { kFactor } from '../kFactor';

describe('kFactor — viral growth', () => {
  it('K = i × c ถูกต้อง (100 users, 200 invites, 40 conv)', () => {
    const r = kFactor({ activeUsers: 100, invitesSent: 200, conversions: 40 });
    expect(r.invitesPerUser).toBeCloseTo(2, 5);
    expect(r.conversionRate).toBeCloseTo(0.2, 5);
    expect(r.k).toBeCloseTo(0.4, 5);
    expect(r.regime).toBe('sub-viral');
    expect(r.amplification).toBeCloseTo(1 / 0.6, 3);
  });

  it('K > 1 → viral + amplification Infinity', () => {
    const r = kFactor({ activeUsers: 100, invitesSent: 300, conversions: 120 }); // i=3 c=0.4 K=1.2
    expect(r.k).toBeCloseTo(1.2, 5);
    expect(r.regime).toBe('viral');
    expect(r.amplification).toBe(Infinity);
  });

  it('K = 0 → flat', () => {
    expect(kFactor({ activeUsers: 100, invitesSent: 0, conversions: 0 }).regime).toBe('flat');
    expect(kFactor({ activeUsers: 0, invitesSent: 10, conversions: 5 }).k).toBe(0);
  });

  it('conversions เกิน invites ถูก clamp', () => {
    const r = kFactor({ activeUsers: 10, invitesSent: 5, conversions: 999 });
    expect(r.conversionRate).toBe(1);
    expect(r.k).toBeCloseTo(0.5, 5);
  });

  it('sustainable: K > churn', () => {
    const good = kFactor({ activeUsers: 100, invitesSent: 200, conversions: 40, churnRatePct: 20 }); // K 0.4 > 0.2
    expect(good.sustainable).toBe(true);
    const bad = kFactor({ activeUsers: 100, invitesSent: 100, conversions: 10, churnRatePct: 30 }); // K 0.1 < 0.3
    expect(bad.sustainable).toBe(false);
    expect(bad.notes.some(n => n.includes('retention'))).toBe(true);
  });

  it('netPerCycle = conversions − churn×active', () => {
    const r = kFactor({ activeUsers: 100, invitesSent: 200, conversions: 40, churnRatePct: 10 });
    expect(r.netPerCycle).toBe(40 - 10); // 40 conv - 0.1*100
  });
});
