/* emotionalArc — จังหวะอารมณ์ของหน้า Landing (เจ้าของสั่ง 24 ส.ค. 2569)
 *
 * ⚠️ ที่มาของหลักการ — ต้องพูดให้ตรง:
 *   skill `ai-dark-marketing` ที่ sync มา **ไม่มีเนื้อหาเรื่องฮอร์โมนเลยสักบรรทัด**
 *   (description เขียนว่า "กลไกที่เกี่ยวข้องกับฮอร์โมนในสมอง" แต่เนื้อในเป็นบทเรียน
 *    AI marketing 25 ข้อ · grep หา dopamine/cortisol/oxytocin/serotonin = ไม่เจอ)
 *   ⇒ ไฟล์นี้จึงเป็น **การออกแบบของเรา** จากหลักการทั่วไป ไม่ใช่การถอดจาก skill นั้น
 *
 * 🔴 หลักการเดียวที่ทั้งไฟล์นี้ยืนอยู่บน:
 *   **ความตึงต้องมาก่อนความโล่ง และความโล่งต้องเป็นของจริง**
 *   หน้าเว็บที่ให้ความมั่นใจก่อนที่ผู้อ่านจะรู้สึกว่ามีปัญหา = ไม่มีอะไรให้คลาย
 *   ⇒ เขาไม่มีเหตุผลจะเลื่อนต่อ (วัดจริง: 85% ไม่เลื่อนเลย · เลื่อนเฉลี่ย 5.2%)
 *
 * 🔴 ข้อจำกัดที่ทำให้เราใช้วิธีนี้ได้โดยไม่ผิดกฎตัวเอง:
 *   เราสร้างความตึงจาก **ตัวเลขของผู้ใช้เอง** ที่เขาตอบไม่ได้ ไม่ใช่จากความขาดแคลนปลอม
 *   ⇒ ได้ผลทางสรีรวิทยาเหมือนกัน แต่ไม่มีอะไรที่ไม่จริงสักข้อ
 *
 * pure ทั้งไฟล์ · ไม่แตะฐานข้อมูล
 */

export type Phase = 'tension' | 'relief';

export interface Beat {
  key: string;
  phase: Phase;
  /** ฮอร์โมนที่เป็นตัวขับหลักของจังหวะนี้ (ป้ายเพื่อสื่อสาร ไม่ใช่ข้ออ้างทางการแพทย์) */
  driver: string;
  /** ผู้ใช้รู้สึกอะไร */
  feels: string;
  /** ของจริงในระบบที่ทำหน้าที่นี้ — ห้ามเป็นของที่ยังไม่ได้สร้าง */
  deliveredBy: string;
  /** ทำไมจังหวะนี้ซื่อสัตย์ได้ ไม่ต้องโกหก */
  honestBecause: string;
}

/** จังหวะ 7 ช่วง — ตึง/โล่ง สลับกัน ห้ามเรียงใหม่โดยไม่มีเหตุผล */
export const BEATS: Beat[] = [
  {
    key: 'open-loop',
    phase: 'tension',
    driver: 'cortisol (ความไม่แน่นอน)',
    feels: 'มีคำถามเกี่ยวกับธุรกิจของตัวเอง ที่ตอบไม่ได้',
    deliveredBy: 'พาดหัว hero — คำถามที่ชี้ไปที่ตัวเลขของเขา',
    honestBecause: 'เป็นคำถามจริงที่เจ้าของส่วนใหญ่ตอบไม่ได้จริง ไม่ได้แต่งปัญหาขึ้นมา',
  },
  {
    key: 'anticipation',
    phase: 'tension',
    driver: 'dopamine (การคาดหวังรางวัล)',
    feels: 'อีกไม่กี่วินาทีจะได้คำตอบ และไม่ต้องจ่ายอะไรก่อน',
    deliveredBy: 'ProductQuickCheck — กรอกราคา/ต้นทุน ไม่ต้องสมัคร',
    honestBecause: 'คำสัญญาสั้นและทำได้จริง — ไม่มีขั้นตอนซ่อนหลังกดปุ่ม',
  },
  {
    key: 'reward',
    phase: 'relief',
    driver: 'dopamine (รางวัลที่มาถึง)',
    feels: 'เห็นตัวเลขของตัวเองเป็นครั้งแรก',
    deliveredBy: 'verdictOf() — กำไรต่อหน่วย + จุดคุ้มทุน',
    honestBecause: 'คำนวณจากเลขที่เขากรอกเอง — แต่งไม่ได้ และตรวจซ้ำได้',
  },
  {
    key: 'trust',
    phase: 'relief',
    driver: 'oxytocin (ความไว้ใจ)',
    feels: 'เขาเห็นวิธีคิด ไม่ใช่แค่ผลลัพธ์',
    deliveredBy: 'Insight.calc ที่บังคับให้มีช่อง from (ที่มาของตัวเลข)',
    honestBecause: 'ระบบพูดได้เฉพาะสิ่งที่มีที่มา — ชนิดข้อมูลบังคับไว้ ไม่ใช่ความตั้งใจ',
  },
  {
    key: 'new-tension',
    phase: 'tension',
    driver: 'cortisol (ช่องว่างที่เพิ่งเห็น)',
    feels: 'เรื่องต้นทุนจบแล้ว แต่เพิ่งรู้ว่ายังมีอีกหลายเรื่องที่ไม่รู้',
    deliveredBy: 'nextProblemsFor() — 7 เรื่องที่จัดลำดับจากตัวเลขที่เขากรอก',
    honestBecause: 'ลำดับมาจากข้อมูลของเขาเอง และคืน null เมื่อข้อมูลไม่พอ ไม่เดา',
  },
  {
    key: 'status',
    phase: 'relief',
    driver: 'serotonin (รู้ตำแหน่งตัวเอง)',
    feels: 'รู้ว่าธุรกิจตัวเองอยู่ตรงไหนของเส้นทาง ไม่ได้หลงทางอยู่คนเดียว',
    deliveredBy: 'CUSTOMER_JOURNEY 10 ขั้น + NextBestActionCard',
    honestBecause: 'ขั้นที่บอกมาจาก genome ที่อ่านข้อมูลจริง ไม่ใช่ให้เขาประเมินตัวเอง',
  },
  {
    key: 'commit',
    phase: 'relief',
    driver: 'dopamine (ขั้นถัดไปที่ชัดเจน)',
    feels: 'มีสิ่งที่ทำได้วันนี้ ไม่ใช่แผนใหญ่ที่ไม่รู้จะเริ่มตรงไหน',
    deliveredBy: 'trialRoadmap.nextStep() — ขั้นถัดไปที่ชี้ไปหน้าที่มีอยู่จริง',
    honestBecause: 'เทสต์บังคับว่าทุกขั้นต้องชี้ไปหน้าที่มีอยู่จริง ห้ามสัญญาของที่ยังไม่ได้สร้าง',
  },
];

/* ── สิ่งที่ตลาดใช้กัน แต่เราใช้ไม่ได้ — และใช้อะไรแทน ───────────────────────
 * ⚠️ นี่คือส่วนที่สำคัญที่สุดของไฟล์: ไม่ได้แค่ห้าม แต่ให้ **ของแทนที่ให้ผลเดียวกัน**
 *    กฎที่ห้ามอย่างเดียวโดยไม่มีทางออก จะถูกละเมิดตอนที่ยอดไม่เข้าเป้า
 * ─────────────────────────────────────────────────────────────────────── */
export interface ForbiddenTrigger {
  trick: string;
  why: string;
  insteadUse: string;
}

export const FORBIDDEN_TRIGGERS: ForbiddenTrigger[] = [
  {
    trick: 'นับถอยหลัง / เหลืออีก N ที่ / ราคาขึ้นพรุ่งนี้ (ที่ไม่จริง)',
    why: 'ผิดกฎแบรนด์ระดับ block และพังทันทีที่เขากลับมาดูวันรุ่งขึ้นแล้วเห็นเลขเดิม',
    insteadUse: 'ความเร่งด่วนจากตัวเลขของเขาเอง — "ทุกเดือนที่ยังไม่รู้กำไรต่อชิ้น คือเดือนที่ตัดสินใจด้วยการเดา"',
  },
  {
    trick: 'รีวิว / จำนวนผู้ใช้ / เคสความสำเร็จที่ยังไม่มีจริง',
    why: 'เรายังไม่มีลูกค้าจ่ายเงินจริงสักราย — ปั้นตอนนี้คือคำโกหกที่จับได้ง่ายที่สุด',
    insteadUse: 'ให้เขาเห็นเครื่องมือทำงานสด ๆ กับตัวเลขของเขา + เครดิต B.Training 20+ ปี ที่ตรวจสอบได้',
  },
  {
    // ⚠️ ไม่เขียนคำต้องห้ามตรง ๆ ในไฟล์นี้ — บล็อกนี้ถูกส่งเข้า prompt
    //    และตัวสแกนคำต้องห้าม (brandBrief.BANNED) จับได้ทั้งตอนใช้จริงและตอน "ยกมาห้าม"
    trick: 'พาดหัวที่อวดอ้างความเป็นที่หนึ่ง / รับรองผลลัพธ์ล่วงหน้า',
    why: 'ไม่มีหลักฐาน และผิดกฎแบรนด์ระดับ block',
    insteadUse: 'พาดหัวเป็น **ปัญหาของเขา** — ปัญหาที่ตรงจริงสร้างความสนใจได้มากกว่าคำอวดอ้าง',
  },
  {
    trick: 'ซ่อนราคา / บังคับสมัครก่อนเห็นคุณค่า',
    why: 'ตัดจังหวะ reward ทิ้ง — เขาจะไม่มีวันรู้สึกอะไรเลยก่อนถูกขอข้อมูล',
    insteadUse: 'ให้คุณค่าก่อนขอ — เครื่องคำนวณและ AI ทดลอง ใช้ได้โดยไม่ต้องสมัคร',
  },
];

/** โล่งติดกันเกินนี้ "กลางหน้า" = ราบเรียบ (ช่วงปิดท้ายใช้เกณฑ์อื่น) */
export const MID_PAGE_MAX_RELIEF_RUN = 4;
/** ช่วงปิดท้ายหลังจังหวะตึงสุดท้าย ยาวได้เท่านี้ */
export const CLOSING_MAX = 5;

export interface ArcIssue {
  level: 'blocker' | 'warn';
  what: string;
  why: string;
}

/** "หนี้ความราบ" = จำนวนบล็อกโล่งที่ล้นความจุของหน้า (ตัวเลขเดียวที่ใช้ตัดสินว่าดีขึ้นหรือแย่ลง)
 *
 * 🔴 ทำไมไม่นับ "จำนวน warn" อีกต่อไป — ตัวนับเดิมชี้ทางผิด:
 *   เดิมนับแบบ `run === 4 แล้วรีเซ็ต` ⇒ ได้ floor(run/4)
 *     · โล่งติดกัน 4,4,4,5,5 (กระจาย) = **5 warn**
 *     · โล่งติดกัน 3,3,3,3,10 (กองรวม) = **2 warn**
 *   ⇒ การเรียงที่แย่กว่าได้คะแนน "ดีกว่า" — ถ้าเราปรับหน้าเว็บตามตัวเลขนั้น หน้าจะแย่ลงจริง ๆ
 *   ตัวนี้คิดจาก **ส่วนที่ล้นเพดาน** (Σ max(0, run − MAX)) ⇒ กองรวมกันแพงกว่าเสมอ
 *
 * และตีความได้ตรง ๆ: หนี้ N = ต้องการจุดตึงเพิ่มอีก ceil(N / MID_PAGE_MAX_RELIEF_RUN) จุด
 *   ⇒ ตอบได้ทันทีว่า "เรียงใหม่พอไหม" หรือ "ต้องเพิ่มจังหวะตึงจริง ๆ"
 */
export function flatnessDebt(order: Array<{ sec: string; phase: Phase }>): number {
  const lastTension = order.map((b) => b.phase).lastIndexOf('tension');
  const closingFrom = lastTension < 0 ? 0 : lastTension + 1;
  let debt = 0;
  let run = 0;
  for (let i = 0; i < closingFrom; i++) {
    if (order[i].phase === 'relief') { run++; continue; }
    debt += Math.max(0, run - MID_PAGE_MAX_RELIEF_RUN);
    run = 0;
  }
  return debt + Math.max(0, run - MID_PAGE_MAX_RELIEF_RUN);
}

/** ตรวจว่าลำดับบล็อกบนหน้าเว็บสร้างจังหวะจริงไหม
 *  รับ "ชื่อ section ตามลำดับที่แสดงจริง" + ป้ายว่าแต่ละอันเป็นตึงหรือโล่ง */
export function arcIssues(order: Array<{ sec: string; phase: Phase }>): ArcIssue[] {
  const out: ArcIssue[] = [];
  if (order.length === 0) return out;

  const firstTension = order.findIndex((b) => b.phase === 'tension');
  const reliefBefore = firstTension < 0 ? order.length : firstTension;
  if (reliefBefore >= 2) {
    out.push({
      level: 'blocker',
      what: `มีบล็อกให้ความมั่นใจ ${reliefBefore} อันก่อนที่ผู้อ่านจะรู้สึกว่ามีปัญหา`,
      why: 'ความโล่งที่มาก่อนความตึง ไม่ได้คลายอะไร — เขาไม่มีเหตุผลจะเลื่อนต่อ',
    });
  }

  /* ความโล่งติดกันยาว = ราบเรียบ ไม่มีจังหวะ
   * ⚠️ ยกเว้น **ช่วงปิดท้าย** (หลังจังหวะตึงสุดท้ายจนจบหน้า) — ตรงนั้นตั้งใจให้คลาย
   *    คนที่อ่านมาถึงตอนจบตัดสินใจแล้ว การใส่ความตึงเพิ่มตรงนั้นคือกดดัน ไม่ใช่จังหวะ
   *    แต่ถ้ายาวเกิน CLOSING_MAX ก็ยังเป็นปัญหา — หางที่ยาวเกินคือเนื้อหาที่ไม่มีใครไปถึง */
  const lastTension = order.map((b) => b.phase).lastIndexOf('tension');
  const closingFrom = lastTension < 0 ? 0 : lastTension + 1;

  let run = 0;
  let runStart = 0;
  const flush = (endIdx: number) => {
    if (run > MID_PAGE_MAX_RELIEF_RUN) {
      out.push({
        level: 'warn',
        what: `โล่งติดกัน ${run} อันกลางหน้า ("${order[runStart].sec}" → "${order[endIdx].sec}") — เกินเพดาน ${run - MID_PAGE_MAX_RELIEF_RUN}`,
        why: 'ยิ่งอ่านยิ่งเรียบ — ความสนใจตกโดยไม่มีอะไรดึงกลับ',
      });
    }
    run = 0;
  };
  for (let i = 0; i < closingFrom; i++) {
    if (order[i].phase === 'relief') { if (run === 0) runStart = i; run++; continue; }
    flush(i - 1);
  }
  if (run > 0) flush(closingFrom - 1);

  const closingLen = order.length - closingFrom;
  if (closingLen > CLOSING_MAX) {
    out.push({
      level: 'warn',
      what: `ช่วงปิดท้ายยาว ${closingLen} บล็อก (เกิน ${CLOSING_MAX})`,
      why: 'หางที่ยาวเกินคือเนื้อหาที่คนตัดสินใจไปแล้วไม่อ่าน — ไม่ใช่จังหวะ แต่เป็นน้ำหนักส่วนเกิน',
    });
  }

  if (!order.some((b) => b.phase === 'tension')) {
    out.push({ level: 'blocker', what: 'ไม่มีจังหวะตึงเลยทั้งหน้า', why: 'ไม่มีคำถามที่เขาตอบไม่ได้ = ไม่มีเหตุผลจะอ่านต่อ' });
  }
  return out;
}

/** บล็อกที่แปะเข้า prompt เวลาสั่งให้ AI เขียนคอนเทนต์/หน้าเว็บ */
export function emotionalArcBlock(): string {
  return [
    '## จังหวะอารมณ์ (ตึง → โล่ง) — ความตึงต้องมาก่อนเสมอ',
    ...BEATS.map((b) => `  ${b.phase === 'tension' ? '↑' : '↓'} ${b.key}: ${b.feels} (${b.deliveredBy})`),
    '',
    '🔴 ห้ามใช้ และให้ใช้อะไรแทน:',
    ...FORBIDDEN_TRIGGERS.map((f) => `  · ${f.trick}\n    ⇒ ใช้แทน: ${f.insteadUse}`),
    '',
    '🔴 ความตึงต้องมาจาก **ตัวเลขของผู้ใช้เองที่เขาตอบไม่ได้** ไม่ใช่จากความขาดแคลนที่เราแต่งขึ้น',
  ].join('\n');
}
