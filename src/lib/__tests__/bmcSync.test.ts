import { describe, it, expect } from 'vitest';
import type { BMCData } from '../../types';
import { bmcSuggestions, applyBmcSuggestion, BMC_BLOCKS } from '../bmcSync';

const emptyBmc = (): BMCData => ({
  partners: [], activities: [], value: [], relationships: [], segments: [],
  resources: [], channels: [], costs: [], revenue: [],
});

describe('bmcSuggestions', () => {
  it('จับ block ที่เกี่ยวจากคำในเนื้อหา (ไทย+อังกฤษ)', () => {
    const s = bmcSuggestions('ยอดขายตก อยากปรับราคาและหาช่องทางขายใหม่ให้ลูกค้ากลุ่มใหม่');
    const keys = s.map(x => x.key);
    expect(keys).toContain('revenue');   // ราคา/ยอดขาย
    expect(keys).toContain('channels');  // ช่องทาง
    expect(keys).toContain('segments');  // ลูกค้ากลุ่มใหม่
  });

  it('เนื้อหาว่าง → ไม่มีข้อเสนอ', () => {
    expect(bmcSuggestions('   ')).toEqual([]);
  });

  it('snippet มี tag + เนื้อหา (ตัดความยาว)', () => {
    const s = bmcSuggestions('ต้นทุนวัตถุดิบเพิ่มขึ้น', 'ไฟล์ cost.txt');
    expect(s[0].snippet).toContain('ไฟล์ cost.txt');
    expect(s.some(x => x.key === 'costs')).toBe(true);
  });

  it('เรียงตามจำนวน hit มาก→น้อย', () => {
    const s = bmcSuggestions('รายได้ ราคา ยอดขาย กำไร — และมีต้นทุนบ้าง');
    expect(s[0].key).toBe('revenue'); // hit เยอะสุด
  });
});

describe('applyBmcSuggestion', () => {
  it('append snippet เข้า block ที่ถูกต้อง (immutable)', () => {
    const bmc = emptyBmc();
    const s = { key: 'revenue' as const, blockTitle: 'Revenue', blockSub: '', snippet: '📌 ปรับราคาขึ้น 10%' };
    const next = applyBmcSuggestion(bmc, s);
    expect(next).not.toBe(bmc);
    expect(next.revenue).toEqual(['📌 ปรับราคาขึ้น 10%']);
    expect(bmc.revenue).toEqual([]); // ของเดิมไม่เปลี่ยน
  });

  it('ไม่ซ้ำ (dedupe snippet เดิม)', () => {
    const s = { key: 'value' as const, blockTitle: 'V', blockSub: '', snippet: '📌 x' };
    const once = applyBmcSuggestion(emptyBmc(), s);
    const twice = applyBmcSuggestion(once, s);
    expect(twice.value).toEqual(['📌 x']);
  });

  it('cap ที่ 12 รายการต่อ block', () => {
    let bmc = emptyBmc();
    for (let i = 0; i < 15; i++) {
      bmc = applyBmcSuggestion(bmc, { key: 'partners', blockTitle: 'P', blockSub: '', snippet: `📌 p${i}` });
    }
    expect(bmc.partners.length).toBe(12);
    expect(bmc.partners[bmc.partners.length - 1]).toBe('📌 p14'); // เก็บล่าสุด
  });

  it('ทน block ที่ไม่ใช่ array (data เพี้ยน) โดยไม่ throw', () => {
    const bad = { ...emptyBmc(), revenue: undefined as unknown as string[] };
    const s = { key: 'revenue' as const, blockTitle: 'R', blockSub: '', snippet: '📌 y' };
    expect(() => applyBmcSuggestion(bad, s)).not.toThrow();
    expect(applyBmcSuggestion(bad, s).revenue).toEqual(['📌 y']);
  });
});

describe('BMC_BLOCKS', () => {
  it('ครบ 9 block ตรงกับ keyof BMCData', () => {
    expect(BMC_BLOCKS.length).toBe(9);
    const keys = BMC_BLOCKS.map(b => b.key).sort();
    expect(keys).toEqual(['activities', 'channels', 'costs', 'partners', 'relationships', 'resources', 'revenue', 'segments', 'value']);
  });
});
