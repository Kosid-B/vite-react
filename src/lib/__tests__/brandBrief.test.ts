import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  WHO, AUDIENCE, PROBLEM, OUTCOME, VOICE, HONEST_STATE,
  FORBIDDEN_PHRASES, brandBriefBlock, violatesBrand,
} from '../brandBrief';
import { organizationJsonLd } from '../seoData';
import { FALLBACK_SEG } from '../ctaContext';
import { growthPrompt } from '../growthAnalysis';

/* ══════════════════════════════════════════════════════════════════════
 * Brand Brief ที่ "จริงเมื่อวาน" อันตรายกว่าไม่มี Brand Brief
 *
 * เพราะทุกคน (และ AI) จะเชื่อมันโดยไม่ตรวจซ้ำ แล้วผลิตคอนเทนต์ผิดออกไปเป็นสิบชิ้น
 * เทสต์นี้จึงผูก brief เข้ากับ "แหล่งความจริงเดียว" ที่มีอยู่แล้วในระบบ:
 *   seoData.organizationJsonLd = สิ่งที่ Google/AI เห็น
 *   ctaContext.FALLBACK_SEG     = กลุ่มเป้าหมายที่โค้ดใช้จริง
 *   landingClaims.test.ts       = คำต้องห้ามชุดเดียวกัน
 * ══════════════════════════════════════════════════════════════════════ */

const read = (p: string) => readFileSync(resolve(__dirname, '../..', p), 'utf8').replace(/\r\n/g, '\n');

describe('brief ต้องตรงกับสิ่งที่ Google/AI เห็นจริง (seoData)', () => {
  const org = organizationJsonLd('https://ceoaithailand.org') as Record<string, string>;

  it('ชื่อแบรนด์ตรงกัน', () => {
    expect(WHO.name).toBe(org.name);
  });

  it('ประโยคหนึ่งบรรทัดต้องเป็นส่วนหนึ่งของ description ที่ประกาศต่อโลก', () => {
    expect(org.description).toContain(WHO.oneLiner);
  });

  it('บริษัทแม่ตรงกับ parentOrganization', () => {
    expect(JSON.stringify(org.parentOrganization)).toContain(WHO.parent);
  });

  it('ข้อ "เราไม่ใช่ AI Cloud/LLM" ต้องตรงกับ disambiguatingDescription ที่แก้ปัญหาสับสนกับ Siam AI', () => {
    expect(org.disambiguatingDescription).toContain('Siam AI');
    expect(WHO.notThis.join(' ')).toContain('Siam AI');
  });
});

describe('brief ต้องตรงกับราคาที่ประกาศจริง', () => {
  it('ราคาทุกแพ็กตรงกับที่เขียนใน JSON-LD (0/790/1490/5900)', () => {
    for (const price of ['0', '790', '1,490', '5,900']) {
      expect(OUTCOME.pricing, `ขาดราคา ${price}`).toContain(price);
    }
  });

  it('ต้องบอกว่าเริ่มที่ ฿0 — ไม่ใช่เริ่มที่ราคาแพ็กแรกที่เสียเงิน', () => {
    expect(OUTCOME.pricing).toMatch(/฿0|ฟรี/);
  });
});

describe('กลุ่มเป้าหมายต้องตรงกับที่โค้ดใช้จริง ไม่ใช่ที่อยากให้เป็น', () => {
  it("ค่าตั้งต้นของระบบคือ 'seller' = เจ้าของธุรกิจที่ขายอยู่แล้ว", () => {
    expect(FALLBACK_SEG).toBe('seller');
    expect(AUDIENCE.primary).toContain('ขายอยู่แล้ว');
  });

  it('ต้องมีหลักฐานตัวเลขกำกับ ไม่ใช่บอกลอย ๆ ว่ากลุ่มนี้', () => {
    expect(AUDIENCE.evidence).toMatch(/\d/);
  });

  it('ห้ามตัดมือใหม่ทิ้ง — ต้องยังมีกลุ่มรอง', () => {
    expect(AUDIENCE.secondary).toContain('newbie');
  });
});

describe('จุดยืนที่ห้ามพูดกลับด้าน', () => {
  it('ต้องยืนยันว่าวางระบบได้ตั้งแต่ปีแรก (ห้ามบอกให้รอโต)', () => {
    expect(PROBLEM.stance).toContain('ปีแรก');
    expect(PROBLEM.stance).not.toMatch(/รอให้โต|โตก่อนค่อย/);
  });

  it('ห้ามขึ้นต้นคอนเทนต์ด้วย ISO กับคนเพิ่งเริ่ม — ต้องมีข้อนี้ในน้ำเสียง', () => {
    expect(VOICE.dont.join(' ')).toContain('ISO');
  });

  it('ต้องคงเส้น "ลูกค้าถือข้อมูลเอง" (export ได้) ไว้ในผลลัพธ์ที่สัญญา', () => {
    expect(OUTCOME.concrete.join(' ')).toContain('export');
  });

  it('ต้องเล่าทั้ง 2 เสา ไม่ใช่เสาเดียว', () => {
    expect(WHO.pillars.length).toBe(2);
    expect(WHO.pillars.join(' ')).toContain('MIT 24 Steps');
    expect(WHO.pillars.join(' ')).toContain('ISO');
  });
});

describe('ช่อง "สถานะจริง" — ช่องที่กัน AI เขียนอ้างการยอมรับที่เรายังไม่มี', () => {
  it('ต้องระบุตรง ๆ ว่ายังไม่มีลูกค้าจ่ายเงินจริง', () => {
    expect(HONEST_STATE.payingCustomers).toMatch(/ยังไม่มี/);
  });

  it('ต้องมีข้อสรุปว่าห้ามเขียนอะไร ไม่ใช่แค่บอกสถานะเฉย ๆ', () => {
    expect(HONEST_STATE.implication).toMatch(/ห้าม/);
  });
});

describe('คำต้องห้าม — ต้องเป็นชุดเดียวกับที่เฝ้าหน้าเว็บอยู่', () => {
  it('ทุกคำใน brief ต้องมีอยู่ใน landingClaims.test.ts ด้วย (ที่เดียวกัน)', () => {
    const guard = read('lib/__tests__/landingClaims.test.ts');
    const missing = FORBIDDEN_PHRASES.filter((p) => !guard.includes(p));
    expect(missing, `คำที่ brief ห้ามแต่ตัวเฝ้าหน้าเว็บไม่รู้จัก: ${missing.join(', ')}`).toEqual([]);
  });

  it('violatesBrand จับคำต้องห้ามได้จริง', () => {
    expect(violatesBrand('เราการันตีผลลัพธ์')).toContain('การันตี');
    expect(violatesBrand('ลูกค้ากว่า 500 ราย')).toContain('ลูกค้ากว่า');
  });

  it('ข้อความปกติต้องไม่ถูกจับผิด', () => {
    expect(violatesBrand('รู้ต้นทุนจริงก่อนตั้งราคา')).toEqual([]);
  });

  it('brief ตัวเองต้องไม่ละเมิดกฎของตัวเอง', () => {
    // ยกเว้นบล็อกที่ "ลิสต์คำต้องห้าม" ออกมาโดยตั้งใจ
    expect(violatesBrand(brandBriefBlock())).toEqual([]);
  });
});

describe('บล็อกบริบทที่ส่งเข้า prompt', () => {
  const block = brandBriefBlock();

  it('มีครบทั้ง 4 กล่องตามแผนภาพ: บริษัท · ปัญหา · ความต้องการ · ผลลัพธ์', () => {
    expect(block).toContain('**บริษัท**');
    expect(block).toContain('**ปัญหาของเขา**');
    expect(block).toContain('**คุยกับใคร**');
    expect(block).toContain('**ผลลัพธ์ที่สัญญา**');
  });

  it('มีสถานะจริงติดไปด้วยเสมอ แม้ไม่ได้ขอ', () => {
    expect(block).toContain('สถานะจริงตอนนี้');
  });

  it('โหมดเขียนข้อความสาธารณะ ต้องแนบคำต้องห้ามไปด้วย', () => {
    const pub = brandBriefBlock({ forPublicCopy: true });
    for (const p of FORBIDDEN_PHRASES) expect(pub).toContain(p);
    // โหมดปกติไม่ต้องแนบ (ประหยัด token)
    expect(block).not.toContain('คำที่ห้ามปรากฏ');
  });
});

describe('ต่อสายจริงหรือยัง (ไม่ใช่เอกสารที่ไม่มีใครเปิด)', () => {
  it('growthPrompt ใส่ Brand Brief เข้าไปใน prompt จริง', () => {
    const p = growthPrompt({ facts: ['ผู้เข้าชม 79 คน'], cannotConclude: [], enough: false });
    expect(p).toContain('Brand Brief');
    expect(p).toContain(WHO.oneLiner);
    expect(p).toContain('สถานะจริงตอนนี้');
  });

  it('Brand Brief ต้องอยู่ "บนสุด" ของ prompt — บริบทต้องมาก่อนคำสั่ง', () => {
    const p = growthPrompt({ facts: ['x'], cannotConclude: [], enough: false });
    expect(p.indexOf('Brand Brief')).toBeLessThan(p.indexOf('คุณคือนักวิเคราะห์'));
  });

  it('prompt สาธารณะต้องพกคำต้องห้ามไปด้วย (AI จะได้ไม่เขียนคำที่เราทำไม่ได้)', () => {
    const p = growthPrompt({ facts: ['x'], cannotConclude: [], enough: false });
    expect(p).toContain('การันตี');
  });
});
