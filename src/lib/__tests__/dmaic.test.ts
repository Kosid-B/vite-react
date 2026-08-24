import { describe, it, expect } from 'vitest';
import {
  PHASES, PHASE_DELIVERABLE, MIN_OPTIONS, DO_NOTHING, FAST_SIGNAL_DAYS,
  scoreOption, rankOptions, chooseBest, dmaicGate, dmaicBlock,
  type Option, type DmaicCase,
} from '../dmaic';
import { MIN_FOR_RATE } from '../growthPdca';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const opt = (o: Partial<Option> & { name: string }): Option => ({
  impact: 3, effort: 3, evidence: 'hypothesis', reversible: true, daysToSignal: 14, ...o,
});

/** เคสตัวอย่างที่ผ่านทุกเฟสจนถึง Improve — ใช้เป็นฐานแล้วถอดทีละชิ้นเพื่อดูว่าด่านจับได้ไหม */
const CASE: DmaicCase = {
  problem: 'คนกรอกเครื่องคำนวณบนหน้า Landing น้อยกว่าที่ควร',
  target: { metric: 'จำนวนคนกรอก/สัปดาห์', from: 0, to: 20, byDays: 14 },
  baseline: 0,
  sample: 80,
  rootCause: 'ช่องกรอกแรกอยู่ใต้ขอบจอบนมือถือทุกความกว้าง',
  options: [
    opt({ name: DO_NOTHING, impact: 1, effort: 1, evidence: 'validated', daysToSignal: 30 }),
    opt({ name: 'ย้ายช่องกรอกขึ้นเหนือขอบจอ', impact: 5, effort: 2, evidence: 'observed', daysToSignal: 7 }),
    opt({ name: 'เขียนหน้า Landing ใหม่ทั้งหน้า', impact: 5, effort: 5, evidence: 'hypothesis', reversible: false, daysToSignal: 45 }),
  ],
};

describe('DMAIC — โครงของเฟส', () => {
  it('5 เฟสเรียงถูก และทุกเฟสบอกว่าต้องส่งมอบอะไร ไม่ใช่บอกว่าให้ "ทำ"', () => {
    expect(PHASES).toEqual(['Define', 'Measure', 'Analyze', 'Improve', 'Control']);
    for (const p of PHASES) expect(PHASE_DELIVERABLE[p].length, p).toBeGreaterThan(20);
  });

  it('🔴 Improve ต้องบังคับให้มีทางเลือก ไม่ใช่ให้ "ปรับปรุง"', () => {
    expect(PHASE_DELIVERABLE.Improve).toMatch(/ทางเลือก/);
    expect(PHASE_DELIVERABLE.Improve).toContain(DO_NOTHING);
    expect(MIN_OPTIONS).toBeGreaterThanOrEqual(3);
  });

  it('ใช้เกณฑ์ตัวอย่างขั้นต่ำร่วมกับ growthPdca — ห้ามนิยามเลขใหม่', () => {
    const v = dmaicGate({ ...CASE, sample: MIN_FOR_RATE - 1 });
    expect(v.blindSpots.join(' ')).toContain(String(MIN_FOR_RATE));
  });
});

describe('การให้คะแนน — เร็วที่จะรู้ผล มีค่ากว่าผลใหญ่ที่ต้องรอ', () => {
  it('ผลเท่ากัน แต่รู้ผลเร็วกว่า ต้องได้คะแนนสูงกว่า', () => {
    const fast = scoreOption(opt({ name: 'a', impact: 4, daysToSignal: 3 }));
    const slow = scoreOption(opt({ name: 'b', impact: 4, daysToSignal: 60 }));
    expect(fast.score).toBeGreaterThan(slow.score);
  });

  it('หลักฐานแข็งกว่า ได้คะแนนสูงกว่าเมื่อทุกอย่างเท่ากัน', () => {
    expect(scoreOption(opt({ name: 'a', evidence: 'observed' })).score)
      .toBeGreaterThan(scoreOption(opt({ name: 'a', evidence: 'hypothesis' })).score);
  });

  it('ถอยกลับไม่ได้ = คะแนนต่ำกว่า (ราคาของความผิดสูงกว่า)', () => {
    expect(scoreOption(opt({ name: 'a', reversible: false })).score)
      .toBeLessThan(scoreOption(opt({ name: 'a', reversible: true })).score);
  });

  it('🔴 ของที่ติดกฎโปรเจกต์ ต้องได้ 0 และตกท้ายแถวเสมอ แม้จะดูดีที่สุด', () => {
    const ranked = rankOptions([
      opt({ name: 'ทำตารางใหม่ใน DB', impact: 5, effort: 1, evidence: 'validated', daysToSignal: 1, blockedBy: 'Gate B ยังไม่ปิด' }),
      opt({ name: 'แก้ CSS', impact: 2, daysToSignal: 7 }),
    ]);
    expect(ranked[0].name).toBe('แก้ CSS');
    expect(ranked[1].score).toBe(0);
    expect(ranked[1].why).toContain('Gate B');
  });
});

describe('🔴 การเลือก — ต้องคืนข้อเสนอ ไม่ใช่คืนตาราง', () => {
  it('เลือกทางที่ผลแรง แรงน้อย และรู้ผลเร็ว', () => {
    const r = chooseBest(CASE.options!);
    expect(r.best?.name).toBe('ย้ายช่องกรอกขึ้นเหนือขอบจอ');
    expect(r.line).toMatch(/^เลือก "/);
  });

  it('ต้องบอกด้วยว่าทำไมไม่เอาอันดับสอง — การเลือกที่ไม่มีคู่เทียบ = การรายงาน', () => {
    expect(chooseBest(CASE.options!).whyNotRunnerUp.length).toBeGreaterThan(10);
  });

  it('ทางที่ติดกฎต้องถูกบอกว่า "พักไว้" ไม่ใช่หายไปเงียบ ๆ', () => {
    const r = chooseBest([...CASE.options!, opt({ name: 'เพิ่มตาราง', blockedBy: 'Gate B ยังไม่ปิด' })]);
    expect(r.parked.map((p) => p.name)).toContain('เพิ่มตาราง');
  });

  it('ทุกทางติดกฎ = บอกตรง ๆ ว่าเลือกไม่ได้ ห้ามฝืนเลือก', () => {
    const r = chooseBest([opt({ name: 'x', blockedBy: 'Gate B' }), opt({ name: 'y', blockedBy: 'Gate B' })]);
    expect(r.best).toBeNull();
    expect(r.line).toMatch(/ยังเลือกไม่ได้/);
  });
});

describe('🔴 ด่าน DMAIC — ความผิดที่กันคือ "หยุดอยู่ที่ Analyze"', () => {
  it('เป้าหมายที่ไม่เป็นตัวเลข = ติดที่ Define', () => {
    const v = dmaicGate({ problem: 'ยอดตก' });
    expect(v.stuckAt).toBe('Define');
    expect(v.nextAction).toMatch(/ตัวเลข/);
  });

  it('ไม่มีค่าตั้งต้นและไม่บอกว่าทำไม = ติดที่ Measure', () => {
    const noBase: DmaicCase = { ...CASE };
    delete noBase.baseline;
    expect(dmaicGate(noBase).stuckAt).toBe('Measure');
  });

  it('🔴 วัดไม่ได้ = เดินต่อได้ แต่ต้องประกาศเป็นจุดบอด และงานแรกคือซ่อมการวัด', () => {
    const v = dmaicGate({ ...CASE, baseline: null, baselineBlindReason: 'Amplitude ไม่ได้รับ event' });
    expect(v.stuckAt).not.toBe('Measure');
    expect(v.blindSpots[0]).toMatch(/ซ่อมการวัด/);
  });

  it('ยังไม่รู้สาเหตุราก = ติดที่ Analyze ห้ามข้ามไปแก้', () => {
    const noCause: DmaicCase = { ...CASE };
    delete noCause.rootCause;
    expect(dmaicGate(noCause).stuckAt).toBe('Analyze');
  });

  it('🔴 รู้สาเหตุแล้วแต่ไม่มีทางเลือก = ติดที่ Improve และต้องสั่งให้ "หยุดวิเคราะห์"', () => {
    const v = dmaicGate({ ...CASE, options: [] });
    expect(v.stuckAt).toBe('Improve');
    expect(v.nextAction).toMatch(/หยุดวิเคราะห์/);
    expect(v.nextAction).toMatch(/ยังไม่ได้ทำงาน/);
  });

  it('🔴 ขาดทางเลือก "ไม่ทำอะไรเลย" = ยังไม่ผ่าน แม้จะมีครบ 3 ทาง', () => {
    const v = dmaicGate({
      ...CASE,
      options: [opt({ name: 'a' }), opt({ name: 'b' }), opt({ name: 'c' })],
    });
    expect(v.stuckAt).toBe('Improve');
    expect(v.nextAction).toContain(DO_NOTHING);
  });

  it('ครบแล้วแต่ยังไม่เลือก = ระบบเลือกให้ และ nextAction คือข้อเสนอ ไม่ใช่คำถาม', () => {
    const v = dmaicGate(CASE);
    expect(v.canDecide).toBe(true);
    expect(v.recommendation?.best?.name).toBe('ย้ายช่องกรอกขึ้นเหนือขอบจอ');
    expect(v.nextAction).toMatch(/^เลือก "/);
    expect(v.nextAction).not.toMatch(/\?$/);
  });

  it('เลือกแล้วแต่ไม่มีกลไกกันไหลกลับ = ติดที่ Control', () => {
    const v = dmaicGate({ ...CASE, chosen: 'ย้ายช่องกรอกขึ้นเหนือขอบจอ' });
    expect(v.stuckAt).toBe('Control');
    expect(v.nextAction).toMatch(/กลับมาเหมือนเดิม/);
  });

  it('ครบทุกเฟส = ปิดรอบ และชี้ไปรอบถัดไป ไม่ใช่จบเฉย ๆ', () => {
    const v = dmaicGate({ ...CASE, chosen: 'ย้ายช่องกรอกขึ้นเหนือขอบจอ', control: 'mobileFoldContract.test.ts' });
    expect(v.stuckAt).toBeNull();
    expect(v.nextAction).toMatch(/รอบถัดไป/);
  });
});

describe('🔴 DMAIC ต้องเดินทางไปกับ prompt (เขียนถูก ≠ ถูกเรียกใช้)', () => {
  it('dmaicBlock สั่งห้ามจบที่รายการปัญหา และสั่งให้ขึ้นต้นด้วยข้อเสนอ', () => {
    const b = dmaicBlock();
    expect(b).toMatch(/ห้ามจบที่/);
    expect(b).toContain(DO_NOTHING);
    expect(b).toMatch(/ขึ้นต้นด้วย \*\*ข้อเสนอ\*\*/);
    expect(b).toContain(String(FAST_SIGNAL_DAYS));
    for (const p of PHASES) expect(b).toContain(p);
  });

  it('brandBriefBlock() ต้องพา DMAIC ติดไปด้วยจริง', async () => {
    const { brandBriefBlock } = await import('../brandBrief');
    expect(brandBriefBlock({ forPublicCopy: true })).toMatch(/ห้ามจบที่/);
  });
});

/* ── skill กับโค้ดต้องผูกกัน ────────────────────────────────────────────────
 * ledger #41: เอกสารที่ไม่มีอะไรผูกไว้ จะกลายเป็นของที่ผิดโดยไม่มีใครรู้
 * ⇒ แก้ค่าคงที่ในโค้ดแล้วไม่แก้ skill = แดงทันที
 * ──────────────────────────────────────────────────────────────────────── */
describe('🔴 skill `dmaic` ต้องพูดตรงกับ src/lib/dmaic.ts', () => {
  const SKILL = readFileSync(resolve(__dirname, '../../../.claude/skills/dmaic/SKILL.md'), 'utf8');

  it('skill ต้องบอกทั้ง 5 เฟส และสิ่งที่แต่ละเฟสส่งมอบ', () => {
    for (const p of PHASES) expect(SKILL, `skill ขาดเฟส ${p}`).toContain(p);
    expect(SKILL).toContain(DO_NOTHING);
  });

  it('เกณฑ์ "เร็วที่จะรู้ผล" ในเอกสารต้องตรงกับค่าในโค้ด', () => {
    expect(SKILL).toContain(`${FAST_SIGNAL_DAYS} วัน`);
  });

  it('เกณฑ์ตัวอย่างขั้นต่ำต้องอ้างค่าเดียวกับ growthPdca ไม่ใช่เขียนเลขใหม่', () => {
    expect(SKILL).toContain(`MIN_FOR_RATE = ${MIN_FOR_RATE}`);
  });

  it('🔴 skill ต้องระบุความผิดที่มันมีไว้กัน — skill ที่ไม่บอกว่ากันอะไร จะถูกอ่านข้าม', () => {
    expect(SKILL).toMatch(/หยุดอยู่ที่ Analyze/);
    expect(SKILL).toMatch(/ผลักภาระ|โยนงาน/);
  });

  it('skill ต้องสั่งให้บรรทัดแรกเป็นข้อเสนอ (เวลาของเจ้าของคือทรัพยากรที่แพงที่สุด)', () => {
    expect(SKILL).toMatch(/บรรทัดแรกของคำตอบคือข้อเสนอ/);
  });

  it('ต้องประกาศว่ากฎสูงสุด (ความถูกต้อง) ยังอยู่เหนือ skill นี้', () => {
    expect(SKILL).toMatch(/ความถูกต้องมาก่อน/);
    expect(SKILL).toMatch(/ตรวจไม่ได้ ยังต้องบอกว่าตรวจไม่ได้/);
  });
});
