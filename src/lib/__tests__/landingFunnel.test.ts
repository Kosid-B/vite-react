import { describe, it, expect } from 'vitest';
import {
  refKind, landingFunnelSteps, biggestLeak, dwellLabel,
  funnelCaveats, funnelTrustworthy, MIN_SAMPLE, type LandingAgg,
} from '../landingFunnel';

const ORIGIN = 'https://ceoaithailand.org';

describe('refKind', () => {
  it('ไม่มี referrer = direct', () => {
    expect(refKind('', ORIGIN)).toBe('direct');
    expect(refKind('   ', ORIGIN)).toBe('direct');
  });
  it('โซเชียลจำแนกถูก', () => {
    expect(refKind('https://l.facebook.com/l.php?u=x', ORIGIN)).toBe('social');
    expect(refKind('https://www.tiktok.com/@x', ORIGIN)).toBe('social');
    expect(refKind('https://lm.instagram.com/', ORIGIN)).toBe('social');
    expect(refKind('https://line.me/', ORIGIN)).toBe('social');
  });
  it('เสิร์ชจำแนกถูก', () => {
    expect(refKind('https://www.google.com/search?q=x', ORIGIN)).toBe('search');
    expect(refKind('https://www.bing.com/', ORIGIN)).toBe('search');
  });
  it('ลิงก์ภายในเว็บเดียวกัน = direct', () => {
    expect(refKind('https://ceoaithailand.org/b/shop', ORIGIN)).toBe('direct');
    expect(refKind('https://www.ceoaithailand.org/start', ORIGIN)).toBe('direct');
  });
  it('เว็บอื่น = other', () => {
    expect(refKind('https://some-blog.example/post', ORIGIN)).toBe('other');
  });
  it('referrer พัง = other (ไม่ throw)', () => {
    expect(refKind('not a url', ORIGIN)).toBe('other');
  });
});

const AGG = (o: Partial<LandingAgg>): LandingAgg => ({
  total: 0, engaged: 0, cta: 0, signup: 0, avg_scroll: 0, avg_dwell: 0, bounce: 0, by_seg: {}, by_ref: {}, by_ab: {}, ...o,
});

describe('landingFunnelSteps', () => {
  it('agg ว่าง → 4 ขั้น ทุกอย่าง 0 ไม่ NaN', () => {
    const s = landingFunnelSteps(null);
    expect(s).toHaveLength(4);
    expect(s.every((x) => x.pct === 0 && x.dropFromPrev === 0)).toBe(true);
  });
  it('คำนวณ % + drop-off ถูก', () => {
    const s = landingFunnelSteps(AGG({ total: 100, engaged: 60, cta: 12, signup: 3 }));
    expect(s[0]).toMatchObject({ key: 'view', count: 100, pct: 100 });
    expect(s[1]).toMatchObject({ key: 'engaged', count: 60, pct: 60, dropFromPrev: 40 });
    expect(s[2]).toMatchObject({ key: 'cta', count: 12, pct: 12, dropFromPrev: 80 }); // หลุด 48/60 = 80%
    expect(s[3]).toMatchObject({ key: 'signup', count: 3, pct: 3, dropFromPrev: 75 });  // หลุด 9/12 = 75%
  });
});

describe('biggestLeak', () => {
  it('ชี้ขั้นที่หลุดมากสุด', () => {
    const s = landingFunnelSteps(AGG({ total: 100, engaged: 60, cta: 12, signup: 3 }));
    const leak = biggestLeak(s);
    expect(leak?.dropPct).toBe(80);
    expect(leak?.from).toContain('เลื่อนผ่าน hero');
  });
  it('ไม่มีการหลุด (ทุกคนผ่านหมด) → null', () => {
    const s = landingFunnelSteps(AGG({ total: 10, engaged: 10, cta: 10, signup: 10 }));
    expect(biggestLeak(s)).toBeNull();
  });
  it('ส่ง agg มาด้วยแล้วข้อมูลเชื่อไม่ได้ → null (ไม่ชี้จุดแก้จากสัญญาณรบกวน)', () => {
    const agg = AGG({ total: 60, engaged: 1, cta: 4, signup: 1 }); // เคสจริง 15 ส.ค. 2569
    expect(biggestLeak(landingFunnelSteps(agg), agg)).toBeNull();
  });
  it('ข้อมูลเชื่อได้ → ยังชี้จุดแก้ตามปกติ', () => {
    const agg = AGG({ total: 400, engaged: 240, cta: 48, signup: 12, avg_scroll: 45, avg_dwell: 30 });
    expect(biggestLeak(landingFunnelSteps(agg), agg)?.dropPct).toBe(80);
  });
});

describe('funnelCaveats — กันเอาตัวเลขที่เชื่อไม่ได้ไปตัดสินใจ', () => {
  it('ยังไม่มีผู้เข้าชม → ไม่ต้องเตือนอะไร', () => {
    expect(funnelCaveats(AGG({ total: 0 }), landingFunnelSteps(null))).toEqual([]);
  });

  it(`ผู้เข้าชมน้อยกว่า ${MIN_SAMPLE} → blocker`, () => {
    const agg = AGG({ total: MIN_SAMPLE - 1, engaged: 40, cta: 10, signup: 2, avg_scroll: 40, avg_dwell: 30 });
    const c = funnelCaveats(agg, landingFunnelSteps(agg));
    expect(c.filter((x) => x.level === 'blocker')).toHaveLength(1);
    expect(c[0].text).toContain(String(MIN_SAMPLE - 1));
    expect(funnelTrustworthy(agg, landingFunnelSteps(agg))).toBe(false);
  });

  it(`ผู้เข้าชมถึง ${MIN_SAMPLE} และกรวยเรียงปกติ → ไม่มี blocker`, () => {
    const agg = AGG({ total: MIN_SAMPLE, engaged: 50, cta: 12, signup: 3, avg_scroll: 40, avg_dwell: 30 });
    expect(funnelCaveats(agg, landingFunnelSteps(agg))).toEqual([]);
    expect(funnelTrustworthy(agg, landingFunnelSteps(agg))).toBe(true);
  });

  it('ขั้นหลังมากกว่าขั้นก่อน (CTA > เลื่อนผ่าน hero) → blocker เพราะไม่ใช่กรวยจริง', () => {
    const agg = AGG({ total: 500, engaged: 10, cta: 40, signup: 5, avg_scroll: 30, avg_dwell: 25 });
    const c = funnelCaveats(agg, landingFunnelSteps(agg));
    const blockers = c.filter((x) => x.level === 'blocker');
    expect(blockers).toHaveLength(1);
    expect(blockers[0].text).toContain('ไม่ได้เรียงต่อกันจริง');
    expect(funnelTrustworthy(agg, landingFunnelSteps(agg))).toBe(false);
  });

  it('เลื่อนน้อยมากแต่อยู่นาน = ลายนิ้วมือบอท → warn (ยังใช้ตัวเลขต่อได้)', () => {
    const agg = AGG({ total: 500, engaged: 100, cta: 20, signup: 4, avg_scroll: 2, avg_dwell: 41 });
    const c = funnelCaveats(agg, landingFunnelSteps(agg));
    expect(c).toHaveLength(1);
    expect(c[0].level).toBe('warn');
    expect(funnelTrustworthy(agg, landingFunnelSteps(agg))).toBe(true);
  });

  it('เคสจริง 15 ส.ค. 2569 (60 คน · CTA 4 > engaged 1) → เตือนทั้งกลุ่มเล็กและกรวยกลับด้าน', () => {
    const agg = AGG({ total: 60, engaged: 1, cta: 4, signup: 1, avg_scroll: 3, avg_dwell: 41 });
    const c = funnelCaveats(agg, landingFunnelSteps(agg));
    expect(c.filter((x) => x.level === 'blocker').length).toBeGreaterThanOrEqual(2);
    expect(c.some((x) => x.level === 'warn')).toBe(true);
    expect(funnelTrustworthy(agg, landingFunnelSteps(agg))).toBe(false);
  });
});

describe('dwellLabel', () => {
  it('< 60 วิ', () => { expect(dwellLabel(8)).toBe('8 วิ'); expect(dwellLabel(0)).toBe('0 วิ'); });
  it('≥ 60 วิ', () => { expect(dwellLabel(85)).toBe('1 น 25 วิ'); expect(dwellLabel(120)).toBe('2 น'); });
  it('กันค่าเพี้ยน', () => { expect(dwellLabel(-5)).toBe('0 วิ'); });
});
