import { describe, it, expect } from 'vitest';
import { harvestFromOutput, applyHarvestToData } from '../taskHarvest';
import type { AppData } from '../../types';

describe('harvestFromOutput — เก็บผลงาน AI เป็นข้อมูล', () => {
  it('ดึงรายจ่ายที่มี ฿ + คำบ่งชี้ต้นทุน', () => {
    const r = harvestFromOutput('แนะนำให้ลงทุนงบโฆษณาเพิ่ม ฿5,000 ต่อเดือนเพื่อเพิ่มยอดขาย');
    const exp = r.finance.find((f) => f.amount === 5000);
    expect(exp?.kind).toBe('expense');
  });
  it('ดึงรายได้ที่มี "บาท" + คำบ่งชี้ยอดขาย', () => {
    const r = harvestFromOutput('คาดว่ายอดขายเดือนนี้จะถึง 50,000 บาท');
    const rev = r.finance.find((f) => f.amount === 50000);
    expect(rev?.kind).toBe('revenue');
  });
  it('ไม่ดึงตัวเลขที่ไม่มีคำบ่งชี้การเงิน (กัน noise)', () => {
    const r = harvestFromOutput('มีลูกค้า 3,000 คนสนใจ และมี 5 ข้อควรทำ');
    expect(r.finance.length).toBe(0);
  });
  it('ดึงคำขอทรัพยากร "เพิ่ม <ชื่อ> <จำนวน> <หน่วย>"', () => {
    const r = harvestFromOutput('เพื่อรองรับงาน ควรเพิ่มเซิร์ฟเวอร์ 2 เครื่อง และจัดหาทีมงาน 1 คน');
    const srv = r.resources.find((x) => x.resourceName.includes('เซิร์ฟเวอร์'));
    expect(srv?.amount).toBe(2);
    const team = r.resources.find((x) => x.resourceName.includes('ทีมงาน'));
    expect(team?.amount).toBe(1);
  });
  it('output ว่าง/ไม่ใช่ string → ผลว่าง', () => {
    expect(harvestFromOutput('')).toEqual({ finance: [], resources: [] });
    expect(harvestFromOutput(undefined as unknown as string).finance).toEqual([]);
  });
  it('ไม่ดึงจำนวนเงินซ้ำ', () => {
    const r = harvestFromOutput('ต้นทุน ฿1,000 และค่าใช้จ่าย ฿1,000 อีกที');
    expect(r.finance.filter((f) => f.amount === 1000).length).toBe(1);
  });
});

describe('applyHarvestToData — เติมข้อมูลจริง', () => {
  const base = { resources: { items: [], requests: [] }, finance: [] } as unknown as AppData;
  it('สร้างคำขอทรัพยากร (pending) + รายการการเงิน จากผลงาน', () => {
    const out = 'ควรเพิ่มเซิร์ฟเวอร์ 2 เครื่อง · ต้นทุนเพิ่ม ฿6,000 ต่อเดือน';
    const { data, added } = applyHarvestToData(base, out, 'cto', '2026-07-11');
    expect(added.resources).toBe(1);
    expect(added.finance).toBe(1);
    expect(data.resources!.requests[0].type).toBe('new');
    expect(data.resources!.requests[0].status).toBe('pending');
    expect(data.resources!.requests[0].agentId).toBe('cto');
    expect(data.finance![0].kind).toBe('expense');
    expect(data.finance![0].amount).toBe(6000);
  });
  it('ผลงานไม่มีข้อมูล → คืน data เดิม (ไม่เพิ่ม)', () => {
    const { data, added } = applyHarvestToData(base, 'งานเสร็จเรียบร้อย ทีมทำได้ดี', 'x', '2026-07-11');
    expect(added).toEqual({ finance: 0, resources: 0 });
    expect(data).toBe(base);
  });
});
