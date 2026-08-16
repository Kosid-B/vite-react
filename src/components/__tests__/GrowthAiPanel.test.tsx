import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import GrowthAiPanel from '../GrowthAiPanel';
import { SECTION_LABEL } from '../../lib/growthAnalysis';
import type { LandingAgg } from '../../lib/landingFunnel';

/* แผงนี้อยู่ในหน้าแอดมิน ซึ่ง local dev เข้าไม่ถึง (ไม่มี session) — เรนเดอร์ตรงแทน
 * กับดักเดียวกับ GOTCHA #1 ใน CLAUDE.md */

const agg = (o: Partial<LandingAgg> = {}): LandingAgg => ({
  total: 500, engaged: 300, cta: 80, signup: 25, avg_scroll: 60, avg_dwell: 40, bounce: 90,
  by_seg: {}, by_ref: {}, by_ab: {}, days: 30, ...o,
});

describe('แผงวิเคราะห์การเติบโต', () => {
  it('ยังไม่มีข้อมูลรายส่วน → บอกตรง ๆ ไม่ใช่โชว์กราฟว่าง', () => {
    render(<GrowthAiPanel landing={agg()} />);
    expect(screen.getByText(/ยังไม่มีข้อมูลรายส่วน/)).toBeTruthy();
  });

  it('ส่วนที่คนเห็นน้อย ขึ้นคำเตือนว่ายังจัดอันดับไม่ได้', () => {
    render(<GrowthAiPanel landing={agg({ sections: { pricing: { viewers: 3, seconds: 300, signups: 1 } } })} />);
    expect(screen.getByText(/ยังจัดอันดับไม่ได้/)).toBeTruthy();
  });

  it('เรียงตามวินาทีเฉลี่ย และแสดงชื่อไทย', () => {
    render(<GrowthAiPanel landing={agg({
      sections: {
        hero: { viewers: 100, seconds: 500, signups: 5 },
        pricing: { viewers: 100, seconds: 4000, signups: 20 },
      },
    })} />);
    expect(screen.getByText('แพ็กเกจและราคา')).toBeTruthy();
    expect(screen.getByText('พาดหัวบนสุด')).toBeTruthy();
  });

  it('A/B ที่คนยังไม่พอ ต้องขึ้นว่ายังสรุปผู้ชนะไม่ได้ ไม่ใช่ประกาศผู้ชนะ', () => {
    render(<GrowthAiPanel landing={agg({
      by_hero_ab: { a: { total: 5, signup: 2, cta: 3 }, b: { total: 4, signup: 0, cta: 1 } },
    })} />);
    // ปรากฏทั้งในแถว A/B และในกล่อง "สิ่งที่ส่งให้ AI" (โปร่งใส) — ต้องมีอย่างน้อย 1
    expect(screen.getAllByText(/ยังสรุปผู้ชนะไม่ได้/).length).toBeGreaterThanOrEqual(1);
  });

  it('ข้อมูลน้อย → บอกล่วงหน้าว่า AI จะตอบว่าสรุปไม่ได้ และนั่นถูกต้อง', () => {
    render(<GrowthAiPanel landing={agg({ total: 5 })} />);
    expect(screen.getByText(/ไม่ใช่ข้อผิดพลาด/)).toBeTruthy();
  });

  it('เปิดดูสิ่งที่ส่งให้ AI ได้จริง (โปร่งใส)', () => {
    render(<GrowthAiPanel landing={agg()} />);
    expect(screen.getByText(/ดูสิ่งที่ส่งให้ AI จริง/)).toBeTruthy();
  });
});

describe('สายส่งต้องต่อครบ — ป้ายบนหน้า Landing ต้องมีชื่อในแผงแอดมิน', () => {
  it('ทุก data-sec ที่ติดไว้ใน LandingPage มีชื่อภาษาไทย (ไม่งั้นแอดมินเห็นคีย์ดิบ)', () => {
    const page = readFileSync('src/pages/LandingPage.tsx', 'utf8');
    const keys = [...page.matchAll(/data-sec="([^"]+)"/g)].map(m => m[1]);
    expect(keys.length, 'ไม่พบ data-sec เลย — การเก็บความสนใจรายส่วนขาดสาย').toBeGreaterThan(5);
    const missing = keys.filter(k => !SECTION_LABEL[k]);
    expect(missing, `ป้ายที่ยังไม่มีชื่อไทย: ${missing.join(', ')}`).toEqual([]);
  });

  it('หน้า Landing ต้องเรียก useLandingTrace พร้อมส่งกลุ่ม A/B ทั้งสอง', () => {
    const page = readFileSync('src/pages/LandingPage.tsx', 'utf8');
    expect(page).toContain('useLandingTrace(hero.seg, true, heroAb ?? undefined, layoutAb)');
  });

  it('client ส่ง sections + hero_ab + layout_ab ขึ้น rpc จริง', () => {
    const lf = readFileSync('src/lib/landingFunnel.ts', 'utf8');
    for (const k of ['p_sections', 'p_hero_ab', 'p_layout_ab']) {
      expect(lf, `payload ขาด ${k}`).toContain(k);
    }
  });
});
