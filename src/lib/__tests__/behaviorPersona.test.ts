import { describe, it, expect } from 'vitest';
import {
  defaultBehavior, tickVisit, recordSignal, derivePersona, type BehaviorState,
} from '../behaviorPersona';

const T0 = 1_700_000_000_000;

describe('behaviorPersona', () => {
  it('tickVisit: คนใหม่ → visits=1', () => {
    const s = tickVisit(null, T0);
    expect(s.visits).toBe(1);
    expect(s.firstVisitMs).toBe(T0);
  });

  it('tickVisit: กลับมาภายใน 30 นาที = session เดิม (ไม่เพิ่ม visit)', () => {
    const s1 = tickVisit(null, T0);
    const s2 = tickVisit(s1, T0 + 10 * 60_000);
    expect(s2.visits).toBe(1);
    expect(s2.lastVisitMs).toBe(T0 + 10 * 60_000);
  });

  it('tickVisit: กลับมาหลัง 30 นาที = session ใหม่ (visit+1)', () => {
    const s1 = tickVisit(null, T0);
    const s2 = tickVisit(s1, T0 + 31 * 60_000);
    expect(s2.visits).toBe(2);
  });

  it('recordSignal: idempotent — ธงเดิมคืน object เดิม', () => {
    const s = defaultBehavior(T0);
    const a = recordSignal(s, 'usedRoi');
    expect(a.usedRoi).toBe(true);
    const b = recordSignal(a, 'usedRoi');
    expect(b).toBe(a); // reference เดิม = ไม่ write ซ้ำ
  });

  it('newcomer (ครั้งแรก ไม่มีสัญญาณ) → ไม่โชว์แบนเนอร์ (null)', () => {
    expect(derivePersona(defaultBehavior(T0), T0)).toBeNull();
  });

  it('dismissed → null เสมอ (เคารพผู้ใช้)', () => {
    const s: BehaviorState = { ...defaultBehavior(T0), visits: 5, reachedPricing: true, dismissed: true };
    expect(derivePersona(s, T0)).toBeNull();
  });

  it('reachedPricing = considering (intent สูงสุด ชนะ returning)', () => {
    const s: BehaviorState = { ...defaultBehavior(T0), visits: 3, reachedPricing: true };
    expect(derivePersona(s, T0)?.id).toBe('considering');
  });

  it('usedRoi/usedDemand = researcher', () => {
    const roi: BehaviorState = { ...defaultBehavior(T0), usedRoi: true };
    expect(derivePersona(roi, T0)?.id).toBe('researcher');
    const dem: BehaviorState = { ...defaultBehavior(T0), usedDemand: true };
    expect(derivePersona(dem, T0)?.id).toBe('researcher');
  });

  it('กลับมา ≥2 ครั้ง (ไม่มีสัญญาณอื่น) = returning', () => {
    const s: BehaviorState = { ...defaultBehavior(T0), visits: 2 };
    const p = derivePersona(s, T0 + 2 * 86400000);
    expect(p?.id).toBe('returning');
    expect(p?.reason).toContain('2');
  });

  it('ทุก persona มี reason โปร่งใส + ctaLabel', () => {
    const cases: BehaviorState[] = [
      { ...defaultBehavior(T0), reachedPricing: true },
      { ...defaultBehavior(T0), usedRoi: true },
      { ...defaultBehavior(T0), visits: 2 },
    ];
    for (const c of cases) {
      const p = derivePersona(c, T0 + 86400000)!;
      expect(p.reason.length).toBeGreaterThan(0);
      expect(p.ctaLabel.length).toBeGreaterThan(0);
      expect(p.headline.length).toBeGreaterThan(0);
    }
  });
});
