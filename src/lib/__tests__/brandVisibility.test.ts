import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  brandMetrics, brandHealth, metricScore, entityConsistency,
  BRAND_BOTTLENECK_ORDER, BRAND_TARGETS, MAX_BLIND_RATIO,
} from '../brandVisibility';
import { entityProfiles } from '../brandEntity';
import { MIN_FOR_RATE } from '../growthPdca';

const SRC = readFileSync(join(process.cwd(), 'src/lib/brandVisibility.ts'), 'utf8');

/** ค่าที่ทำให้ทุกตัวที่เข้าคะแนน "อ่านได้" — ใช้เป็นฐานของเทสต์ที่ต้องการคะแนนจริง */
const ALL_READ = {
  indexedPages: 30, brandedRank: 1, externalMentions: 5, shareOfSearch: 0.5,
};

describe('brandVisibility — null คือ "ตรวจไม่ได้" ไม่ใช่ 0', () => {
  it('ตัวที่ผู้ช่วยอ่านเองไม่ได้ ต้องเป็น null ไม่ใช่ 0 เมื่อยังไม่มีใครกรอก', () => {
    const owner = brandMetrics().filter((m) => m.readableBy === 'owner-only');
    expect(owner.length).toBeGreaterThan(0);
    for (const m of owner) expect(m.value).toBeNull();
  });

  it('metricScore ของค่าที่อ่านไม่ได้ = null ไม่ใช่ 0 (0 แปลว่า "แย่" ซึ่งเราไม่รู้)', () => {
    for (const m of brandMetrics()) {
      if (m.value === null) expect(metricScore(m)).toBeNull();
    }
  });

  it('ค่า 0 ที่กรอกมาจริง ต่างจากไม่ได้กรอก — 0 ให้คะแนน 0 · ไม่กรอกให้ null', () => {
    const zero = brandMetrics({ externalMentions: 0 }).find((m) => m.key === 'externalMentions')!;
    expect(zero.value).toBe(0);
    expect(metricScore(zero)).toBe(0);
    const none = brandMetrics().find((m) => m.key === 'externalMentions')!;
    expect(none.value).toBeNull();
    expect(metricScore(none)).toBeNull();
  });

  it('ทุกตัวที่อ่านไม่ได้ ต้องบอกวิธีไปเอาค่ามา — ห้ามคืนจุดบอดเปล่า ๆ', () => {
    for (const m of brandHealth().blind) {
      expect(m.howToGet.trim().length).toBeGreaterThan(10);
    }
  });
});

describe('brandVisibility — ห้ามให้คะแนนรวมตอนตาบอดเกินครึ่ง', () => {
  it('ยังไม่มีใครกรอกอะไรเลย ⇒ score = null (ไม่ใช่เลขสวย ๆ ที่คำนวณจากช่องว่าง)', () => {
    const h = brandHealth();
    expect(h.score).toBeNull();
    expect(h.why).toMatch(/ตรวจไม่ได้/);
  });

  it('กรอกครบ ⇒ ให้คะแนนได้', () => {
    const h = brandHealth(ALL_READ);
    expect(h.score).not.toBeNull();
    // ยังไม่ถึง 100 เพราะสัญญาณ entity ของเราเองยังขาด — คะแนนต้องสะท้อนช่องว่างจริง
    const ec = entityConsistency();
    expect(h.score).toBe(Math.round(((ec.value + 4) / 5) * 100));
    expect(h.score).toBeLessThan(100);
  });

  it('เส้นแบ่งคือ MAX_BLIND_RATIO จริง — ตาบอดพอดีครึ่งยังให้คะแนนได้ · เกินครึ่งห้าม', () => {
    const scoredKeys = brandMetrics(ALL_READ).filter((m) => m.target !== null).map((m) => m.key);
    expect(scoredKeys.length).toBe(5);
    // entityConsistency อ่านได้เสมอ ⇒ กรอกเพิ่มอีก 1 ตัว = อ่านได้ 2/5 (ตาบอด 60% > 50%)
    expect(brandHealth({ indexedPages: 30 }).score).toBeNull();
    // อ่านได้ 3/5 ⇒ ตาบอด 40% ≤ 50%
    expect(brandHealth({ indexedPages: 30, brandedRank: 1 }).score).not.toBeNull();
    expect(MAX_BLIND_RATIO).toBe(0.5);
  });
});

describe('brandVisibility — คะแนนต้องมาจากเป้า ไม่ใช่ "มีค่าก็เต็ม"', () => {
  it('จัดทำดัชนี 1 หน้า ต้องไม่ได้คะแนนเท่ากับ 30 หน้า (บั๊กเดิม: min(1, value) ข้ามหน่วย)', () => {
    const few = brandMetrics({ indexedPages: 1 }).find((m) => m.key === 'indexedPages')!;
    const many = brandMetrics({ indexedPages: 30 }).find((m) => m.key === 'indexedPages')!;
    expect(metricScore(few)).toBeLessThan(metricScore(many)!);
    expect(metricScore(few)).toBeCloseTo(1 / 30, 5);
  });

  it('อันดับยิ่งน้อยยิ่งดี — อันดับ 1 เต็ม · อันดับ 10 ได้ 0.1', () => {
    const r1 = brandMetrics({ brandedRank: 1 }).find((m) => m.key === 'brandedRank')!;
    const r10 = brandMetrics({ brandedRank: 10 }).find((m) => m.key === 'brandedRank')!;
    expect(metricScore(r1)).toBe(1);
    expect(metricScore(r10)).toBeCloseTo(0.1, 5);
  });

  it('ตัวที่ไม่มีเป้า = ตัวประกอบบริบท ห้ามเข้าคะแนน (ผู้ติดตามเยอะ ≠ ถูกจำถูกตัว)', () => {
    const ctx = brandMetrics({ facebookFollowers: 99999, youtubeSubscribers: 99999 })
      .filter((m) => m.target === null);
    expect(ctx.map((m) => m.key)).toContain('facebookFollowers');
    for (const m of ctx) expect(metricScore(m)).toBeNull();
    // เติมผู้ติดตามเยอะ ๆ แล้วคะแนนต้องไม่ขยับ
    expect(brandHealth({ ...ALL_READ, facebookFollowers: 99999 }).score)
      .toBe(brandHealth(ALL_READ).score);
  });

  it('ทุกเกณฑ์ต้องติดป้าย policy/hypothesis — 🔴 ห้ามมีตัวไหนเป็น validated', () => {
    for (const m of brandMetrics()) {
      if (m.target === null) { expect(m.thresholdStatus).toBeNull(); continue; }
      expect(m.thresholdStatus).not.toBeNull();
      expect(['policy', 'hypothesis']).toContain(m.thresholdStatus);
    }
    for (const t of Object.values(BRAND_TARGETS)) {
      expect(t.status).not.toBe('validated');
    }
  });
});

describe('brandVisibility — คอขวดต้องเรียงตามลำดับ ห้ามข้ามขั้น', () => {
  it('ทุกคีย์ในลำดับคอขวดต้องมีตัวชี้วัดจริงรองรับ และเป็นตัวที่เข้าคะแนน', () => {
    const scored = new Map(brandMetrics().filter((m) => m.target !== null).map((m) => [m.key, m]));
    for (const k of BRAND_BOTTLENECK_ORDER) expect(scored.has(k)).toBe(true);
    expect(BRAND_BOTTLENECK_ORDER.length).toBe(scored.size);
  });

  it('สัญญาณของเราเองยังไม่ครบ ⇒ คอขวดคือ entityConsistency เสมอ (แม้ตัวอื่นจะสวย)', () => {
    expect(entityConsistency().missing).toBeGreaterThan(0); // สถานะจริงวันนี้: ยังขาด URL
    const h = brandHealth(ALL_READ);
    expect(h.bottleneck).toBe('entityConsistency');
    expect(h.nextAction).toMatch(/ห้ามเดา URL/);
  });

  it('คอขวดขยับไปข้างหน้าได้ก็ต่อเมื่อขั้นก่อนหน้าเต็มแล้ว', () => {
    // ยังไม่กรอกอะไร: entity ยังไม่ครบ ⇒ ค้างที่ขั้นแรก
    expect(brandHealth().bottleneck).toBe('entityConsistency');
    // ขั้นแรกไม่ครบ ⇒ ห้ามรายงานว่าคอขวดอยู่ที่ indexedPages แม้ indexedPages จะเป็น null
    expect(brandHealth().bottleneck).not.toBe('indexedPages');
  });

  it('nextAction ต้องไม่ว่างเปล่าไม่ว่ากรณีไหน', () => {
    for (const inp of [{}, ALL_READ, { indexedPages: 0 }, { brandedRank: 99 }]) {
      expect(brandHealth(inp).nextAction.trim().length).toBeGreaterThan(10);
    }
  });
});

describe('brandVisibility — ผูกกับแหล่งจริง ห้ามเขียนค่าซ้ำ', () => {
  it('ใช้ MIN_FOR_RATE ตัวเดียวกับ growthPdca — ห้ามประกาศเลขใหม่', () => {
    expect(SRC).toMatch(/import\s*\{\s*MIN_FOR_RATE\s*\}\s*from\s*'\.\/growthPdca'/);
    const rate = brandMetrics().filter((m) => m.minSample !== null);
    expect(rate.length).toBeGreaterThan(0);
    for (const m of rate) expect(m.minSample).toBe(MIN_FOR_RATE);
  });

  it('entityConsistency คำนวณจาก entityProfiles จริง — ห้ามเขียนจำนวนช่องทางตายตัว', () => {
    const req = entityProfiles().filter((p) => p.required);
    const ec = entityConsistency();
    expect(ec.total).toBe(req.length);
    expect(ec.missing).toBe(req.filter((p) => !p.url).length);
    // ถ้าเผลอ hardcode ไว้ เพิ่มช่องทางใหม่แล้วคะแนนจะโกหกทันที
    expect(SRC).toMatch(/entityProfiles\(\)\.filter/);
  });

  it('ไม่แตะ schema/ฐานข้อมูล — ไฟล์นี้ pure (ด่านปล่อยของยังกั้น migration อยู่)', () => {
    expect(SRC).not.toMatch(/supabase|from\s*\(|\.rpc\(/);
  });
});
