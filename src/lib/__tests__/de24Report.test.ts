import { describe, it, expect } from 'vitest';
import { de24Summary, de24Markdown, de24ToBmcSeed } from '../de24Report';
import type { AppData } from '../../types';

const blank = () => Array.from({ length: 24 }, () => ({ done: false, notes: '' }));
const mk = (de24: Array<{ done: boolean; notes: string }>): AppData =>
  ({ businessModel: { de24 }, aiCompany: { name: 'ACME' } } as unknown as AppData);

describe('de24Summary', () => {
  it('ว่าง → 0/24, 4 ระยะ', () => {
    const s = de24Summary(mk(blank()));
    expect(s.doneCount).toBe(0);
    expect(s.pct).toBe(0);
    expect(s.phases).toHaveLength(4);
    expect(s.phases.reduce((n, p) => n + p.steps.length, 0)).toBe(24);
  });
  it('ทำ 6 ขั้น → 25%', () => {
    const d = blank(); [0, 1, 2, 3, 4, 5].forEach(i => (d[i].done = true));
    expect(de24Summary(mk(d)).pct).toBe(25);
  });
});

describe('de24ToBmcSeed', () => {
  it('ดึงเฉพาะขั้นที่ทำแล้ว + มีโน้ต ไปยัง block ที่ถูก', () => {
    const d = blank();
    d[4] = { done: true, notes: 'SME เจ้าของธุรกิจ 30-45 ปี' };  // → segments
    d[7] = { done: true, notes: 'ประหยัด 40 ชม./เดือน' };        // → value
    d[15] = { done: false, notes: 'ราคายังไม่สรุป' };            // ยังไม่ done → ไม่เอา
    const seed = de24ToBmcSeed(mk(d));
    expect(seed.segments).toContain('SME เจ้าของธุรกิจ 30-45 ปี');
    expect(seed.value).toContain('ประหยัด 40 ชม./เดือน');
    expect(seed.revenue).toBeUndefined();   // ขั้น 16 ไม่ done
  });
});

describe('de24Markdown', () => {
  it('มีหัวข้อ + ชื่อบริษัท + % + ตารางแมป BMC', () => {
    const d = blank(); d[4] = { done: true, notes: 'SME ไทย' };
    const md = de24Markdown(mk(d), { company: 'ACME', date: '2026-07-12' });
    expect(md).toContain('# สรุปผล MIT 24-Step');
    expect(md).toContain('ACME');
    expect(md).toContain('2026-07-12');
    expect(md).toContain('Business Model Canvas');
    expect(md).toContain('SME ไทย');       // โน้ตขั้นที่ทำ
    expect(md).toContain('| BMC Block |');  // ตารางแมป
  });
});
