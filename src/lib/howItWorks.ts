// howItWorks.ts — สเต็ป "ระบบทำงานยังไงใน 30 วินาที" (explainer เคลื่อนไหวบน Landing)
// แก้ปัญหาคนไม่เข้าใจระบบ → อธิบายภาพรวมเร็ว ๆ · pure + tested

export interface HowStep {
  id: string;
  icon: string;
  title: string;    // สั้น อ่านใน 1 วินาที
  caption: string;  // ขยายความสั้น ๆ
}

export const HOW_STEPS: HowStep[] = [
  { id: 'choose', icon: '👆', title: 'เลือกว่าคุณขายให้ใคร', caption: 'ลูกค้าทั่วไป (B2C) หรือ องค์กร (B2B) — ระบบปรับให้ตรงธุรกิจคุณ' },
  { id: 'validate', icon: '🧪', title: 'ทดสอบไอเดียก่อนลงเงิน', caption: 'รู้ก่อนว่าขายได้จริงไหม โดยยังไม่เสียเงินสักบาท' },
  { id: 'team', icon: '🤖', title: 'ทีม AI ลงมือช่วยทำงาน', caption: 'CEO/CFO/CMO AI + เอเจนต์ ช่วยคิดและทำแทน 24 ชม.' },
  { id: 'customers', icon: '🧲', title: 'ระบบช่วยหาลูกค้า', caption: 'หน้าร้านที่ค้นเจอ + จับคู่ดีมานด์ให้ ไม่ต้องนั่งรอ' },
  { id: 'grow', icon: '🏙️', title: 'เห็นธุรกิจโตเป็นภาพ', caption: 'เมืองบริษัทโตตามงานจริง ทำต่อได้ไม่ท้อ' },
  { id: 'start', icon: '🚀', title: 'เริ่มฟรี — ลองก่อนได้เลย', caption: 'ไม่ต้องใส่บัตร ระบบพาไปทีละขั้น' },
];

export const STEP_MS = 5000;                       // 5 วิ/สเต็ป
export const HOW_TOTAL_MS = HOW_STEPS.length * STEP_MS; // = 30,000 (30 วินาที)

/** index ของสเต็ก ณ เวลา ms (วนซ้ำ) — ใช้เทส/คำนวณ */
export function stepIndexAt(ms: number): number {
  const t = ((ms % HOW_TOTAL_MS) + HOW_TOTAL_MS) % HOW_TOTAL_MS;
  return Math.floor(t / STEP_MS);
}
