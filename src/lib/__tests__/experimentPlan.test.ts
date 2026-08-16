import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  EXPERIMENT_PLAN, planEntry, frozenVariantOf, reachableAudience,
  planIssues, planSummary, MIN_PER_ARM,
} from '../experimentPlan';
import type { LandingAgg } from '../landingFunnel';

/* ตัวเลขจริงจาก production 16 ส.ค. 2569 — ใช้เป็นเคสหลัก ไม่ใช่ตัวเลขสมมติ */
const REAL: LandingAgg = {
  total: 60, engaged: 1, cta: 4, signup: 1, avg_scroll: 12, avg_dwell: 9, bounce: 50,
  by_seg: {}, by_ref: {}, by_ab: {}, days: 30,
};

describe('แผนการทดลอง — ต้องสะท้อนว่ามีคนเห็นจริงกี่คน', () => {
  it('ของใต้ครึ่งหน้า นับจากคนที่เลื่อนถึง ไม่ใช่ผู้เข้าชมทั้งหมด (จุดที่เคยหลอกตา)', () => {
    expect(reachableAudience(REAL, 'above_fold')).toBe(60);
    expect(reachableAudience(REAL, 'below_fold')).toBe(1);
    expect(reachableAudience(null, 'above_fold')).toBe(0);
  });

  it('รันชุดเดียว และเป็นชุดที่ทุกคนเห็น', () => {
    const running = EXPERIMENT_PLAN.filter(e => e.status === 'running');
    expect(running).toHaveLength(1);
    expect(running[0].placement).toBe('above_fold');
  });

  it('ทุกชุดที่หยุด ต้องมีค่าตั้งต้น + เหตุผล (กันหยุดแล้วลืม)', () => {
    for (const e of EXPERIMENT_PLAN.filter(x => x.status === 'frozen')) {
      expect(e.frozenVariant, e.id).toBeTruthy();
      expect(e.reason.length, e.id).toBeGreaterThan(30);
    }
  });

  it('frozenVariantOf คืนค่าคงที่เมื่อหยุด และ null เมื่อยังรัน', () => {
    expect(frozenVariantOf('layout')).toBe('explain_first');
    expect(frozenVariantOf('new_sections_v1')).toBe('show');
    expect(frozenVariantOf('hero')).toBeNull();
    expect(frozenVariantOf('ไม่มีชุดนี้')).toBeNull();
  });

  it('ค่าตั้งต้นที่หยุดไว้ ต้องเป็น variant ที่มีอยู่จริงในโค้ด', () => {
    const layout = readFileSync('src/lib/landingLayoutExperiment.ts', 'utf8');
    const ab = readFileSync('src/lib/landingAb.ts', 'utf8');
    expect(layout, 'explain_first ไม่มีใน LayoutAb').toContain("'explain_first'");
    expect(ab, "show ไม่มีใน LandingVariant").toContain("'show'");
  });
});

describe('ตรวจแผนกับตัวเลขจริง — ต้องบอกตรง ๆ ว่ายังสรุปไม่ได้', () => {
  it('ตัวเลขจริงตอนนี้ → ติด blocker ว่าเหตุการณ์ CTA น้อยเกิน', () => {
    const issues = planIssues(REAL);
    expect(issues.some(i => i.id === 'metric' && i.level === 'blocker')).toBe(true);
  });

  it('ไม่เตือนเรื่องรันพร้อมกัน เพราะเหลือชุดเดียวแล้ว', () => {
    expect(planIssues(REAL).some(i => i.id === 'concurrency')).toBe(false);
  });

  it('คนเยอะพอและ CTA พอ → ไม่มี blocker เหลือ', () => {
    const big: LandingAgg = { ...REAL, total: 2000, engaged: 900, cta: 120, signup: 40 };
    expect(planIssues(big).filter(i => i.level === 'blocker')).toEqual([]);
  });

  it('ถ้าชุดที่รันอยู่มีคนเห็นน้อยกว่าเกณฑ์ → blocker', () => {
    const tiny: LandingAgg = { ...REAL, total: MIN_PER_ARM, cta: 100 };
    expect(planIssues(tiny).some(i => i.id === 'hero' && i.level === 'blocker')).toBe(true);
  });

  it('สรุปให้แอดมินอ่าน บอกทั้งที่รันอยู่และเหตุผลที่ชุดอื่นหยุด', () => {
    const lines = planSummary(REAL).join('\n');
    expect(lines).toContain('▶');
    expect(lines).toContain('⏸');
    expect(lines).toContain('วัดไม่ได้');
  });
});

describe('หน้า Landing ต้องเคารพแผนจริง ไม่ใช่มีแผนแต่ยังสุ่มต่อ', () => {
  const page = readFileSync('src/pages/LandingPage.tsx', 'utf8');

  it('layout A/B เช็ค frozenVariantOf ก่อนสุ่ม', () => {
    expect(page).toContain("frozenVariantOf('layout')");
  });

  it('holdout ส่วนใหม่ เช็ค frozenVariantOf ก่อนสุ่ม', () => {
    expect(page).toContain("frozenVariantOf('new_sections_v1')");
  });

  it('พาดหัวยังสุ่มอยู่ (เป็นชุดที่ยังรัน)', () => {
    expect(page).toContain('heroAbVariant(id)');
    expect(planEntry('hero')?.status).toBe('running');
  });
});
