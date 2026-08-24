import { describe, it, expect } from 'vitest';
import {
  MASTER_PRINCIPLE, MARKETING_BRAIN, CONTENT_DNA, CLAIM_RANK, CLAIM_LABEL,
  COMPETITIVE_ALTERNATIVES, STRATEGY_GATE_QUESTIONS,
  reviewCampaign, isPopOnly, podLayerFor, positioningBlock,
  type CampaignBrief,
} from '../positioningEngine';
import { MIN_FOR_RATE } from '../growthPdca';
import { POP, POD } from '../competitiveStrategy';

/** แคมเปญที่ผ่านครบ — ใช้เป็นฐาน แล้วค่อยพังทีละข้อเพื่อพิสูจน์ว่าด่านจับได้ */
const GOOD: CampaignBrief = {
  segment: 'คนทำงานประจำที่อยากมีรายได้เพิ่ม',
  jtbd: 'อยากมีรายได้อีกทาง โดยไม่ต้องลาออกและไม่เสียเงินเก็บ',
  problem: 'อยากมีรายได้เพิ่ม แต่ไม่รู้ว่าจะขายอะไร',
  popExpected: ['AI ช่วยหาไอเดีย', 'สร้างคอนเทนต์ด้วย AI'],
  podClaim: 'Validation Before Spending — ทดสอบว่ามีคนต้องการก่อนลงทุน',
  podEvidence: 'observed',
  vrioSupport: ['thai-playbook', 'business-genome'],
  alternative: 'ChatGPT / Gemini / Claude',
  experiment: 'คุยกับลูกค้าเป้าหมาย 10 คน',
  successMetric: 'สัญญาณปัญหา / ความเต็มใจจ่าย / ข้อโต้แย้ง',
  learnIfWrong: 'ถ้าไม่มีใครมีปัญหานี้ = เปลี่ยน segment ไม่ใช่เปลี่ยนคำโฆษณา',
};

describe('หลักการแม่และลำดับ DNA', () => {
  it('หลักการแม่ต้องพูดว่า "อย่าสร้างคอนเทนต์ให้มากขึ้น"', () => {
    expect(MASTER_PRINCIPLE).toMatch(/อย่าใช้ AI เพื่อสร้าง Content ให้มากขึ้น/);
    expect(MASTER_PRINCIPLE).toMatch(/เรียนรู้/);
  });

  it('🔴 DNA ต้องเริ่มที่ปัญหาลูกค้า ไม่ใช่ AI หรือฟีเจอร์', () => {
    expect(CONTENT_DNA[0]).toBe('Customer Problem');
    expect(CONTENT_DNA[CONTENT_DNA.length - 1]).toBe('Learning');
    // AI ต้องอยู่กลางสาย ในฐานะ "กลไก" ไม่ใช่หัวเรื่อง
    const ai = CONTENT_DNA.findIndex((s) => s.includes('AI'));
    expect(ai).toBeGreaterThan(0);
    expect(ai).toBeLessThan(CONTENT_DNA.length - 1);
  });

  it('Positioning Engine ต้องอยู่ก่อน Message/Content — ไม่ใช่ตรวจทีหลัง', () => {
    const pe = MARKETING_BRAIN.indexOf('Positioning Engine');
    const msg = MARKETING_BRAIN.indexOf('Message / Content');
    expect(pe).toBeGreaterThan(-1);
    expect(pe).toBeLessThan(msg);
    // และวงจรต้องปิดกลับไปที่ VRIO
    expect(MARKETING_BRAIN[MARKETING_BRAIN.length - 1]).toBe('VRIO Strengthens');
  });

  it('ระดับความแน่นอนต้องเรียงจากเดาไปหาพิสูจน์แล้ว และมีคำอธิบายทุกระดับ', () => {
    expect(CLAIM_RANK.hypothesis).toBeLessThan(CLAIM_RANK.research);
    expect(CLAIM_RANK.research).toBeLessThan(CLAIM_RANK.observed);
    expect(CLAIM_RANK.observed).toBeLessThan(CLAIM_RANK.validated);
    for (const k of Object.keys(CLAIM_RANK)) expect(CLAIM_LABEL[k as keyof typeof CLAIM_RANK].length).toBeGreaterThan(10);
  });

  it('ต้องระบุทางเลือกที่ลูกค้าใช้อยู่แล้ว รวมถึง "ไม่ทำอะไรเลย"', () => {
    expect(COMPETITIVE_ALTERNATIVES.join(' ')).toMatch(/ChatGPT/);
    expect(COMPETITIVE_ALTERNATIVES.join(' ')).toMatch(/ไม่ทำอะไรเลย/);
  });
});

describe('ด่าน 10 คำถาม', () => {
  it('ต้องมีครบ 10 ข้อ และแคมเปญที่ตอบครบต้องผ่าน', () => {
    expect(STRATEGY_GATE_QUESTIONS).toHaveLength(10);
    const v = reviewCampaign(GOOD);
    expect(v.unanswered).toEqual([]);
    expect(v.pass).toBe(true);
    expect(v.allowedClaimStrength).toBe('differentiation');
  });

  it('🔴 ตอบไม่ครบ = สร้างไม่ได้ (ไม่ใช่แค่เตือน)', () => {
    const v = reviewCampaign({ ...GOOD, learnIfWrong: undefined, successMetric: '' });
    expect(v.pass).toBe(false);
    expect(v.unanswered).toHaveLength(2);
    expect(v.allowedClaimStrength).toBe('none');
  });
});

describe('กฎบังคับ 4 ข้อ', () => {
  it('POP ONLY → บอกเล่าได้ แต่ห้ามอ้างความได้เปรียบ', () => {
    const v = reviewCampaign({ ...GOOD, podClaim: 'เรามี AI Agent ช่วย SME' });
    expect(v.pass).toBe(false);
    expect(v.blocks.some((b) => b.rule.startsWith('POP ONLY'))).toBe(true);
    expect(v.allowedClaimStrength).toBe('inform');
    // ต้องบอกทางออก ไม่ใช่แค่ห้าม
    expect(v.blocks.find((b) => b.rule.startsWith('POP ONLY'))!.fix).toMatch(/POD/);
  });

  it('NO POD → ห้ามอ้างความต่างแบบแรง', () => {
    const v = reviewCampaign({ ...GOOD, podClaim: 'เราดีที่สุดในตลาด' });
    expect(v.blocks.some((b) => b.rule.startsWith('NO POD'))).toBe(true);
    expect(v.pass).toBe(false);
  });

  it('NO EVIDENCE → claim ต้องคงสถานะเป็นสมมติฐาน', () => {
    const v = reviewCampaign({ ...GOOD, podEvidence: 'hypothesis' });
    expect(v.blocks.some((b) => b.rule.startsWith('NO EVIDENCE'))).toBe(true);
    expect(v.allowedClaimStrength).toBe('hypothesis');
  });

  it('งานวิจัยของคนอื่นยังไม่พอ — ต้องถึง observed ขึ้นไป', () => {
    expect(reviewCampaign({ ...GOOD, podEvidence: 'research' }).pass).toBe(false);
    expect(reviewCampaign({ ...GOOD, podEvidence: 'validated' }).pass).toBe(true);
  });

  it(`LOW SAMPLE (< ${MIN_FOR_RATE}) → ห้ามสรุปผลงาน · ต้องใช้เกณฑ์เดียวกับ growthPdca`, () => {
    const v = reviewCampaign({ ...GOOD, sampleSize: MIN_FOR_RATE - 1 });
    expect(v.blocks.some((b) => b.rule.startsWith('LOW SAMPLE'))).toBe(true);
    expect(v.blocks.find((b) => b.rule.startsWith('LOW SAMPLE'))!.why).toContain(String(MIN_FOR_RATE));
    expect(reviewCampaign({ ...GOOD, sampleSize: MIN_FOR_RATE }).pass).toBe(true);
  });

  it('VRIO ที่อ้าง ต้องมีอยู่จริงในบันได', () => {
    const v = reviewCampaign({ ...GOOD, vrioSupport: ['magic-moat'] });
    expect(v.blocks.some((b) => b.rule === 'VRIO ASSET MUST EXIST')).toBe(true);
  });
});

describe('ตัวจำแนก POP / POD', () => {
  it('ประโยคที่มีแต่คำ POP ต้องถูกจับได้', () => {
    expect(isPopOnly('AI Chat ตอบลูกค้าให้คุณ')).toBe(true);
    expect(isPopOnly('Dashboard ดูยอดขายแบบเรียลไทม์')).toBe(true);
  });

  it('ประโยคที่ยึดชั้น POD ต้องไม่ถูกจับว่าเป็น POP แม้จะมีคำว่า AI', () => {
    expect(isPopOnly('Validation Before Spending — ให้ AI ช่วยทดสอบก่อนลงเงิน')).toBe(false);
    expect(podLayerFor('Validation Before Spending')!.layer).toBe(2);
  });

  it('ทุกชั้น POD ต้องถูกจำแนกกลับมาได้จากชื่อของตัวเอง', () => {
    for (const p of POD) expect(podLayerFor(p.name)?.name, p.name).toBe(p.name);
  });

  it('POP ทุกคำที่ยกมาเดี่ยว ๆ ต้องไม่ถูกนับเป็น POD', () => {
    for (const item of ['AI Chat', 'Dashboard', 'AI Agent']) {
      expect(POP).toContain(item as typeof POP[number]);
      expect(podLayerFor(item), item).toBeNull();
    }
  });
});

describe('positioningBlock — บล็อกที่ส่งเข้า prompt ของทุก agent', () => {
  it('ต้องมีหลักการแม่ · DNA · 10 คำถาม · กฎ 4 ข้อ', () => {
    const b = positioningBlock();
    expect(b).toContain(MASTER_PRINCIPLE);
    expect(b).toContain(CONTENT_DNA.join(' → '));
    for (const q of STRATEGY_GATE_QUESTIONS) expect(b).toContain(q.q);
    for (const r of ['NO POD', 'NO EVIDENCE', 'LOW SAMPLE', 'POP ONLY']) expect(b).toContain(r);
  });

  it('ต้องสั่งให้พาดหัวขึ้นด้วยปัญหา ไม่ใช่ชื่อหมวดหมู่', () => {
    expect(positioningBlock()).toMatch(/พาดหัวต้องขึ้นด้วย: ปัญหาของลูกค้า/);
    expect(reviewCampaign(GOOD).hookMustLeadWith).toMatch(/ห้ามขึ้นด้วยชื่อหมวดหมู่/);
  });
});

/* ── ด่านนี้ต้องถูกเสียบเข้า prompt จริง ไม่ใช่มีไว้เฉย ๆ ────────────────────
 * บทเรียนของโปรเจกต์: "เขียนถูก ≠ ถูกเรียกใช้" (skill shipped-not-written)
 * เครื่องมือทุกตัวตรวจว่าโค้ดถูก แต่ไม่มีตัวไหนตรวจว่าโค้ดถูกเรียก */
describe('🔴 ด่านต้องถูกเรียกใช้จริงในสายที่ AI ใช้เขียนงาน', () => {
  it('brandBriefBlock() ต้องมีด่านนี้อยู่ข้างใน', async () => {
    const { brandBriefBlock } = await import('../brandBrief');
    const block = brandBriefBlock({ forPublicCopy: true });
    expect(block).toContain(MASTER_PRINCIPLE);
    expect(block).toContain('NO POD');
    expect(block).toContain('LOW SAMPLE');
    for (const q of STRATEGY_GATE_QUESTIONS.slice(0, 3)) expect(block).toContain(q.q);
  });

  it('prompt การตลาดหลักต้องพา block นี้ติดไปด้วย', async () => {
    const { growthPrompt } = await import('../growthAnalysis');
    const p = growthPrompt({ facts: ['ผู้เข้าชม 80 คน'], cannotConclude: [], enough: false });
    expect(p).toContain('Positioning Engine');
    expect(p).toContain('POP ONLY');
  });
});

/* ── ตัวอย่างที่เจ้าของเขียนไว้ ต้องผ่านด่านจริง ──────────────────────────
 * ถ้าตัวอย่างในเอกสารผ่านด่านไม่ได้ แปลว่าด่านหรือตัวอย่างข้อใดข้อหนึ่งผิด */
describe('ตัวอย่างจริง: คนทำงานประจำอยากเริ่มธุรกิจ', () => {
  it('hook ที่เจ้าของเขียนต้องเป็นปัญหา ไม่ใช่ความสามารถ AI', () => {
    const hook = 'อย่าเพิ่งลาออกจากงานเพื่อเริ่มธุรกิจ จนกว่าคุณจะตอบได้ว่า ลูกค้า 10 คนแรกคือใคร';
    expect(isPopOnly(hook)).toBe(false);
    expect(hook).not.toMatch(/AI Agent|AI Chat|Dashboard/);
  });

  it('เวอร์ชันที่ AI "ไม่ควรเริ่ม" ต้องถูกด่านปัดตก', () => {
    const bad = reviewCampaign({ ...GOOD, podClaim: 'CEO AI Thailand มี AI Agent ช่วยสร้างธุรกิจ' });
    expect(bad.pass).toBe(false);
    expect(bad.allowedClaimStrength).toBe('inform');
  });
});
