import { describe, it, expect } from 'vitest';
import {
  quickCheck, verdictOf, verdictText, verdictIsPositive, headlineInsights, topicInsights,
  QUICK_TOPICS, topicById, parseQuickDraft, draftToFinance, DRAFT_MAX_AGE_DAYS, quickTrackPayload,
  topConcerns, concernsTrustworthy, MIN_CONCERN_SAMPLE, type QuickAgg,
  type ProductInput, type TopicId, type QuickDraft,
} from '../productQuickCheck';
import { SKILL_CATALOG } from '../skillCatalog';

const P = (o: Partial<ProductInput> = {}): ProductInput => ({
  biz: 'food', name: 'ข้าวมันไก่', price: 50, cost: 30, ...o,
});
const ALL_TOPICS = QUICK_TOPICS.map((t) => t.id);

describe('quickCheck — เลขคณิตล้วนจากเลขที่ผู้ใช้กรอก', () => {
  it('คำนวณกำไรต่อหน่วยและ % ถูก', () => {
    const r = quickCheck(P());
    expect(r.marginPerUnit).toBe(20);
    expect(r.marginPct).toBe(40);
  });

  it('จุดคุ้มทุน = ค่าใช้จ่ายคงที่ ÷ กำไรต่อหน่วย (ปัดขึ้น)', () => {
    const r = quickCheck(P({ fixedCostPerMonth: 30_000 }));
    expect(r.breakEvenUnits).toBe(1500);
    const odd = quickCheck(P({ price: 50, cost: 43, fixedCostPerMonth: 10_000 })); // 10000/7 = 1428.57
    expect(odd.breakEvenUnits).toBe(1429);
  });

  it('กำไรต่อหน่วยติดลบ = ไม่มีจุดคุ้มทุน (ไม่ใช่คำนวณออกมาเป็นค่าติดลบ)', () => {
    const r = quickCheck(P({ price: 30, cost: 50, fixedCostPerMonth: 10_000 }));
    expect(r.marginPerUnit).toBe(-20);
    expect(r.breakEvenUnits).toBeNull();
    expect(verdictOf(r)).toBe('loss');
  });

  it('ต้นทุนเท่าราคาขายพอดี = ขาดทุน (ไม่ใช่ ok)', () => {
    expect(verdictOf(quickCheck(P({ price: 50, cost: 50 })))).toBe('loss');
  });

  it('กำไรสุทธิ/เดือน หักค่าใช้จ่ายคงที่แล้ว', () => {
    const r = quickCheck(P({ unitsPerMonth: 1000, fixedCostPerMonth: 30_000 }));
    expect(r.grossPerMonth).toBe(20_000);
    expect(r.netPerMonth).toBe(-10_000);
    expect(r.unitsToBreakEven).toBe(500);
  });

  it('ขายเกินจุดคุ้มทุนแล้ว → ขาดอีก 0 หน่วย (ไม่ติดลบ)', () => {
    const r = quickCheck(P({ unitsPerMonth: 2000, fixedCostPerMonth: 30_000 }));
    expect(r.unitsToBreakEven).toBe(0);
    expect(r.netPerMonth).toBe(10_000);
  });

  it('ข้อมูลไม่พอ → คืน null ไม่เดาแทน', () => {
    const r = quickCheck(P({ price: 0, cost: 0 }));
    expect(r.marginPct).toBeNull();
    expect(r.breakEvenUnits).toBeNull();
    expect(r.grossPerMonth).toBeNull();
    expect(r.netPerMonth).toBeNull();
    expect(verdictOf(r)).toBe('unknown');
    expect(verdictText('unknown')).toContain('ยังบอกไม่ได้');
  });

  it('ยอดขาย/ค่าใช้จ่ายคงที่ = 0 หรือติดลบ ถือว่ายังไม่ได้กรอก', () => {
    const r = quickCheck(P({ unitsPerMonth: 0, fixedCostPerMonth: -5 }));
    expect(r.grossPerMonth).toBeNull();
    expect(r.breakEvenUnits).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════
 * ชุดที่สำคัญที่สุด — กัน "ตัวเลขที่ไม่มีแหล่ง" หลุดออกไปหาคนแปลกหน้า
 * หน้านี้แสดงให้คนที่ยังไม่รู้จักเราดู ตัวเลขปลอมตัวเดียว = เสียความน่าเชื่อถือถาวร
 * ══════════════════════════════════════════════════════════════════ */
describe('ความซื่อสัตย์ของข้อสังเกต', () => {
  const everyInsight = () => {
    const cases: ProductInput[] = [
      P(), P({ price: 30, cost: 50 }), P({ price: 0, cost: 0 }),
      P({ unitsPerMonth: 1000, fixedCostPerMonth: 30_000 }),
      P({ biz: 'service', unitsPerMonth: 10, fixedCostPerMonth: 5000 }),
    ];
    return cases.flatMap((input) => {
      const r = quickCheck(input);
      return [
        ...headlineInsights(input, r),
        ...ALL_TOPICS.flatMap((t) => topicInsights(t, input, r)),
      ];
    });
  };

  it('ทุกตัวเลขที่แสดง ต้องอ้างได้ว่ามาจากช่องที่ผู้ใช้กรอก', () => {
    for (const i of everyInsight()) {
      if (i.kind === 'calc') {
        expect(i.from, i.text).toBeTruthy();
        expect(i.from.length, i.text).toBeGreaterThan(5);
      }
    }
  });

  it('ทุกคำถามต้องบอกเหตุผลว่าทำไมต้องตอบ', () => {
    for (const i of everyInsight()) {
      if (i.kind === 'question') expect(i.why, i.text).toBeTruthy();
    }
  });

  it('ไม่มีข้อสังเกตชนิดอื่นนอกจาก calc/question/action', () => {
    for (const i of everyInsight()) expect(['calc', 'question', 'action']).toContain(i.kind);
  });

  it('ไม่มีข้อความไหนอ้างสถิติตลาด/ค่าเฉลี่ยอุตสาหกรรม/คู่แข่ง — เราไม่มีแหล่งอ้างอิง', () => {
    // คำที่บ่งชี้ว่ากำลังอ้างข้อมูลภายนอกที่เราไม่ได้มีจริง
    const banned = [
      'ค่าเฉลี่ยอุตสาหกรรม', 'มาตรฐานอุตสาหกรรม', 'ตลาดนี้มีมูลค่า', 'มูลค่าตลาด',
      'ส่วนแบ่งตลาด', 'คู่แข่งตั้งราคา', 'ทั่วประเทศ', 'ผลสำรวจ', 'งานวิจัยพบว่า',
      'โดยเฉลี่ยแล้วธุรกิจ', 'อัตราการเติบโตของตลาด',
    ];
    for (const i of everyInsight()) {
      for (const b of banned) expect(i.text, `"${i.text}" มีคำว่า "${b}"`).not.toContain(b);
    }
  });

  it('ถามเรื่องค่าแรงตัวเองเสมอ แม้ตัวเลขจะออกมาสวย', () => {
    const good = P({ price: 100, cost: 10, unitsPerMonth: 5000, fixedCostPerMonth: 1000 });
    const texts = headlineInsights(good, quickCheck(good)).map((i) => i.text);
    expect(texts.some((t) => t.includes('ค่าแรงตัวเอง'))).toBe(true);
  });
});

describe('หัวข้อ — ต้องผูกกับทักษะที่มีจริงในระบบ', () => {
  it('มี 4 หัวข้อ id ไม่ซ้ำ', () => {
    expect(QUICK_TOPICS).toHaveLength(4);
    expect(new Set(ALL_TOPICS).size).toBe(4);
  });

  it('ทุก skill id ที่อ้าง มีอยู่จริงใน skillCatalog (กันลิงก์ตาย)', () => {
    const ids = new Set(SKILL_CATALOG.map((s) => s.id));
    for (const t of QUICK_TOPICS) {
      expect(t.skills.length, t.label).toBeGreaterThan(0);
      for (const s of t.skills) expect(ids.has(s), `${t.label} → ${s}`).toBe(true);
    }
  });

  it('ทุกหัวข้อให้ข้อสังเกตอย่างน้อย 3 ข้อ และมีคำถามอย่างน้อย 1 ข้อเสมอ', () => {
    const input = P({ unitsPerMonth: 800, fixedCostPerMonth: 20_000 });
    const r = quickCheck(input);
    for (const t of ALL_TOPICS) {
      const ins = topicInsights(t, input, r);
      expect(ins.length, t).toBeGreaterThanOrEqual(3);
      expect(ins.some((i) => i.kind === 'question'), t).toBe(true);
    }
  });

  it('หัวข้อการตลาดผูกค่าโฆษณาไว้กับกำไรต่อหน่วยจริง', () => {
    const input = P({ price: 50, cost: 30 });
    const texts = topicInsights('marketing', input, quickCheck(input)).map((i) => i.text);
    expect(texts.some((t) => t.includes('20'))).toBe(true); // กำไรต่อหน่วย = 20
  });

  it('topicById คืนค่าเสมอ แม้ id แปลก', () => {
    expect(topicById('pricing').id).toBe('pricing');
    expect(topicById('ไม่มีจริง' as TopicId)).toBeTruthy();
  });
});

describe('ยกข้อมูลเข้าแอปตอนสมัคร', () => {
  const draft = (o: Partial<QuickDraft> = {}): QuickDraft => ({
    input: P({ unitsPerMonth: 1000, fixedCostPerMonth: 30_000 }),
    topics: ['profit'], at: '2026-08-16', ...o,
  });

  it('ร่างใหม่อ่านได้ปกติ', () => {
    const d = parseQuickDraft(JSON.stringify(draft()), '2026-08-16');
    expect(d?.input.price).toBe(50);
    expect(d?.topics).toEqual(['profit']);
  });

  it(`ร่างเก่ากว่า ${DRAFT_MAX_AGE_DAYS} วัน → ทิ้ง (คนเปิดเว็บทิ้งไว้เป็นเดือน)`, () => {
    expect(parseQuickDraft(JSON.stringify(draft({ at: '2026-06-01' })), '2026-08-16')).toBeNull();
    expect(parseQuickDraft(JSON.stringify(draft({ at: '2026-08-01' })), '2026-08-16')).not.toBeNull();
  });

  it('JSON พัง / ไม่มี input / at ผิดรูปแบบ → null ไม่ throw', () => {
    expect(parseQuickDraft('{{{', '2026-08-16')).toBeNull();
    expect(parseQuickDraft('null', '2026-08-16')).toBeNull();
    expect(parseQuickDraft('{"at":"2026-08-16"}', '2026-08-16')).toBeNull();
    expect(parseQuickDraft(JSON.stringify(draft({ at: 'เมื่อวาน' })), '2026-08-16')).toBeNull();
  });

  it('กรอง topic ที่ไม่รู้จักทิ้ง (ข้อมูลเก่าจากเวอร์ชันก่อน)', () => {
    const raw = JSON.stringify({ ...draft(), topics: ['profit', 'ของเก่า', 42] });
    expect(parseQuickDraft(raw, '2026-08-16')?.topics).toEqual(['profit']);
  });

  it('แปลงเป็นรายรับ-รายจ่ายได้ตรงกับที่กรอก', () => {
    const rows = draftToFinance(draft());
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.kind === 'revenue')?.amount).toBe(50_000);
    expect(rows.filter((r) => r.kind === 'expense').map((r) => r.amount)).toEqual([30_000, 30_000]);
    expect(rows.every((r) => r.label.includes('จากที่กรอกบนหน้าแรก'))).toBe(true);
  });

  it('ไม่รู้ยอดขาย → ไม่สร้างรายการ (ไม่ใส่ตัวเลขมั่วให้ดูมีอะไร)', () => {
    expect(draftToFinance(draft({ input: P() }))).toEqual([]);
  });
});

describe('คำตัดสินรวม — กำไรสุทธิต้องมาก่อนกำไรต่อหน่วยเสมอ', () => {
  // เคสจริงที่เจอตอนทดสอบ 16 ส.ค. 2569: margin 40% ดูดี แต่รวมแล้วขาดทุนเดือนละ 10,000
  it('กำไรต่อหน่วยดีแต่รวมแล้วขาดทุน → netLoss ไม่ใช่ ok', () => {
    const r = quickCheck(P({ price: 50, cost: 30, unitsPerMonth: 1000, fixedCostPerMonth: 30_000 }));
    expect(r.marginPct).toBe(40);
    expect(r.netPerMonth).toBe(-10_000);
    expect(verdictOf(r)).toBe('netLoss');
    expect(verdictIsPositive(verdictOf(r))).toBe(false);
    expect(verdictText('netLoss')).toContain('ยังขาดทุน');
  });

  it('ขายพอจนกำไรสุทธิเป็นบวก → ok', () => {
    const r = quickCheck(P({ price: 50, cost: 30, unitsPerMonth: 2000, fixedCostPerMonth: 30_000 }));
    expect(verdictOf(r)).toBe('ok');
    expect(verdictIsPositive('ok')).toBe(true);
  });

  it('ยังไม่รู้ยอดขาย → ตัดสินจากกำไรต่อหน่วยตามเดิม (ไม่เดาว่าขาดทุน)', () => {
    expect(verdictOf(quickCheck(P({ price: 50, cost: 30 })))).toBe('ok');
    expect(verdictOf(quickCheck(P({ price: 50, cost: 45 })))).toBe('thin');
  });

  it('มีแต่ ok เท่านั้นที่ขึ้นสีบวก', () => {
    for (const v of ['loss', 'netLoss', 'thin', 'unknown'] as const) {
      expect(verdictIsPositive(v), v).toBe(false);
    }
  });
});

describe('ส่งขึ้นแผงแอดมิน — ห้ามให้ชื่อสินค้าหลุดไปกับข้อมูลสถิติ', () => {
  const SESSION = '11111111-1111-4111-8111-111111111111';

  it('payload ไม่มีชื่อสินค้าเลย แม้ผู้ใช้กรอกมา', () => {
    const input = P({ name: 'ร้านลุงสมชาย ซอยอารีย์ โทร 0812345678' });
    const payload = quickTrackPayload(SESSION, input, ['profit'], false);
    const json = JSON.stringify(payload);
    expect(json).not.toContain('สมชาย');
    expect(json).not.toContain('0812345678');
    expect(Object.keys(payload).sort()).toEqual([
      'p_biz', 'p_cost', 'p_cta', 'p_fixed', 'p_price', 'p_session', 'p_topics', 'p_units', 'p_verdict',
    ]);
  });

  it('ส่งเฉพาะ field ที่เป็น dropdown/ตัวเลข/หัวข้อ และ verdict ตรงกับที่คำนวณ', () => {
    const input = P({ price: 50, cost: 30, unitsPerMonth: 1000, fixedCostPerMonth: 30_000 });
    const payload = quickTrackPayload(SESSION, input, ['pricing', 'risk'], true);
    expect(payload.p_biz).toBe('food');
    expect(payload.p_price).toBe(50);
    expect(payload.p_units).toBe(1000);
    expect(payload.p_verdict).toBe('netLoss');
    expect(payload.p_topics).toEqual(['pricing', 'risk']);
    expect(payload.p_cta).toBe(true);
  });

  it('ช่องที่ไม่ได้กรอก ส่งเป็น null ไม่ใช่ 0 (0 กับ "ไม่รู้" คนละความหมาย)', () => {
    const payload = quickTrackPayload(SESSION, P(), [], false);
    expect(payload.p_units).toBeNull();
    expect(payload.p_fixed).toBeNull();
  });

  it('คัดลอกรายการหัวข้อ ไม่ผูกกับ state เดิม', () => {
    const topics: TopicId[] = ['profit'];
    const payload = quickTrackPayload(SESSION, P(), topics, false);
    topics.push('risk');
    expect(payload.p_topics).toEqual(['profit']);
  });
});

describe('สรุปในแผงแอดมิน — อย่าอ่านผลจากตัวอย่างเล็กเกินไป', () => {
  const agg = (o: Partial<QuickAgg> = {}): QuickAgg => ({
    total: 0, with_topic: 0, cta: 0, median_price: 0, median_cost: 0, median_margin_pct: 0,
    by_biz: {}, by_verdict: {}, by_topic: {}, ...o,
  });

  it('จัดอันดับหัวข้อจากมากไปน้อย พร้อม % และป้ายภาษาไทย', () => {
    const r = topConcerns(agg({ by_topic: { profit: 10, risk: 30, pricing: 10 } }));
    expect(r[0].id).toBe('risk');
    expect(r[0].pct).toBe(60);
    expect(r[0].label).toBe('ความเสี่ยง & ระบบ');
    expect(r.map((x) => x.id)).toEqual(['risk', 'profit', 'pricing']);
  });

  it('ยังไม่มีข้อมูล → รายการว่าง ไม่ NaN', () => {
    expect(topConcerns(null)).toEqual([]);
    expect(topConcerns(agg())).toEqual([]);
  });

  it('หัวข้อที่ไม่รู้จัก (เวอร์ชันเก่า) ยังแสดงได้ ไม่ crash', () => {
    expect(topConcerns(agg({ by_topic: { ของเก่า: 5 } }))[0].label).toBe('ของเก่า');
  });

  it(`คนกดหัวข้อน้อยกว่า ${MIN_CONCERN_SAMPLE} → ยังเชื่ออันดับไม่ได้`, () => {
    expect(concernsTrustworthy(agg({ with_topic: MIN_CONCERN_SAMPLE - 1 }))).toBe(false);
    expect(concernsTrustworthy(agg({ with_topic: MIN_CONCERN_SAMPLE }))).toBe(true);
    expect(concernsTrustworthy(null)).toBe(false);
  });
});
