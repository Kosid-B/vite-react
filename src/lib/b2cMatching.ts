// b2cMatching.ts — AI จับคู่ ธุรกิจ↔ลูกค้า/ประชากร (B2C reach) · ต่อยอด VP "Matchmaker"
// แก้ pain: ร้านเข้าไม่ถึงกลุ่มผู้บริโภคที่ "ใช่" → AI แนะนำ persona/ช่องทาง/มุมข้อความที่เหมาะ
// reuse offerKind() จาก b2bMatching · pure + tested · ขนาดตลาดเสริมด้วย marketSizing (แยกชั้น)
import { offerKind, type OfferKind } from './b2bMatching';

export interface AudienceMatch {
  segment: string;     // กลุ่มผู้บริโภคเป้าหมาย
  fit: number;         // 0..99 ความเหมาะ
  why: string;         // ทำไมกลุ่มนี้ใช่
  channels: string[];  // หาเจอ/เข้าถึงที่ไหน
  angle: string;       // มุมข้อความที่ควรใช้กับกลุ่มนี้
}

// กลุ่มผู้บริโภคที่เหมาะกับธุรกิจแต่ละประเภท (curated · เรียง fit มากสุดก่อน)
const AUDIENCE_BY_KIND: Record<OfferKind, AudienceMatch[]> = {
  food: [
    { segment: 'คนทำงาน/ออฟฟิศใกล้ร้าน (รัศมี 3–5 กม.)', fit: 90, why: 'ซื้อซ้ำมื้อกลางวัน/เย็น ทุกวัน', channels: ['LINE OA', 'Google Maps/รีวิว', 'FB กลุ่มจังหวัด/ย่าน'], angle: 'สะดวก เร็ว อร่อยคุ้ม — สั่งล่วงหน้าไม่ต้องรอ' },
    { segment: 'ครอบครัวในละแวก', fit: 78, why: 'สั่งเดลิเวอรีมื้อเย็น/วันหยุด', channels: ['LINE', 'FB Marketplace', 'ป้ายหน้าร้าน+QR'], angle: 'เมนูครอบครัว คุ้ม อิ่มทั้งบ้าน' },
    { segment: 'สายรีวิว/คอนเทนต์อาหาร', fit: 62, why: 'ช่วยกระจายแบบ organic', channels: ['TikTok', 'IG', 'เพจรีวิวจังหวัด'], angle: 'เมนูเด็ด/ภาพสวย ชวนถ่าย' },
  ],
  retail: [
    { segment: 'ลูกค้าเดิม/ในละแวก', fit: 85, why: 'ซื้อซ้ำ + บอกต่อ', channels: ['LINE OA', 'FB Page', 'หน้าร้าน+QR'], angle: 'ของใหม่มาก่อนใคร + สิทธิ์ลูกค้าประจำ' },
    { segment: 'นักช้อปออนไลน์ตามความสนใจ', fit: 72, why: 'ตรงสินค้าเฉพาะกลุ่ม', channels: ['FB กลุ่มสินค้า', 'TikTok Shop', 'IG'], angle: 'สินค้าเฉพาะ หายาก คัดมาแล้ว' },
  ],
  material: [
    { segment: 'ผู้ประกอบการรายเล็ก (ร้านอาหาร/ร้านค้า)', fit: 88, why: 'ซื้อประจำเป็นต้นทุน', channels: ['FB กลุ่มพ่อค้าแม่ค้า', 'LINE กลุ่มค้าส่ง', 'RFQ ในระบบ'], angle: 'ราคาส่ง ส่งตรงเวลา มีบิล/เครดิต' },
  ],
  logistics: [
    { segment: 'ร้านค้าออนไลน์/ร้านอาหารในพื้นที่', fit: 86, why: 'ต้องส่งของทุกวัน', channels: ['FB กลุ่มร้านค้า', 'LINE ย่าน', 'RFQ ในระบบ'], angle: 'เร็ว ตรงเวลา ราคาต่อชิ้นคุ้มเมื่อส่งประจำ' },
  ],
  marketing: [
    { segment: 'SME ที่อยากโตแต่ไม่มีทีม', fit: 84, why: 'ต้องการยอด/ลูกค้าเพิ่ม', channels: ['LinkedIn', 'FB กลุ่มธุรกิจ', 'สัมมนา/networking'], angle: 'วัดผลได้จริง คุ้มกว่าจ้างพนักงานประจำ' },
  ],
  accounting: [
    { segment: 'เจ้าของธุรกิจ/ฟรีแลนซ์ที่ไม่มีเวลาทำบัญชี', fit: 84, why: 'จำเป็นตามกฎหมาย + ประหยัดเวลา', channels: ['FB กลุ่ม SME', 'LINE', 'บอกต่อ'], angle: 'ถูกต้อง ตรงเวลา ไม่โดนปรับ สบายใจ' },
  ],
  legal: [
    { segment: 'ธุรกิจที่ต้องทำสัญญา/จดทะเบียน', fit: 80, why: 'ลดความเสี่ยงทางกฎหมาย', channels: ['LinkedIn', 'FB กลุ่มธุรกิจ', 'บอกต่อ'], angle: 'ปิดความเสี่ยง เอกสารรัดกุม' },
  ],
  it: [
    { segment: 'ธุรกิจที่อยากมีระบบ/เว็บ/แอป', fit: 82, why: 'ต้องการ automation/ออนไลน์', channels: ['LinkedIn', 'FB กลุ่มธุรกิจ', 'TikTok สายเทค'], angle: 'ลดงานซ้ำ ขายได้ 24 ชม.' },
  ],
  packaging: [
    { segment: 'ร้านอาหาร/ร้านค้า/แบรนด์เล็ก', fit: 83, why: 'ต้องใช้บรรจุภัณฑ์ต่อเนื่อง', channels: ['FB กลุ่มพ่อค้าแม่ค้า', 'LINE ค้าส่ง', 'RFQ'], angle: 'สวย แข็งแรง สั่งน้อยได้ มีโลโก้' },
  ],
  design: [
    { segment: 'แบรนด์เล็ก/ร้านที่อยากดูโปร', fit: 79, why: 'ต้องการภาพลักษณ์', channels: ['IG', 'FB กลุ่มธุรกิจ', 'Behance/พอร์ต'], angle: 'ดูโปรขึ้น ลูกค้าเชื่อถือ' },
  ],
  other: [
    { segment: 'ลูกค้าในละแวก/ตามความสนใจ', fit: 65, why: 'เริ่มจากกลุ่มที่เข้าถึงง่ายสุด', channels: ['LINE OA', 'FB Page', 'หน้าร้าน+QR'], angle: 'บอกให้ชัดว่าแก้ปัญหาอะไรให้ลูกค้า' },
  ],
};

/** คืนกลุ่มลูกค้าที่ "ใช่" สำหรับธุรกิจ (จากหมวด) — เรียง fit มากสุดก่อน */
export function audienceFor(category: string): AudienceMatch[] {
  return [...AUDIENCE_BY_KIND[offerKind(category)]].sort((a, b) => b.fit - a.fit);
}
