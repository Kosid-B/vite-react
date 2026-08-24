/* competitorMemory — ความจำเรื่องคู่แข่ง + ด่านตรวจว่า "ที่ว่าต่าง จริงไหม"
 * (MOAT Architecture v1 · §8 · เจ้าของกำหนด 23 ส.ค. 2569)
 *
 * 🔴 ปัญหาที่แก้: ระบบพูดว่าอะไร "แตกต่าง" ทั้งที่ตลาดพูดกันหมดแล้ว
 *   ⇒ ถ้าไม่มีความจำเรื่องคู่แข่ง เราจะประกาศความต่างจากความรู้สึก ไม่ใช่จากการเทียบ
 *
 * ต้นไม้ตัดสินใจที่ไฟล์นี้ทำให้เป็นโค้ด:
 *   Proposed POD → ตลาดพูดกันทั่วไปแล้วหรือยัง?
 *      YES → POP
 *      NO  → คู่แข่งลอกได้ง่ายไหม?
 *              YES → Weak POD
 *              NO  → มีหลักฐานไหม?
 *                      YES → Strategic POD
 *                      NO  → ยังเป็นสมมติฐาน
 *
 * ⚠️ ไม่แตะ schema — ข้อมูลคู่แข่งเก็บที่ไหน เป็นการตัดสินใจของรอบ schema (Gate B)
 *    ไฟล์นี้นิยาม "รูปร่าง" กับ "กติกา" ให้ schema นั้นเคารพ
 */

import type { ClaimStatus } from './positioningEngine';
import { CLAIM_RANK } from './positioningEngine';

/** สิ่งที่ต้องจำเกี่ยวกับคู่แข่งแต่ละราย */
export interface CompetitorRecord {
  name: string;
  positioning: string;
  /** ข้อที่เขาพูดเหมือนทุกคน */
  pop: string[];
  /** ข้อที่เขาอ้างว่าต่าง */
  pod: string[];
  price?: string;
  audience?: string;
  claims?: string[];
  channels?: string[];
  /** ช่องว่างที่เขาไม่ได้ครอบ — จุดที่เราเข้าได้ */
  whiteSpace?: string[];
}

/** ความง่ายในการลอก — ตัวที่ตัดสินว่า POD นั้นอยู่ได้นานแค่ไหน */
export type CopyDifficulty = 'trivial' | 'easy' | 'hard' | 'very-hard';

export const COPY_DIFFICULTY_WHY: Record<CopyDifficulty, string> = {
  trivial: 'เปลี่ยนคำโฆษณาก็ลอกได้ทันที',
  easy: 'ลอก workflow/prompt ได้ภายในไม่กี่สัปดาห์',
  hard: 'ต้องสร้าง decision rules + ontology เอง ใช้เวลาเป็นเดือน',
  'very-hard': 'ต้องมีข้อมูลผลลัพธ์ธุรกิจจริงสะสม — ซื้อไม่ได้ เร่งไม่ได้',
};

/** ผลการตรวจว่า claim นี้ต่างจริงหรือไม่ */
export type DifferentiationVerdict =
  | 'pop'              // ตลาดพูดกันหมดแล้ว
  | 'weak-pod'         // ต่าง แต่ลอกง่าย
  | 'hypothesis-pod'   // ลอกยาก แต่ยังไม่มีหลักฐาน
  | 'strategic-pod';   // ลอกยาก + มีหลักฐาน

export interface DifferentiationResult {
  verdict: DifferentiationVerdict;
  why: string;
  /** คู่แข่งที่พูดข้อนี้เหมือนกัน (ถ้ามี) */
  alsoClaimedBy: string[];
  nextStep: string;
}

/** ตรวจว่าข้ออ้างที่เสนอมา ต่างจริงไหม — เทียบกับความจำเรื่องคู่แข่งที่มี
 *
 *  @param claim        ข้ออ้างที่เสนอ
 *  @param market       คู่แข่งที่เรารู้จัก
 *  @param copyDifficulty ประเมินว่าลอกยากแค่ไหน
 *  @param evidence     ระดับหลักฐานที่มี
 */
export function assessDifferentiation(
  claim: string,
  market: CompetitorRecord[],
  copyDifficulty: CopyDifficulty,
  evidence: ClaimStatus,
): DifferentiationResult {
  const c = claim.trim().toLowerCase();
  const alsoClaimedBy = market
    .filter((m) => [...m.pop, ...m.pod, ...(m.claims ?? [])]
      .some((x) => x.toLowerCase().includes(c) || c.includes(x.toLowerCase())))
    .map((m) => m.name);

  if (alsoClaimedBy.length > 0) {
    return {
      verdict: 'pop',
      why: `${alsoClaimedBy.length} เจ้าในตลาดพูดข้อนี้เหมือนกัน ⇒ เป็น POP ไม่ใช่ความต่าง`,
      alsoClaimedBy,
      nextStep: 'หาข้อที่ไม่มีใครในรายการพูด แล้วตรวจซ้ำ',
    };
  }

  if (copyDifficulty === 'trivial' || copyDifficulty === 'easy') {
    return {
      verdict: 'weak-pod',
      why: `ยังไม่มีใครพูด แต่ ${COPY_DIFFICULTY_WHY[copyDifficulty]}`,
      alsoClaimedBy: [],
      nextStep: 'ทำให้ข้อนี้ต้องพึ่งข้อมูล/กฎการตัดสินใจของเราเอง ไม่ใช่แค่คำหรือ workflow',
    };
  }

  if (CLAIM_RANK[evidence] < CLAIM_RANK.observed) {
    return {
      verdict: 'hypothesis-pod',
      why: `ลอกยาก (${COPY_DIFFICULTY_WHY[copyDifficulty]}) แต่หลักฐานยังอยู่ระดับ "${evidence}"`,
      alsoClaimedBy: [],
      nextStep: 'เก็บหลักฐานให้ถึงระดับ observed ก่อนพูดเป็นข้อเท็จจริง',
    };
  }

  return {
    verdict: 'strategic-pod',
    why: `ไม่มีใครพูด · ${COPY_DIFFICULTY_WHY[copyDifficulty]} · มีหลักฐานระดับ "${evidence}"`,
    alsoClaimedBy: [],
    nextStep: 'ใช้เป็นข้ออ้างหลักได้ — และลงทุนทำให้มันลอกยากขึ้นเรื่อย ๆ',
  };
}

/** ตลาดที่เรารู้จักจริง ณ 23 ส.ค. 2569
 *  ⚠️ ข้อมูลนี้ต้องอัปเดตเมื่อเจอคู่แข่งใหม่ — ความจำที่ไม่อัปเดต = ความมั่นใจปลอม */
export const KNOWN_MARKET: CompetitorRecord[] = [
  {
    name: 'ChatGPT / Gemini / Claude',
    positioning: 'ผู้ช่วย AI อเนกประสงค์',
    pop: ['AI Chat', 'สร้างคอนเทนต์ด้วย AI', 'สร้างภาพ/วิดีโอด้วย AI'],
    pod: [],
    whiteSpace: ['ไม่รู้บริบทธุรกิจของผู้ใช้ข้ามครั้ง', 'ไม่บอกว่าควรทำอะไรต่อจากหลักฐานที่มี'],
  },
  {
    name: 'AIS × Microsoft (AI Ready for SMEs)',
    positioning: 'AI Agent สำเร็จรูปสำหรับ SME ไทย',
    pop: ['AI Agent', 'เทมเพลตสำเร็จรูป', 'ภาษาไทย'],
    pod: [],
    audience: 'SME ไทย',
    whiteSpace: ['ไม่มีสายวิชาชีพระบบบริหารอยู่ข้างหลัง', 'ไม่ได้พาไปถึงการวางระบบให้ขยายได้'],
  },
  {
    name: 'ซอฟต์แวร์เอกสาร ISO ในไทย',
    positioning: 'ที่เก็บเอกสารมาตรฐาน',
    pop: ['Dashboard', 'เทมเพลตสำเร็จรูป'],
    pod: ['จัดเก็บเอกสารให้ตรงข้อกำหนด'],
    whiteSpace: ['ช่วยเก็บสิ่งที่เขียนเสร็จแล้ว แต่ไม่ช่วยคิดว่าต้องเขียนอะไร'],
  },
  {
    name: 'เอเจนซี / ที่ปรึกษา',
    positioning: 'บริการโดยคน',
    pop: [],
    pod: ['ปรับให้เข้ากับธุรกิจได้ลึก'],
    price: 'หลักหมื่น–หลักแสนต่อโปรเจกต์',
    whiteSpace: ['ราคาสูงเกินสำหรับคนเริ่มต้น', 'ความรู้จบไปกับโปรเจกต์ ไม่สะสมกลับมาที่ลูกค้า'],
  },
  {
    name: 'Excel / จดมือ / ไม่ทำอะไรเลย',
    positioning: 'ทางเลือกที่ชนะบ่อยที่สุดและมักถูกลืม',
    pop: [],
    pod: ['ฟรีและคุ้นเคย'],
    whiteSpace: ['ไม่มีใครบอกว่าตัวเลขที่กรอกแปลว่าอะไร'],
  },
];
