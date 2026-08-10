// gainPoints.ts — สื่อสาร "ระบบเราช่วยคุณได้อะไร" เป็น gain point (สิ่งที่ลูกค้าได้)
// แก้ปัญหา "คนไม่เข้าใจระบบ → ไม่กล้าสมัคร" ด้วยภาษา pain → gain (ไม่ใช่ศัพท์/ฟีเจอร์)
// pure + tested · จัดลำดับตามกลุ่ม (seg) ให้เห็นสิ่งที่ตรงใจก่อน

export interface GainPoint {
  id: string;
  icon: string;
  pain: string;   // ปัญหาที่ลูกค้าเจอ (พูดภาษาลูกค้า)
  gain: string;   // สิ่งที่ "ได้" (ผลลัพธ์ ไม่ใช่ฟีเจอร์)
  how: string;    // ทำได้เพราะระบบมีอะไร (สั้น ๆ พอให้เชื่อ)
}

export const GAIN_HEADLINE = 'เริ่มธุรกิจอย่างมีระบบ — โดยไม่ต้องเก่งทุกอย่างเอง';
export const GAIN_SUB = 'ระบบช่วยคุณ “ได้อะไร” บ้าง (ไม่ใช่แค่มีฟีเจอร์อะไร)';

export const GAIN_POINTS: GainPoint[] = [
  { id: 'validate', icon: '🧪', pain: 'กลัวลงเงินแล้วเจ๊ง', gain: 'รู้ก่อนว่าไอเดียขายได้จริงไหม — ก่อนเสียเงินสักบาท', how: 'ทดสอบไอเดียบนกระดาษด้วยหลัก MIT 24 ขั้น' },
  { id: 'team', icon: '🤖', pain: 'ทำทุกอย่างคนเดียวจนไม่มีเวลาโต', gain: 'มีทีมช่วยคิด+ลงมือแทน ทำงานให้ตลอด', how: 'ทีม AI (CEO/CFO/CMO + เอเจนต์)' },
  { id: 'customers', icon: '🧲', pain: 'นั่งรอลูกค้า วันไหนเงียบก็ขาดทุน', gain: 'ลูกค้าหาเจอ + ระบบช่วยจับคู่ดีมานด์ให้', how: 'หน้าร้าน+SEO อัตโนมัติ + ตัวจับคู่ธุรกิจ' },
  { id: 'roi', icon: '🧮', pain: 'ไม่รู้ว่าจ่ายค่าระบบแล้วคุ้มไหม', gain: 'คำนวณเองใน 3 ช่อง เห็นชัดว่าคุ้มกี่เท่า', how: 'เครื่องคำนวณความคุ้มค่า (ROI) บนหน้าแรก' },
  { id: 'progress', icon: '🏙️', pain: 'ทำธุรกิจแล้วท้อ ไม่เห็นความคืบหน้า', gain: 'เห็นธุรกิจโตเป็นภาพ ทำต่อได้ไม่ท้อกลางทาง', how: 'เมืองบริษัทโตตามงานจริง + ความต่อเนื่องรายวัน' },
  { id: 'decide', icon: '🧭', pain: 'ตัดสินใจเรื่องยาก ๆ ไม่รู้จะถามใคร', gain: 'มีที่ปรึกษาช่วยตัดสินใจ + โตแบบมีระบบ', how: 'ห้องบอร์ด + ระบบมาตรฐาน (ISO/SOP)' },
  { id: 'start', icon: '🎁', pain: 'กลัวผูกมัด/ต้องจ่ายก่อนได้ลอง', gain: 'เริ่มฟรี ไม่ต้องใส่บัตร ทดลองก่อนได้เลย', how: 'เข้าใช้ได้ทันทีที่ /start' },
  { id: 'guide', icon: '🗺️', pain: 'ไม่รู้จะเริ่มตรงไหน มันดูเยอะไปหมด', gain: 'มีเส้นทางทีละขั้น พาไปเอง ไม่ต้องงง', how: 'ตัวนำทาง + เลือกเป้าหมายตั้งแต่ก้าวแรก' },
];

// จัดลำดับให้ "สิ่งที่ตรงใจกลุ่มนั้น" ขึ้นก่อน (seg จาก hero)
const PRIORITY: Record<string, string[]> = {
  seller: ['customers', 'roi', 'start', 'team'],
  newbie: ['validate', 'start', 'guide', 'team'],
  owner: ['team', 'decide', 'customers', 'progress'],
  palm: ['validate', 'roi', 'customers', 'start'],
  default: ['validate', 'team', 'customers', 'start'],
};

/** คืน gain points โดยดันข้อที่ตรงกลุ่ม (seg) ขึ้นก่อน */
export function gainPointsFor(seg?: string): GainPoint[] {
  const order = PRIORITY[seg ?? 'default'] ?? PRIORITY.default;
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i === -1 ? order.length + 1 : i;
  };
  return [...GAIN_POINTS].sort((a, b) => rank(a.id) - rank(b.id));
}
