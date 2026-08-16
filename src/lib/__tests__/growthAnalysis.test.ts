import { describe, it, expect } from 'vitest';
import {
  sectionStats, sectionsTrustworthy, sectionLabel, MIN_SECTION_VIEWERS,
  abResult, MIN_ARM, buildGrowthBrief, growthPrompt,
} from '../growthAnalysis';
import { MIN_SAMPLE, type LandingAgg } from '../landingFunnel';

const agg = (over: Partial<LandingAgg> = {}): LandingAgg => ({
  total: 500, engaged: 300, cta: 80, signup: 25, avg_scroll: 62, avg_dwell: 41, bounce: 90,
  by_seg: {}, by_ref: {}, by_ab: {}, days: 30, ...over,
});

describe('ความสนใจรายส่วน — เรียงตามเวลาที่หยุดดูจริง ไม่ใช่จำนวนคนเห็น', () => {
  it('คำนวณวินาทีเฉลี่ยต่อคน และเรียงจากสนใจมากสุด', () => {
    const s = sectionStats({
      hero: { viewers: 100, seconds: 500, signups: 5 },      // 5 วิ/คน
      pricing: { viewers: 40, seconds: 1600, signups: 12 },  // 40 วิ/คน ← สนใจกว่า แม้คนเห็นน้อยกว่า
    });
    expect(s[0].key).toBe('pricing');
    expect(s[0].avgSeconds).toBe(40);
    expect(s[1].avgSeconds).toBe(5);
  });

  it('ไม่มีคนดู → ไม่หารด้วยศูนย์', () => {
    expect(sectionStats({ hero: { viewers: 0, seconds: 0 } })[0].avgSeconds).toBe(0);
  });

  it('ส่วนที่คนเห็นน้อยเกิน = ยังจัดอันดับไม่ได้', () => {
    expect(sectionsTrustworthy(sectionStats({ a: { viewers: MIN_SECTION_VIEWERS - 1, seconds: 100 } }))).toBe(false);
    expect(sectionsTrustworthy(sectionStats({ a: { viewers: MIN_SECTION_VIEWERS, seconds: 100 } }))).toBe(true);
    expect(sectionsTrustworthy([])).toBe(false);
  });

  it('มีชื่อภาษาไทยให้ทุกส่วนที่หน้า Landing ติดป้ายไว้', () => {
    for (const k of ['hero', 'quickcheck', 'roadmap', 'why_not_chatgpt', 'try_ai', 'pricing']) {
      expect(sectionLabel(k), k).not.toBe(k);
    }
    expect(sectionLabel('ไม่รู้จัก')).toBe('ไม่รู้จัก');  // fallback ไม่พัง
  });
});

describe('ผล A/B — ต้องปฏิเสธการสรุปเมื่อคนยังไม่พอ', () => {
  it('กลุ่มเดียว = เทียบไม่ได้', () => {
    expect(abResult('x', 'X', { a: { total: 999, signup: 50 } }).ready).toBe(false);
  });

  it('กลุ่มเล็กเกิน = ไม่พร้อม และบอกว่าต้องการอีกเท่าไร', () => {
    const r = abResult('x', 'X', { a: { total: 100, signup: 10 }, b: { total: MIN_ARM - 1, signup: 2 } });
    expect(r.ready).toBe(false);
    expect(r.note).toContain(`${MIN_ARM}`);
  });

  it('คนพอแต่ยังไม่มีใครสมัครเลย = ยังวัดผลปลายทางไม่ได้', () => {
    const r = abResult('x', 'X', { a: { total: 200, signup: 0 }, b: { total: 200, signup: 0 } });
    expect(r.ready).toBe(false);
    expect(r.note).toContain('ยังไม่มีใครสมัคร');
  });

  it('พร้อมแล้วคำนวณ % ถูก', () => {
    const r = abResult('x', 'X', { a: { total: 200, signup: 10 }, b: { total: 100, signup: 3 } });
    expect(r.ready).toBe(true);
    expect(r.arms[0].signupPct).toBe(5);
    expect(r.arms[1].signupPct).toBe(3);
  });

  it('ข้ามกลุ่ม unknown (คนที่เข้ามาก่อนเริ่มทดลอง)', () => {
    const r = abResult('x', 'X', { a: { total: 50, signup: 5 }, b: { total: 50, signup: 4 }, unknown: { total: 900, signup: 1 } });
    expect(r.arms.map(a => a.variant)).toEqual(['a', 'b']);
  });
});

describe('บทสรุปที่ส่งให้ AI — ต้องบอกด้วยว่าห้ามสรุปอะไร', () => {
  it('คนน้อยกว่าเกณฑ์ → ติดธงห้ามสรุป และ enough=false', () => {
    const b = buildGrowthBrief(agg({ total: MIN_SAMPLE - 1 }), [], []);
    expect(b.enough).toBe(false);
    expect(b.cannotConclude.join(' ')).toContain('ห้ามสรุป');
  });

  it('ส่วนที่คนเห็นน้อย ถูกใส่ในรายการห้ามสรุป ไม่ใช่เอาไปจัดอันดับ', () => {
    const s = sectionStats({ pricing: { viewers: 3, seconds: 300 } });
    const b = buildGrowthBrief(agg(), s, []);
    expect(b.facts.join(' ')).not.toContain('ราคา');
    expect(b.cannotConclude.join(' ')).toContain('ราคา');
  });

  it('A/B ที่ยังไม่พร้อม → ห้ามบอกว่าใครชนะ', () => {
    const ab = abResult('hero', 'พาดหัว', { a: { total: 5, signup: 1 }, b: { total: 4, signup: 0 } });
    const b = buildGrowthBrief(agg(), [], [ab]);
    expect(b.cannotConclude.join(' ')).toContain('ห้ามบอกว่ากลุ่มไหนชนะ');
  });

  it('พรอมป์ตมีข้อห้ามครบ และไม่ขัดหลักการโปรเจกต์', () => {
    const p = growthPrompt(buildGrowthBrief(agg(), [], []));
    expect(p).toContain('ห้ามสร้างตัวเลขใหม่');
    expect(p).toContain('ค่าเฉลี่ยอุตสาหกรรม');
    expect(p).toContain('ทำได้ตั้งแต่ปีแรก');   // iso-from-day-one
    expect(p).toContain('dark pattern');
    expect(p).toContain('ยังสรุปไม่ได้ เพราะขาด');
  });

  it('พรอมป์ตส่งเฉพาะตัวเลขรวม — ไม่มี session id หรือข้อมูลรายคน', () => {
    const p = growthPrompt(buildGrowthBrief(agg(), sectionStats({ hero: { viewers: 80, seconds: 400 } }), []));
    expect(p).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);  // ไม่มี uuid
    expect(p.toLowerCase()).not.toContain('session');
  });
});
