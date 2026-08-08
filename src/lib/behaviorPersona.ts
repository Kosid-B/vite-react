// behaviorPersona.ts — เว็บที่ปรับตาม "พฤติกรรมจริง" ของผู้เข้าชม (Dynamic Website)
// Dark AI Marketing #5 (Dynamic Persona อัปเดตตามพฤติกรรมจริง) · #6 (Hyper-Personalization)
//                   · #7 (พฤติกรรม > ประชากรศาสตร์) · #24 (จริยธรรม/โปร่งใส)
//
// จริยธรรม + PDPA:
//  • เก็บเฉพาะสัญญาณ first-party นิรนาม (นับครั้ง/ธง) ใน localStorage — ไม่มี PII, ไม่ส่งออกนอกเครื่อง
//  • โปร่งใส: ทุกข้อความส่วนตัวมี "เหตุผล" ให้ผู้ใช้อ่านได้ว่าทำไมถึงเห็น
//  • เคารพผู้ใช้: ปิด (dismiss) ได้ + ล้างข้อมูลส่วนตัวได้ทุกเมื่อ (clearBehavior)
//  • ไม่มี dark pattern: ไม่ปั้นตัวเลข ไม่มี scarcity/urgency ปลอม — แค่ "จัดลำดับความเกี่ยวข้อง"
//
// pure logic แยกจาก DOM (เทสต์ได้) — เลเยอร์ localStorage เป็น wrapper บาง ๆ

const KEY = 'ceo_ai_behavior';
const DAY_MS = 86400000;

export interface BehaviorState {
  visits: number;          // จำนวนครั้งที่เปิดหน้า landing (นับ session ห่าง ≥30 นาที = ครั้งใหม่)
  firstVisitMs: number;    // ครั้งแรกที่รู้จัก
  lastVisitMs: number;     // ครั้งล่าสุด
  reachedPricing?: boolean;// เคยเลื่อนถึงส่วนแพ็กเกจ = สนใจราคา (intent สูง)
  usedRoi?: boolean;       // เคยลองเครื่องคำนวณความคุ้มค่า/ROI
  usedDemand?: boolean;    // เคยค้นดีมานด์จริงในระบบ
  dismissed?: boolean;     // ปิดแบนเนอร์ส่วนตัวแล้ว (ไม่รบกวนซ้ำ)
}

export type PersonaId = 'newcomer' | 'researcher' | 'considering' | 'returning';
export type SignalKey = 'reachedPricing' | 'usedRoi' | 'usedDemand';

export interface PersonaView {
  id: PersonaId;
  emoji: string;
  headline: string;
  sub: string;
  ctaLabel: string;
  reason: string;          // โปร่งใส: อธิบายว่าทำไมถึงเห็นข้อความนี้ (อิงพฤติกรรม)
}

export function defaultBehavior(nowMs: number): BehaviorState {
  return { visits: 1, firstVisitMs: nowMs, lastVisitMs: nowMs };
}

/** อ่าน state + นับ "การมาเยือน" (session ใหม่เมื่อห่างจากครั้งก่อน ≥30 นาที) — pure ต่อ input */
export function tickVisit(prev: BehaviorState | null, nowMs: number): BehaviorState {
  if (!prev) return defaultBehavior(nowMs);
  const isNewSession = nowMs - prev.lastVisitMs >= 30 * 60_000;
  return {
    ...prev,
    visits: prev.visits + (isNewSession ? 1 : 0),
    lastVisitMs: nowMs,
    firstVisitMs: prev.firstVisitMs || nowMs,
  };
}

/** บันทึกสัญญาณพฤติกรรม (ธง idempotent) — คืน state เดิมถ้าไม่เปลี่ยน (กัน write ซ้ำ) */
export function recordSignal(prev: BehaviorState, key: SignalKey): BehaviorState {
  if (prev[key]) return prev;
  return { ...prev, [key]: true };
}

/** เลือก persona จากพฤติกรรม — เรียงตาม intent สูง→ต่ำ
 *  คืน null เมื่อ "คนใหม่จริง ๆ" (ไม่มีสัญญาณ) หรือผู้ใช้ปิดแบนเนอร์ → ไม่รบกวน first impression */
export function derivePersona(s: BehaviorState | null, nowMs: number): PersonaView | null {
  if (!s || s.dismissed) return null;
  const daysSinceFirst = (nowMs - s.firstVisitMs) / DAY_MS;

  // 1) considering — เคยดูราคาแล้ว (intent สูงสุด): ดันไปตัดสินใจ แต่ไม่กดดัน
  if (s.reachedPricing) {
    return {
      id: 'considering', emoji: '💡',
      headline: 'เห็นว่าคุณเคยดูแพ็กเกจแล้ว — เริ่มจากฟรี 15 วันก่อนได้',
      sub: 'ไม่ต้องผูกบัตร ยกเลิกได้ทุกเมื่อ · ลองทำจริงก่อนค่อยตัดสินใจจ่าย',
      ctaLabel: 'เริ่มทดลองฟรี — ไม่ต้องใช้บัตร',
      reason: 'คุณเคยเลื่อนดูส่วนแพ็กเกจในหน้านี้ ระบบเลยพาลัดไปเริ่มได้เลย',
    };
  }

  // 2) researcher — กำลังประเมินด้วยเครื่องมือ (ROI/ดีมานด์): ยื่นหลักฐาน/ตัวเลขจริง
  if (s.usedRoi || s.usedDemand) {
    return {
      id: 'researcher', emoji: '📊',
      headline: 'คุณกำลังประเมินความคุ้มค่าอยู่ใช่ไหม? — ลองกับธุรกิจจริงของคุณ',
      sub: 'สมัครฟรีแล้วให้ทีม AI คิดตัวเลข + วางแผนจากข้อมูลธุรกิจคุณเองแบบเจาะลึก',
      ctaLabel: 'ให้ AI วิเคราะห์ธุรกิจของฉัน',
      reason: s.usedRoi ? 'คุณเพิ่งลองเครื่องคำนวณความคุ้มค่า' : 'คุณเพิ่งค้นดีมานด์ในระบบ',
    };
  }

  // 3) returning — กลับมาซ้ำ (≥2 ครั้ง): ทักทาย + พาต่อจากที่ค้าง
  if (s.visits >= 2) {
    const nice = daysSinceFirst >= 1 ? 'ยินดีต้อนรับกลับ 👋' : 'กลับมาอีกครั้ง 👋';
    return {
      id: 'returning', emoji: '👋',
      headline: `${nice} พร้อมลงมือทำต่อหรือยัง?`,
      sub: 'ครั้งนี้ลองเริ่มจริง — สมัครฟรี 15 วัน เก็บงานไว้ทำต่อได้ทุกเมื่อ',
      ctaLabel: 'เริ่มเลย — ฟรี 15 วัน',
      reason: `คุณเคยเข้าชมหน้านี้มาแล้ว ${s.visits} ครั้ง`,
    };
  }

  // 4) newcomer — ครั้งแรก ยังไม่มีสัญญาณ → ไม่โชว์แบนเนอร์ (ปล่อยให้ดู hero ก่อน)
  return null;
}

/* ---------- localStorage wrapper (ปลอดภัยเมื่อถูกบล็อก) ---------- */

export function loadBehavior(nowMs: number): BehaviorState {
  try {
    const raw = localStorage.getItem(KEY);
    const prev = raw ? (JSON.parse(raw) as BehaviorState) : null;
    const next = tickVisit(prev, nowMs);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch { return defaultBehavior(nowMs); }
}

export function persistSignal(key: SignalKey): BehaviorState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const prev = JSON.parse(raw) as BehaviorState;
    const next = recordSignal(prev, key);
    if (next !== prev) localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch { return null; }
}

export function dismissPersona(): void {
  try {
    const raw = localStorage.getItem(KEY);
    const prev = raw ? (JSON.parse(raw) as BehaviorState) : defaultBehavior(0);
    localStorage.setItem(KEY, JSON.stringify({ ...prev, dismissed: true }));
  } catch { /* noop */ }
}

/** ล้างข้อมูลพฤติกรรมส่วนตัวทั้งหมด (สิทธิ์ผู้ใช้ตาม PDPA) */
export function clearBehavior(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
