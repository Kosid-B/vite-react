import { describe, it, expect } from 'vitest';
import {
  growthPdca, bottleneckOf, shippedPieces, MIN_FOR_RATE, REACH_FLOOR_PER_WEEK,
  type Tracker, type GrowthPdcaInput,
} from '../growthPdca';
import type { LandingAgg } from '../landingFunnel';

const agg = (o: Partial<LandingAgg>): LandingAgg => ({
  total: 0, engaged: 0, cta: 0, signup: 0, avg_scroll: 0, avg_dwell: 0, bounce: 0,
  by_seg: {}, by_ref: {}, by_ab: {}, ...o,
});

const live: Tracker[] = [{ id: 'funnel', label: 'landing_funnel', wired: true, receiving: true }];

const base = (o: Partial<GrowthPdcaInput> = {}): GrowthPdcaInput => ({
  agg: agg({ total: 0 }), trackers: live, planned: 4, windowDays: 7,
  now: '2026-08-19T07:00:00Z', ...o,
});

describe('shippedPieces — หลักฐานของ Do คือคนเข้าจริง ไม่ใช่คำว่า "โพสต์แล้ว"', () => {
  it('นับเฉพาะแคมเปญที่มีคนเข้าจริง', () => {
    expect(shippedPieces(agg({ by_campaign: {
      pricing: { total: 3, cta: 1, signup: 0 },
      palm: { total: 0, cta: 0, signup: 0 },
    } }))).toBe(1);
  });
  it('ไม่มีข้อมูล = 0 ไม่ throw', () => {
    expect(shippedPieces(null)).toBe(0);
    expect(shippedPieces(agg({}))).toBe(0);
  });
});

describe('bottleneckOf — ห้ามฟันธงตอนคนยังน้อย', () => {
  it('คนต่อสัปดาห์ต่ำกว่าพื้น = คอขวดคือ "ไม่มีคนมา" เสมอ', () => {
    expect(bottleneckOf(agg({ total: 70, cta: 0 }), REACH_FLOOR_PER_WEEK - 1)).toBe('reach');
  });
  it('คนถึงพื้นแล้วแต่ยังไม่ถึงเกณฑ์อ่านอัตราส่วน = unknown (ไม่ใช่ landing)', () => {
    expect(bottleneckOf(agg({ total: MIN_FOR_RATE - 1, cta: 0 }), 500)).toBe('unknown');
  });
  it('คนพอ + กด CTA น้อยกว่า 10% = คอขวดที่หน้าแรก', () => {
    expect(bottleneckOf(agg({ total: 200, cta: 10, signup: 5 }), 500)).toBe('landing');
  });
  it('กด CTA เยอะแต่สมัครต่อน้อย = คอขวดที่ขั้นสมัคร', () => {
    expect(bottleneckOf(agg({ total: 200, cta: 60, signup: 3 }), 500)).toBe('signup');
  });
});

describe('growthPdca — วงจรค้างที่เฟสแรกที่ยังไม่ผ่าน', () => {
  it('ไม่ได้วางแผน = ค้างที่ Plan (ไม่ใช่ไปโทษว่าคนน้อย)', () => {
    const s = growthPdca(base({ planned: 0 }));
    expect(s.stuckAt).toBe('plan');
    expect(s.canAct).toBe(false);
  });

  it('วางแผนแล้วแต่ยังไม่มีใครเข้ามาจากชิ้นงานเลย = ค้างที่ Do', () => {
    const s = growthPdca(base({ agg: agg({ total: 70, cta: 5, signup: 2 }) }));
    expect(s.stuckAt).toBe('do');
    expect(s.nextAction).toContain('?s=');
  });

  it('🔴 เครื่องมือวัดตายอยู่ = ค้างที่ Check แม้ข้อมูลจะดูเยอะ — และ Act ต้องถูกล็อก', () => {
    const s = growthPdca(base({
      agg: agg({ total: 5000, cta: 900, signup: 300, by_campaign: { pricing: { total: 5000, cta: 900, signup: 300 } } }),
      trackers: [
        { id: 'funnel', label: 'landing_funnel', wired: true, receiving: true },
        { id: 'amp', label: 'Amplitude', wired: false, receiving: false, fix: 'ตั้ง VITE_AMPLITUDE_KEY ใน GitHub Secrets' },
      ],
    }));
    expect(s.stuckAt).toBe('check');
    expect(s.canAct).toBe(false);
    expect(s.nextAction).toContain('VITE_AMPLITUDE_KEY');
    expect(s.blindSpots.some(b => b.startsWith('🔴') && b.includes('Amplitude'))).toBe(true);
  });

  it('🟡 เครื่องมือที่ "ตรวจจากในแอปไม่ได้" = จุดบอด แต่ไม่บล็อกวงจร', () => {
    const s = growthPdca(base({
      agg: agg({ total: 300, cta: 40, signup: 12, by_campaign: { pricing: { total: 300, cta: 40, signup: 12 } } }),
      trackers: [
        { id: 'funnel', label: 'landing_funnel', wired: true, receiving: true },
        { id: 'amp', label: 'Amplitude', wired: true, receiving: null },
      ],
    }));
    expect(s.stuckAt).toBeNull();
    expect(s.canAct).toBe(true);
    expect(s.blindSpots.some(b => b.startsWith('🟡'))).toBe(true);
  });

  it('คนน้อยเกินอ่านอัตราส่วน = Check ยัง thin → ห้าม Act', () => {
    const s = growthPdca(base({
      agg: agg({ total: 70, cta: 5, signup: 2, by_campaign: { pricing: { total: 70, cta: 5, signup: 2 } } }),
    }));
    expect(s.stuckAt).toBe('check');
    expect(s.phases.check.state).toBe('thin');
    expect(s.canAct).toBe(false);
    expect(s.phases.check.evidence).toContain('70');
  });

  it('ไม่มีคนเข้าเลยหลายวัน = Do หยุด ไม่ใช่ "กำลังรอผล"', () => {
    const s = growthPdca(base({
      agg: agg({ total: 70, cta: 5, by_campaign: { pricing: { total: 70, cta: 5, signup: 0 } } }),
      lastVisitAt: '2026-08-10T00:00:00Z',
    }));
    expect(s.stuckAt).toBe('do');
    expect(s.phases.do.state).toBe('thin');
    expect(s.nextAction).toContain('ปล่อยชิ้นถัดไป');
  });

  it('ครบวงจร → Act ต้องตรงกับคอขวด ไม่ใช่คำแนะนำทั่วไป', () => {
    const s = growthPdca(base({
      agg: agg({ total: 300, cta: 15, signup: 4, by_campaign: { pricing: { total: 300, cta: 15, signup: 4 } } }),
      windowDays: 7,
    }));
    expect(s.stuckAt).toBeNull();
    expect(s.bottleneck).toBe('landing');
    expect(s.nextAction).toContain('พาดหัว');
  });

  it('ทุกคนไม่มี utm = จุดบอดที่ต้องพูดออกมา', () => {
    const s = growthPdca(base({ agg: agg({ total: 70, cta: 5 }) }));
    expect(s.blindSpots.some(b => b.includes('utm'))).toBe(true);
  });

  it('ข้อมูลว่าง/พัง ต้องไม่ throw และต้องไม่แกล้งตอบ', () => {
    for (const a of [null, agg({})]) {
      const s = growthPdca(base({ agg: a }));
      expect(s.canAct).toBe(false);
      expect(s.headline.length).toBeGreaterThan(0);
    }
  });

  it('normalize คนต่อสัปดาห์จากช่วงเวลาจริง (30 วัน 300 คน = 70 คน/สัปดาห์)', () => {
    const s = growthPdca(base({ agg: agg({ total: 300 }), windowDays: 30 }));
    expect(s.visitorsPerWeek).toBe(70);
  });
});
