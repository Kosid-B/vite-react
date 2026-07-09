import { describe, it, expect } from 'vitest';
import { DEFAULT_DATA as SEED } from '../../data';
import type { AppData, FinanceEntry } from '../../types';
import { weeklyDigest } from '../weeklyDigest';

const clone = (): AppData => JSON.parse(JSON.stringify(SEED)) as AppData;
const NOW = new Date(2026, 6, 8, 12, 0, 0); // พุธ 8 ก.ค. 2026
const fe = (over: Partial<FinanceEntry>): FinanceEntry => ({
  id: 'f' + Math.round(over.amount ?? 0), label: 'x', amount: 0, kind: 'revenue', date: '2026-07-07', ...over,
});

describe('weeklyDigest — การเงินสัปดาห์นี้', () => {
  it('นับเฉพาะรายการที่วันที่อยู่ในสัปดาห์เดียวกับ now', () => {
    const d = clone();
    d.finance = [
      fe({ id: 'a', amount: 1000, kind: 'revenue', date: '2026-07-07' }), // สัปดาห์นี้
      fe({ id: 'b', amount: 400, kind: 'expense', date: '2026-07-08' }),   // สัปดาห์นี้
      fe({ id: 'c', amount: 9999, kind: 'revenue', date: '2026-06-15' }),  // คนละสัปดาห์ — ต้องไม่นับ
    ];
    const dg = weeklyDigest(d, NOW);
    expect(dg.revenue).toBe(1000);
    expect(dg.expense).toBe(400);
    expect(dg.net).toBe(600);
    expect(dg.entriesThisWeek).toBe(2);
  });

  it('net เป็นลบเมื่อรายจ่าย > รายได้ (สัปดาห์นี้)', () => {
    const d = clone();
    d.finance = [fe({ id: 'a', amount: 100, kind: 'revenue', date: '2026-07-07' }), fe({ id: 'b', amount: 500, kind: 'expense', date: '2026-07-07' })];
    const dg = weeklyDigest(d, NOW);
    expect(dg.net).toBe(-400);
  });

  it('ไม่มีรายการในสัปดาห์ → 0 ทุกช่อง ไม่ throw', () => {
    const d = clone();
    d.finance = [fe({ id: 'old', amount: 5000, kind: 'revenue', date: '2026-01-01' })];
    const dg = weeklyDigest(d, NOW);
    expect(dg.revenue).toBe(0);
    expect(dg.expense).toBe(0);
    expect(dg.entriesThisWeek).toBe(0);
  });
});

describe('weeklyDigest — highlights & โครงสร้าง', () => {
  it('มี weekTag + highlights เสมอ (อย่างน้อย 1)', () => {
    const dg = weeklyDigest(clone(), NOW);
    expect(dg.weekTag).toMatch(/^\d{4}-W\d{2}$/);
    expect(dg.highlights.length).toBeGreaterThan(0);
  });

  it('กำไร → highlight บอกว่าทำกำไร', () => {
    const d = clone();
    d.finance = [fe({ id: 'a', amount: 2000, kind: 'revenue', date: '2026-07-07' })];
    const dg = weeklyDigest(d, NOW);
    expect(dg.highlights.some(h => h.includes('กำไร'))).toBe(true);
  });

  it('ข้อมูลว่างเปล่า → highlight ชวนเริ่มต้น', () => {
    const d = clone();
    d.finance = [];
    d.marketplace = { ...d.marketplace, deals: [] };
    d.aiCompany = { ...d.aiCompany, tasks: [] };
    const dg = weeklyDigest(d, NOW);
    expect(dg.highlights.some(h => h.includes('เริ่มสัปดาห์นี้'))).toBe(true);
  });

  it('คืน level + streak + nextAction fields ครบ (ไม่ throw กับ seed)', () => {
    const dg = weeklyDigest(clone(), NOW);
    expect(typeof dg.levelRank).toBe('string');
    expect(typeof dg.streak).toBe('number');
    // nextAction เป็น object หรือ null ก็ได้
    expect(dg.nextAction === null || typeof dg.nextAction.label === 'string').toBe(true);
  });
});
