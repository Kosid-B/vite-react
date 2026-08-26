import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  WHO, AUDIENCE, PROBLEM, OUTCOME, VOICE, HONEST_STATE,
  FORBIDDEN_PHRASES, brandBriefBlock, violatesBrand, MESSAGE_HIERARCHY,
  CUSTOMER_JOURNEY, ISO_ENTERS_AT_STEP,
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
  /* 🔁 แก้ระดับโครงสร้าง 23 ส.ค. 2569 — เดิมเทสต์ล็อกว่า FALLBACK_SEG ต้องเป็น 'seller'
   * ซึ่งมาจากการอ่านสถิติผู้ชม YouTube แล้วเข้าใจผิดว่าเป็นตลาดเป้าหมาย */
  it("ค่าตั้งต้นต้องพูดกับ Broad Market (คนที่อยากเริ่มธุรกิจ) ไม่ใช่คนที่ขายอยู่แล้ว", () => {
    expect(FALLBACK_SEG).toBe('newbie');
    expect(AUDIENCE.broad).toMatch(/เริ่มต้น|สร้างธุรกิจ/);
  });

  it('🔴 ต้องแยก Current Audience ออกจาก Target Market ให้ชัด — ห้ามเอามาปนกันอีก', () => {
    expect(AUDIENCE.currentAudience).toMatch(/\d/);
    expect(AUDIENCE.currentAudience).toMatch(/ไม่ใช่ตลาดเป้าหมาย/);
    expect(AUDIENCE.targetMarket).not.toMatch(/\d\d–\d\d|อายุ/);
  });

  it('persona ต้องเป็นเชิงสถานะ ไม่ใช่เชิงอายุ (สถานะเปลี่ยนได้ อายุเปลี่ยนไม่ได้)', () => {
    expect(AUDIENCE.persona).not.toMatch(/\d\d–\d\d|วัย \d/);
    expect(AUDIENCE.persona).toMatch(/ยังไม่รู้ว่าควรเริ่มจากอะไร/);
  });

  it('ห้ามทิ้งกลุ่มที่ขายอยู่แล้ว — ต้องอยู่ใน Journey ขั้นถัดไป', () => {
    expect(AUDIENCE.growth).toMatch(/ขายแล้ว|ขายอยู่แล้ว|เริ่มขาย/);
    expect(AUDIENCE.sideDoor).toContain('audit');
  });

  it('⚠️ ความเสี่ยงของการเปลี่ยนกลุ่มต้องถูกเขียนไว้ ไม่ใช่ซ่อน', () => {
    expect(AUDIENCE.risk).toMatch(/0\.0%/);
    expect(AUDIENCE.risk).toMatch(/สร้างการเข้าถึงใหม่/);
  });

  /* ── หน้าที่ของแต่ละกลุ่ม (เจ้าของตัดสิน 24 ส.ค. 2569) ────────────────────
   * 🔴 ความผิดที่กัน: ผมเสนอให้เอา sideDoor (ฐาน ISO ของ B.Training) มาเป็น
   *    เครื่องยนต์รายได้ ทั้งที่โค้ดเขียนไว้เองว่าเป็น "ประตูข้าง"
   *    รูปแบบเดียวกับ ledger #40 — เจอทางที่พิสูจน์ได้เร็ว แล้วให้มันเขียนตัวตนใหม่
   * ────────────────────────────────────────────────────────────────────── */
  it('🔴 ตัวทำรายได้คือ growth · ตัวสร้างฐานคือ primary — ห้ามสลับ', () => {
    expect(AUDIENCE.revenueEngine).toBe('growth');
    expect(AUDIENCE.baseBuilding).toBe('primary');
  });

  it('🔴 ประตูข้างห้ามเป็นเครื่องยนต์ ไม่ว่าจะพิสูจน์ได้เร็วแค่ไหน', () => {
    expect(AUDIENCE.neverTheEngine).toBe('sideDoor');
    // เหตุผลต้องอยู่ในโค้ด ไม่ใช่ในหัวใคร — พร้อมตัวเลขที่ต้องจ่ายถ้าสลับ
    expect(AUDIENCE.whyNotSideDoor).toMatch(/50,000/);
    expect(AUDIENCE.whyNotSideDoor).toMatch(/แข่งกับบริษัทแม่/);
  });

  it('กลุ่มที่เป็นเครื่องยนต์ ต้องเป็นกลุ่มที่ "มีตัวเลขให้ระบบกิน"', () => {
    // growth = เจ้าของที่ขายแล้ว ⇒ มีรายได้/ต้นทุน/ลูกค้าจริงให้ป้อนเข้า pricingAnalysis/cfoAnalysis
    expect(AUDIENCE.growth).toMatch(/ขายแล้ว|ขายอยู่แล้ว|เริ่มขาย/);
    // primary = ยังไม่มีธุรกิจ ⇒ คุณค่าอยู่ที่ชั้นฟรี ไม่ใช่ค่าสมาชิก
    expect(AUDIENCE.risk).toMatch(/ชั้นฟรีต้องแข็งแรง/);
  });

});

describe('เส้นทางลูกค้า — ตัวที่ตัดสินว่าสารไหนพูดกับใครตอนไหน', () => {
  it('ต้องเริ่มที่ Idea และจบที่ Scale · 10 ขั้น ไม่ข้าม', () => {
    expect(CUSTOMER_JOURNEY).toHaveLength(10);
    expect(CUSTOMER_JOURNEY[0].name).toBe('Idea');
    expect(CUSTOMER_JOURNEY[CUSTOMER_JOURNEY.length - 1].name).toBe('Scale');
    CUSTOMER_JOURNEY.forEach((j, i) => expect(j.step).toBe(i + 1));
  });

  it('ทุกขั้นต้องมีคำถามของลูกค้ากำกับ — ไม่ใช่ชื่อขั้นลอย ๆ', () => {
    for (const j of CUSTOMER_JOURNEY) expect(j.question.length).toBeGreaterThan(8);
  });

  it('🔴 ISO ต้องเข้ามาช่วง Systemize ไม่ใช่ประตูหน้า', () => {
    expect(ISO_ENTERS_AT_STEP).toBeGreaterThanOrEqual(7);
    const at = CUSTOMER_JOURNEY.find((j) => j.step === ISO_ENTERS_AT_STEP);
    expect(at?.name).toBe('กระบวนการ');
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

describe('ช่องทางทางการ — ต้องถูกส่งถึง Google/AI จริง ไม่ใช่แค่เก็บไว้ใน config', () => {
  it('YouTube URL อยู่ใน sameAs ของ Organization JSON-LD', () => {
    const org = organizationJsonLd('https://ceoaithailand.org') as Record<string, unknown>;
    const same = (org.sameAs as string[]) ?? [];
    expect(same, 'ใส่ URL ไว้ใน config เฉย ๆ = search engine ไม่รู้ว่าช่องนี้เป็นของเรา')
      .toContain('https://www.youtube.com/@CEOAIThailand');
  });

  it('sameAs ต้องยังมีเว็บบริษัทแม่อยู่ด้วย (ห้ามเผลอทับ)', () => {
    const org = organizationJsonLd('https://ceoaithailand.org') as Record<string, unknown>;
    expect((org.sameAs as string[]) ?? []).toContain('https://www.b-tctraining.com/');
  });

  it('sameAs ห้ามมีค่าว่าง — ช่องที่ยังไม่มีต้องถูกกรองทิ้ง ไม่ใช่ส่งสตริงว่างไป', () => {
    const org = organizationJsonLd('https://ceoaithailand.org') as Record<string, unknown>;
    expect(((org.sameAs as string[]) ?? []).filter((u) => !u || !u.trim())).toEqual([]);
  });
});

describe('Pilot ฿1,990 — เจ้าของสั่งเปิดขาย ต้องขายได้จริงโดยไม่ติดค้างรอ Stripe', () => {
  const pricing = readFileSync(resolve(__dirname, '../../pages/PublicPricing.tsx'), 'utf8')
    .replace(/\r\n/g, '\n');

  it('การ์ด Pilot ต้องไม่ถูกซ่อนทั้งใบเมื่อยังไม่มีลิงก์จ่ายเงิน', () => {
    // ของเดิม: {PAYMENT.stripePaymentLinkPilot && ( <div className="pp-pilot"> ... )}
    // = ยังไม่มีลิงก์ ⇒ ไม่มีใครรู้ว่ามีข้อเสนอนี้อยู่เลย
    expect(pricing).not.toMatch(/\{PAYMENT\.stripePaymentLinkPilot\s*&&\s*\(\s*\n?\s*<div className="pp-pilot"/);
    expect(pricing).toContain('className="pp-pilot"');
  });

  it('ไม่มีลิงก์จ่ายเงิน = ต้องมีทางติดต่อแทน (โทร) ไม่ใช่ทางตัน', () => {
    expect(pricing).toMatch(/href=\{`tel:/);
  });

  it('เบอร์โทรต้องมาจาก config ไม่ใช่พิมพ์ตายตัว (แก้ที่เดียว)', () => {
    expect(pricing).toContain('COMPANY.tel');
  });
});

describe('🔴 ลำดับของสาร — "ธุรกิจ" นำ · "ISO" ตาม (เจ้าของยืนยัน 22 ส.ค. 2569)', () => {
  it('สารหลักต้องเป็นเรื่องธุรกิจ ไม่ใช่มาตรฐาน', () => {
    expect(MESSAGE_HIERARCHY.lead).toContain('ธุรกิจ');
    expect(MESSAGE_HIERARCHY.lead).not.toMatch(/ISO|มอก|PDPA/);
  });

  it('มาตรฐานอยู่ชั้นรอง และระบุว่าเป็น "ผลพลอยได้" ไม่ใช่เหตุผลที่ซื้อ', () => {
    expect(MESSAGE_HIERARCHY.secondary).toMatch(/ISO/);
    expect(MESSAGE_HIERARCHY.secondary).toMatch(/ผลพลอยได้|ไม่ใช่เหตุผลที่ซื้อ/);
  });

  it('ต้องเขียนไว้ว่าเงื่อนไขเดียวที่พูด ISO ขึ้นหน้าได้คืออะไร (ไม่ใช่ห้ามเด็ดขาด)', () => {
    expect(MESSAGE_HIERARCHY.isoLeadAllowedWhen).toContain('seg=audit');
  });

  it('🔴 ต้องเก็บเหตุผล "แข่งกับบริษัทแม่" ไว้ — เหตุผลที่คนลืมง่ายที่สุดและแพงที่สุด', () => {
    expect(MESSAGE_HIERARCHY.whyNotSwap).toMatch(/50,000|85,000/);
    expect(MESSAGE_HIERARCHY.whyNotSwap).toMatch(/ที่ปรึกษา/);
  });

  it('ลำดับสารถูกส่งเข้า prompt จริง (ไม่ใช่ค่าคงที่ที่ไม่มีใครใช้)', () => {
    const block = brandBriefBlock();
    expect(block).toContain('ลำดับของสาร');
    expect(block).toContain(MESSAGE_HIERARCHY.lead);
    expect(block).toContain(MESSAGE_HIERARCHY.whyNotSwap);
  });

  it('ในบล็อก prompt สารเรื่องธุรกิจต้องมาก่อนสารเรื่องมาตรฐาน', () => {
    const block = brandBriefBlock();
    expect(block.indexOf(MESSAGE_HIERARCHY.lead))
      .toBeLessThan(block.indexOf(MESSAGE_HIERARCHY.secondary));
  });
});
