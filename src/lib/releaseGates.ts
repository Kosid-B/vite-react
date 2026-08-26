/* releaseGates — ด่านปล่อยของ: "ตอนนี้แตะ schema/migration ได้หรือยัง"
 *
 * 🔴 ปัญหาจริงที่ไฟล์นี้แก้ (26 ส.ค. 2569):
 *   ประโยคบอกสถานะของ Gate B ถูกเขียนกระจายอยู่ **14 ไฟล์** (เอกสาร · สคิลล์ · โค้ด · เทสต์)
 *   ⇒ วันที่เจ้าของบอกว่าปิดแล้ว ไม่มีอะไรบังคับให้ไล่แก้ครบ — และรอบถัดไปเราจะอ่านบรรทัดเก่า
 *      แล้วเชื่อมันอีก (เกิดมาแล้วจริง · ledger #39, #41)
 *   ⇒ สถานะด่านต้องมี **แหล่งเดียว** และ **ตรวจได้ด้วยเทสต์**
 *
 * 🔴 หลักที่ไฟล์นี้ยืนอยู่บน: **`unknown` ไม่ใช่ `closed`**
 *   ด่านที่ผู้ช่วยมองไม่เห็นในรีโป = ตรวจไม่ได้ ⇒ fail-closed (แบบเดียวกับ `stageFit`)
 *   ห้ามแปล "ไม่มีใครบอกว่าปิด" เป็น "ยังเปิดอยู่" หรือ "ปิดแล้วมั้ง" — ต้องถามเจ้าของ
 *
 * pure ทั้งไฟล์ · ไม่แตะฐานข้อมูล
 */

export type GateStatus =
  | 'closed'   // ผ่านแล้ว ยืนยันได้ว่าใครยืนยันเมื่อไร
  | 'open'     // ยังไม่ผ่าน และรู้ว่ายังไม่ผ่าน
  | 'unknown'; // 🔴 ตรวจไม่ได้จากรีโปนี้ — ต่างจาก 'open' ตรงที่เราไม่รู้ ไม่ใช่เรารู้ว่ายัง

export interface ReleaseGate {
  key: string;
  name: string;
  status: GateStatus;
  /** ตรวจจากรีโปนี้ได้ไหม — ถ้า owner-only ต้องมีคนยืนยัน ห้ามสันนิษฐาน */
  verifiable: 'in-repo' | 'owner-only';
  /** ผ่านด่านนี้แล้วทำอะไรได้เพิ่ม */
  unlocks: string;
  /** ใครยืนยัน + เมื่อไร (บังคับเมื่อ status = 'closed') */
  confirmedBy?: string;
  /** ทำไมถึงยังตรวจไม่ได้ (บังคับเมื่อ status = 'unknown') */
  whyUnknown?: string;
}

/** ลำดับด่านตามที่เจ้าของกำหนดใน docs/product/MOAT-ARCHITECTURE-V1.md — ห้ามข้ามขั้น */
export const GATE_CHAIN: ReleaseGate[] = [
  {
    key: 'gate-b',
    name: 'Gate B PASS / FROZEN',
    status: 'closed',
    verifiable: 'owner-only',
    confirmedBy: 'เจ้าของยืนยันในแชต 26 ส.ค. 2569',
    unlocks: 'เลิกคำสั่ง "ห้ามแตะ schema เพราะ Gate B" — แต่ยังเหลือด่านถัดไปในห่วงโซ่',
  },
  {
    key: 'phase1-acceptance-2',
    name: 'Phase 1 Acceptance #2',
    status: 'unknown',
    verifiable: 'owner-only',
    whyUnknown:
      'ไม่มีไฟล์/เทสต์/CI ใดในรีโปนี้ที่นิยามหรือบันทึกผลของ Acceptance #2 — grep แล้วไม่พบ ' +
      'เกณฑ์ผ่านคืออะไรก็ยังไม่รู้ ⇒ ตรวจไม่ได้ ต้องให้เจ้าของยืนยัน',
    unlocks: 'freeze baseline ของ Phase 1 ได้',
  },
  {
    key: 'freeze-phase1-baseline',
    name: 'Freeze Phase 1 baseline',
    status: 'unknown',
    verifiable: 'owner-only',
    whyUnknown: 'ขึ้นกับด่านก่อนหน้า และยังไม่มีจุดอ้างอิง baseline ที่บันทึกไว้ในรีโปนี้',
    unlocks: 'เพิ่ม VRIO/POP/POD Strategy Layer เป็น controlled next iteration ได้',
  },
];

/** ด่านสุดท้ายที่ต้องผ่านก่อนจะแตะ schema/migration ได้ */
export const SCHEMA_REQUIRES: string[] = GATE_CHAIN.map((g) => g.key);

export interface GateVerdict {
  allowed: boolean;
  /** ด่านแรกที่ยังไม่ผ่าน (null = ผ่านครบ) */
  blockedBy: ReleaseGate | null;
  /** ประโยคที่เอาไปพูดกับเจ้าของได้ตรง ๆ */
  reason: string;
  /** ถ้าติด ให้ทำอะไรต่อ — ห้ามคืน "ทำไม่ได้" เปล่า ๆ (skill growth-mindset) */
  nextAction: string;
}

/** แตะ schema/migration ได้หรือยัง — fail-closed เมื่อมีด่านไหนเป็น unknown */
export function schemaChangeAllowed(chain: ReleaseGate[] = GATE_CHAIN): GateVerdict {
  const blocked = chain.find((g) => g.status !== 'closed') ?? null;
  if (!blocked) {
    return {
      allowed: true,
      blockedBy: null,
      reason: 'ผ่านครบทุกด่านแล้ว — แก้ schema/migration ได้ภายใต้ regression gate ของส่วนที่กระทบ',
      nextAction: 'เปิด regression gate เฉพาะส่วนที่ได้รับผลกระทบ แล้วค่อยลง migration ทีละก้อน',
    };
  }
  const isUnknown = blocked.status === 'unknown';
  return {
    allowed: false,
    blockedBy: blocked,
    reason: isUnknown
      ? `🔴 ตรวจไม่ได้ว่า "${blocked.name}" ผ่านหรือยัง — ${blocked.whyUnknown ?? ''}`
      : `ยังติดด่าน "${blocked.name}"`,
    nextAction: isUnknown
      ? `ถามเจ้าของข้อเดียว: "${blocked.name}" ผ่านแล้วหรือยัง · ระหว่างรอ ทำงานที่ไม่แตะ schema ต่อได้ทั้งหมด`
      : `ปิด "${blocked.name}" ก่อน — ${blocked.unlocks}`,
  };
}

/** บล็อกที่แปะเข้า prompt เวลาสั่งให้ AI เสนอสถาปัตยกรรม/ฟีเจอร์ */
export function gateBlock(): string {
  const v = schemaChangeAllowed();
  return [
    '## ด่านปล่อยของ (แตะ schema/migration ได้หรือยัง)',
    ...GATE_CHAIN.map((g) => {
      const mark = g.status === 'closed' ? '🟢' : g.status === 'unknown' ? '🔴' : '🟡';
      const note = g.status === 'closed' ? g.confirmedBy : g.whyUnknown;
      return `  ${mark} ${g.name} — ${g.status}${note ? ` (${note})` : ''}`;
    }),
    `  ⇒ ${v.reason}`,
    `  ⇒ ${v.nextAction}`,
    '  🔴 unknown ไม่ใช่ closed — ตรวจไม่ได้ต้องถาม ห้ามสันนิษฐานว่าผ่าน',
  ].join('\n');
}
