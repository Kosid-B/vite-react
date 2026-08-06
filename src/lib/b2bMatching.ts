// b2bMatching.ts — AI Matchmaker (Value Proposition หลัก): จับคู่ธุรกิจ↔ธุรกิจ
// แก้ pain จริงของร้าน/กิจการไทย: "หาคู่ค้า/ซัพพลายเออร์/ผู้ซื้อที่เข้าไม่ถึงไม่เจอ"
// ต่างจาก directory (ลงประกาศแล้วรอ) — ระบบ "จับคู่ให้ active" ด้วย complementarity (need↔offer)
// + เป็นเชื้อไวรัล: ถ้าคู่ที่ควรจับยังไม่อยู่ในระบบ → เหตุผลให้ "เชิญเข้ามา" (network effect)
// pure + tested · rule-based (ไม่เปลือง AI call) · ทนข้อมูล field ขาด

/** ประเภท "สิ่งที่ธุรกิจ offer" — จำแนกจากหมวด (keyword) เพื่อจับคู่ need↔offer */
export type OfferKind =
  | 'food' | 'retail' | 'material' | 'logistics' | 'marketing'
  | 'accounting' | 'legal' | 'it' | 'packaging' | 'design' | 'other';

export interface BizProfile {
  id: string;
  name: string;
  category: string;      // หมวด/สิ่งที่ธุรกิจนี้ขาย (freeform ไทย)
  location: string;      // จังหวัด/พื้นที่
  rating?: number;       // 0..5
  verified?: boolean;
  inSystem?: boolean;    // อยู่ในระบบแล้วไหม (false → จับคู่ได้แต่ต้อง "เชิญ" = viral)
}

export interface MatchResult {
  biz: BizProfile;
  score: number;                       // 0..99 (ความควรจับคู่)
  direction: 'buy' | 'sell' | 'peer';  // buy=เราซื้อจากเขา · sell=เราขายให้เขา · peer=พันธมิตรแลกลูกค้า
  reasons: string[];                   // ทำไมจับคู่ (อธิบายได้)
  action: string;                      // ก้าวถัดไปที่แนะนำ
  needsInvite: boolean;                // true → เชิญเข้าระบบ (เชื้อไวรัล)
}

// keyword → OfferKind (เรียงเฉพาะเจาะจงก่อนกว้าง)
const KIND_KEYWORDS: [OfferKind, string[]][] = [
  ['logistics',  ['ขนส่ง', 'โลจิสติกส์', 'เดลิเวอรี', 'ส่งของ', 'freight']],
  ['accounting', ['บัญชี', 'ภาษี', 'accounting']],
  ['legal',      ['กฎหมาย', 'ทนาย', 'legal']],
  ['marketing',  ['การตลาด', 'โฆษณา', 'ยิงแอด', 'คอนเทนต์', 'marketing', 'เอเจนซี']],
  ['it',         ['ไอที', 'ซอฟต์แวร์', 'เว็บ', 'ระบบ', 'it', 'software', 'แอป']],
  ['design',     ['ดีไซน์', 'ออกแบบ', 'กราฟิก', 'design']],
  ['packaging',  ['บรรจุภัณฑ์', 'แพ็กเกจ', 'กล่อง', 'ถุง', 'packaging']],
  ['material',   ['วัตถุดิบ', 'ส่วนผสม', 'ผ้า', 'ไม้', 'เหล็ก', 'อะไหล่', 'ค้าส่ง', 'ซัพพลาย', 'material']],
  ['food',       ['อาหาร', 'ร้านอาหาร', 'ก๋วยเตี๋ยว', 'กาแฟ', 'เครื่องดื่ม', 'คาเฟ่', 'ขนม', 'เบเกอรี']],
  ['retail',     ['ร้านค้า', 'ขายปลีก', 'ค้าปลีก', 'เสื้อผ้า', 'shop', 'store', 'retail']],
];

/** จำแนกหมวด → OfferKind */
export function offerKind(category: string): OfferKind {
  const c = (category ?? '').toLowerCase();
  for (const [kind, kws] of KIND_KEYWORDS) if (kws.some(k => c.includes(k.toLowerCase()))) return kind;
  return 'other';
}

// สิ่งที่แต่ละประเภท "ต้องใช้/จ้าง" (needs) — ใช้จับ complementarity
const NEEDS: Record<OfferKind, OfferKind[]> = {
  food:       ['material', 'logistics', 'packaging', 'marketing', 'accounting'],
  retail:     ['material', 'logistics', 'packaging', 'marketing', 'accounting', 'it'],
  material:   ['logistics', 'accounting', 'marketing'],
  logistics:  ['it', 'accounting', 'marketing'],
  marketing:  ['design', 'it'],
  accounting: ['it', 'marketing'],
  legal:      ['marketing', 'it'],
  it:         ['design', 'marketing', 'accounting'],
  packaging:  ['material', 'logistics', 'marketing'],
  design:     ['it', 'marketing'],
  other:      ['marketing', 'accounting', 'logistics'],
};

const KIND_LABEL: Record<OfferKind, string> = {
  food: 'ร้านอาหาร/เครื่องดื่ม', retail: 'ค้าปลีก', material: 'วัตถุดิบ/ค้าส่ง', logistics: 'ขนส่ง/โลจิสติกส์',
  marketing: 'การตลาด', accounting: 'บัญชี/ภาษี', legal: 'กฎหมาย', it: 'ไอที/ซอฟต์แวร์',
  packaging: 'บรรจุภัณฑ์', design: 'ออกแบบ', other: 'ธุรกิจทั่วไป',
};
export const kindLabel = (k: OfferKind): string => KIND_LABEL[k];

const sameArea = (a: string, b: string): boolean => {
  const x = (a ?? '').trim(), y = (b ?? '').trim();
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};
const num = (v: unknown, f = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : f);

/** ให้คะแนน + เหตุผล การจับคู่ me กับ other (อธิบายได้ ไม่ใช่กล่องดำ) */
export function matchOne(me: BizProfile, other: BizProfile): MatchResult {
  const myKind = offerKind(me.category);
  const otherKind = offerKind(other.category);
  const reasons: string[] = [];
  let score = 30;
  let direction: MatchResult['direction'] = 'peer';
  let action = 'ทักไปแนะนำตัว หาโอกาสร่วมมือ';

  const iNeedThem = NEEDS[myKind].includes(otherKind);
  const theyNeedMe = NEEDS[otherKind].includes(myKind);

  if (iNeedThem) {
    direction = 'buy'; score += 40;
    reasons.push(`${kindLabel(otherKind)} = สิ่งที่ ${kindLabel(myKind)} อย่างคุณต้องใช้`);
    action = 'ขอใบเสนอราคา (RFQ) จากเขา';
  } else if (theyNeedMe) {
    direction = 'sell'; score += 40;
    reasons.push(`${kindLabel(otherKind)} มักต้องใช้ ${kindLabel(myKind)} แบบคุณ — เสนอขายได้`);
    action = 'เสนอสินค้า/บริการของคุณให้เขา';
  } else if (myKind === otherKind && myKind !== 'other') {
    direction = 'peer'; score += 12;
    reasons.push(`ธุรกิจประเภทเดียวกัน — จับมือแลกลูกค้า/รวมออร์เดอร์ได้`);
    action = 'ชวนเป็นพันธมิตร แลกลูกค้า/ซื้อรวม';
  }

  if (sameArea(me.location, other.location)) { score += 15; reasons.push(`อยู่พื้นที่เดียวกัน (${other.location}) — ส่ง/นัดเจอง่าย`); }
  const rating = num(other.rating);
  if (rating >= 4) { score += 8; reasons.push(`เรตติ้งดี (${rating}★)`); }
  if (other.verified) { score += 6; reasons.push('ยืนยันตัวตนแล้ว'); }

  const needsInvite = other.inSystem === false;
  if (needsInvite) reasons.push('ยังไม่อยู่ในระบบ — เชิญเข้ามาเพื่อปิดดีล (ทั้งคู่ได้สิทธิ์รุ่นก่อตั้ง)');

  return {
    biz: other,
    score: Math.max(0, Math.min(99, Math.round(score))),
    direction,
    reasons,
    action: needsInvite ? 'เชิญเข้าระบบ → แล้วปิดดีล' : action,
    needsInvite,
  };
}

/**
 * จับคู่ me กับ pool ทั้งหมด → เรียงคะแนนมากสุด · ตัดตัวเอง + คะแนนต่ำเกิน (< minScore)
 * คืน [] ถ้าไม่มีคู่ที่เข้าเกณฑ์ (ให้ UI โชว์ empty state ไม่ปั้น)
 */
export function topMatches(me: BizProfile, pool: BizProfile[], n = 8, minScore = 45): MatchResult[] {
  return pool
    .filter(b => b && b.id !== me.id)
    .map(b => matchOne(me, b))
    .filter(m => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
