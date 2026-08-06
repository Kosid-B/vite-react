// heroExperiment.ts — A/B ทดสอบ hero บน landing (anonymous ก่อนสมัคร) · Dark AI Marketing #9+18
// ต่างจาก experiments.ts (Pulse ในแอป ต้อง consent) — อันนี้ทดสอบ "พาดหัว" กับผู้เยี่ยมชมที่ยังไม่ล็อกอิน
// โปร่งใส: ทดสอบแค่มุมข้อความ (ไม่มี scarcity ปลอม) · assign แบบ deterministic ต่อ browser (ไม่เก็บ PII)
//
// ขอบเขต: ทดสอบเฉพาะ hero ของ seg 'default' (คนที่ยังไม่ระบุกลุ่ม = traffic ส่วนใหญ่ที่ไม่มี ?seg=)
// เพื่อคุมจำนวน cell ให้น้อย (2) — พอมี traffic มากค่อยขยาย
// ⚠️ ต้องมี traffic ระดับหลักร้อย/วัน ผลถึงจะมีนัยสำคัญ — ที่ traffic น้อยถือเป็น "เริ่มเก็บข้อมูลไว้"

export type HeroAb = 'A' | 'B';

export interface HeroAbCopy {
  h1a: string;
  h1bLines: string[];
  subLead: string;
}

// A = control (สำเนาปัจจุบัน · มุม "กลัวเจ๊ง → ทดสอบก่อน")
// B = challenger (มุม "เร็ว + ได้ของจริง" — ผลลัพธ์/ความเร็ว)
export const HERO_AB_COPY: Record<HeroAb, HeroAbCopy> = {
  A: {
    h1a: 'อยากมีธุรกิจของตัวเอง?',
    h1bLines: ['เริ่มคืนนี้ได้เลย', 'ไม่ต้องเสี่ยงเงินก้อน'],
    subLead: 'พิมพ์ไอเดีย 1 บรรทัด — ทีม AI ช่วยทดสอบว่ามันไปรอดไหม ก่อนคุณเสียเงินจริง',
  },
  B: {
    h1a: 'มีธุรกิจเป็นของตัวเอง',
    h1bLines: ['ใน 5 นาที', 'ด้วยทีม AI'],
    subLead: 'บอกสิ่งที่คุณถนัด — AI ร่างแผนธุรกิจ + พาเปิดหน้าร้านให้ทันที ฟรี ไม่ต้องเสี่ยงเงินก้อน',
  },
};

/** hash เสถียร (djb2) — เดียวกับ experiments.ts เพื่อแบ่งกลุ่มต่อ browser แบบคงที่ */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** แบ่งกลุ่ม A/B จาก id ที่ผูกกับ browser (deterministic — คนเดิมเห็นตัวเดิมเสมอ) */
export function heroAbVariant(abId: string): HeroAb {
  return hashStr((abId || 'anon') + ':hero_ab') % 2 === 0 ? 'A' : 'B';
}
