import { describe, it, expect } from 'vitest';
import {
  AGENDA, boardState, pendingProposals, itemStatus, skillLevels, gateProgress,
  defaultBoardRoom, type BoardDecision,
} from '../boardRoom';
import type { AppData, Persona } from '../../types';

const persona = (over: Partial<Persona> = {}): Persona => ({
  name: 'x', role: 'y', initials: 'XY', bg: '#fff', tc: '#000', quote: 'q',
  pains: ['p'], gains: ['g'], goal: ['go'], fear: ['f'], search: ['s'], action: ['a'], ...over,
});
const mk = (over: Partial<AppData> = {}) => ({ personas: [], ...over }) as AppData;

const approve = (itemId: string): BoardDecision => ({ itemId, status: 'approved', at: '2026-07-11' });

describe('AGENDA — วาระ', () => {
  it('มี 5 gate + ฟีเจอร์ · id ไม่ซ้ำ', () => {
    expect(AGENDA.filter((i) => i.category === 'gate').length).toBe(5);
    expect(AGENDA.filter((i) => i.category === 'feature').length).toBeGreaterThan(0);
    expect(new Set(AGENDA.map((i) => i.id)).size).toBe(AGENDA.length);
  });
  it('ทุกวาระมีบทเรียน (why + lesson) + track', () => {
    for (const i of AGENDA) {
      expect(i.why.length).toBeGreaterThan(0);
      expect(i.lesson.length).toBeGreaterThan(0);
      expect(['business', 'marketing']).toContain(i.track);
    }
  });
});

describe('itemStatus / pendingProposals — gate sequence + data readiness', () => {
  it('gate-who = locked เมื่อ persona ยังไม่มีข้อมูล (pains+search)', () => {
    const d = mk({ personas: [persona({ pains: [], search: [] })] });
    expect(itemStatus(AGENDA.find((i) => i.id === 'gate-who')!, d, [])).toBe('locked');
  });
  it('gate-who = proposed เมื่อ persona มี pains + search', () => {
    const d = mk({ personas: [persona()] });
    expect(itemStatus(AGENDA.find((i) => i.id === 'gate-who')!, d, [])).toBe('proposed');
  });
  it('gate-value = locked จนกว่า gate-who จะอนุมัติ (requires)', () => {
    const d = mk({ personas: [persona()] });
    expect(itemStatus(AGENDA.find((i) => i.id === 'gate-value')!, d, [])).toBe('locked');
    expect(itemStatus(AGENDA.find((i) => i.id === 'gate-value')!, d, [approve('gate-who')])).toBe('proposed');
  });
  it('feature เสนอได้ทันที (ไม่ต้องรอ)', () => {
    const d = mk();
    expect(itemStatus(AGENDA.find((i) => i.id === 'feat-pricing')!, d, [])).toBe('proposed');
  });
  it('อนุมัติแล้ว → status = approved', () => {
    const d = mk({ personas: [persona()] });
    expect(itemStatus(AGENDA.find((i) => i.id === 'gate-who')!, d, [approve('gate-who')])).toBe('approved');
  });
  it('pendingProposals ไม่รวมอันที่ตัดสินแล้ว/locked', () => {
    const d = mk({ personas: [persona()] });
    const pend = pendingProposals(d, [approve('gate-who')]);
    expect(pend.find((i) => i.id === 'gate-who')).toBeUndefined();     // อนุมัติแล้ว
    expect(pend.find((i) => i.id === 'gate-value')).toBeDefined();     // ปลดล็อกแล้ว
    expect(pend.find((i) => i.id === 'gate-money')).toBeUndefined();   // ยัง locked
  });
});

describe('skillLevels — สะสมทักษะ 2 สาย', () => {
  it('เริ่มต้น level 1 xp 0 ทั้ง 2 สาย', () => {
    const s = skillLevels([]);
    expect(s.business.level).toBe(1);
    expect(s.business.xp).toBe(0);
    expect(s.marketing.xp).toBe(0);
  });
  it('อนุมัติ gate-who (business 50) → business xp 50, marketing 0', () => {
    const s = skillLevels([approve('gate-who')]);
    expect(s.business.xp).toBe(50);
    expect(s.marketing.xp).toBe(0);
  });
  it('xp ข้าม threshold → level ขึ้น', () => {
    // business: gate-who 50 + gate-money 60 + feat-pricing 30 = 140 → level 2 (>=60)
    const s = skillLevels([approve('gate-who'), approve('gate-money'), approve('feat-pricing')]);
    expect(s.business.xp).toBe(140);
    expect(s.business.level).toBe(2);
    expect(s.business.label).toBeTruthy();
  });
  it('rejected ไม่ให้ xp', () => {
    const s = skillLevels([{ itemId: 'gate-who', status: 'rejected', at: 'x' }]);
    expect(s.business.xp).toBe(0);
  });
});

describe('gateProgress + defaults', () => {
  it('นับ gate ที่อนุมัติ / ทั้งหมด', () => {
    expect(gateProgress([]).total).toBe(5);
    expect(gateProgress([approve('gate-who')]).approved).toBe(1);
  });
  it('defaultBoardRoom ว่าง', () => {
    expect(defaultBoardRoom().decisions).toEqual([]);
  });
  it('boardState คืนสถานะครบทุกวาระ', () => {
    const d = mk({ personas: [persona()] });
    expect(boardState(d, []).length).toBe(AGENDA.length);
  });
});
