/* founderMindset — Founder Mindset Engine
 * (เจ้าของกำหนด 23 ส.ค. 2569 · MOAT Architecture v1 · POD ชั้น 2 "Next Best Business Action")
 *
 * 🔴 ปัญหาที่เอนจินนี้แก้:
 *   ผู้ใช้บอก "อยากยิง Ads 100,000 บาท" แล้ว AI ทั่วไปจะรีบทำแคมเปญให้ทันที
 *   ⇒ ช่วยให้เขา **เสียเงินเร็วขึ้น** ไม่ได้ช่วยให้เขามีธุรกิจ
 *
 *   CEO AI Thailand ต้องถามกลับก่อน: Problem validated? Customer defined? Offer validated?
 *   Unit economics known? Tracking ready? Evidence sufficient?
 *   ⇒ ยังไม่ผ่าน = **Next Best Action คือ Validation ไม่ใช่ Scale**
 *
 * ⚠️ นี่คือ **กฎ** (Thai Business Playbook) ไม่ใช่ **เอนจินที่เรียนรู้จากผลจริง**
 *    กฎเขียนได้ตั้งแต่ผู้ใช้ 0 ราย · เอนจินที่เก่งขึ้นจากผลลัพธ์ต้องรอผู้ใช้ 5 ราย
 *    (`competitiveStrategy.moatReadiness`) — สองอย่างนี้คนละสิ่ง ห้ามสับสน
 *
 * pure ทั้งไฟล์ · ไม่แตะฐานข้อมูล · ไม่มี migration
 */

import { GOLDEN_QUESTION, answersGoldenQuestion, MISSION_CHAIN } from './founderConstitution';
import type { GenomeData } from './businessGenome';
import { genomeStatus } from './businessGenome';

/** 6 ด่านความพร้อมที่เจ้าของกำหนด — เรียงตามลำดับที่ต้องผ่านจริง */
export const READINESS_CHECKS = [
  {
    key: 'problem',
    q: 'Problem validated?',
    genomeBranch: 'problem',
    why: 'ถ้ายังไม่รู้ว่าปัญหามีจริงและเกิดบ่อยพอ การจ่ายเงินหาคนคือการซื้อคนมาดูของที่ไม่มีใครต้องการ',
    nextAction: 'สัมภาษณ์ลูกค้าเป้าหมาย 10 คน — ถามว่าเขาแก้ปัญหานี้ด้วยอะไรอยู่ตอนนี้',
  },
  {
    key: 'customer',
    q: 'Customer defined?',
    genomeBranch: 'customer',
    why: 'ยิงแอดโดยไม่รู้ว่าใครคือลูกค้า = จ่ายเงินให้แพลตฟอร์มเดาแทนเรา',
    nextAction: 'ระบุ segment + persona + JTBD ให้ชัด แล้วเขียนว่า "ใครไม่ใช่ลูกค้า" ด้วย',
  },
  {
    key: 'offer',
    q: 'Offer validated?',
    genomeBranch: 'offer',
    why: 'ข้อเสนอที่ยังไม่มีใครเคยตอบรับ ไม่ได้ดีขึ้นเพราะมีคนเห็นมากขึ้น',
    nextAction: 'เสนอขายกับ 5 คนแบบตัวต่อตัว ดูว่ามีใครยอมจ่ายก่อนของเสร็จไหม',
  },
  {
    key: 'unitEconomics',
    q: 'Unit economics known?',
    genomeBranch: 'economics',
    why: 'ถ้าไม่รู้กำไรต่อหน่วย ยิ่งขายมากยิ่งขาดทุนมาก — และจะไม่รู้ตัวจนสายเกินไป',
    nextAction: 'คำนวณกำไรต่อหน่วยและจุดคุ้มทุนจากตัวเลขจริงของคุณเอง',
  },
  {
    key: 'tracking',
    q: 'Tracking ready?',
    genomeBranch: 'acquisition',
    why: 'จ่ายเงินโดยวัดผลไม่ได้ = ซื้อความไม่รู้ในราคาแพง',
    nextAction: 'ติดแท็กปลายทางให้ครบก่อน แล้วยิงทดสอบก้อนเล็กเพื่อยืนยันว่าตัววัดทำงาน',
  },
  {
    key: 'evidence',
    q: 'Evidence sufficient?',
    genomeBranch: 'experiment',
    why: 'ยังไม่มีผลการทดลองที่บันทึกไว้ = ไม่มีอะไรให้ระบบเรียนรู้ และรอบหน้าจะเริ่มจากศูนย์อีก',
    nextAction: 'บันทึกสมมติฐาน → วิธี → สิ่งที่สังเกตได้ → ผล → บทเรียน ลง Experiment อย่างน้อย 1 รอบ',
  },
] as const;

export type ReadinessKey = typeof READINESS_CHECKS[number]['key'];

/** สิ่งที่ผู้ใช้ขอให้ทำ — จำแนกเพื่อรู้ว่าต้องผ่านด่านไหนบ้าง */
export type AskIntent =
  /** 🔬 ซื้อสื่อ **เพื่อหาคำตอบ** — งบเล็ก · สมมติฐานเดียว · segment เดียว · offer เดียว · มีเงื่อนไขหยุด
   *  เจ้าของแก้ถูก 24 ส.ค. 2569: เดิมรวมเป็น 'paid-acquisition' ก้อนเดียวแล้วกั้นหมด
   *  ⇒ กลายเป็น hard-block ที่ขัด Growth Mindset เพราะ **paid ก้อนเล็กคือเครื่องมือหาหลักฐาน** */
  | 'paid-validation'
  /** 💸 เพิ่มงบเพื่อ **ขยายผลที่พิสูจน์แล้ว** — ต้องผ่าน evidence gate ก่อนเสมอ */
  | 'paid-scale'
  | 'scale'              // ขยายสาขา · จ้างทีม · เพิ่มกำลังผลิต
  | 'content'            // ทำคอนเทนต์ · โพสต์ · คลิป
  | 'build'              // สร้างฟีเจอร์ · ทำเว็บ · ทำระบบ
  | 'validate'           // สัมภาษณ์ · ทดสอบ · หาลูกค้ารายแรก
  | 'other';

/** คำที่บอกว่าเป็นการ **ขยายผล** ไม่ใช่การทดลอง — ตรวจก่อน paid-validation เสมอ */
const PAID_SCALE_WORDS = [
  'เพิ่มงบ', 'เพิ่มงบประมาณ', 'ขยายงบ', 'อัดงบ', 'ทุ่มงบ', 'scale ad', 'สเกลแอด',
  'ยิงเต็มที่', 'ยิงหนัก', 'เร่งยอด', 'เร่งยอดขาย', 'เร่งสมัคร',
];

const INTENT_WORDS: Record<Exclude<AskIntent, 'other' | 'paid-scale'>, string[]> = {
  'paid-validation': ['ยิงแอด', 'ยิง ads', 'ads', 'แอด', 'โฆษณา', 'บูสต์', 'boost', 'ซื้อวิว', 'อินฟลู'],
  scale: ['ขยาย', 'เปิดสาขา', 'จ้างทีม', 'จ้างพนักงาน', 'เพิ่มกำลังผลิต', 'scale'],
  content: ['คอนเทนต์', 'content', 'โพสต์', 'คลิป', 'รีล', 'บทความ', 'แคปชัน'],
  build: ['สร้างฟีเจอร์', 'ทำเว็บ', 'ทำระบบ', 'ทำแอป', 'feature', 'พัฒนาระบบ'],
  validate: ['สัมภาษณ์', 'ทดสอบตลาด', 'หาลูกค้ารายแรก', 'validate', 'พิสูจน์'],
};

/** งบที่ยังถือว่าเป็น "การทดลอง" ไม่ใช่ "การขยายผล" (บาท/รอบ)
 *  เหนือกว่านี้ ต่อให้พูดเหมือนทดลอง ก็ต้องผ่านด่านของ paid-scale
 *  🏷️ POLICY — ตั้งจากนโยบาย ยังไม่ใช่ค่าที่พิสูจน์จากผลจริง (ดู `THRESHOLD_STATUS`) */
export const PAID_VALIDATION_BUDGET_CEILING = 5_000;

/** ดึงจำนวนเงินจากประโยค — รองรับ "100,000" · "100000 บาท" · "5พัน" · "1 หมื่น" */
export function budgetInAsk(raw: string): number | null {
  const t = raw.replace(/,/g, '');
  // ⚠️ ห้ามใช้ \b ท้ายหน่วยไทย — อักษรไทยไม่ใช่ word char ของ JS regex ⇒ ขอบเขตไม่เกิด
  const unit = t.match(/(\d+(?:\.\d+)?)\s*(หมื่น|พัน|แสน|ล้าน|k|m)/i);
  if (unit) {
    const mult: Record<string, number> = { พัน: 1e3, หมื่น: 1e4, แสน: 1e5, ล้าน: 1e6, k: 1e3, m: 1e6 };
    return Number(unit[1]) * mult[unit[2].toLowerCase()];
  }
  const plain = t.match(/(\d{3,})\s*(?:บาท|฿)?/);
  return plain ? Number(plain[1]) : null;
}

export function classifyAsk(raw: string): AskIntent {
  const r = raw.toLowerCase();
  // คำที่บอกว่า "ขยายผล" ชัดเจนอยู่แล้ว ตัดสินก่อน — "เพิ่มงบ" ไม่ต้องมีคำว่าแอดก็รู้ว่าคืออะไร
  if (PAID_SCALE_WORDS.some((w) => r.includes(w.toLowerCase()))) return 'paid-scale';
  const isPaid = INTENT_WORDS['paid-validation'].some((w) => r.includes(w.toLowerCase()));
  if (isPaid) {
    // ขยายผลหรือทดลอง? งบเป็นตัวตัดสิน — งบใหญ่ไม่ใช่การทดลองไม่ว่าจะเรียกว่าอะไร
    const b = budgetInAsk(raw);
    return b != null && b > PAID_VALIDATION_BUDGET_CEILING ? 'paid-scale' : 'paid-validation';
  }
  for (const [intent, words] of Object.entries(INTENT_WORDS)) {
    if (words.some((w) => r.includes(w.toLowerCase()))) return intent as AskIntent;
  }
  return 'other';
}

/** ด่านที่แต่ละเจตนาต้องผ่าน — ยิ่งใช้เงิน/ยิ่งขยาย ยิ่งต้องผ่านครบ */
export const REQUIRED_BY_INTENT: Record<AskIntent, ReadinessKey[]> = {
  /** 🔬 ทดลองด้วยงบเล็ก — ต้องการแค่ **วัดผลได้** กับ **รู้ว่าคุยกับใคร**
   *  ไม่บังคับ offer/unitEconomics/evidence เพราะนั่นคือสิ่งที่การทดลองนี้กำลังจะไปหา
   *  (กั้นตรงนี้ = กั้นการพิสูจน์ ซึ่งเป็นสิ่งเดียวกับที่ `validate: []` ห้ามไว้) */
  'paid-validation': ['customer', 'tracking'],
  /** 💸 ขยายผล — ต้องผ่านครบรวม evidence เพราะกำลังเอาเงินไปคูณสิ่งที่เชื่อว่าได้ผลแล้ว */
  'paid-scale': ['problem', 'customer', 'offer', 'unitEconomics', 'tracking', 'evidence'],
  scale: ['problem', 'customer', 'offer', 'unitEconomics', 'tracking', 'evidence'],
  content: ['problem', 'customer'],
  build: ['problem', 'customer'],
  validate: [],           // การพิสูจน์ไม่ต้องรออะไร — ทำได้เสมอ
  other: ['problem'],
};

export interface FounderVerdict {
  intent: AskIntent;
  /** อนุญาตให้ทำสิ่งที่ขอไหม */
  allow: boolean;
  /** ด่านที่ยังไม่ผ่าน (เรียงตามลำดับที่ควรทำ) */
  missing: typeof READINESS_CHECKS[number][];
  /** สิ่งที่ควรทำแทน — มาจากด่านแรกที่ยังไม่ผ่าน */
  nextBestAction: string;
  why: string;
  /** คำตอบของ Golden Question (ถ้าให้เหตุผลมา) */
  golden: ReturnType<typeof answersGoldenQuestion>;
}

/** ความพร้อมอ่านจาก Business Genome — กิ่งที่กรอกครบ = ด่านนั้นผ่าน
 *  ⚠️ อ่านจากข้อมูลจริง ไม่ใช่ให้ผู้ใช้บอกเองว่า "พร้อมแล้ว" */
export function readinessFromGenome(data: GenomeData): Record<ReadinessKey, boolean> {
  const status = genomeStatus(data);
  const done = (branch: string) => status.find((b) => b.key === branch)?.complete ?? false;
  return {
    problem: done('problem'),
    customer: done('customer'),
    offer: done('offer'),
    unitEconomics: done('economics'),
    tracking: done('acquisition'),
    evidence: done('experiment'),
  };
}

/** 🔴 ด่านหลัก — ผู้ใช้ขออะไรมา ระบบตอบว่าทำได้หรือต้องพิสูจน์ก่อน
 *
 *  @param raw      สิ่งที่ผู้ใช้พิมพ์มา เช่น "อยากยิง Ads 100,000 บาท"
 *  @param ready    ความพร้อมรายด่าน (ได้จาก readinessFromGenome)
 *  @param reason   เหตุผลที่ผู้ใช้/agent ให้ — ใช้ตอบ Golden Question
 */
export function founderGate(
  raw: string,
  ready: Partial<Record<ReadinessKey, boolean>>,
  reason?: string,
): FounderVerdict {
  const intent = classifyAsk(raw);
  const required = REQUIRED_BY_INTENT[intent];
  const missing = READINESS_CHECKS.filter((c) => required.includes(c.key) && !ready[c.key]);
  const golden = answersGoldenQuestion(reason);

  if (missing.length === 0) {
    return {
      intent,
      allow: golden.ok || intent === 'validate',
      missing: [],
      nextBestAction: golden.ok
        ? 'ทำได้ — และบันทึกผลกลับเข้า Experiment เพื่อให้รอบหน้าเริ่มจากของที่รู้แล้ว'
        : `ตอบ Golden Question ก่อน: "${GOLDEN_QUESTION}"`,
      why: golden.ok
        ? `ผ่านครบทุกด่านของ "${intent}" · ${golden.why}`
        : `ผ่านด่านความพร้อมแล้ว แต่ยังไม่ได้ตอบว่าทำแล้วธุรกิจเข้าใกล้อะไร — ${golden.why}`,
      golden,
    };
  }

  const first = missing[0];
  return {
    intent,
    allow: false,
    missing: [...missing],
    nextBestAction: first.nextAction,
    why:
      `ยังไม่ควรทำ "${raw.trim()}" — ${first.q} ยังไม่ผ่าน\n` +
      `เหตุผล: ${first.why}\n` +
      `เหลืออีก ${missing.length} ด่าน: ${missing.map((m) => m.q).join(' · ')}`,
    golden,
  };
}

/** ขั้นของพันธกิจที่ธุรกิจนี้อยู่ — ใช้บอกผู้ใช้ว่าเดินมาถึงไหนของ ไอเดีย → Scale */
export function missionStage(ready: Partial<Record<ReadinessKey, boolean>>): string {
  if (!ready.problem) return MISSION_CHAIN[0];        // ไอเดีย
  if (!ready.customer) return MISSION_CHAIN[1];       // ลูกค้า
  if (!ready.offer || !ready.evidence) return MISSION_CHAIN[2]; // หลักฐาน
  if (!ready.unitEconomics) return MISSION_CHAIN[3];  // รายได้
  if (!ready.tracking) return MISSION_CHAIN[4];       // ระบบ
  return MISSION_CHAIN[5];                            // Scale
}

/** บล็อกสำหรับ prompt — ให้ทุก agent รู้กติกานี้ก่อนตอบคำขอของผู้ใช้ */
export function founderMindsetBlock(): string {
  return [
    '## Founder Mindset Engine — ห้ามรีบทำตามที่ผู้ใช้ขอ',
    'ถ้าผู้ใช้ขอสิ่งที่ใช้เงินหรือขยาย ให้ตรวจ 6 ด่านนี้ก่อนเสมอ:',
    ...READINESS_CHECKS.map((c) => `  · ${c.q} — ถ้ายังไม่ผ่าน: ${c.nextAction}`),
    '',
    'ยังไม่ผ่าน ⇒ Next Best Action = **Validation ก่อน Scale**',
    'ห้ามตอบว่า "ได้เลย" กับคำขอที่ยังไม่ผ่านด่าน แม้ระบบจะทำได้ก็ตาม',
  ].join('\n');
}
