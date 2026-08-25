import { describe, it, expect } from 'vitest';
import {
  VISION, MISSION_CHAIN, MINDSET, MENTAL_MODEL, PRODUCT_DNA,
  GOLDEN_QUESTION, VALID_OUTCOMES, answersGoldenQuestion, constitutionBlock,
} from '../founderConstitution';
import {
  READINESS_CHECKS, REQUIRED_BY_INTENT, classifyAsk, founderGate, budgetInAsk,
  readinessFromGenome, missionStage, founderMindsetBlock,
  type ReadinessKey,
} from '../founderMindset';
import type { GenomeData } from '../businessGenome';

const ALL_READY: Record<ReadinessKey, boolean> = {
  problem: true, customer: true, offer: true, unitEconomics: true, tracking: true, evidence: true,
};

describe('รัฐธรรมนูญ — Vision ต้องใหญ่กว่าตัวผลิตภัณฑ์', () => {
  it('Vision พูดถึงระดับประเทศ ไม่ใช่ระดับ SaaS ตัวหนึ่ง', () => {
    expect(VISION.core).toMatch(/คนไทยทุกคน/);
    expect(VISION.moonshot).toMatch(/Infrastructure/i);
    expect(VISION.moonshot).toMatch(/ระดับโลก/);
  });

  it('🔴 Vision ไม่ใช่พาดหัว — ต้องประกาศไว้ชัด', () => {
    expect(VISION.notAHeadline).toBe(true);
  });

  it('พันธกิจต้องเรียง ไอเดีย → Scale ไม่ข้ามขั้น', () => {
    expect(MISSION_CHAIN[0]).toBe('ไอเดีย');
    expect(MISSION_CHAIN[MISSION_CHAIN.length - 1]).toBe('Scale');
    expect(MISSION_CHAIN).toContain('หลักฐาน');
  });

  it('6 หลักคิดต้องครบ และทุกข้อต้องบอก "ผิดหลักหน้าตาเป็นยังไง"', () => {
    expect(MINDSET).toHaveLength(6);
    for (const m of MINDSET) {
      expect(m.rule.length, m.key).toBeGreaterThan(20);
      expect(m.violation.length, `${m.key} ไม่ได้บอกตัวอย่างการละเมิด`).toBeGreaterThan(10);
    }
  });

  it('Mental model ต้องเริ่มที่ VISION และจบที่ 10x', () => {
    expect(MENTAL_MODEL[0]).toBe('BIG VISION');
    expect(MENTAL_MODEL[MENTAL_MODEL.length - 1]).toBe('10x IMPROVEMENT');
    expect(MENTAL_MODEL).toContain('UPDATE BUSINESS GENOME');
    // ต้องผ่าน MEASURE ก่อน LEARN เสมอ
    expect(MENTAL_MODEL.indexOf('MEASURE')).toBeLessThan(MENTAL_MODEL.indexOf('LEARN'));
  });

  it('Product DNA มีทั้งสองภาษา และสื่อความเดียวกัน', () => {
    expect(PRODUCT_DNA.en).toMatch(/Think Big/);
    expect(PRODUCT_DNA.th).toMatch(/คิดให้ใหญ่/);
    expect(PRODUCT_DNA.th).toMatch(/ขยายอย่างชาญฉลาด/);
  });
});

describe('🔴 Golden Question — "AI ทำได้" ไม่ใช่เหตุผล', () => {
  it('ไม่ให้เหตุผล = ไม่ผ่าน', () => {
    expect(answersGoldenQuestion('').ok).toBe(false);
    expect(answersGoldenQuestion(undefined).ok).toBe(false);
    expect(answersGoldenQuestion('').why).toMatch(/AI ทำได้/);
  });

  it('เหตุผลที่บอกแค่ว่าระบบทำได้ ต้องไม่ผ่าน', () => {
    const r = answersGoldenQuestion('เพราะระบบเรามีฟีเจอร์นี้อยู่แล้ว ทำได้เลย');
    expect(r.ok).toBe(false);
    expect(r.outcomes).toEqual([]);
  });

  it('เหตุผลที่ชี้ไป 1 ใน 4 ปลายทาง = ผ่าน', () => {
    expect(answersGoldenQuestion('ช่วยให้รู้ว่าใครคือลูกค้าที่ยอมจ่าย').outcomes).toContain('ลูกค้า');
    expect(answersGoldenQuestion('ทำให้เก็บหลักฐานจากการทดสอบได้').outcomes).toContain('หลักฐาน');
    expect(answersGoldenQuestion('ทำให้รู้กำไรต่อหน่วยจริง').outcomes).toContain('กำไร');
    expect(answersGoldenQuestion('ทำให้กระบวนการทำซ้ำได้เวลาขยาย').outcomes).toContain('Scale');
  });

  it('ปลายทางที่ยอมรับมีแค่ 4 อย่าง — ห้ามเพิ่มโดยไม่ตั้งใจ', () => {
    expect(VALID_OUTCOMES).toHaveLength(4);
    expect(GOLDEN_QUESTION).toContain('Scale');
  });
});

describe('🔴 Founder Mindset Engine — "อยากยิง Ads 100,000 บาท"', () => {
  it('จำแนกเจตนาได้ถูก — งบใหญ่ = ขยายผล ไม่ใช่การทดลอง', () => {
    expect(classifyAsk('อยากยิง Ads 100,000 บาท')).toBe('paid-scale');
    expect(classifyAsk('อยากขยายสาขาที่ 2')).toBe('scale');
    expect(classifyAsk('ช่วยเขียนคอนเทนต์ให้หน่อย')).toBe('content');
    expect(classifyAsk('อยากสัมภาษณ์ลูกค้า')).toBe('validate');
  });

  it('ธุรกิจที่ยังไม่พร้อม ขอยิงแอด → ต้องถูกกั้น และได้ขั้นต่อไปที่ทำได้จริง', () => {
    const v = founderGate('อยากยิง Ads 100,000 บาท', {});
    expect(v.allow).toBe(false);
    expect(v.intent).toBe('paid-scale');
    expect(v.missing[0].q).toBe('Problem validated?');
    expect(v.nextBestAction).toMatch(/สัมภาษณ์ลูกค้าเป้าหมาย 10 คน/);
    expect(v.why).toMatch(/ยังไม่ควรทำ/);
  });

  it('บอกครบว่าเหลืออีกกี่ด่าน ไม่ใช่บอกทีละข้อแล้วให้เดา', () => {
    const v = founderGate('ยิงแอด 300,000 บาท', {});
    expect(v.intent).toBe('paid-scale');
    expect(v.missing.length).toBe(REQUIRED_BY_INTENT['paid-scale'].length);
    expect(v.why).toMatch(/เหลืออีก 6 ด่าน/);
  });

  /* ── เจ้าของแก้ถูก 24 ส.ค. 2569: paid_validation ≠ paid_scale ─────────────
   * เดิมผมรวมเป็น 'paid-acquisition' ก้อนเดียวแล้วกั้นหมด = hard-block ทุกกรณี
   * ซึ่งขัด Growth Mindset เพราะ **paid ก้อนเล็กคือเครื่องมือหาหลักฐาน**
   * ─────────────────────────────────────────────────────────────────────── */
  it('🔬 ยิงแอดงบเล็กเพื่อหาคำตอบ = การทดลอง ต้องไม่ถูกกั้นแบบเดียวกับการขยายผล', () => {
    expect(classifyAsk('อยากยิงแอด 2,000 บาท ทดสอบพาดหัว')).toBe('paid-validation');
    expect(REQUIRED_BY_INTENT['paid-validation'].length)
      .toBeLessThan(REQUIRED_BY_INTENT['paid-scale'].length);
    // ต้องการแค่ "รู้ว่าคุยกับใคร" + "วัดผลได้" — ไม่บังคับ offer/economics/evidence
    expect(REQUIRED_BY_INTENT['paid-validation']).toEqual(['customer', 'tracking']);
  });

  it('🔬 พร้อม customer + tracking แล้ว ยิงทดลองได้เลย ไม่ต้องรอ evidence', () => {
    const ready = { ...ALL_READY, problem: false, offer: false, unitEconomics: false, evidence: false };
    const v = founderGate('ยิงแอด 3,000 บาท ทดสอบสาร', ready, 'เพื่อเก็บหลักฐานว่าสารไหนทำให้คนกรอก');
    expect(v.intent).toBe('paid-validation');
    expect(v.allow).toBe(true);
  });

  it('🔴 งบใหญ่ต่อให้บอกว่า "ทดสอบ" ก็ยังเป็นการขยายผล — เงินตัดสิน ไม่ใช่คำพูด', () => {
    expect(classifyAsk('ขอทดสอบยิงแอด 100,000 บาท')).toBe('paid-scale');
    expect(classifyAsk('เพิ่มงบแอดอีกหน่อย')).toBe('paid-scale');
  });

  it('อ่านงบจากประโยคได้ทั้งเลขเต็มและหน่วยไทย', () => {
    expect(budgetInAsk('ยิงแอด 100,000 บาท')).toBe(100000);
    expect(budgetInAsk('ยิงแอด 5พัน')).toBe(5000);
    expect(budgetInAsk('ยิงแอด 1 หมื่น')).toBe(10000);
    expect(budgetInAsk('ยิงแอดหน่อย')).toBeNull();   // ไม่ระบุงบ = ไม่เดา
  });

  it('พร้อมครบแล้ว แต่ตอบ Golden Question ไม่ได้ → ยังไม่ให้ทำ', () => {
    const v = founderGate('ยิงแอด', ALL_READY, 'เพราะเรามีงบแล้ว');
    expect(v.missing).toEqual([]);
    expect(v.allow).toBe(false);
    expect(v.nextBestAction).toContain(GOLDEN_QUESTION);
  });

  it('พร้อมครบ + ตอบ Golden Question ได้ → ทำได้ และต้องบันทึกผลกลับ', () => {
    const v = founderGate('ยิงแอด', ALL_READY, 'เพื่อวัดต้นทุนต่อลูกค้าจริง และเก็บหลักฐานว่าสารไหนได้ผล');
    expect(v.allow).toBe(true);
    expect(v.nextBestAction).toMatch(/บันทึกผลกลับเข้า Experiment/);
  });

  it('🔴 การพิสูจน์ต้องทำได้เสมอ — ห้ามกั้น validation', () => {
    expect(REQUIRED_BY_INTENT.validate).toEqual([]);
    const v = founderGate('อยากสัมภาษณ์ลูกค้า 10 คน', {});
    expect(v.allow).toBe(true);
  });

  it('ยิ่งใช้เงิน/ยิ่งขยาย ยิ่งต้องผ่านด่านมากขึ้น', () => {
    expect(REQUIRED_BY_INTENT.scale.length).toBeGreaterThan(REQUIRED_BY_INTENT['paid-validation'].length);
    expect(REQUIRED_BY_INTENT['paid-scale'].length).toBeGreaterThan(REQUIRED_BY_INTENT['paid-validation'].length);
    expect(REQUIRED_BY_INTENT.content.length).toBeLessThanOrEqual(REQUIRED_BY_INTENT['paid-scale'].length);
  });

  it('ทุกด่านต้องบอกทั้งเหตุผลและขั้นต่อไป — ห้ามห้ามเฉย ๆ', () => {
    expect(READINESS_CHECKS).toHaveLength(6);
    for (const c of READINESS_CHECKS) {
      expect(c.why.length, c.key).toBeGreaterThan(20);
      expect(c.nextAction.length, c.key).toBeGreaterThan(15);
    }
  });
});

describe('ความพร้อมต้องอ่านจากข้อมูลจริง ไม่ใช่ให้ผู้ใช้บอกเอง', () => {
  it('จีโนมว่าง = ไม่พร้อมสักด่าน', () => {
    const r = readinessFromGenome({});
    expect(Object.values(r).every((v) => v === false)).toBe(true);
  });

  it('กรอกกิ่ง problem ครบ = ด่าน problem ผ่าน', () => {
    const data: GenomeData = { problem: { severity: 'สูง', frequency: 'ทุกวัน', evidence: 'สัมภาษณ์ 12 ราย' } };
    expect(readinessFromGenome(data).problem).toBe(true);
    expect(readinessFromGenome(data).customer).toBe(false);
  });

  it('ขั้นของพันธกิจต้องเลื่อนตามความพร้อมจริง', () => {
    expect(missionStage({})).toBe('ไอเดีย');
    expect(missionStage({ problem: true })).toBe('ลูกค้า');
    expect(missionStage({ problem: true, customer: true })).toBe('หลักฐาน');
    expect(missionStage(ALL_READY)).toBe('Scale');
  });
});

describe('🔴 รัฐธรรมนูญต้องเดินทางไปกับทุก prompt (เขียนถูก ≠ ถูกเรียกใช้)', () => {
  it('constitutionBlock มี Vision · Mindset · Golden Question ครบ', () => {
    const b = constitutionBlock();
    expect(b).toContain(VISION.core);
    expect(b).toContain(GOLDEN_QUESTION);
    for (const m of MINDSET) expect(b).toContain(m.name);
  });

  it('founderMindsetBlock สั่งห้ามรีบทำตามคำขอ', () => {
    const b = founderMindsetBlock();
    expect(b).toMatch(/ห้ามรีบทำตามที่ผู้ใช้ขอ/);
    expect(b).toMatch(/Validation ก่อน Scale/);
    for (const c of READINESS_CHECKS) expect(b).toContain(c.q);
  });

  it('brandBriefBlock() ต้องพารัฐธรรมนูญติดไปด้วยจริง', async () => {
    const { brandBriefBlock } = await import('../brandBrief');
    const block = brandBriefBlock({ forPublicCopy: true });
    expect(block).toContain(VISION.core);
    expect(block).toContain(GOLDEN_QUESTION);
    expect(block).toMatch(/Validation ก่อน Scale/);
  });
});
