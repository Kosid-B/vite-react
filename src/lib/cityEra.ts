// cityEra.ts — "ยุคของเมือง" ที่วิวัฒน์ตามความเจริญของบริษัท (pure + tested)
// เมืองเติบโตจาก "ยุคบุกเบิก" (ธรรมชาติร่วมสมัย เรียบง่าย) → "มหานครอนาคต" (AI humanoid + โดรน + รถไร้คนขับ)
// ทุกยุคออกแบบให้สวยแบบมินิมอล + มีธรรมชาติ (greenBoost) — ไม่ใช่แค่ตึกสูงขึ้น
// ผูกกับระดับเมือง (COMPANY_LEVELS 5 ระดับ) ผ่าน index — หน้าเพจส่ง eraIndex เข้ามา, engine วาดตามนั้น

export interface EraAgents {
  people: number;      // คนเดิน (เดินบนทางเท้า)
  bikes: number;       // จักรยาน/มอเตอร์ไซค์
  cars: number;        // รถยนต์ทั่วไป
  selfDriving: number; // รถยนต์ไร้คนขับ (มี LiDAR)
  drones: number;      // โดรน (บินบนฟ้า)
  humanoids: number;   // หุ่นยนต์ AI humanoid (เดินร่วมกับคน)
  airtaxi: number;     // แท็กซี่บินได้ VTOL (ยุคอนาคต)
  motes: number;       // อนุภาคเรืองแสง (หิ่งห้อยยุคธรรมชาติ / data motes ยุคนีออน)
}

export interface EraDef {
  id: string;
  name: string;        // ชื่อยุค (ไทย)
  icon: string;
  caption: string;     // คำบรรยายบรรยากาศ
  newThis: string;     // "สิ่งใหม่" ที่ปลดล็อกในยุคนี้ (โชว์เป็น legend)
  maxH: number;        // เพดานความสูงตึก (px) — ยุคแรกเตี้ย/มินิมอล ยุคหลังสูงเสียดฟ้า
  floorScale: number;  // สเกลความสูงตึก
  greenBoost: number;  // ต้นไม้ริมถนนเพิ่ม (ธรรมชาติร่วมสมัย)
  accent: string;      // สีไฮเทค (glow humanoid/โดรน/LiDAR) — hsl()
}

/** 5 ยุค เรียงตามความเจริญ (index 0–4 = Starter…Elite) */
export const ERAS: EraDef[] = [
  {
    id: 'seed', name: 'ยุคบุกเบิก', icon: '🌱',
    caption: 'เมืองเกิดใหม่ท่ามกลางธรรมชาติ — เรียบง่าย ร่มรื่น มีผู้คนเริ่มเดิน',
    newThis: 'ผู้คนเริ่มเดินในเมือง + พื้นที่สีเขียว',
    maxH: 96, floorScale: 0.6, greenBoost: 4, accent: 'hsl(150 60% 52%)',
  },
  {
    id: 'rise', name: 'ยุคเติบโต', icon: '🏙️',
    caption: 'เมืองเริ่มก่อตัว ผู้คนพลุกพล่าน รถราเริ่มวิ่ง',
    newThis: 'รถยนต์ + ตึกเริ่มสูงขึ้น',
    maxH: 152, floorScale: 0.8, greenBoost: 2, accent: 'hsl(200 70% 56%)',
  },
  {
    id: 'busy', name: 'ยุคเมืองคึกคัก', icon: '🚦',
    caption: 'การค้าคึกคัก จราจรหนาแน่น โดรนส่งของลำแรกปรากฏ',
    newThis: 'โดรนส่งของ + เมืองคึกคัก',
    maxH: 202, floorScale: 0.92, greenBoost: 1, accent: 'hsl(190 80% 54%)',
  },
  {
    id: 'smart', name: 'ยุคสมาร์ทซิตี้', icon: '🛰️',
    caption: 'รถไร้คนขับวิ่งเอง โดรนเต็มฟ้า เมืองอัจฉริยะเชื่อมกันทั้งระบบ',
    newThis: 'รถยนต์ไร้คนขับ (LiDAR) + ฝูงโดรน',
    maxH: 252, floorScale: 1.0, greenBoost: 2, accent: 'hsl(210 90% 60%)',
  },
  {
    id: 'neo', name: 'ยุคมหานครอนาคต', icon: '🤖',
    caption: 'หุ่นยนต์ AI อยู่ร่วมกับผู้คน เมืองไฮเทคสะอาดตา กลมกลืนกับธรรมชาติ',
    newThis: 'AI Humanoid เดินในเมือง + สกายไลน์อนาคต',
    maxH: 306, floorScale: 1.12, greenBoost: 3, accent: 'hsl(275 85% 66%)',
  },
];

const AGENTS: EraAgents[] = [
  { people: 8, bikes: 3, cars: 1, selfDriving: 0, drones: 0, humanoids: 0, airtaxi: 0, motes: 6 },
  { people: 11, bikes: 5, cars: 5, selfDriving: 0, drones: 0, humanoids: 0, airtaxi: 0, motes: 4 },
  { people: 12, bikes: 5, cars: 7, selfDriving: 0, drones: 3, humanoids: 0, airtaxi: 1, motes: 3 },
  { people: 11, bikes: 3, cars: 3, selfDriving: 7, drones: 6, humanoids: 2, airtaxi: 2, motes: 5 },
  { people: 9, bikes: 1, cars: 1, selfDriving: 8, drones: 8, humanoids: 6, airtaxi: 3, motes: 8 },
];

export const ERA_COUNT = ERAS.length;

/** clamp index ให้อยู่ในช่วงยุคที่มีจริง */
export function clampEra(i: number): number {
  if (!Number.isFinite(i)) return 0;
  return Math.max(0, Math.min(ERA_COUNT - 1, Math.floor(i)));
}

/** ยุคตาม index (clamp) */
export function eraByIndex(i: number): EraDef {
  return ERAS[clampEra(i)];
}

/** จำนวน agent ของยุค (clamp) */
export function agentsByIndex(i: number): EraAgents {
  return AGENTS[clampEra(i)];
}
