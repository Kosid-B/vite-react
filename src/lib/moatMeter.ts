/* ===== Moat Meter — "ความได้เปรียบของคุณ" (Your Edge) =====
 * ดาร์กมาร์เก็ตติ้งเชิงจริยธรรม: first-party data (#3) + retention/switching-cost (#21/#22) + loss aversion
 * วัดว่า "AI รู้จักธุรกิจคุณแค่ไหน" จากข้อมูลจริงที่สะสม → ยิ่งใช้ยิ่งสะสม = คู่แข่ง (แชตบอต/wrapper) ลอกไม่ได้
 * โปร่งใส: แสดงให้ผู้ใช้เห็นคุณค่าที่เขาสร้างเอง (ไม่ใช่กับดัก) · ตัวเลขจากข้อมูลจริงล้วน
 * pure + tested */

export interface BrainInputs {
  financeEntries: number;  // รายการการเงินที่บันทึก
  opsDays: number;         // วันที่มีข้อมูลผลดำเนินงาน
  dealsClosed: number;     // ดีล/ลูกค้าที่ปิดสำเร็จ
  agents: number;          // ทีมผู้บริหาร AI
  skillsLearned: number;   // skill ที่ปลดล็อก
  streakDays: number;      // ความต่อเนื่องรายวัน
}

export interface BrainAsset {
  key: string;
  label: string;
  count: number;
  filled: boolean;
  weight: number;   // คะแนนเต็มของ asset นี้
  earned: number;   // คะแนนที่ได้จริง
  note: string;     // asset นี้ให้อะไรกับ "สมอง AI"
}

export interface BrainTier { key: string; label: string; emoji: string; msg: string; }

export interface BrainResult {
  score: number;            // 0–100
  tier: BrainTier;
  assets: BrainAsset[];
  filledCount: number;
  dataPoints: number;       // จำนวนจุดข้อมูลรวม (ใช้ในสาร loss-aversion)
  nextStep: string;
  switchingNote: string;
}

interface AssetDef { key: string; label: string; cap: number; weight: number; note: string; get: (x: BrainInputs) => number; }
const ASSETS: AssetDef[] = [
  { key: 'finance', label: 'ประวัติการเงิน', cap: 12, weight: 20, note: 'CFO AI เห็นแนวโน้มรายรับ-รายจ่ายจริงของคุณ ไม่ต้องเดา', get: (x) => x.financeEntries },
  { key: 'ops', label: 'ข้อมูลผลดำเนินงาน', cap: 30, weight: 20, note: 'AI ประเมินสมรรถนะ + จับรูรั่วจากตัวเลขจริงรายวัน', get: (x) => x.opsDays },
  { key: 'deals', label: 'ดีลที่ปิดได้', cap: 10, weight: 20, note: 'ระบบเรียนรู้ว่าลูกค้าแบบไหนจ่ายจริง → เจาะกลุ่มแม่นขึ้น', get: (x) => x.dealsClosed },
  { key: 'agents', label: 'ทีมผู้บริหาร AI', cap: 5, weight: 15, note: 'ทีมที่ปรับ mandate ตามธุรกิจคุณ ไม่ใช่บอตสำเร็จรูป', get: (x) => x.agents },
  { key: 'skills', label: 'ทักษะที่ปลดล็อก', cap: 10, weight: 15, note: 'ความสามารถเฉพาะที่สะสมให้ทีม AI ของคุณ', get: (x) => x.skillsLearned },
  { key: 'streak', label: 'ความต่อเนื่อง (วัน)', cap: 30, weight: 10, note: 'ยิ่งใช้ต่อเนื่อง ข้อมูลยิ่งสด คำแนะนำยิ่งตรง', get: (x) => x.streakDays },
];

const TIERS: BrainTier[] = [
  { key: 'seed', label: 'เพิ่งเริ่มสะสม', emoji: '🌱', msg: 'AI ยังรู้จักธุรกิจคุณไม่มาก — ยิ่งกรอกข้อมูลจริง คำแนะนำยิ่งแม่น' },
  { key: 'building', label: 'กำลังสะสมความได้เปรียบ', emoji: '🧱', msg: 'AI เริ่มเข้าใจธุรกิจคุณแล้ว — ข้อมูลนี้คือสิ่งที่แชตบอตทั่วไปไม่มี' },
  { key: 'strong', label: 'ความได้เปรียบแข็งแรง', emoji: '💪', msg: 'AI รู้จักธุรกิจคุณลึกพอจะให้คำแนะนำเฉพาะตัว — ย้ายไปที่อื่นต้องเริ่มใหม่หมด' },
  { key: 'moat', label: 'คูเมืองที่ลอกไม่ได้', emoji: '🏰', msg: 'ธุรกิจคุณมี "สมอง AI" เฉพาะตัวที่สะสมมา — นี่คือความได้เปรียบที่คู่แข่งลอกไม่ได้' },
];

/** คำนวณ "คะแนนสมองธุรกิจ" + tier + assets + สาร retention เชิงจริยธรรม */
export function businessBrainScore(x: BrainInputs): BrainResult {
  const assets: BrainAsset[] = ASSETS.map((a) => {
    const count = Math.max(0, a.get(x) || 0);
    const earned = Math.round(Math.min(count, a.cap) / a.cap * a.weight);
    return { key: a.key, label: a.label, count, filled: count > 0, weight: a.weight, earned, note: a.note };
  });
  const score = Math.min(100, assets.reduce((s, a) => s + a.earned, 0));
  const tier = score >= 75 ? TIERS[3] : score >= 50 ? TIERS[2] : score >= 25 ? TIERS[1] : TIERS[0];
  const filledCount = assets.filter((a) => a.filled).length;
  const dataPoints = assets.reduce((s, a) => s + a.count, 0);

  // next step = asset ที่ยังได้คะแนนน้อยสุดเทียบน้ำหนัก (โอกาสเพิ่มคะแนนสูงสุด)
  const gap = [...assets].sort((a, b) => (b.weight - b.earned) - (a.weight - a.earned))[0];
  const nextStep = gap
    ? `เพิ่ม “${gap.label}” เพื่อให้ AI รู้จักธุรกิจคุณมากขึ้น (${gap.note})`
    : 'สะสมข้อมูลจริงต่อเนื่องเพื่อให้คำแนะนำแม่นขึ้น';

  const switchingNote = dataPoints > 0
    ? `AI จำธุรกิจคุณจาก ${dataPoints} จุดข้อมูลที่คุณสร้างเอง — ถ้าย้ายไปแชตบอตทั่วไป ต้องเริ่มเล่าใหม่จากศูนย์`
    : 'เริ่มบันทึกข้อมูลจริงวันนี้ แล้ว AI จะเริ่มสะสม “ความได้เปรียบ” ให้ธุรกิจคุณ';

  return { score, tier, assets, filledCount, dataPoints, nextStep, switchingNote };
}

/** ต่างจากแชตบอตทั่วไปยังไง (differentiation — คู่แข่ง 3→5) */
export interface ChatbotDiff { them: string; us: string; }
export const CHATBOT_DIFF: ChatbotDiff[] = [
  { them: 'ตอบคำถามแล้วลืม เริ่มใหม่ทุกครั้ง', us: 'จำข้อมูลธุรกิจคุณ ยิ่งใช้ยิ่งแม่น' },
  { them: 'ไม่รู้จักภาษี/PromptPay/PDPA ไทย', us: 'ออกแบบเพื่อไทย (ตรวจสลิป SlipOK · PromptPay · PDPA)' },
  { them: 'คุณต้องลงมือทำเองทั้งหมด', us: 'ทีมผู้บริหาร AI รับงานไปลงมือให้จริง' },
  { them: 'ใครก็ทำ wrapper ขึ้นมาได้', us: 'ผสานระบบบริหาร/ISO 20+ ปีของ B.Training' },
];
