/* phase1Baseline — เส้นตั้งต้นของ Phase 1 ที่ freeze แล้ว (22 พ.ย. 2569)
 *
 * 🔴 ปัญหาที่ไฟล์นี้แก้: ด่าน `Freeze Phase 1 baseline` เคยเป็น `owner-only`
 *    ⇒ ปิดได้ทางเดียวคือรอเจ้าของพิมพ์ว่า "freeze แล้ว" แล้วเราจะยืนยันได้แค่
 *       **"เจ้าของบอกว่าผ่าน"** ไม่ใช่ **"ตรวจแล้วว่าผ่าน"** — ความผิดชุดเดียวกับ
 *       `Phase 1 Acceptance #2` ที่ผ่านไปโดยเกณฑ์ไม่เคยถูกเขียนลงรีโปเลยสักรอบ
 *    ⇒ 22 พ.ย. 2569 เจ้าของสั่ง: *"นิยาม freeze baseline แก้ไขได้ เพื่อให้ใช้งานได้"*
 *
 * 📌 **นิยามที่ใช้ตั้งแต่วันนี้ — freeze = เขียนตัวเลขตั้งต้นลงรีโป พร้อม "วิธีนับ" และ "วันที่"
 *    แล้วล็อกด้วยเทสต์** · ไม่ใช่พิธีกรรม และไม่ใช่ประโยคยืนยันในแชต
 *    เหตุผลที่นิยามเป็นแบบนี้ (baseline มีหน้าที่เดียว = ทำให้ "แก้แล้วดีขึ้นไหม" ตอบได้):
 *      · ไม่มี baseline      ⇒ ทุกคำกล่าวอ้างเรื่อง "ดีขึ้น" พิสูจน์ไม่ได้ (PDCA ขั้น Check ตาบอด)
 *      · baseline ในแชต      ⇒ หายไปกับ context window แล้วรอบหน้าเดาใหม่ (ledger #41)
 *      · baseline ไม่มีวิธีนับ ⇒ รอบหน้านับคนละวิธี ตัวเลขขยับโดยที่ของจริงไม่ได้ขยับ
 *
 * 🔴 "freeze" **ไม่ได้แปลว่าห้ามเปลี่ยนตัวเลขตลอดกาล** — แปลว่า **เปลี่ยนแล้วต้องรู้ตัว**
 *    เทสต์ล็อกค่าทุกตัวไว้ตรง ๆ ⇒ แก้ค่าโดยไม่แก้เทสต์ = แดง (หลักเดียวกับ `BASELINE_DEBT`)
 *
 * 🔴 ตัวเลขชุดนี้คือ **ค่าที่วัดได้ ไม่ใช่ค่าที่หวัง** — หลายตัวเป็นศูนย์ และนั่นคือความจริง
 *    `0` ที่นี่แปลว่า "ยังไม่พบ" ไม่ใช่ "อัตราจริงเป็นศูนย์" (decisionRules.zeroIsNotProof)
 *
 * pure ทั้งไฟล์ · ไม่เรียกฐานข้อมูลเอง (ตัวเลขวัดด้วยมือแล้วบันทึก · วิธีนับติดอยู่ทุกแถว)
 */

/** ตัวเลขนี้มาจากไหน — `measured` เท่านั้นที่ปิดด่านได้ */
export type BaselineTruth =
  | 'measured'     // นับจากของจริงแล้ว และวิธีนับเขียนไว้ให้รันซ้ำได้
  | 'unavailable'; // 🔴 วัดไม่ได้ และบอกได้ว่าเพราะอะไร — ไม่ใช่ 0

export interface BaselineMetric {
  key: string;
  label: string;
  /** required = ต้องเป็น measured ถึงจะถือว่า freeze สำเร็จ */
  required: boolean;
  truth: BaselineTruth;
  /** null ได้เฉพาะเมื่อ truth = 'unavailable' */
  value: number | null;
  unit: string;
  /** YYYY-MM-DD — วันที่ "วัด" ไม่ใช่วันที่เขียนไฟล์ */
  measuredAt: string;
  /** วิธีนับ ต้องละเอียดพอให้คนอื่นนับซ้ำได้เลขเดียวกัน ("ดูจากแดชบอร์ด" ไม่นับ) */
  method: string;
  /** สิ่งที่ตัวเลขนี้ **ไม่ได้** บอก — กันการอ่านเกินจริงในรอบถัดไป */
  doesNotMean?: string;
  /** บังคับเมื่อ truth = 'unavailable' */
  whyUnavailable?: string;
}

/** Phase 1 ครอบคลุมอะไร — ไม่มีขอบเขต = "baseline ของอะไร" ตอบไม่ได้ */
export const PHASE1_SCOPE: readonly string[] = [
  'หน้า Landing `/` + `/start` และสายวัดผลของมัน (landing_funnel · quickcheck · GA/Amplitude)',
  'สะพานส่ง event ออกไปยังระบบการตลาดของอีกระบบ (ขา push เท่านั้น — ขา pull ยังไม่มี)',
  'ชั้นกฎที่ปล่อยของได้โดยไม่แตะ schema (brandBrief · positioningEngine · decisionRules · releaseGates)',
];

/** วันที่ freeze — วันที่ตัวเลขชุดนี้ถูกเขียนลงรีโปและถูกล็อกด้วยเทสต์ */
export const PHASE1_FROZEN_AT = '2026-11-22';
/** วันเดียวกันในรูปแบบที่ทั้งรีโปใช้ (พ.ศ.) — ใช้ในประโยคสถานะด่าน */
export const PHASE1_FROZEN_AT_TH = '22 พ.ย. 2569';

/** ของจริงที่เสิร์ฟตัวเลขชุดนี้อยู่ตอน freeze (ยืนยันได้จากหน้าเว็บจริง ไม่ใช่จากรีโป) */
export const PHASE1_FROZEN_BUNDLE = 'index-DQCwqKgo.js';

/* ⚠️ ค่าทุกตัวด้านล่างวัดเมื่อ 22 พ.ย. 2569 ด้วย SQL บน production `waigsnxhrlwtiotspaim`
 *    (ยกเว้นตัวสุดท้ายที่วัดบนฐานของอีกระบบ) — คำสั่งที่ใช้อยู่ในช่อง `method` ของแต่ละแถว */
export const PHASE1_BASELINE: readonly BaselineMetric[] = [
  {
    key: 'landingVisitors',
    label: 'ผู้เข้าชมหน้า Landing ตลอดกาล',
    required: true,
    truth: 'measured',
    value: 395,
    unit: 'session',
    measuredAt: '2026-11-22',
    method: 'select count(*) from public.landing_funnel — 1 แถว = 1 ผู้เข้าชม (session uuid สุ่มฝั่ง client)',
    doesNotMean: 'ไม่ใช่จำนวนคน — คนเดิมเปิดคนละเครื่อง/คนละวันนับใหม่ · และหน้า /start ไม่ได้เขียนตารางนี้',
  },
  {
    key: 'segIdentified',
    label: 'ผู้เข้าชมที่ระบบรู้กลุ่มเป้าหมาย (seg ไม่ใช่ default)',
    required: true,
    truth: 'measured',
    value: 20,
    unit: 'session',
    measuredAt: '2026-11-22',
    method: "select count(*) from public.landing_funnel where seg is distinct from 'default'",
    doesNotMean: 'ไม่ได้แปลว่าอีก 375 คนไม่มีกลุ่ม — 97.5% ที่ตกเป็น default เคยเป็นบั๊กของเราเอง (ledger #73/#74)',
  },
  {
    key: 'reachedCta',
    label: 'ผู้เข้าชมที่กดปุ่มหลัก',
    required: true,
    truth: 'measured',
    value: 10,
    unit: 'session',
    measuredAt: '2026-11-22',
    method: 'select count(*) from public.landing_funnel where reached_cta',
  },
  {
    key: 'signups',
    label: 'ผู้เข้าชมที่ไปถึงขั้นสมัคร',
    required: true,
    truth: 'measured',
    value: 5,
    unit: 'session',
    measuredAt: '2026-11-22',
    method: 'select count(*) from public.landing_funnel where reached_signup',
    doesNotMean: 'ถึงหน้าสมัคร ไม่ใช่สมัครสำเร็จ — และ 5 ตัวอย่างต่ำกว่า MIN_SAMPLE_FOR_RATE มาก ห้ามคิดเป็นอัตรา',
  },
  {
    key: 'quickcheckSubmissions',
    label: 'คนที่กรอกเครื่องตรวจสินค้าเร็วจนจบ',
    required: true,
    truth: 'measured',
    value: 1,
    unit: 'แถว',
    measuredAt: '2026-11-22',
    method: 'select count(*) from public.quickcheck_submissions',
    doesNotMean: '🔴 1 แถวนี้วัดบั๊กของเรามากกว่าวัดตลาด — ช่องกรอกเคยอยู่ใต้ขอบจอทุกเครื่อง (ledger #43)',
  },
  {
    key: 'payingCustomers',
    label: 'ธุรกิจที่จ่ายเงินจริง',
    required: true,
    truth: 'measured',
    value: 0,
    unit: 'ราย',
    measuredAt: '2026-11-22',
    method:
      "select count(*) from public.skill_purchases where pay_method is distinct from 'admin-free' " +
      '(159 แถวทั้งหมดเป็น admin-free) · และ public.payment_submissions = 0 แถว',
    doesNotMean: '0 = ยังไม่มีใครจ่าย ไม่ใช่ "ขายไม่ได้" — เรายังไม่เคยเปิดขายกับคนที่ไม่รู้จักเรา',
  },
  {
    key: 'clientErrors',
    label: 'error ที่ผู้ใช้เจอจริงบนเบราว์เซอร์ (สะสม)',
    required: true,
    truth: 'measured',
    value: 27,
    unit: 'แถว',
    measuredAt: '2026-11-22',
    method: 'select count(*) from public.client_errors',
    doesNotMean: 'นับไม่ครบโดยโครงสร้าง — chunk error ครั้งแรกไม่ถูกรายงาน (ErrorBoundary reload ก่อน)',
  },
  {
    key: 'osEventsFromUsLive',
    label: 'event ของเราที่ไปถึงระบบของอีกระบบในโหมดจริง',
    required: true,
    truth: 'measured',
    value: 0,
    unit: 'event',
    measuredAt: '2026-11-22',
    method:
      'select mode, count(*) from public (ตาราง behavior events) group by mode บนฐานของอีกระบบผ่าน MCP ' +
      "— ได้ mode='test' 5 แถว และไม่มีแถว mode='live' เลย",
    doesNotMean:
      '🔴 ไม่ได้แปลว่าสะพานพัง — โหมดจริงเพิ่งเปิด 21 พ.ย. และยังไม่มีผู้เข้าชมคนไหนทำครบเงื่อนไขหลังจากนั้น ' +
      '(ทางเดินพิสูจน์แล้วด้วย 4 event โหมดทดสอบจาก session 405a828b)',
  },
];

/** คีย์ที่บังคับว่าต้องมีและต้อง measured — เทสต์ล็อกรายการนี้ไว้ กันการ "ลดเกณฑ์เพื่อให้ผ่าน" */
export const REQUIRED_KEYS: readonly string[] = PHASE1_BASELINE.filter((m) => m.required).map((m) => m.key);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** อะไรยังขาดก่อนจะเรียกว่า freeze ได้ — คืนรายการเปล่า = freeze สำเร็จ
 *  🔴 fail-closed: ตัวที่ required แล้ว `unavailable` **ไม่ปิดด่าน** แม้จะบอกเหตุผลครบ
 *     (วัดไม่ได้ = ยังไม่มีเส้นตั้งต้น ไม่ใช่ "ยกเว้นให้") */
export function baselineIssues(
  rows: readonly BaselineMetric[] = PHASE1_BASELINE,
  today = PHASE1_FROZEN_AT,
): string[] {
  const out: string[] = [];
  if (PHASE1_SCOPE.length < 3) out.push('ขอบเขตของ Phase 1 ยังไม่ครบ — baseline ของอะไรก็ตอบไม่ได้');
  if (!DATE_RE.test(PHASE1_FROZEN_AT)) out.push('ไม่มีวันที่ freeze');
  if (!PHASE1_FROZEN_BUNDLE) out.push('ไม่ได้บันทึกว่าของจริงตัวไหนเสิร์ฟตัวเลขชุดนี้อยู่');

  for (const k of REQUIRED_KEYS) {
    if (!rows.some((m) => m.key === k)) out.push(`ขาดตัวชี้วัดที่บังคับ: ${k}`);
  }
  for (const m of rows) {
    const at = `${m.key}`;
    if (!DATE_RE.test(m.measuredAt)) out.push(`${at}: วันที่วัดไม่ถูกรูปแบบ`);
    else if (m.measuredAt > today) out.push(`${at}: วันที่วัดอยู่ในอนาคต`);
    if (m.method.trim().length < 20) out.push(`${at}: วิธีนับสั้นเกินกว่าจะนับซ้ำได้`);
    if (m.truth === 'unavailable') {
      if (!m.whyUnavailable) out.push(`${at}: วัดไม่ได้ แต่ไม่บอกว่าเพราะอะไร`);
      if (m.value !== null) out.push(`${at}: วัดไม่ได้ แต่ยังใส่ตัวเลข — 0 ไม่ใช่ "ไม่รู้"`);
      if (m.required) out.push(`${at}: เป็นตัวบังคับแต่ยังวัดไม่ได้ ⇒ ยัง freeze ไม่ได้`);
    } else {
      if (typeof m.value !== 'number' || !Number.isFinite(m.value) || m.value < 0) {
        out.push(`${at}: บอกว่าวัดแล้ว แต่ค่าไม่ใช่ตัวเลขที่ใช้ได้`);
      }
    }
  }
  return out;
}

/** freeze สำเร็จหรือยัง — ตรวจจากรีโปล้วน ๆ ไม่ต้องถามใคร */
export function baselineFrozen(rows: readonly BaselineMetric[] = PHASE1_BASELINE): boolean {
  return baselineIssues(rows).length === 0;
}

/** ประโยคที่เอาไปใส่สถานะด่านได้ตรง ๆ (ต้องมีปีเสมอ — ด่านที่รู้สถานะต้องบอกที่มาได้) */
export function baselineStatusLine(): string {
  const issues = baselineIssues();
  if (issues.length === 0) {
    return `ตรวจจากรีโป ${PHASE1_FROZEN_AT_TH}: baseline ครบ ${PHASE1_BASELINE.length} ตัว วัดจริงทุกตัว พร้อมวิธีนับ (phase1Baseline.ts · เทสต์ล็อกค่าไว้)`;
  }
  return `ตรวจจากรีโป ${PHASE1_FROZEN_AT_TH}: ยัง freeze ไม่ได้ — ${issues.length} ข้อ: ${issues.join(' · ')}`;
}

/** ตารางสรุปสำหรับแปะใน prompt/เอกสาร */
export function baselineBlock(): string {
  return [
    `## เส้นตั้งต้น Phase 1 (freeze ${PHASE1_FROZEN_AT} · ของจริง ${PHASE1_FROZEN_BUNDLE})`,
    ...PHASE1_BASELINE.map((m) => {
      const v = m.truth === 'unavailable' ? '🔴 วัดไม่ได้' : `${m.value} ${m.unit}`;
      return `  · ${m.label} = ${v} (วัด ${m.measuredAt})`;
    }),
    '  🔴 ตัวเลขเหล่านี้คือ "ยังไม่พบ" ไม่ใช่ "อัตราจริงเป็นศูนย์" — ห้ามคิดเป็นอัตราเมื่อ sample ต่ำ',
  ].join('\n');
}
