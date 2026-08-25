/* decisionRules — "ตอนนี้ธุรกิจควรทำอะไรต่อ" จากสภาพจริง ไม่ใช่จากสิ่งที่ AI ทำได้
 * (เจ้าของ freeze 24 ส.ค. 2569 จาก Marketing Diagnosis Case #001)
 *
 * 🔴 POD ที่ไฟล์นี้ทำให้เกิดจริง:
 *   ระบบทั่วไปตอบคำถาม "สร้างคอนเทนต์อะไรดี"
 *   CEO AI ต้อง **วินิจฉัยก่อน** แล้วตอบว่า "ตอนนี้ยังไม่ควรทำคอนเทนต์เพิ่ม เพราะ X"
 *   ⇒ Diagnose → Prioritize Bottleneck → Next Best Action → Experiment → Measure → Learn
 *
 * ⚠️ นี่คือ **กฎ** ไม่ใช่ **เอนจินที่เรียนรู้จากผลจริง** — กฎเขียนได้ที่ผู้ใช้ 0 ราย
 *    เอนจินที่ปรับ threshold เองจากผลลัพธ์ ต้องรอผู้ใช้ 5 ราย (`moatReadiness`)
 *    ทุก threshold ในไฟล์นี้จึงติดป้าย POLICY ไม่ใช่ VALIDATED
 *
 * 🧱 เส้นแบ่งเจ้าของ: ไฟล์นี้เป็น **กฎที่ทำงานกับธุรกิจของผู้ใช้** = ของรีโปนี้
 *    ส่วน "ข้อมูลการตลาดของเราเอง" (ตาราง marketing_*) เป็นของอีกระบบ — ไม่แตะ
 *
 * pure ทั้งไฟล์ · ไม่แตะฐานข้อมูล · ไม่มี migration
 */

/* ══════════════════════════════════════════════════════════════════════════
 * ① Measurement Safety — แยก "สิ่งที่นับได้" ออกจาก "อัตราที่อนุมาน"
 *
 * เจ้าของแก้ถูก 24 ส.ค. 2569: ประโยค *"ศูนย์ไม่ต้องรอ sample"* ผิด
 *   `0/32 observed` ยืนยันได้แค่ว่า **นับได้ 0** — ไม่ได้แปลว่า **อัตราจริง = 0**
 *   ⇒ "social ให้ผลเป็นศูนย์" เป็นข้อสรุปเชิงประชากรที่ข้อมูลชุดนี้ยังไม่รองรับ
 * ══════════════════════════════════════════════════════════════════════════ */

/** สิ่งที่นับได้ตรง ๆ — ยืนยันได้ทันทีไม่ต้องรอ sample */
export interface ObservedCount {
  kind: 'observed-count';
  label: string;
  n: number;
  of?: number;
}

/** อัตราที่ **อนุมาน** จากตัวอย่าง — ต้องมี sample พอถึงจะพูดได้ */
export interface InferredRate {
  kind: 'inferred-rate';
  label: string;
  numerator: number;
  denominator: number;
}

/** ตัวอย่างขั้นต่ำก่อนพูดถึง "อัตรา" ของช่องทางหนึ่ง
 *  🏷️ POLICY — ยังไม่ใช่ค่าที่พิสูจน์จากผลจริงของเราเอง */
export const MIN_SAMPLE_FOR_RATE = 100;

export type ThresholdStatus = 'policy' | 'hypothesis' | 'validated';

/** ป้ายกำกับที่ต้องติดกับทุกเกณฑ์ — กัน hypothesis เลื่อนชั้นเป็น fact เงียบ ๆ */
export const THRESHOLD_STATUS: Record<string, ThresholdStatus> = {
  MIN_SAMPLE_FOR_RATE: 'policy',
  UTM_COVERAGE_REQUIRED: 'policy',
  LEADS_BEFORE_PAID_SCALE: 'hypothesis',
  DEFAULT_SEGMENT_DOMINANT: 'policy',
};

/** พูดถึงตัวเลขนี้ยังไงให้ไม่เกินหลักฐาน */
export function stateSafely(v: ObservedCount | InferredRate): string {
  if (v.kind === 'observed-count') {
    return v.of != null
      ? `${v.label}: นับได้ ${v.n} จาก ${v.of} ที่สังเกต`
      : `${v.label}: นับได้ ${v.n}`;
  }
  const { numerator: a, denominator: b, label } = v;
  if (b < MIN_SAMPLE_FOR_RATE) {
    return `${label}: ในข้อมูลที่สังเกต ${b} ครั้ง พบ ${a} ครั้ง ` +
      `— ตัวอย่างยังไม่ถึง ${MIN_SAMPLE_FOR_RATE} จึงยังสรุปเป็นอัตราไม่ได้`;
  }
  return `${label}: ${Math.round((a / b) * 1000) / 10}% (จาก ${b} ครั้ง)`;
}

/** 🔴 ห้ามพูดว่า "อัตราจริงเป็นศูนย์" จากการนับได้ศูนย์
 *  คืนประโยคที่พูดได้จริง เมื่อมีคนเสนอจะสรุปแบบนั้น */
export function zeroIsNotProof(label: string, observed: number, of: number): string {
  return observed === 0
    ? `ใน ${of} ครั้งที่สังเกต ยังไม่พบ${label} — ยังไม่ได้แปลว่าอัตราจริงเป็นศูนย์`
    : `พบ${label} ${observed} จาก ${of} ครั้งที่สังเกต`;
}

/* ══════════════════════════════════════════════════════════════════════════
 * ② สภาพธุรกิจที่กฎอ่าน — ทุกช่องต้องมาจากข้อมูลจริง ห้ามให้ผู้ใช้บอกเอง
 * ══════════════════════════════════════════════════════════════════════════ */

export interface BusinessState {
  sessions: number;
  sessionsWithUtm: number;
  /** session ที่เห็นหน้า default (ไม่ถูกจัดเข้า segment ไหน) */
  sessionsDefaultSegment: number;
  /** จำนวน segment ที่ "นิยามไว้แล้ว" — มากกว่า 1 ถึงจะพูดเรื่อง routing ได้ */
  definedSegments: number;
  /** มีกลไกเก็บ lead ที่ผู้ใช้ทำได้โดยไม่ต้องสมัครเต็มรูปแบบไหม */
  leadCaptureMechanism: boolean;
  leads: number;
  /** หลักฐานว่า offer นี้มีคนตอบรับ (จำนวนครั้งที่บันทึกไว้) */
  offerEvidence: number;
}

/** สัดส่วน UTM ขั้นต่ำก่อนจะสรุปเรื่อง "ช่องทางไหนได้ผล"
 *  🏷️ POLICY — ต่ำกว่านี้ ที่มาของคนส่วนใหญ่ระบุไม่ได้ ⇒ ข้อสรุปเรื่องช่องทางเป็นเงาของบั๊กเรา */
export const UTM_COVERAGE_REQUIRED = 0.9;

/** สัดส่วนที่ถือว่า "หน้า default ครองทราฟฟิก" 🏷️ POLICY */
export const DEFAULT_SEGMENT_DOMINANT = 0.5;

/** จำนวน lead ก่อนขยายงบ 🏷️ HYPOTHESIS — ยังไม่มีผลจริงรองรับ
 *  Learning Engine ต้องปรับค่านี้จาก outcome จริงภายหลัง ห้าม freeze เป็น fact */
export const LEADS_BEFORE_PAID_SCALE = 50;

export type RuleId =
  | 'MEASUREMENT_NOT_READY'
  | 'NO_LEAD_CAPTURE'
  | 'SEGMENTATION_NOT_ACTIVATED'
  | 'PAID_SCALE_NOT_READY';

export interface RuleHit {
  rule: RuleId;
  /** เพราะอะไร — ต้องอ้างตัวเลขจริง ไม่ใช่คำบรรยาย */
  because: string;
  nextBestAction: string;
  /** สิ่งที่ห้ามสรุปตราบใดที่กฎนี้ยังติด */
  blocks: string[];
}

/** ลำดับคอขวดที่เจ้าของ freeze — ห้ามข้ามขั้น
 *  Measurement → Lead capture → Segment routing → Message/Offer → Organic
 *  → Evidence → Paid validation → Scale */
export const BOTTLENECK_ORDER = [
  'measurement-readiness',
  'lead-capture',
  'segment-routing',
  'message-offer-experiment',
  'organic-distribution',
  'evidence-accumulation',
  'paid-validation',
  'scale',
] as const;
export type Bottleneck = typeof BOTTLENECK_ORDER[number];

const RULE_BOTTLENECK: Record<RuleId, Bottleneck> = {
  MEASUREMENT_NOT_READY: 'measurement-readiness',
  NO_LEAD_CAPTURE: 'lead-capture',
  SEGMENTATION_NOT_ACTIVATED: 'segment-routing',
  PAID_SCALE_NOT_READY: 'scale',
};

export function evaluateRules(s: BusinessState): RuleHit[] {
  const hits: RuleHit[] = [];
  const utmCoverage = s.sessions > 0 ? s.sessionsWithUtm / s.sessions : 0;

  if (utmCoverage < UTM_COVERAGE_REQUIRED) {
    hits.push({
      rule: 'MEASUREMENT_NOT_READY',
      because: `${s.sessionsWithUtm} จาก ${s.sessions} session มีแท็กที่มา ` +
        `(${Math.round(utmCoverage * 100)}% · ต้องการ ${Math.round(UTM_COVERAGE_REQUIRED * 100)}%)`,
      nextBestAction: 'ซ่อมการวัดก่อน — ติดแท็กที่มาให้ครบทุกลิงก์ที่ปล่อยออกไป',
      blocks: [
        'ข้อสรุปว่าช่องทางไหนได้ผล/ไม่ได้ผล',
        'การเพิ่มงบให้ช่องทางใดช่องทางหนึ่ง',
      ],
    });
  }

  if (!s.leadCaptureMechanism && s.leads === 0) {
    hits.push({
      rule: 'NO_LEAD_CAPTURE',
      because: 'ยังไม่มีขั้นกลางที่คนยอมทำก่อนสมัครเต็มรูปแบบ และเก็บ lead ได้ 0',
      nextBestAction: 'เปิดขั้นกลางที่แลกกับข้อมูลติดต่อ โดยผู้ใช้ได้ของจริงกลับไปทันที',
      blocks: ['การประเมินว่าข้อเสนอดีหรือไม่ดี (ยังไม่มีใครได้เห็นข้อเสนอเลย)'],
    });
  }

  const defaultShare = s.sessions > 0 ? s.sessionsDefaultSegment / s.sessions : 0;
  if (s.definedSegments > 1 && defaultShare > DEFAULT_SEGMENT_DOMINANT) {
    hits.push({
      rule: 'SEGMENTATION_NOT_ACTIVATED',
      because: `นิยามไว้ ${s.definedSegments} กลุ่ม แต่ ${s.sessionsDefaultSegment} จาก ${s.sessions} ` +
        'session ยังเห็นหน้า default',
      nextBestAction: 'เปิดการนำทางตามกลุ่มก่อน — งานที่ทำไว้แล้วยังไม่ถูกใช้',
      blocks: ['การผลิตคอนเทนต์เพิ่มแบบกว้าง ๆ (เพิ่มปริมาณให้กับสารที่ยังไม่ตรงคน)'],
    });
  }

  const trackingReady = utmCoverage >= UTM_COVERAGE_REQUIRED;
  const leadReady = s.leadCaptureMechanism && s.leads >= LEADS_BEFORE_PAID_SCALE;
  if (!trackingReady || !leadReady || s.offerEvidence <= 0) {
    hits.push({
      rule: 'PAID_SCALE_NOT_READY',
      because: [
        !trackingReady ? 'วัดผลยังไม่พร้อม' : null,
        !leadReady ? `lead ${s.leads} ยังไม่ถึง ${LEADS_BEFORE_PAID_SCALE} (เกณฑ์เชิงนโยบาย)` : null,
        s.offerEvidence <= 0 ? 'ยังไม่มีหลักฐานว่าข้อเสนอมีคนตอบรับ' : null,
      ].filter(Boolean).join(' · '),
      // 🔴 บล็อก "ขยายผล" เท่านั้น ไม่ได้บล็อก "การทดลองด้วยงบเล็ก"
      nextBestAction: 'ยังไม่เพิ่มงบ — ถ้าจะใช้เงิน ให้ใช้เป็นการทดลองก้อนเล็กที่มีเงื่อนไขหยุดชัดเจน',
      blocks: ['การเพิ่มงบโฆษณา (paid scale)'],
    });
  }

  return hits;
}

export interface Diagnosis {
  hits: RuleHit[];
  /** คอขวดแรกตามลำดับที่ freeze ไว้ — ตัวเดียวที่ควรลงมือตอนนี้ */
  bottleneck: Bottleneck | null;
  /** ประโยคเดียวที่ผู้ใช้ต้องอ่าน */
  nextBestAction: string;
  /** 🔬 ใช้เงินก้อนเล็กเพื่อหาคำตอบได้ไหม (ต่างจากการเพิ่มงบ) */
  paidValidationAllowed: boolean;
  paidScaleAllowed: boolean;
}

export function diagnose(s: BusinessState): Diagnosis {
  const hits = evaluateRules(s);
  const ordered = [...hits].sort(
    (a, b) => BOTTLENECK_ORDER.indexOf(RULE_BOTTLENECK[a.rule]) - BOTTLENECK_ORDER.indexOf(RULE_BOTTLENECK[b.rule]),
  );
  const first = ordered[0] ?? null;
  return {
    hits: ordered,
    bottleneck: first ? RULE_BOTTLENECK[first.rule] : null,
    nextBestAction: first ? first.nextBestAction : 'ผ่านทุกกฎแล้ว — ขั้นต่อไปคือขยายผลที่พิสูจน์แล้ว',
    // 🔴 การทดลองต้องทำได้เสมอ ตราบใดที่วัดผลได้ — ห้าม hard-block ทุกกรณี
    //    (หลักเดียวกับ `founderMindset.REQUIRED_BY_INTENT.validate = []`)
    paidValidationAllowed: !hits.some((h) => h.rule === 'MEASUREMENT_NOT_READY'),
    paidScaleAllowed: !hits.some((h) => h.rule === 'PAID_SCALE_NOT_READY'),
  };
}

/** บล็อกที่แปะเข้า prompt — บังคับให้ AI วินิจฉัยก่อนเสนองาน */
export function decisionRulesBlock(): string {
  return [
    '## กฎการตัดสินใจ (Decision Rules) — วินิจฉัยก่อนเสนอเสมอ',
    `ลำดับคอขวด (ห้ามข้ามขั้น): ${BOTTLENECK_ORDER.join(' → ')}`,
    '',
    '🔴 ก่อนเสนอ "ทำคอนเทนต์เพิ่ม" หรือ "ยิงแอด" ต้องตอบให้ได้ก่อนว่า',
    '   วัดผลได้หรือยัง · มีที่รับ lead ไหม · สารตรงกับกลุ่มหรือยัง · ข้อเสนอมีหลักฐานไหม',
    '',
    '🔴 แยกให้ชัด: **การทดลองด้วยงบเล็ก ≠ การเพิ่มงบ**',
    '   ทดลอง (งบเล็ก · สมมติฐานเดียว · กลุ่มเดียว · มีเงื่อนไขหยุด) = ทำได้ถ้าวัดผลได้',
    '   เพิ่มงบ = ต้องผ่านหลักฐานก่อนเสมอ',
    '',
    '🔴 นับได้ ≠ อัตราจริง — "0 จาก 32" แปลว่ายังไม่พบ ไม่ได้แปลว่าอัตราเป็นศูนย์',
    `🏷️ ทุกเกณฑ์ในระบบเป็น POLICY/HYPOTHESIS จนกว่าจะมีผลจริงรองรับ (ห้ามอ้างว่า validated)`,
  ].join('\n');
}
