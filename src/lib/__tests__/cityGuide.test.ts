import { describe, it, expect } from 'vitest';
import { guideScript, type GuideCtx } from '../cityGuide';

const base: GuideCtx = {
  company: 'ร้านกาแฟดี',
  sectorLabel: 'หมวด I · ที่พักแรมและบริการด้านอาหาร',
  offerings: ['เอสเพรสโซ', 'เมล็ดคั่วเอง', 'คอร์สบาริสต้า'],
  eraIndex: 0,
  tierLabel: 'หมู่บ้านสตาร์ทอัป',
};

describe('guideScript — โฮสต์เมืองต้อนรับคู่ค้า (matching)', () => {
  it('บทพูดมีชื่อบริษัท + ระดับ + หมวด + สินค้า', () => {
    const g = guideScript(base);
    const all = g.lines.map(l => l.text).join(' ');
    expect(all).toContain('ร้านกาแฟดี');
    expect(all).toContain('หมู่บ้านสตาร์ทอัป');
    expect(all).toContain('ที่พักแรม');
    expect(all).toContain('เอสเพรสโซ');
  });

  it('มี CTA จับคู่ธุรกิจ 3 ปุ่ม (RFQ/จับคู่/หน้าร้าน)', () => {
    const pages = guideScript(base).ctas.map(c => c.page);
    expect(pages).toEqual(['trade', 'citytrade', 'storefront']);
  });

  it('เจตนา matching ต่างกันตามยุค (บุกเบิก ≠ อนาคต)', () => {
    const seed = guideScript({ ...base, eraIndex: 0 });
    const neo = guideScript({ ...base, eraIndex: 4, tierLabel: 'มหานคร AI' });
    const seedMatch = seed.lines.find(l => l.icon === '🎯')!.text;
    const neoMatch = neo.lines.find(l => l.icon === '🎯')!.text;
    expect(seedMatch).not.toBe(neoMatch);
    expect(seedMatch).toContain('รายแรก');       // ยุคแรกหาพันธมิตรรายแรก
    expect(neoMatch).toContain('กลยุทธ์');        // ยุคอนาคต = พาร์ตเนอร์เชิงกลยุทธ์
  });

  it('ไม่มีสินค้า → ใช้ข้อความ fallback (ไม่โชว์ว่าง)', () => {
    const g = guideScript({ ...base, offerings: [] });
    const offer = g.lines.find(l => l.icon === '🛍️')!.text;
    expect(offer).toContain('กำลังจัดทัพ');
  });

  it('ไม่มีชื่อบริษัท → fallback', () => {
    const g = guideScript({ ...base, company: '   ' });
    expect(g.lines[0].text).toContain('ธุรกิจของเรา');
  });

  it('speech = รวมทุกบรรทัด + host มีชื่อ', () => {
    const g = guideScript(base);
    expect(g.speech).toBe(g.lines.map(l => l.text).join(' '));
    expect(g.host.length).toBeGreaterThan(0);
  });

  it('eraIndex เกินช่วง clamp ไม่พัง', () => {
    expect(() => guideScript({ ...base, eraIndex: 99 })).not.toThrow();
    const g = guideScript({ ...base, eraIndex: -5 });
    expect(g.lines.length).toBeGreaterThan(0);
  });
});
