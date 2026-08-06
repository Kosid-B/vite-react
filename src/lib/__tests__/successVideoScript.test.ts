import { describe, it, expect } from 'vitest';
import {
  buildSuccessVideoScript,
  businessInfoFromData,
  readinessFor,
  audienceLabel,
  scriptToPlainText,
  scriptToMarkdown,
  polishInstruction,
  applyPolish,
  type BusinessInfo,
} from '../successVideoScript';
import type { AppData } from '../../types';

const B2C: BusinessInfo = {
  company: 'ขนมมายด์', industry: 'ร้านขนม', goal: 'มีลูกค้าประจำ 100 ราย',
  audience: 'b2c', product: 'ขนมโฮมเมด', valueProp: 'ของหวานให้รางวัลตัวเอง', persona: 'พนักงานออฟฟิศ',
};

describe('buildSuccessVideoScript', () => {
  it('สร้าง 10 บท + title/thumbnail/disclaimer + ประเมินนาที > 0', () => {
    const s = buildSuccessVideoScript(B2C);
    expect(s.chapters).toHaveLength(10);
    expect(s.chapters.map(c => c.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(s.title).toContain('ขนมมายด์');
    expect(s.estMinutes).toBeGreaterThan(0);
    expect(s.disclaimer).toMatch(/ไม่ใช่การรับประกัน/);
  });

  it('personalize: ชื่อธุรกิจ + กลุ่มลูกค้าโผล่ในบท', () => {
    const s = buildSuccessVideoScript(B2C);
    const all = s.chapters.map(c => c.narration + c.points.join(' ')).join(' ');
    expect(all).toContain('ขนมมายด์');
    expect(all).toContain('B2C');
  });

  it('B2B กับ B2C ได้บทหาลูกค้าต่างกัน', () => {
    const b2b = buildSuccessVideoScript({ ...B2C, audience: 'b2b' });
    const b2c = buildSuccessVideoScript(B2C);
    const ch7b = b2b.chapters.find(c => c.no === 7)!;
    const ch7c = b2c.chapters.find(c => c.no === 7)!;
    expect(ch7b.heading).toContain('องค์กร');
    expect(ch7c.heading).toMatch(/walk-in/);
    expect(ch7b.narration).not.toBe(ch7c.narration);
  });

  it('ข้อมูลว่าง → ยัง fallback ได้ (ไม่พัง)', () => {
    const s = buildSuccessVideoScript({ company: '', industry: '', goal: '' });
    expect(s.chapters).toHaveLength(10);
    expect(s.title).toContain('ธุรกิจของคุณ');
  });
});

describe('businessInfoFromData', () => {
  it('ดึงฟิลด์จาก AppData', () => {
    const d = {
      aiCompany: { name: 'ร้านเอ', industry: 'คาเฟ่', goal: 'โต', mission: '', productDesc: 'กาแฟ', productVp: 'สงบ 15 นาที' },
      audienceType: 'b2c',
      businessModel: { bmc: { value: ['คุณค่าจาก BMC'] } },
      personas: [{ name: 'คนทำงาน' }],
    } as unknown as AppData;
    const info = businessInfoFromData(d);
    expect(info.company).toBe('ร้านเอ');
    expect(info.audience).toBe('b2c');
    expect(info.valueProp).toBe('สงบ 15 นาที');
    expect(info.persona).toBe('คนทำงาน');
  });

  it('valueProp fallback ไป BMC.value เมื่อไม่มี productVp', () => {
    const d = {
      aiCompany: { name: 'ร้านบี', industry: '', goal: '', productVp: '' },
      businessModel: { bmc: { value: ['คุณค่าจาก BMC'] } },
    } as unknown as AppData;
    expect(businessInfoFromData(d).valueProp).toBe('คุณค่าจาก BMC');
  });
});

describe('readinessFor', () => {
  it('ครบ → ready + score สูง', () => {
    const r = readinessFor(B2C);
    expect(r.ready).toBe(true);
    expect(r.score).toBe(1);
    expect(r.missing).toHaveLength(0);
  });
  it('ว่างหมด → not ready + missing ครบ', () => {
    const r = readinessFor({ company: '', industry: '', goal: '' });
    expect(r.ready).toBe(false);
    expect(r.missing.length).toBeGreaterThan(0);
  });
  it('มีแค่ชื่อ+ประเภท → ready (เกณฑ์ขั้นต่ำ)', () => {
    expect(readinessFor({ company: 'ร้าน', industry: 'คาเฟ่', goal: '' }).ready).toBe(true);
  });
});

describe('polish (AI ขัดเกลาสำนวน)', () => {
  it('polishInstruction: มี guardrail + จำนวนบทถูกต้อง', () => {
    const s = buildSuccessVideoScript(B2C);
    const instr = polishInstruction(s);
    expect(instr).toMatch(/ห้ามแต่งตัวเลข/);
    expect(instr).toContain(`${s.chapters.length} ข้อ`);
    expect(instr).toContain('ขนมมายด์'); // ต้นฉบับถูกแนบไปด้วย
  });
  it('applyPolish: จำนวนตรง → แทน narration (คง heading/points เดิม)', () => {
    const s = buildSuccessVideoScript(B2C);
    const sugg = s.chapters.map((_, i) => `บทพากย์ขัดเกลา ${i + 1}`);
    const out = applyPolish(s, sugg);
    expect(out.chapters[0].narration).toBe('บทพากย์ขัดเกลา 1');
    expect(out.chapters[0].heading).toBe(s.chapters[0].heading);
    expect(out.chapters[0].points).toEqual(s.chapters[0].points);
  });
  it('applyPolish: จำนวนไม่ตรง → คืนของเดิม (ไม่พัง)', () => {
    const s = buildSuccessVideoScript(B2C);
    expect(applyPolish(s, ['สั้นไป'])).toBe(s);
  });
  it('applyPolish: ข้อว่าง → คงบทเดิมของช่องนั้น', () => {
    const s = buildSuccessVideoScript(B2C);
    const sugg = s.chapters.map((_, i) => (i === 0 ? '' : `ขัดเกลา ${i}`));
    const out = applyPolish(s, sugg);
    expect(out.chapters[0].narration).toBe(s.chapters[0].narration);
    expect(out.chapters[1].narration).toBe('ขัดเกลา 1');
  });
});

describe('helpers', () => {
  it('audienceLabel', () => {
    expect(audienceLabel('b2b')).toContain('B2B');
    expect(audienceLabel('b2c')).toContain('B2C');
    expect(audienceLabel(undefined)).toContain('ลูกค้า');
  });
  it('scriptToPlainText/Markdown มี title + ทุกหัวข้อบท', () => {
    const s = buildSuccessVideoScript(B2C);
    const txt = scriptToPlainText(s);
    const md = scriptToMarkdown(s);
    expect(txt).toContain(s.title);
    expect(md).toContain(`# ${s.title}`);
    for (const ch of s.chapters) {
      expect(txt).toContain(ch.heading);
      expect(md).toContain(ch.heading);
    }
  });
});
