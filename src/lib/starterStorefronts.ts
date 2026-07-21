/** Seed marketplace แบบซื่อสัตย์ — บริการ "จริง" ของ B. Training Consultant (ผู้พัฒนาแพลตฟอร์ม)
 *  แก้ cold-start: /b ไม่ว่างวันแรก ด้วยของจริง (ไม่ใช่ร้านปลอม/รีวิวปลอม)
 *  แสดงแยกส่วน + ป้ายชัดว่าเป็นบริการของผู้พัฒนา (โปร่งใส) */

import { COMPANY } from '../config';

export interface StarterListing {
  id: string;
  name: string;
  category: string;     // ป้ายหมวด (อ่านง่าย)
  vp: string;           // จุดขายหนึ่งประโยค
  services: string[];
  href: string;         // ลิงก์จริง (เว็บบริษัท / หน้าเริ่มใช้งาน)
}

/** บริการจริงของ B. Training (ที่ปรึกษา 20+ ปี) + แพลตฟอร์มนี้เอง */
export const STARTER_LISTINGS: StarterListing[] = [
  {
    id: 'iso', name: 'ที่ปรึกษา ISO 9001 / 14001 / 45001',
    category: '📋 มาตรฐาน & Compliance',
    vp: 'วางระบบมาตรฐานสากลให้ผ่าน audit จริง โดยทีมที่ปรึกษาประสบการณ์ 20+ ปี',
    services: ['ISO 9001 (QMS)', 'ISO 14001 (EMS)', 'ISO 45001', 'Internal Audit'],
    href: COMPANY.website,
  },
  {
    id: 'tis', name: 'TIS / มอก. & มาตรฐานอุตสาหกรรมไทย',
    category: '📋 มาตรฐาน & Compliance',
    vp: 'ยกระดับสินค้า/โรงงานให้ได้ มอก. และมาตรฐานไทย พร้อมระบบเอกสารครบ',
    services: ['TIS Automate', 'มอก.', 'GMP', 'HACCP'],
    href: COMPANY.website,
  },
  {
    id: 'training', name: 'อบรม & Workshop การจัดการ / Lean',
    category: '🎓 อบรม & พัฒนาบุคลากร',
    vp: 'หลักสูตร in-house ปรับตามธุรกิจจริง — Lean, JIT, Kaizen, ISO Awareness',
    services: ['In-house Training', 'Lean / Kaizen', 'ISO Awareness', 'ที่ปรึกษาโครงการ'],
    href: COMPANY.website,
  },
  {
    id: 'saas', name: 'CEO AI Thailand — สร้างบริษัท AI',
    category: '🤖 SaaS & เทคโนโลยี',
    vp: 'ให้ทีม AI ทำเอกสาร การตลาด และบริหารธุรกิจแทนคุณ — เริ่มฟรี 15 วัน',
    services: ['AI Company', 'Marketplace B2B', 'ISO Automation', 'AI Marketing'],
    href: '/start',
  },
];
