import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BEATS, FORBIDDEN_TRIGGERS, MID_PAGE_MAX_RELIEF_RUN, arcIssues, flatnessDebt, emotionalArcBlock, type Phase } from '../emotionalArc';

/* ══════════════════════════════════════════════════════════════════════════
 * ⚠️ ที่มาของหลักการ: skill `ai-dark-marketing` ที่ sync มา **ไม่มีเนื้อหาฮอร์โมน**
 *    ⇒ ไฟล์นี้เป็นการออกแบบของเรา ไม่ใช่การถอดจาก skill นั้น (เขียนไว้ในหัวไฟล์ด้วย)
 *
 * 🔴 สิ่งที่เทสต์นี้กัน: จังหวะอารมณ์ถูกใช้เป็นข้ออ้างให้ทำ dark pattern
 *    ⇒ ทุกจังหวะต้องบอกได้ว่า "ซื่อสัตย์ได้เพราะอะไร" และทุกข้อห้ามต้องมีของแทนที่
 * ══════════════════════════════════════════════════════════════════════════ */

const LANDING = () => readFileSync(resolve(__dirname, '../../pages/LandingPage.tsx'), 'utf8');

/** ลำดับ section ตาม "ลำดับในไฟล์" — อ่านจากไฟล์ ไม่ใช่จากความจำ
 *  🔴 ตัวคัดต้องยอมตัวเลขด้วย: ชื่อจริงมี `how_30s` — regex เดิม `[a-z_]+` มองข้ามมันทั้งบล็อก
 *     (อ่านได้ 34 จาก 35 แล้วรายงานว่า "ครบ") = ตัวตรวจที่เดินไม่ครบ ตระกูลเดียวกับ ledger #35 */
function realOrder(): string[] {
  return [...LANDING().matchAll(/data-sec="([a-z0-9_]+)"/g)].map((m) => m[1]);
}

/* ══ ② หน้าเดียวกันแสดงได้ 8 แบบ — ตรวจแบบเดียวคือตรวจไม่ครบ ═════════════════
 *   · abShowNew  (A/B holdout)      → try_ai + why_trust_ai แสดง/ไม่แสดง
 *   · layoutAb   ('proof_first')    → สลับก้อน explain ↔ proof
 *   · persona    (มีข้อมูลพอไหม)     → persona_banner แสดง/ไม่แสดง
 *   ⇒ baseline ต้องเป็น **แบบที่แย่ที่สุด** ไม่ใช่แบบที่บังเอิญเรียงอยู่ในไฟล์
 * ══════════════════════════════════════════════════════════════════════════ */
const OPTIONAL_AB = ['try_ai', 'why_trust_ai'];
const OPTIONAL_PERSONA = ['persona_banner'];
const EXPLAIN_GROUP = ['compare', 'trust_bar', 'how_30s', 'gain_points', 'skills'];
const PROOF_GROUP = ['market_demand', 'pricing_calc', 'roi_calc', 'instant_preview', 'credibility_bar'];

/** ลำดับที่ผู้ใช้เห็นจริงในแต่ละกรณี */
function renderedOrder(o: { abNew: boolean; proofFirst: boolean; persona: boolean }): string[] {
  const base = realOrder().filter(
    (s) => (o.abNew || !OPTIONAL_AB.includes(s)) && (o.persona || !OPTIONAL_PERSONA.includes(s)),
  );
  if (!o.proofFirst) return base;
  const grouped = new Set([...EXPLAIN_GROUP, ...PROOF_GROUP]);
  const at = base.findIndex((s) => grouped.has(s));
  const rest = base.filter((s) => !grouped.has(s));
  return [...rest.slice(0, at), ...PROOF_GROUP, ...EXPLAIN_GROUP, ...rest.slice(at)];
}

const VARIANTS = [true, false].flatMap((abNew) =>
  [true, false].flatMap((proofFirst) => [true, false].map((persona) => ({ abNew, proofFirst, persona }))),
);
const label = (v: { abNew: boolean; proofFirst: boolean; persona: boolean }) =>
  `abNew=${+v.abNew} proofFirst=${+v.proofFirst} persona=${+v.persona}`;
const withPhase = (order: string[]) => order.map((sec) => ({ sec, phase: PHASE[sec] }));

/** ป้ายว่าแต่ละ section เป็นความตึงหรือความโล่ง (ตัดสินจากหน้าที่ของมัน) */
const PHASE: Record<string, Phase> = {
  hero: 'tension',            // คำถามที่เขาตอบไม่ได้
  quickcheck: 'relief',       // ได้ตัวเลขของตัวเองกลับไป = รางวัล
  positioning: 'relief',
  roadmap: 'relief',
  why_not_chatgpt: 'tension', // เทียบกับของที่เขาใช้อยู่ แล้วเห็นช่องว่าง
  try_ai: 'relief',
  skills: 'relief',
  // — บล็อกที่เพิ่งติดป้ายครบ 26 ส.ค. 2569 —
  // เครื่องมือที่ "ตอบคำถามให้" = โล่ง · การเทียบที่ "ทำให้เห็นช่องว่าง" = ตึง
  returning: 'relief',
  why_trust_ai: 'relief',
  market_sizer: 'relief',        // เครื่องมือ → ได้คำตอบ
  persona_banner: 'relief',
  trust_bar: 'relief',
  how_30s: 'relief',
  gain_points: 'relief',
  market_demand: 'tension',      // เห็นว่าดีมานด์มีอยู่ แต่เรายังไม่ได้รับ
  pricing_calc: 'relief',
  roi_calc: 'relief',
  instant_preview: 'relief',
  lead_capture: 'relief',
  value_compare: 'tension',      // เทียบแล้วเห็นว่าวิธีเดิมแพงกว่า
  value_timeline: 'relief',
  community: 'relief',
  credibility_bar: 'relief',
  consultant_proof: 'relief',
  testimonials: 'relief',
  how_it_works: 'relief',
  features: 'relief',
  compare: 'tension',         // เทียบแล้วเห็นว่าของเดิมไม่พอ
  team: 'relief',
  self_serve: 'relief',
  outcomes: 'relief',
  case_studies: 'relief',
  trust: 'relief',
  pricing: 'tension',         // ต้องตัดสินใจ
  final_cta: 'relief',
};

describe('จังหวะอารมณ์ — โครงสร้าง', () => {
  it('ต้องสลับตึง/โล่ง และเริ่มด้วยความตึง', () => {
    expect(BEATS[0].phase).toBe('tension');
    expect(BEATS.filter((b) => b.phase === 'tension').length).toBeGreaterThanOrEqual(3);
    expect(BEATS.filter((b) => b.phase === 'relief').length).toBeGreaterThanOrEqual(3);
  });

  it('🔴 ทุกจังหวะต้องมีของจริงในระบบทำหน้าที่ — ห้ามอ้างของที่ยังไม่ได้สร้าง', () => {
    for (const b of BEATS) {
      expect(b.deliveredBy.length, b.key).toBeGreaterThan(10);
      expect(b.honestBecause.length, `${b.key} ไม่ได้บอกว่าซื่อสัตย์ได้เพราะอะไร`).toBeGreaterThan(25);
    }
  });

  it('ของที่อ้างว่าทำหน้าที่แต่ละจังหวะ ต้องมีอยู่จริงในโค้ด', () => {
    const src = (f: string) => readFileSync(resolve(__dirname, '..', f), 'utf8');
    expect(src('productQuickCheck.ts')).toMatch(/verdictOf/);
    expect(src('nextProblems.ts')).toMatch(/nextProblemsFor/);
    expect(src('trialRoadmap.ts')).toMatch(/nextStep/);
    expect(src('brandBrief.ts')).toMatch(/CUSTOMER_JOURNEY/);
  });

  it('🔴 ทุกข้อห้ามต้องมี "ใช้อะไรแทน" — กฎที่ห้ามเฉย ๆ จะถูกละเมิดตอนยอดไม่เข้าเป้า', () => {
    expect(FORBIDDEN_TRIGGERS.length).toBeGreaterThanOrEqual(4);
    for (const f of FORBIDDEN_TRIGGERS) {
      expect(f.insteadUse.length, f.trick).toBeGreaterThan(25);
      expect(f.why.length, f.trick).toBeGreaterThan(20);
    }
  });

  it('ข้อห้ามต้องตรงกับกฎแบรนด์ที่มีอยู่แล้ว ไม่ใช่กฎชุดใหม่', () => {
    const brand = readFileSync(resolve(__dirname, '../brandBrief.ts'), 'utf8');
    expect(brand).toMatch(/นับถอยคน?ปลอม|นับถอยหลังปลอม/);
    expect(FORBIDDEN_TRIGGERS.map((f) => f.trick).join(' ')).toMatch(/นับถอยหลัง/);
    expect(FORBIDDEN_TRIGGERS.map((f) => f.trick).join(' ')).toMatch(/รีวิว/);
  });
});

describe('ตัวตรวจจังหวะ', () => {
  it('ให้ความมั่นใจก่อนสร้างความตึง = blocker', () => {
    const issues = arcIssues([
      { sec: 'proof', phase: 'relief' }, { sec: 'team', phase: 'relief' }, { sec: 'hero', phase: 'tension' },
    ]);
    expect(issues.some((i) => i.level === 'blocker')).toBe(true);
  });

  it('ไม่มีความตึงเลย = blocker', () => {
    expect(arcIssues([{ sec: 'a', phase: 'relief' }]).some((i) => i.what.match(/ไม่มีจังหวะตึง/))).toBe(true);
  });

  it('เริ่มด้วยความตึงแล้วสลับ = ผ่าน', () => {
    expect(arcIssues([
      { sec: 'hero', phase: 'tension' }, { sec: 'calc', phase: 'relief' },
      { sec: 'next', phase: 'tension' }, { sec: 'cta', phase: 'relief' },
    ])).toEqual([]);
  });
});

describe('ตัววัดต้องชี้ทางถูก (ไม่ใช่แค่มีตัวเลข)', () => {
  /* 🔴 ความผิดที่กัน: ตัวนับเดิม `run === MAX แล้วรีเซ็ต` = floor(run/MAX)
   *    ⇒ "กองรวมกันยาว ๆ ครั้งเดียว" ได้คะแนนดีกว่า "กระจายพอดี ๆ หลายช่วง"
   *    ถ้าเราไล่ลดตัวเลขนั้น เราจะดันหน้าเว็บไปในทางที่แย่ลง โดยที่ตัวเลขบอกว่าดีขึ้น */
  const seq = (pattern: number[]) =>
    pattern.flatMap((gap, i) => [
      { sec: `t${i}`, phase: 'tension' as Phase },
      ...Array.from({ length: gap }, (_, j) => ({ sec: `r${i}_${j}`, phase: 'relief' as Phase })),
    ]).concat({ sec: 'end', phase: 'tension' as Phase });

  it('กองรวมกันต้องแพงกว่ากระจาย เมื่อจำนวนบล็อกเท่ากัน', () => {
    const spread = seq([4, 4, 4, 5, 5]);   // รวม 22 โล่ง
    const piled = seq([3, 3, 3, 3, 10]);   // รวม 22 โล่ง เท่ากันเป๊ะ
    const oldCount = (o: ReturnType<typeof seq>) =>
      arcIssues(o).filter((i) => i.what.includes('โล่งติดกัน')).length;
    expect(oldCount(piled), 'จำนวน warn ยังนับแบบเก่าอยู่').toBeLessThanOrEqual(oldCount(spread));
    expect(flatnessDebt(piled)).toBeGreaterThan(flatnessDebt(spread));
  });

  it('หนี้ = จำนวนบล็อกที่ล้นเพดาน — แปลเป็น "ต้องเพิ่มจุดตึงกี่จุด" ได้', () => {
    expect(flatnessDebt(seq([4, 4]))).toBe(0);
    expect(flatnessDebt(seq([6]))).toBe(2);
    expect(Math.ceil(flatnessDebt(seq([12])) / MID_PAGE_MAX_RELIEF_RUN)).toBe(2);
  });

  it('ช่วงปิดท้ายไม่ถูกนับเป็นหนี้ (ตั้งใจให้คลาย)', () => {
    expect(flatnessDebt([
      { sec: 'h', phase: 'tension' },
      ...Array.from({ length: 9 }, (_, j) => ({ sec: `c${j}`, phase: 'relief' as Phase })),
    ])).toBe(0);
  });
});

describe('🔴 หน้า Landing ของเราเองผ่านจังหวะนี้ไหม', () => {
  it('อ่านลำดับ section จริงได้ (กันเทสต์ผ่านเพราะ regex พัง)', () => {
    expect(realOrder().length).toBeGreaterThanOrEqual(12);
  });

  it('ทุก section ต้องถูกจัดว่าเป็นตึงหรือโล่ง — เพิ่ม section ใหม่แล้วไม่จัด = แดง', () => {
    const un = realOrder().filter((s) => !(s in PHASE));
    expect(un, `section ที่ยังไม่ถูกจัดจังหวะ: ${un.join(', ')}`).toEqual([]);
  });

  it('🔴 ป้ายที่จัดไว้ต้องมีอยู่จริงบนหน้า — ป้ายค้างที่ไม่มีบล็อกแล้ว = แผนที่ผิด', () => {
    const real = new Set(realOrder());
    const stale = Object.keys(PHASE).filter((s) => !real.has(s));
    expect(stale, `ป้ายที่ไม่มีบล็อกรองรับ: ${stale.join(', ')}`).toEqual([]);
  });

  it('🔴 โครงที่ใช้จำลองตัวแปร ต้องตรงกับไฟล์จริง — ไฟล์เปลี่ยนแล้วไม่แก้ = จำลองผิด', () => {
    const tsx = LANDING();
    expect(tsx, 'A/B holdout หายไปจากหน้า').toMatch(/abShowNew\s*&&/);
    expect(tsx, "A/B ลำดับบล็อกหายไปจากหน้า").toMatch(/layoutAb === 'proof_first'/);
    expect(tsx, 'persona banner ไม่ได้อยู่หลังเงื่อนไขแล้ว').toMatch(/persona &&/);
    // ทั้งสองก้อนต้องยังติดกันจริงในไฟล์ ไม่งั้นการสลับก้อนที่จำลองไว้ = เรื่องแต่ง
    const order = realOrder();
    const idx = (s: string) => order.indexOf(s);
    for (const g of [EXPLAIN_GROUP, PROOF_GROUP]) {
      expect(g.map(idx).every((v) => v >= 0), `ก้อนหาย: ${g.join(',')}`).toBe(true);
      expect(Math.max(...g.map(idx)) - Math.min(...g.map(idx)), `ก้อนไม่ติดกัน: ${g.join(',')}`).toBe(g.length - 1);
    }
  });

  /* 🟡 ค่าตั้งต้นจริง (26 ส.ค. 2569) — วัดใหม่ทั้งหมดหลังซ่อมตัววัด 3 จุด
   *   ① regex มองข้าม `how_30s` (อ่าน 34 จาก 35)
   *   ② นับ warn แบบ floor(run/4) ⇒ กองรวมกันได้คะแนนดีกว่ากระจาย (ชี้ทางผิด)
   *   ③ ตรวจแค่ลำดับในไฟล์ ทั้งที่หน้าเดียวกันแสดงได้ 8 แบบ
   *
   * 🔴 ตัวเลขที่เคยบันทึกไว้ (warn 1 เมื่อ 24 ส.ค. · warn 5 เมื่อ 26 ส.ค.) **ใช้ไม่ได้ทั้งคู่**
   *    — วัดด้วยเครื่องมือที่ยังผิดอยู่ทั้งสองรอบ
   *
   * เลขคณิตของหน้านี้ (พิสูจน์ในเทสต์ถัดไป · ไม่ใช่ความเห็น):
   *   จุดตึง 6 จุด → ความจุกลางหน้า = 5 ช่อง × 4 = 20 บล็อกโล่ง
   *   แต่กลางหน้ามีโล่งจริง 24 ⇒ ล้น 4 เป็นอย่างน้อย **ไม่ว่าจะเรียงยังไง**
   *   ⇒ ตอนนี้อยู่ที่ค่าต่ำสุดทางคณิตศาสตร์แล้ว (เทสต์ถัดไปพิสูจน์)
   *      จะลดต่อจากนี้ต้อง "เพิ่มจุดตึงจริง 1 จุด" (งานเนื้อหา) ไม่ใช่สลับบล็อกอีกแล้ว
   *      เพิ่ม 1 จุด → ความจุ 24 = พอดีกับที่มี ⇒ หนี้เป็น 0 ได้จริง
   *
   * ⚠️ อีกครึ่งของการแก้รอบนี้: ก้อน explain/proof เดิม "ยาวไม่เท่ากัน" (4 vs 2)
   *    ⇒ ก้อนไหนถูกสลับไปอยู่ท้าย จะพาหางของตัวเองไปต่อกับช่วงถัดไป = หนี้ต่างกันตามกลุ่ม A/B
   *    ย้าย instant_preview + credibility_bar เข้าก้อน proof (ทั้งคู่เป็น "หลักฐาน" อยู่แล้ว)
   *    ⇒ ก้อนยาวเท่ากัน 4/4 ⇒ หนี้เท่ากันทุกกลุ่ม = เทียบผล A/B ได้จริง
   *
   * 🔒 เพดานนี้เป็นบันไดลง ห้ามขยับขึ้นเพื่อให้ผ่าน (8 → 4 เมื่อ 26 ส.ค. 2569)
   */
  const BASELINE_DEBT = 4;

  it('ทุกแบบที่ผู้ใช้เห็นได้ ต้องไม่มี blocker และหนี้ความราบต้องไม่เพิ่ม', () => {
    for (const v of VARIANTS) {
      const order = withPhase(renderedOrder(v));
      const issues = arcIssues(order);
      expect(issues.filter((i) => i.level === 'blocker'), `${label(v)} → ${JSON.stringify(issues)}`).toEqual([]);
      expect(flatnessDebt(order), `${label(v)} → ${JSON.stringify(issues)}`).toBeLessThanOrEqual(BASELINE_DEBT);
    }
  });

  it('🔴 ช่วงปิดท้ายต้องไม่ยาวเกินเพดาน ในทุกแบบ', () => {
    for (const v of VARIANTS) {
      const long = arcIssues(withPhase(renderedOrder(v))).filter((i) => i.what.includes('ปิดท้ายยาว'));
      expect(long, label(v)).toEqual([]);
    }
  });

  it('🔴 หนี้ที่เหลือต้องอธิบายได้ด้วยความจุ — ไม่ใช่เพราะเรียงมั่ว', () => {
    const order = withPhase(renderedOrder({ abNew: true, proofFirst: false, persona: true }));
    const lastT = order.map((b) => b.phase).lastIndexOf('tension');
    const anchors = order.slice(0, lastT).filter((b) => b.phase === 'tension').length;
    const midRelief = order.slice(0, lastT).filter((b) => b.phase === 'relief').length;
    const floorDebt = Math.max(0, midRelief - anchors * MID_PAGE_MAX_RELIEF_RUN);
    expect(floorDebt, `กลางหน้ามีโล่ง ${midRelief} · ความจุ ${anchors * MID_PAGE_MAX_RELIEF_RUN}`).toBeGreaterThan(0);
    // 🔴 ต้อง "เท่ากัน" ไม่ใช่ "ไม่เกิน" — พิสูจน์ว่าหนี้ที่เหลืออธิบายด้วยความจุได้ทั้งก้อน
    //    ⇒ ใครเสนอให้ "ลองสลับบล็อกดูอีกที" จะเห็นทันทีว่าสลับยังไงก็ไม่ลง
    expect(BASELINE_DEBT, 'เรียงใหม่ลงต่ำกว่านี้ไม่ได้ — ต้องเพิ่มจุดตึงจริง').toBe(floorDebt);
  });

  it('จังหวะตึงต้องกระจาย ไม่กระจุกหัวหน้า', () => {
    const order = realOrder();
    const at = order.map((s, i) => (PHASE[s] === 'tension' ? i + 1 : 0)).filter(Boolean);
    expect(at[0]).toBe(1);
    expect(at[at.length - 1]).toBeGreaterThan(order.length * 0.5);
    expect(at.length).toBeGreaterThanOrEqual(4);
  });

  it('🔴 ป้ายต้องครอบคลุมทั้งหน้า — บล็อกที่ไม่ติดป้ายคือจุดที่เรามองไม่เห็น', () => {
    const tsx = LANDING();
    const all = [...tsx.matchAll(/data-sec="([^"]+)"/g)].length;
    expect(realOrder().length, 'ตัวคัดอ่านได้ไม่ครบทุกป้าย').toBe(all);
    expect(all).toBeGreaterThanOrEqual(30);
  });
});

describe('จังหวะต้องเดินทางไปกับ prompt', () => {
  it('emotionalArcBlock มีทั้งจังหวะและของแทนที่', () => {
    const b = emotionalArcBlock();
    for (const beat of BEATS) expect(b).toContain(beat.key);
    for (const f of FORBIDDEN_TRIGGERS) expect(b).toContain(f.insteadUse);
    expect(b).toMatch(/ตัวเลขของผู้ใช้เองที่เขาตอบไม่ได้/);
  });
});
