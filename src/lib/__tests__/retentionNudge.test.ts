import { describe, it, expect } from 'vitest';
import { retentionNudge, daysBetween, type NudgeInput } from '../retentionNudge';

const base: NudgeInput = {
  today: '2026-08-10', lastActiveDay: '2026-08-08', seenDay: undefined,
  visitedCount: 6, streakCount: 3, hasCompany: true, hasIdea: true,
};

describe('daysBetween', () => {
  it('นับวันถูก', () => {
    expect(daysBetween('2026-08-08', '2026-08-10')).toBe(2);
    expect(daysBetween('2026-08-10', '2026-08-10')).toBe(0);
  });
});

describe('retentionNudge', () => {
  it('ผู้ใช้เดิมหายไป ≥1 วัน → โชว์', () => {
    const n = retentionNudge(base);
    expect(n.show).toBe(true);
    expect(n.title).toMatch(/ไม่ได้เจอกัน 2 วัน/);
  });

  it('gap 1 วัน + มี streak → ข้อความชวนรักษาความต่อเนื่อง', () => {
    const n = retentionNudge({ ...base, lastActiveDay: '2026-08-09', streakCount: 5 });
    expect(n.title).toMatch(/ยินดีต้อนรับกลับ/);
    expect(n.message).toMatch(/ต่อเนื่อง 5 วัน/);
  });

  it('เข้าวันเดียวกัน (gap 0) → ไม่โชว์', () => {
    expect(retentionNudge({ ...base, lastActiveDay: '2026-08-10' }).show).toBe(false);
  });

  it('โชว์ไปแล้ววันนี้ (seenDay=today) → ไม่โชว์', () => {
    expect(retentionNudge({ ...base, seenDay: '2026-08-10' }).show).toBe(false);
  });

  it('มือใหม่ (visitedCount ≤ 1) → ไม่โชว์', () => {
    expect(retentionNudge({ ...base, visitedCount: 1 }).show).toBe(false);
  });

  it('ไม่มี lastActiveDay → ไม่โชว์', () => {
    expect(retentionNudge({ ...base, lastActiveDay: undefined }).show).toBe(false);
  });

  it('งานถัดไปตามความคืบหน้า: ยังไม่มีบริษัท → aicompany', () => {
    const n = retentionNudge({ ...base, hasCompany: false });
    expect(n.ctaPage).toBe('aicompany');
    expect(n.ctaLabel).toMatch(/สร้างบริษัท/);
  });
  it('มีบริษัทแล้ว แต่ยังไม่มีไอเดีย → bmc', () => {
    const n = retentionNudge({ ...base, hasCompany: true, hasIdea: false });
    expect(n.ctaPage).toBe('bmc');
  });
});
