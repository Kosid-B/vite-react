/* ===== Authentic Sign-up Experience — nudge ที่ "ออกแบบประสบการณ์ ไม่ใช่ข้อความขาย" =====
 * แนวทาง (ยึดหลักที่บอร์ดกำหนด): Authenticity แทน Celebrity · ประสบการณ์แทนข้อความขาย
 * ใช้ "สัญญาณจริง" เท่านั้น — ไม่มีตัวเลขปลอม/ความขาดแคลนปลอม/นับผู้ใช้ปลอม:
 *   • Social proof แบบ authentic = เครดิตจริงของที่ปรึกษา (M.E.A) 20+ ปี ISO & ธุรกิจ
 *   • Scarcity/Value จริง = ทดลอง Scale ฟรี 15 วัน ไม่ต้องใส่บัตร (offer จริงของระบบ)
 *   • Loss-aversion แบบสุจริต = แรงจูงใจให้ "เริ่ม" ไม่ใช่หลอกให้กลัว
 *   • Imprint = สัญลักษณ์การเติบโต 🌱→👑 ซ้ำ ๆ จนจำได้
 * แต่ละ variant คือ "มุมอารมณ์" ที่ต่างกัน → วัดผลด้วย GA (nudge_shown/nudge_cta) ว่ามุมไหนแปลงจริง
 * = กลไก "วัดว่าอารมณ์ไหนทำให้อยากเริ่มจริง" แบบโปร่งใส (ไม่ใช่การบิดเบือน) */

export type NudgeAngle = 'belief' | 'proof' | 'value' | 'momentum';

export interface AuthNudge {
  angle: NudgeAngle;
  symbol: string;      // สัญลักษณ์ imprint
  headline: string;    // ประสบการณ์/อารมณ์ (ไม่ใช่ข้อความขาย)
  body: string;
  proof: string;       // เครดิตจริง (authentic ไม่ใช่ celebrity)
  chip: string;        // offer จริงที่จับต้องได้
}

/** เครดิตจริงของระบบ (ตรวจสอบได้ — footer/แดชบอร์ด) */
export const REAL_PROOF = 'ออกแบบโดยที่ปรึกษาธุรกิจ & ISO จริงกว่า 20 ปี — B. Training Consultant (M.E.A)';
export const REAL_OFFER = 'ทดลองแพ็ก Scale (สูงสุด) ฟรี 15 วัน · ไม่ต้องใส่บัตร';

const NUDGES: Record<NudgeAngle, AuthNudge> = {
  // Imprint/ประสบการณ์: สัญลักษณ์เติบโต + คำมั่นทางอารมณ์ที่ซ้ำได้
  belief: {
    angle: 'belief', symbol: '🌱→👑',
    headline: 'โตได้ แม้เริ่มจากศูนย์',
    body: 'จ้างทีม AI ทั้งบริษัทมาลงมือทำจริง — จากหมู่บ้านสตาร์ทอัป สู่มหานคร AI',
    proof: REAL_PROOF, chip: REAL_OFFER,
  },
  // Authentic proof (ไม่ใช่ celebrity)
  proof: {
    angle: 'proof', symbol: '🛡️',
    headline: 'สร้างจากประสบการณ์จริง ไม่ใช่คำโฆษณา',
    body: 'ทุกเครื่องมือมาจากการตรวจประเมิน & ให้คำปรึกษาจริงในสนามธุรกิจไทยมากว่า 20 ปี',
    proof: REAL_PROOF, chip: REAL_OFFER,
  },
  // Value/scarcity จริง
  value: {
    angle: 'value', symbol: '🎁',
    headline: 'ได้ทีมผู้บริหาร AI ครบ ตั้งแต่วันแรก',
    body: 'CEO · CMO · CFO และทีมงาน AI ทำงานให้ 24 ชม. — เริ่มฟรี ลองก่อนตัดสินใจ',
    proof: REAL_PROOF, chip: REAL_OFFER,
  },
  // Loss-aversion แบบสุจริต (กระตุ้นให้เริ่ม ไม่หลอกให้กลัว)
  momentum: {
    angle: 'momentum', symbol: '🚀',
    headline: 'ทุกวันที่รอ คือวันที่ธุรกิจยังไม่เริ่ม',
    body: 'เริ่มวันนี้ฟรี — ให้ทีม AI ช่วยลงมือ แล้วเห็นเมืองบริษัทของคุณโตทีละก้าว',
    proof: REAL_PROOF, chip: REAL_OFFER,
  },
};

export const NUDGE_ANGLES: NudgeAngle[] = ['belief', 'proof', 'value', 'momentum'];

/** เลือก variant แบบ deterministic (หมุนตามวัน) เพื่อให้ GA วัดได้ว่ามุมไหนแปลงดีสุด */
export function pickNudgeVariant(dayStamp: number): NudgeAngle {
  return NUDGE_ANGLES[((dayStamp % NUDGE_ANGLES.length) + NUDGE_ANGLES.length) % NUDGE_ANGLES.length];
}

export function buildNudge(angle: NudgeAngle): AuthNudge {
  return NUDGES[angle];
}
