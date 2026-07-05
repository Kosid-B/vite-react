import { describe, it, expect } from 'vitest';
import { salesPipeline, SALES_TEAM } from '../salesTeam';
import { DEFAULT_DATA } from '../../data';
import type { AppData, Deal } from '../../types';

function withDeals(deals: Deal[]): AppData {
  return { ...DEFAULT_DATA, marketplace: { ...DEFAULT_DATA.marketplace, deals } };
}

describe('salesPipeline', () => {
  it('คำนวณจากดีลเริ่มต้น: conversion 33% · forecast ฿15,600', () => {
    const p = salesPipeline(DEFAULT_DATA); // matched 18k · negotiating 24k · closed 45k
    expect(p.hasDeals).toBe(true);
    expect(p.activeDeals).toBe(3);
    expect(p.wonValue).toBe(45000);
    expect(p.convRate).toBe(33);              // 1 ปิด / 3 active
    expect(p.forecast).toBe(15600);           // 18000*0.2 + 24000*0.5
  });

  it('4 สเตจครบ และไม่รวมดีลยกเลิกใน active', () => {
    const p = salesPipeline(withDeals([
      { id: 'a', partnerId: 'x', title: 'a', amount: 1000, status: 'closed' },
      { id: 'b', partnerId: 'x', title: 'b', amount: 2000, status: 'cancelled' },
    ]));
    expect(p.stages.map(s => s.key)).toEqual(['matched', 'negotiating', 'closed', 'cancelled']);
    expect(p.activeDeals).toBe(1);            // ตัด cancelled ออก
    expect(p.convRate).toBe(100);             // 1 ปิด / 1 active
  });

  it('ไม่มีดีล → ค่าเป็นศูนย์ ไม่พัง', () => {
    const p = salesPipeline(withDeals([]));
    expect(p.hasDeals).toBe(false);
    expect(p.convRate).toBe(0);
    expect(p.forecast).toBe(0);
  });

  it('SALES_TEAM มี 4 ตำแหน่งหลัก', () => {
    expect(SALES_TEAM.map(r => r.role)).toContain('Sales Manager');
    expect(SALES_TEAM.length).toBe(4);
  });
});
