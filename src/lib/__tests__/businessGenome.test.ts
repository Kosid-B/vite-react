import { describe, it, expect } from 'vitest';
import {
  GENOME_BRANCHES, NOT_GENOME, WHY_NOT_GENOME,
  genomeStatus, stuckBranch, journeyGaps, confidenceOf,
  type GenomeData, type EvidenceNode,
} from '../businessGenome';
import { CUSTOMER_JOURNEY } from '../brandBrief';
import {
  assessDifferentiation, KNOWN_MARKET, COPY_DIFFICULTY_WHY,
} from '../competitorMemory';
import { VRIO_ASSETS, vrioVerdict, NORTH_STAR } from '../competitiveStrategy';

describe('Business Genome — โครงข้อมูลที่เป็นหัวใจของ moat', () => {
  it('ต้องมีครบ 8 กิ่ง และทุกกิ่งต้องมีช่องข้อมูลจริง', () => {
    expect(GENOME_BRANCHES).toHaveLength(8);
    for (const b of GENOME_BRANCHES) {
      expect(b.fields.length, `${b.key} ไม่มีช่องข้อมูล`).toBeGreaterThan(1);
      expect(b.journeyStep).toBeGreaterThan(0);
    }
  });

  it('🔴 ทุกขั้นของ Customer Journey (1–7) ต้องมีกิ่งรองรับ — ห้ามสัญญาสิ่งที่เก็บข้อมูลไม่ได้', () => {
    expect(journeyGaps(), `ขั้นที่ไม่มีกิ่งรองรับ: ${journeyGaps().join(',')}`).toEqual([]);
    expect(CUSTOMER_JOURNEY.length).toBe(10);
  });

  it('ต้องบอกได้ว่าธุรกิจติดอยู่กิ่งไหน โดยไม่ต้องถามเจ้าของซ้ำ', () => {
    const data: GenomeData = {
      business: { founderGoal: 'มีรายได้เสริม', industry: 'อาหาร', stage: 'idea' },
      customer: { segment: 'พนักงานออฟฟิศ' },   // ยังไม่ครบ
    };
    const stuck = stuckBranch(data);
    expect(stuck?.key).toBe('customer');
    expect(stuck?.missing).toContain('jtbd');
    expect(stuck?.filled).toBe(1);
  });

  it('จีโนมว่างเปล่า ต้องติดที่กิ่งแรกสุด ไม่ใช่บอกว่า "พร้อมแล้ว"', () => {
    expect(stuckBranch({})?.key).toBe('business');
    expect(genomeStatus({}).every((b) => !b.complete)).toBe(true);
  });

  it('🔴 ต้องประกาศชัดว่าอะไร "ไม่ใช่" จีโนม — กันคนเอา chat history มาคิดว่าได้ moat', () => {
    expect(NOT_GENOME.join(' ')).toMatch(/ประวัติแชต/);
    expect(NOT_GENOME.join(' ')).toMatch(/prompt/);
    expect(WHY_NOT_GENOME).toMatch(/ลอกได้ทันที|เปลี่ยนผู้ให้บริการ/);
  });
});

describe('Evidence Graph — ความมั่นใจต้องคำนวณจากสิ่งที่กรอกจริง', () => {
  const base: EvidenceNode = {
    claim: 'เจ้าของร้านอาหารต้องการลด food cost',
    hypothesis: 'ร้านส่วนใหญ่ไม่รู้ต้นทุนต่อจานจริง',
    method: 'สัมภาษณ์ 20 ร้าน',
  };

  it('มีแค่สมมติฐาน + วิธี = research ยังไม่ใช่ observed', () => {
    expect(confidenceOf(base)).toBe('research');
  });

  it('มีสิ่งที่สังเกตได้ = observed', () => {
    expect(confidenceOf({ ...base, observed: '14 ร้านมีปัญหา cost variance' })).toBe('observed');
  });

  it('🔴 validated ต้องมีทั้งผลจริง **และ** บทเรียน — ผลอย่างเดียวไม่พอ', () => {
    expect(confidenceOf({ ...base, observed: 'x', outcome: '3 ร้านซื้อ' })).toBe('observed');
    expect(confidenceOf({
      ...base, observed: 'x', outcome: '3 ร้านซื้อ',
      learning: 'pain จริง แต่ willingness-to-pay ขึ้นกับขนาดร้าน',
    })).toBe('validated');
  });

  it('ไม่มีอะไรเลย = hypothesis (ห้าม default เป็นอย่างอื่น)', () => {
    expect(confidenceOf({ claim: 'a', hypothesis: '', method: '' })).toBe('hypothesis');
  });
});

describe('Competitor Memory — กันระบบพูดว่า "ต่าง" ทั้งที่ตลาดพูดกันหมด', () => {
  it('🔴 ข้อที่คู่แข่งพูดเหมือนกัน ต้องถูกตัดสินเป็น POP', () => {
    const r = assessDifferentiation('AI Agent', KNOWN_MARKET, 'hard', 'validated');
    expect(r.verdict).toBe('pop');
    expect(r.alsoClaimedBy.length).toBeGreaterThan(0);
    expect(r.nextStep).toMatch(/หาข้อที่ไม่มีใคร/);
  });

  it('ไม่มีใครพูด แต่ลอกง่าย = Weak POD', () => {
    const r = assessDifferentiation('เทมเพลตแผนธุรกิจ 50 แบบ', KNOWN_MARKET, 'easy', 'validated');
    expect(r.verdict).toBe('weak-pod');
    expect(r.why).toContain(COPY_DIFFICULTY_WHY.easy);
  });

  it('ลอกยาก แต่ยังไม่มีหลักฐาน = ยังเป็นสมมติฐาน', () => {
    expect(assessDifferentiation('กฎการตัดสินใจจากผลลัพธ์ธุรกิจไทย', KNOWN_MARKET, 'very-hard', 'hypothesis').verdict)
      .toBe('hypothesis-pod');
  });

  it('ลอกยาก + มีหลักฐาน = Strategic POD', () => {
    expect(assessDifferentiation('กฎการตัดสินใจจากผลลัพธ์ธุรกิจไทย', KNOWN_MARKET, 'very-hard', 'observed').verdict)
      .toBe('strategic-pod');
  });

  it('ตลาดที่จำไว้ต้องรวม "ไม่ทำอะไรเลย" — คู่แข่งที่ชนะบ่อยที่สุด', () => {
    expect(KNOWN_MARKET.map((m) => m.name).join(' ')).toMatch(/ไม่ทำอะไรเลย/);
    // ทุกรายต้องมีช่องว่างที่ระบุได้ ไม่งั้นจำไว้ก็ไม่ได้ใช้
    for (const m of KNOWN_MARKET) expect(m.whiteSpace?.length, m.name).toBeGreaterThan(0);
  });
});

describe('VRIO Engine — R และ I เป็นตัวชี้ขาด ไม่ใช่ V', () => {
  it('V สูงแต่ R/I ต่ำ = POP เสมอ (AI Content)', () => {
    const ai = VRIO_ASSETS.find((a) => a.asset === 'AI Content')!;
    expect(ai.score.v).toBe(5);
    expect(vrioVerdict(ai.score)).toBe('POP');
  });

  it('บันไดคะแนนต้องไล่ขึ้นจริง — Benchmark Network ต้องแรงที่สุด', () => {
    expect(vrioVerdict(VRIO_ASSETS.find((a) => a.asset === 'Benchmark Network')!.score)).toBe('Strong Moat');
    expect(vrioVerdict(VRIO_ASSETS.find((a) => a.asset === 'Business Genome')!.score)).toBe('Emerging Moat');
    expect(vrioVerdict(VRIO_ASSETS.find((a) => a.asset === 'MIT Workflow')!.score)).toBe('Temporary POD');
  });

  it('🔴 O ต่ำต้องไม่ถูกปัดขึ้นเป็น Strong Moat — ของที่ยังไม่ได้สร้างต้องดูเหมือนยังไม่ได้สร้าง', () => {
    expect(vrioVerdict({ v: 5, r: 5, i: 5, o: 1 })).toBe('Potential Moat');
    expect(vrioVerdict({ v: 5, r: 5, i: 5, o: 5 })).toBe('Strong Moat');
  });
});

describe('North Star ที่เจ้าของสั่ง freeze', () => {
  it('ห่วงโซ่ POD → MOAT ต้องเริ่มที่ POD และจบที่ MOAT ไม่ข้ามขั้น', () => {
    expect(NORTH_STAR.chain[0]).toBe('POD');
    expect(NORTH_STAR.chain[NORTH_STAR.chain.length - 1]).toBe('MOAT');
    expect(NORTH_STAR.chain).toContain('Structured Business Data');
    expect(NORTH_STAR.chain).toContain('Data Network Effect');
  });

  it('เป็นป้ายภายใน — ต้องยาวเกินกว่าจะเป็นพาดหัว และมีคำสัญญากำกับ', () => {
    expect(NORTH_STAR.label).toMatch(/Validation-to-Scale/);
    expect(NORTH_STAR.promise).toMatch(/Next Best Business Action/);
  });
});
