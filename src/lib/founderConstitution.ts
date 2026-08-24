/* founderConstitution — รัฐธรรมนูญของ CEO AI Thailand (เจ้าของ freeze 23 ส.ค. 2569)
 *
 * ทำไมเป็นโค้ด ไม่ใช่หน้า About Us:
 *   Vision ที่อยู่ในหน้า About Us ไม่มีผลกับสิ่งที่ระบบทำจริงแม้แต่นิดเดียว
 *   ไฟล์นี้ถูกส่งเข้า prompt ทุกครั้ง และมีด่านบังคับที่ block ได้ (founderMindset.ts)
 *   ⇒ Vision ฝังอยู่ในระบบ ไม่ใช่อยู่บนกำแพง
 *
 * pure ทั้งไฟล์ · ไม่เรียก network · ไม่มี side effect
 */

/** วิสัยทัศน์ — ระดับโครงสร้างพื้นฐานของประเทศ ไม่ใช่ระดับ SaaS ตัวหนึ่ง */
export const VISION = {
  core: 'ทำให้คนไทยทุกคนสามารถเปลี่ยนไอเดียให้เป็นธุรกิจที่มีลูกค้า มีหลักฐาน มีระบบ และขยายได้ ด้วย AI',
  moonshot:
    "Build Thailand's Business Intelligence Infrastructure — " +
    'สร้างโครงสร้างพื้นฐาน AI ที่ช่วยให้คนไทยสร้างธุรกิจที่แข็งแรงและแข่งขันได้ในระดับโลก',
  /** ⚠️ วิสัยทัศน์ไม่ใช่พาดหัว — พาดหัวยังเป็นปัญหาของลูกค้าเสมอ */
  notAHeadline: true,
} as const;

/** พันธกิจ — ลำดับที่ผลิตภัณฑ์พาเขาเดิน (ห้ามข้ามขั้น) */
export const MISSION_CHAIN = ['ไอเดีย', 'ลูกค้า', 'หลักฐาน', 'รายได้', 'ระบบ', 'Scale'] as const;

/** 6 หลักคิดที่ทุกการตัดสินใจต้องผ่าน */
export const MINDSET = [
  {
    key: 'first-principles',
    name: 'First Principles',
    rule: 'ไม่เริ่มจาก "คนอื่นทำอะไร" แต่เริ่มจาก "ปัญหาจริงคืออะไร และข้อจำกัดอะไรเป็นข้อเท็จจริง"',
    violation: 'ลอกฟีเจอร์คู่แข่งเพราะเขามี',
  },
  {
    key: '10x',
    name: '10x Thinking',
    rule: 'ไม่ถามว่า "ทำอย่างไรให้ดีขึ้น 10%" แต่ถามว่า "ต้องออกแบบใหม่อย่างไรให้ดีขึ้น 10 เท่า"',
    violation: 'ปรับ UI ทีละนิดแล้วเรียกว่าปรับปรุงผลิตภัณฑ์',
  },
  {
    key: 'experiment-fast',
    name: 'Experiment Fast',
    rule: 'ทุกสมมติฐานต้องแปลงเป็น experiment ที่วัดผลได้',
    violation: 'ถกเถียงกันว่าอันไหนดีกว่า ทั้งที่ทดลองได้ใน 2 วัน',
  },
  {
    key: 'evidence-over-opinion',
    name: 'Evidence > Opinion',
    rule: 'ความเห็นของ Founder หรือ AI ไม่สำคัญเท่าหลักฐานจากลูกค้าและ outcome',
    violation: 'ตัดสินใจจาก "ผมว่ามันน่าจะ…" ทั้งที่มีข้อมูลอยู่แล้ว',
  },
  {
    key: 'failure-is-data',
    name: 'Failure = Learning Data',
    rule: 'experiment ที่ไม่ผ่านไม่ใช่ความล้มเหลว แต่เป็นข้อมูลที่ช่วยลด uncertainty',
    violation: 'ซ่อนผลที่ไม่สวย หรือเลิกทดลองเพราะกลัวผลไม่ดี',
  },
  {
    key: 'compounding',
    name: 'Compounding Learning',
    rule: 'ทุก user · experiment · campaign · outcome ต้องทำให้ Business Genome และ Decision Engine เก่งขึ้น',
    violation: 'ทำแคมเปญแล้วจบที่ Dashboard ไม่มีอะไรไหลกลับเข้าระบบ',
  },
] as const;

export type MindsetKey = typeof MINDSET[number]['key'];

/** Mental model ที่ระบบต้องเดินตาม — ห้ามข้ามขั้น */
export const MENTAL_MODEL = [
  'BIG VISION',
  'FIRST PRINCIPLES',
  'HYPOTHESIS',
  'BUILD MINIMUM EXPERIMENT',
  'MEASURE',
  'LEARN',
  'UPDATE BUSINESS GENOME',
  'NEXT BEST ACTION',
  '10x IMPROVEMENT',
] as const;

/** Product DNA — ประโยคที่เจ้าของสั่ง freeze */
export const PRODUCT_DNA = {
  en: 'Think Big. Start Small. Validate Fast. Learn Continuously. Build Systems. Scale Intelligently.',
  th: 'คิดให้ใหญ่ เริ่มให้เล็ก พิสูจน์ให้เร็ว เรียนรู้ตลอดเวลา สร้างให้เป็นระบบ แล้วขยายอย่างชาญฉลาด',
} as const;

/* ── Golden Question ──────────────────────────────────────────────────────
 * คำถามเดียวที่ทุก Agent ต้องตอบก่อนสร้างอะไรก็ตาม
 * ตอบไม่ได้ = ไม่สร้าง แม้ AI จะ "ทำได้" ก็ตาม
 * ──────────────────────────────────────────────────────────────────────── */

export const GOLDEN_QUESTION =
  'สิ่งที่กำลังทำนี้ช่วยให้ธุรกิจเข้าใกล้ลูกค้า หลักฐาน กำไร หรือ Scale มากขึ้นอย่างไร?';

/** 4 ปลายทางเดียวที่นับว่าเป็นคำตอบของ Golden Question */
export const VALID_OUTCOMES = ['ลูกค้า', 'หลักฐาน', 'กำไร', 'Scale'] as const;
export type ValidOutcome = typeof VALID_OUTCOMES[number];

const OUTCOME_WORDS: Record<ValidOutcome, string[]> = {
  'ลูกค้า': ['ลูกค้า', 'customer', 'ผู้ซื้อ', 'คนซื้อ', 'segment', 'persona'],
  'หลักฐาน': ['หลักฐาน', 'evidence', 'ทดสอบ', 'validat', 'พิสูจน์', 'experiment', 'สมมติฐาน'],
  'กำไร': ['กำไร', 'profit', 'margin', 'รายได้', 'revenue', 'ราคา', 'ต้นทุน', 'unit economics'],
  // ⚠️ ห้ามใช้คำว่า 'ระบบ' เดี่ยว ๆ — "ระบบเรามีฟีเจอร์นี้" เป็นเหตุผลเรื่อง *เครื่องมือ* ไม่ใช่ *ธุรกิจ*
  'Scale': ['scale', 'ขยาย', 'วางระบบ', 'sop', 'kpi', 'กระบวนการ', 'ทำซ้ำ', 'ส่งต่อให้คนอื่นทำ'],
};

/** 🔴 เหตุผลที่พูดถึง "เครื่องมือของเรา" ไม่ใช่ "ธุรกิจของเขา" — ต้องถูกปัดตกก่อนเสมอ
 *  นี่คือข้ออ้างที่หลุดง่ายที่สุด เพราะฟังดูเหมือนมีเหตุผล */
const TOOL_CENTRIC_EXCUSES = [
  'ระบบเรามี', 'เรามีฟีเจอร์', 'ฟีเจอร์นี้อยู่แล้ว', 'ai ทำได้', 'ทำได้เลย',
  'ระบบทำได้', 'มีอยู่แล้ว ทำได้', 'เพราะเราทำได้',
];

export interface GoldenAnswer {
  /** ตอบได้ไหม */
  ok: boolean;
  /** ปลายทางที่คำตอบนี้ชี้ไป */
  outcomes: ValidOutcome[];
  why: string;
}

/** ตรวจว่าเหตุผลที่ให้มา ตอบ Golden Question จริงหรือแค่พูดว่า AI ทำได้
 *  ⚠️ ตั้งใจให้เข้มงวด — "เพราะ AI ทำได้" ต้องไม่ผ่าน */
export function answersGoldenQuestion(reason: string | null | undefined): GoldenAnswer {
  const r = (reason ?? '').toLowerCase();
  if (r.trim().length < 8) {
    return { ok: false, outcomes: [], why: 'ไม่ได้ให้เหตุผล — ห้ามสร้างเพราะ "AI ทำได้"' };
  }
  const excuse = TOOL_CENTRIC_EXCUSES.find((e) => r.includes(e));
  if (excuse) {
    return {
      ok: false,
      outcomes: [],
      why: `"${excuse}" เป็นเหตุผลว่า **เครื่องมือเราทำได้** ไม่ใช่ว่า **ธุรกิจเขาเข้าใกล้อะไร**`,
    };
  }
  const outcomes = VALID_OUTCOMES.filter((o) => OUTCOME_WORDS[o].some((w) => r.includes(w.toLowerCase())));
  if (outcomes.length === 0) {
    return {
      ok: false,
      outcomes: [],
      why: `เหตุผลนี้ไม่ได้ชี้ไปที่ ${VALID_OUTCOMES.join(' / ')} — ` +
        'อาจเป็นเหตุผลว่า "ทำได้" ไม่ใช่ "ทำแล้วธุรกิจเข้าใกล้อะไร"',
    };
  }
  return { ok: true, outcomes: [...outcomes], why: `ชี้ไปที่: ${outcomes.join(' · ')}` };
}

/** บล็อกที่แปะเข้า prompt ของทุก agent — Vision ต้องเดินทางไปกับทุกคำสั่ง */
export function constitutionBlock(): string {
  return [
    '## รัฐธรรมนูญ (CEO AI Thailand Founder Constitution)',
    `VISION: ${VISION.core}`,
    `MOONSHOT: ${VISION.moonshot}`,
    `MISSION: ${MISSION_CHAIN.join(' → ')}`,
    `PRODUCT DNA: ${PRODUCT_DNA.th}`,
    '',
    'MINDSET (ทุกการตัดสินใจต้องผ่าน 6 ข้อนี้):',
    ...MINDSET.map((m) => `  · ${m.name} — ${m.rule}`),
    '',
    `Mental model (ห้ามข้ามขั้น): ${MENTAL_MODEL.join(' → ')}`,
    '',
    `🔴 GOLDEN QUESTION — ตอบไม่ได้ = ไม่สร้าง แม้ AI จะทำได้`,
    `   "${GOLDEN_QUESTION}"`,
    `   คำตอบต้องชี้ไปที่: ${VALID_OUTCOMES.join(' / ')} เท่านั้น`,
  ].join('\n');
}
