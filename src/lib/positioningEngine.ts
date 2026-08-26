/* positioningEngine — ด่านที่ทุกแคมเปญ/คอนเทนต์ต้องผ่านก่อนถูกสร้าง
 * (เจ้าของยกระดับ POP/POD/VRIO เป็น "กฎหลักของ AI Marketing OS" 23 ส.ค. 2569)
 *
 * ทำไมต้องเป็นด่านที่ block ได้ ไม่ใช่ prompt:
 *   prompt = คำแนะนำ · AI ทำตามบ้างไม่ทำตามบ้าง และไม่มีใครรู้ว่ารอบไหนไม่ทำ
 *   ด่าน = ถ้าไม่ผ่าน **สร้างไม่ได้** ⇒ ความผิดพลาดกลายเป็นสิ่งที่เป็นไปไม่ได้ ไม่ใช่สิ่งที่ควรระวัง
 *
 * 🔴 ปัญหาที่ด่านนี้แก้: ถ้าไม่มีชั้นนี้ Content Agent จะไหลกลับไปเขียน
 *   "AI ทำงานให้คุณ" · "AI Agent สำหรับ SME" ซึ่งเป็น **POP ที่คู่แข่งพูดได้เหมือนกันทุกคำ**
 *
 * ⚠️ ไฟล์นี้ **ไม่แตะ schema/migration** โดยตั้งใจ (ด่านปล่อยของ: `releaseGates.ts` — ตอนเขียนยังกั้นอยู่)
 *    ทั้งหมดเป็น pure logic — เสียบเข้า agent ได้โดยไม่กระทบ security evidence ที่กำลังเก็บ
 */

import { POP, POD, VRIO_LADDER, CATEGORY, MOAT_CLAIM } from './competitiveStrategy';
import { MIN_FOR_RATE } from './growthPdca';

/** หลักการแม่ของ CEO AI Marketing — ประโยคเดียวที่ทับทุกอย่าง */
export const MASTER_PRINCIPLE =
  'อย่าใช้ AI เพื่อสร้าง Content ให้มากขึ้น — ' +
  'ใช้ AI เพื่อค้นหาว่าอะไรควรพูด กับใคร เพราะอะไร และเรียนรู้อะไรจากผลลัพธ์';

/** สายการทำงานของ Marketing Brain — Positioning Engine อยู่ตรงกลาง ไม่ใช่ท้ายสุด */
export const MARKETING_BRAIN = [
  'Business Context',
  'Audience / JTBD',
  'Problem Validation',
  'Positioning Engine',      // ← ชั้นใหม่ที่ไฟล์นี้เป็นตัวแทน
  'Offer',
  'Campaign Hypothesis',
  'Message / Content',
  'Compliance + Evidence',
  'Human Approval',
  'Tracking',
  'Outcome',
  'Learning Loop',
  'VRIO Strengthens',
] as const;

/** DNA ของคอนเทนต์ — ลำดับนี้ห้ามสลับ
 *  ของเดิม: AI → Feature → Content → CTA  (ขายเครื่องมือ)
 *  ของใหม่: เริ่มที่ปัญหาของลูกค้า · AI เป็น "กลไก" ไม่ใช่ "หัวเรื่อง" */
export const CONTENT_DNA = [
  'Customer Problem',
  'Business Insight',
  'POD',
  'Proof',
  'AI-enabled Action',
  'Experiment',
  'Measurement',
  'Learning',
] as const;

/** ระดับความแน่นอนของข้ออ้าง — ทุก claim ต้องติดป้ายนี้เสมอ */
export type ClaimStatus = 'hypothesis' | 'research' | 'observed' | 'validated';

export const CLAIM_RANK: Record<ClaimStatus, number> = {
  hypothesis: 0, research: 1, observed: 2, validated: 3,
};

export const CLAIM_LABEL: Record<ClaimStatus, string> = {
  hypothesis: 'สมมติฐาน — เรายังไม่รู้ว่าจริงไหม',
  research: 'จากงานวิจัย/แหล่งภายนอก — ไม่ใช่ข้อมูลของเราเอง',
  observed: 'สังเกตได้จากข้อมูลของเรา — แต่ยังสรุปเป็นเหตุ-ผลไม่ได้',
  validated: 'พิสูจน์แล้วด้วยการทดลองของเราเอง',
};

/** สิ่งที่ลูกค้า "ใช้อยู่แล้ว" แทนเรา — ต้องระบุเสมอ ไม่งั้นจะเขียนเหมือนไม่มีทางเลือกอื่น */
export const COMPETITIVE_ALTERNATIVES = [
  'ChatGPT / Gemini / Claude',
  'เครื่องมือ AI ทั่วไป (Canva · automation tools)',
  'เอเจนซี',
  'ที่ปรึกษา',
  'Excel / จดมือ / ไม่ทำอะไรเลย',
] as const;

/** 10 คำถามที่ทุกแคมเปญต้องตอบก่อนผ่านด่าน */
export const STRATEGY_GATE_QUESTIONS = [
  { key: 'segment', q: 'Target segment คือใคร' },
  { key: 'jtbd', q: 'JTBD คืออะไร' },
  { key: 'problem', q: 'Problem ที่เรากำลังพูดถึงคืออะไร' },
  { key: 'popExpected', q: 'POP อะไรที่ลูกค้าคาดหวังอยู่แล้ว' },
  { key: 'podClaim', q: 'POD อะไรที่ทำให้เราต่างจริง' },
  { key: 'podEvidence', q: 'POD นี้มี Evidence ระดับไหน' },
  { key: 'vrioSupport', q: 'VRIO asset อะไรสนับสนุน claim นี้' },
  { key: 'experiment', q: 'ต้องการให้ลูกค้าทำ experiment อะไร' },
  { key: 'successMetric', q: 'Success metric คืออะไร' },
  { key: 'learnIfWrong', q: 'ถ้าผลไม่เป็นไปตามสมมติฐาน เราจะเรียนรู้อะไร' },
] as const;

export interface CampaignBrief {
  segment?: string;
  jtbd?: string;
  problem?: string;
  /** POP ที่ลูกค้าคาดหวังอยู่แล้ว — ระบุไว้เพื่อ "รู้ว่าอย่าไปขายข้อนี้" */
  popExpected?: string[];
  /** ข้ออ้างที่ทำให้เราต่าง — ต้องอยู่ในตระกูล POD */
  podClaim?: string | null;
  podEvidence?: ClaimStatus;
  /** id จาก VRIO_LADDER ที่รองรับ claim นี้ */
  vrioSupport?: string[];
  alternative?: string | null;
  experiment?: string | null;
  successMetric?: string | null;
  learnIfWrong?: string | null;
  /** จำนวนตัวอย่างที่ใช้สรุปผล (ถ้าแคมเปญนี้อ้างผลงาน) */
  sampleSize?: number | null;
}

/** ความแรงของข้ออ้างที่อนุญาต — ไล่จากพูดไม่ได้เลย ถึงอ้างความต่างได้ */
export type ClaimStrength = 'none' | 'inform' | 'hypothesis' | 'differentiation';

export interface GateBlock { rule: string; why: string; fix: string }

export interface GateVerdict {
  pass: boolean;
  /** คำถามในด่านที่ยังไม่ได้ตอบ */
  unanswered: string[];
  blocks: GateBlock[];
  allowedClaimStrength: ClaimStrength;
  /** พาดหัวต้องเริ่มด้วยอะไรเสมอ */
  hookMustLeadWith: string;
  summary: string;
}

const filled = (v: unknown): boolean =>
  Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim().length > 0 : v != null;

/** POD claim ต้องเกาะกับชั้น POD จริง ไม่ใช่คำสวย ๆ ที่แต่งเอง */
export function podLayerFor(claim: string | null | undefined): typeof POD[number] | null {
  if (!claim) return null;
  const c = claim.toLowerCase();
  // ชื่อชั้นแบบเป๊ะมาก่อนเสมอ — ไม่งั้น "Scale with System" ไปชนคำว่า System ของชั้น 3
  const byName = POD.find((p) => c.includes(p.name.toLowerCase()));
  if (byName) return byName;
  return POD.find((p) => p.keywords.some((k) => c.includes(k.toLowerCase()))) ?? null;
}

/** claim นี้เป็นแค่ POP หรือเปล่า (คู่แข่งพูดได้เหมือนกันทุกคำ) */
export function isPopOnly(claim: string | null | undefined): boolean {
  if (!claim) return false;
  const c = claim.toLowerCase();
  return POP.some((p) => c.includes(p.toLowerCase())) && podLayerFor(claim) == null;
}

/* ── 4 กฎบังคับ (เจ้าของกำหนด) ───────────────────────────────────────────
 *   NO POD        → NO STRONG DIFFERENTIATION CLAIM
 *   NO EVIDENCE   → CLAIM MUST REMAIN HYPOTHESIS
 *   LOW SAMPLE    → NO STRONG PERFORMANCE CONCLUSION
 *   POP ONLY      → MAY INFORM BUT MUST NOT CLAIM COMPETITIVE ADVANTAGE
 * ──────────────────────────────────────────────────────────────────────── */

export function reviewCampaign(brief: CampaignBrief): GateVerdict {
  const unanswered = STRATEGY_GATE_QUESTIONS
    .filter((q) => !filled((brief as Record<string, unknown>)[q.key]))
    .map((q) => q.q);

  const blocks: GateBlock[] = [];
  let strength: ClaimStrength = 'differentiation';
  const weaken = (s: ClaimStrength) => {
    const order: ClaimStrength[] = ['none', 'inform', 'hypothesis', 'differentiation'];
    if (order.indexOf(s) < order.indexOf(strength)) strength = s;
  };

  // ① POP ONLY → บอกเล่าได้ แต่ห้ามอ้างความได้เปรียบ
  if (isPopOnly(brief.podClaim)) {
    blocks.push({
      rule: 'POP ONLY → MUST NOT CLAIM COMPETITIVE ADVANTAGE',
      why: `"${brief.podClaim}" เป็น POP — คู่แข่งพูดได้เหมือนกันทุกคำ (${POP.slice(0, 4).join(' · ')} …)`,
      fix: `เปลี่ยนไปยึดชั้น POD: ${POD.map((p) => p.name).join(' · ')}`,
    });
    weaken('inform');
  }

  // ② NO POD → ห้ามอ้างความต่างแบบแรง
  if (!filled(brief.podClaim) || podLayerFor(brief.podClaim) == null) {
    if (!isPopOnly(brief.podClaim)) {
      blocks.push({
        rule: 'NO POD → NO STRONG DIFFERENTIATION CLAIM',
        why: 'ไม่มีข้ออ้างที่เกาะกับชั้น POD ⇒ ไม่มีเหตุผลว่าทำไมต้องเลือกเรา',
        fix: 'ระบุว่าแคมเปญนี้ยืนบน POD ชั้นไหน แล้วเขียนข้ออ้างจากชั้นนั้น',
      });
    }
    weaken('inform');
  }

  // ③ NO EVIDENCE → claim ต้องคงสถานะเป็นสมมติฐาน
  const ev = brief.podEvidence;
  if (!ev || CLAIM_RANK[ev] < CLAIM_RANK.observed) {
    blocks.push({
      rule: 'NO EVIDENCE → CLAIM MUST REMAIN HYPOTHESIS',
      why: `ระดับหลักฐาน = ${ev ? CLAIM_LABEL[ev] : 'ยังไม่ระบุ'} ⇒ ยังพูดเป็นข้อเท็จจริงไม่ได้`,
      fix: 'เขียนเป็นคำถาม/สมมติฐาน หรือหาหลักฐานระดับ observed ขึ้นไปก่อน',
    });
    weaken('hypothesis');
  }

  // ④ LOW SAMPLE → ห้ามสรุปผลงาน · ใช้เกณฑ์เดียวกับ growthPdca ห้ามตั้งเลขใหม่
  if (brief.sampleSize != null && brief.sampleSize < MIN_FOR_RATE) {
    blocks.push({
      rule: 'LOW SAMPLE → NO STRONG PERFORMANCE CONCLUSION',
      why: `ตัวอย่าง ${brief.sampleSize} < ${MIN_FOR_RATE} ⇒ อัตราส่วนยังอ่านไม่ได้`,
      fix: `รายงานเป็น "จำนวนคน" ไม่ใช่เปอร์เซ็นต์ จนกว่าจะถึง ${MIN_FOR_RATE}`,
    });
    weaken('hypothesis');
  }

  // VRIO ที่อ้าง ต้องมีอยู่จริงในบันได และต้องปลดล็อกแล้ว (ผู้ใช้จริง 0 ราย)
  for (const id of brief.vrioSupport ?? []) {
    const item = VRIO_LADDER.find((v) => v.id === id);
    if (!item) {
      blocks.push({
        rule: 'VRIO ASSET MUST EXIST',
        why: `อ้าง VRIO "${id}" ที่ไม่มีอยู่ในบันได`,
        fix: `ใช้ id จริง: ${VRIO_LADDER.map((v) => v.id).join(' · ')}`,
      });
      weaken('inform');
    }
  }

  if (unanswered.length > 0) weaken('none');

  return {
    pass: blocks.length === 0 && unanswered.length === 0,
    unanswered,
    blocks,
    allowedClaimStrength: strength,
    hookMustLeadWith: 'ปัญหาของลูกค้า — ห้ามขึ้นด้วยชื่อหมวดหมู่หรือความสามารถ AI',
    summary: blocks.length === 0 && unanswered.length === 0
      ? 'ผ่านด่าน — อ้างความต่างได้ตามหลักฐานที่มี'
      : `ยังผ่านไม่ได้: ตอบไม่ครบ ${unanswered.length} ข้อ · ติดกฎ ${blocks.length} ข้อ`,
  };
}

/** บล็อกที่แปะเข้า prompt ของทุก agent การตลาด */
export function positioningBlock(): string {
  return [
    '## ด่านกลยุทธ์ (Positioning Engine) — ต้องผ่านก่อนสร้างคอนเทนต์',
    `หลักการแม่: ${MASTER_PRINCIPLE}`,
    `ลำดับ DNA ของคอนเทนต์ (ห้ามสลับ): ${CONTENT_DNA.join(' → ')}`,
    `พาดหัวต้องขึ้นด้วย: ปัญหาของลูกค้า · ตัวอย่าง: "${CATEGORY.publicHook}"`,
    '',
    '10 คำถามที่ต้องตอบก่อน:',
    ...STRATEGY_GATE_QUESTIONS.map((q, i) => `  ${i + 1}. ${q.q}`),
    '',
    'กฎบังคับ 4 ข้อ:',
    '  NO POD → ห้ามอ้างความต่างแบบแรง',
    '  NO EVIDENCE → claim ต้องคงสถานะเป็นสมมติฐาน',
    `  LOW SAMPLE (< ${MIN_FOR_RATE}) → ห้ามสรุปผลงาน`,
    '  POP ONLY → บอกเล่าได้ แต่ห้ามอ้างความได้เปรียบ',
    '',
    `ทางเลือกที่ลูกค้าใช้อยู่แล้วแทนเรา: ${COMPETITIVE_ALTERNATIVES.join(' · ')}`,
    `🔴 ห้ามอ้าง: ${MOAT_CLAIM.mustNotClaim.join(' · ')}`,
  ].join('\n');
}
