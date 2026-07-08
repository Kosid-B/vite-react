import { describe, it, expect } from 'vitest';
import {
  AIFLOW_CATEGORIES, AIFLOW_TOTAL, STAGE_PLANS, currentStage,
  SKILL_PACKS, COMPETITORS, OUR_EDGE, PROMOTIONS,
} from '../skillInvestmentPlan';
import { DEFAULT_DATA } from '../../data';

/* แผนลงทุนทักษะตามช่วงเติบโต + Price Analysis — ข้อมูลต้องสอดคล้องกัน (501 ทักษะ) */

describe('AIFLOW catalog', () => {
  it('ผลรวมทุกหมวด = AIFLOW_TOTAL (501)', () => {
    const sum = Object.values(AIFLOW_CATEGORIES).reduce((s, n) => s + n, 0);
    expect(sum).toBe(AIFLOW_TOTAL);
    expect(AIFLOW_TOTAL).toBe(501);
  });
});

describe('STAGE_PLANS / currentStage', () => {
  it('มี 5 ช่วง + rank ตรงกับระดับบริษัท', () => {
    expect(STAGE_PLANS.map(s => s.rank)).toEqual(['Starter', 'Growing', 'Professional', 'Advanced', 'Elite']);
  });
  it('บริษัทเริ่มต้น (XP ต่ำ) → ช่วง Starter', () => {
    const base = { ...DEFAULT_DATA, aiCompany: { ...DEFAULT_DATA.aiCompany, skillXP: 0, tasks: [], agents: [], toolOwners: {}, missionApproved: false }, actions: [] };
    expect(currentStage(base).rank).toBe('Starter');
  });
  it('ทุกช่วงมีอย่างน้อย 1 หมวดทักษะ', () => {
    STAGE_PLANS.forEach(s => expect(s.categories.length).toBeGreaterThan(0));
  });
});

describe('SKILL_PACKS (Price Analysis)', () => {
  it('id ไม่ซ้ำ + Full Bundle = 501 ทักษะ = anchor ราคาสูงสุด', () => {
    const ids = SKILL_PACKS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const full = SKILL_PACKS.find(p => p.id === 'full')!;
    expect(full.skills).toBe(AIFLOW_TOTAL);
    expect(Math.max(...SKILL_PACKS.map(p => p.priceTHB))).toBe(full.priceTHB);
  });
});

describe('positioning content', () => {
  it('มีคู่แข่ง + จุดต่าง + โปรโมชันครบ (ไม่ว่าง)', () => {
    expect(COMPETITORS.length).toBeGreaterThan(0);
    expect(OUR_EDGE.length).toBeGreaterThan(0);
    expect(PROMOTIONS.every(p => p.name && p.detail)).toBe(true);
  });
});
