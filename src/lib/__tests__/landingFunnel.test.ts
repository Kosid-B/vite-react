import { describe, it, expect } from 'vitest';
import {
  refKind, landingFunnelSteps, biggestLeak, dwellLabel, type LandingAgg,
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
  total: 0, engaged: 0, cta: 0, signup: 0, avg_scroll: 0, avg_dwell: 0, bounce: 0, by_seg: {}, by_ref: {}, ...o,
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
});

describe('dwellLabel', () => {
  it('< 60 วิ', () => { expect(dwellLabel(8)).toBe('8 วิ'); expect(dwellLabel(0)).toBe('0 วิ'); });
  it('≥ 60 วิ', () => { expect(dwellLabel(85)).toBe('1 น 25 วิ'); expect(dwellLabel(120)).toBe('2 น'); });
  it('กันค่าเพี้ยน', () => { expect(dwellLabel(-5)).toBe('0 วิ'); });
});
