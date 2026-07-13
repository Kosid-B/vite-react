/** ISO 9001:2015 Gap Assessment — codify ความเชี่ยวชาญที่ปรึกษา 20 ปี (B. Training)
 *  เปลี่ยน clause tracker แบบ passive → ที่ปรึกษา active: บอกว่า "พร้อมกี่ % + ต้องทำอะไรก่อน audit"
 *  pure, ทดสอบได้ — ใช้ใน ISO9001.tsx (overview) */

import type { ISOClauseCheck, ISOStatus } from '../types';

export interface ClauseGuide {
  action: string;    // สิ่งที่ต้องทำให้ clause นี้ผ่าน (ภาษาไทย กระชับ)
  keyDoc: string;    // เอกสาร/หลักฐานหลักที่ auditor มองหา
  priority: 1 | 2 | 3; // 1 = ต้องมีก่อน (mandatory/auditor เช็คแน่) → 3 = รอง
  mandatoryDoc?: boolean; // เอกสารบังคับตามมาตรฐาน (documented information)
}

/** คู่มือรายข้อ — auditor เช็คอะไร + ต้องเตรียมเอกสารอะไร */
export const ISO_CLAUSE_GUIDE: Record<string, ClauseGuide> = {
  '4.1': { action: 'ระบุประเด็นภายใน/ภายนอกที่กระทบธุรกิจ (SWOT/PESTEL)', keyDoc: 'ตารางบริบทองค์กร', priority: 2 },
  '4.2': { action: 'ระบุผู้มีส่วนได้ส่วนเสีย + ความต้องการของแต่ละกลุ่ม', keyDoc: 'ตาราง Interested Parties', priority: 2 },
  '4.3': { action: 'กำหนดขอบเขตระบบคุณภาพ (ทำอะไร/ที่ไหน/ข้อยกเว้น)', keyDoc: 'เอกสารขอบเขต QMS', priority: 1, mandatoryDoc: true },
  '4.4': { action: 'เขียนผังกระบวนการหลัก + ความเชื่อมโยง (SIPOC/Process Map)', keyDoc: 'แผนผังกระบวนการ', priority: 1 },
  '5.1': { action: 'ผู้บริหารแสดงความมุ่งมั่น (ประชุม/สื่อสาร/จัดสรรทรัพยากร)', keyDoc: 'บันทึกประชุมผู้บริหาร', priority: 2 },
  '5.2': { action: 'ประกาศนโยบายคุณภาพ + สื่อสารให้พนักงานเข้าใจ', keyDoc: 'นโยบายคุณภาพ (ติดประกาศ)', priority: 1, mandatoryDoc: true },
  '5.3': { action: 'กำหนดบทบาท/หน้าที่/อำนาจ ในระบบคุณภาพ', keyDoc: 'ผังองค์กร + JD', priority: 2 },
  '6.1': { action: 'ประเมินความเสี่ยง/โอกาส + แผนจัดการ', keyDoc: 'ทะเบียนความเสี่ยง (Risk Register)', priority: 1 },
  '6.2': { action: 'ตั้งวัตถุประสงค์คุณภาพที่วัดได้ + แผนบรรลุ (SMART)', keyDoc: 'ตารางวัตถุประสงค์คุณภาพ', priority: 1, mandatoryDoc: true },
  '6.3': { action: 'วางแผนการเปลี่ยนแปลงระบบอย่างเป็นระบบ', keyDoc: 'แผนบริหารการเปลี่ยนแปลง', priority: 3 },
  '7.1': { action: 'จัดสรรทรัพยากร (คน/เครื่องมือ/สภาพแวดล้อม/สอบเทียบ)', keyDoc: 'ทะเบียนเครื่องมือ + ใบสอบเทียบ', priority: 2 },
  '7.2': { action: 'กำหนดความสามารถที่ต้องมี + ฝึกอบรม + ประเมินผล', keyDoc: 'ประวัติอบรม + Training Matrix', priority: 2 },
  '7.3': { action: 'สร้างความตระหนักเรื่องคุณภาพให้พนักงาน', keyDoc: 'บันทึกการสื่อสาร/อบรม awareness', priority: 3 },
  '7.4': { action: 'กำหนดช่องทางสื่อสารภายใน/ภายนอก', keyDoc: 'แผนการสื่อสาร', priority: 3 },
  '7.5': { action: 'ควบคุมเอกสาร/บันทึก (สร้าง/อนุมัติ/แก้ไข/เก็บ)', keyDoc: 'ระเบียบควบคุมเอกสาร + Master List', priority: 1, mandatoryDoc: true },
  '8.1': { action: 'วางแผนและควบคุมการปฏิบัติงานจริง', keyDoc: 'แผนการผลิต/ให้บริการ', priority: 2 },
  '8.2': { action: 'ทบทวนข้อกำหนดลูกค้าก่อนรับงาน + สื่อสารลูกค้า', keyDoc: 'ใบทบทวนคำสั่งซื้อ/สัญญา', priority: 2 },
  '8.3': { action: 'ควบคุมการออกแบบและพัฒนา (ถ้ามี — ไม่มีให้ทำข้อยกเว้น)', keyDoc: 'บันทึกออกแบบ/หมายเหตุข้อยกเว้น', priority: 3 },
  '8.4': { action: 'ประเมิน/คัดเลือก/ควบคุมผู้ขายภายนอก', keyDoc: 'ทะเบียนผู้ขาย + ผลประเมิน (AVL)', priority: 2 },
  '8.5': { action: 'ควบคุมการผลิต/บริการ + ชี้บ่ง/สอบกลับ/ทรัพย์สินลูกค้า', keyDoc: 'บันทึกการผลิต + ป้ายชี้บ่ง', priority: 2 },
  '8.6': { action: 'ตรวจปล่อยสินค้า/บริการตามเกณฑ์ก่อนส่งมอบ', keyDoc: 'บันทึกการตรวจปล่อย (QC Release)', priority: 2 },
  '8.7': { action: 'ควบคุมของที่ไม่เป็นไปตามข้อกำหนด (แยก/ตัดสิน)', keyDoc: 'บันทึก Nonconforming Output', priority: 1, mandatoryDoc: true },
  '9.1': { action: 'เก็บ/วิเคราะห์ข้อมูล + วัดความพึงพอใจลูกค้า', keyDoc: 'รายงานชี้วัด + ผลสำรวจลูกค้า', priority: 1 },
  '9.2': { action: 'ทำ Internal Audit ตามแผน + รายงานผล', keyDoc: 'แผน+รายงานตรวจติดตามภายใน', priority: 1, mandatoryDoc: true },
  '9.3': { action: 'ประชุมทบทวนฝ่ายบริหาร (Management Review) ครบวาระ', keyDoc: 'รายงานประชุมทบทวนฝ่ายบริหาร', priority: 1, mandatoryDoc: true },
  '10.1': { action: 'ระบุโอกาสปรับปรุงอย่างต่อเนื่อง', keyDoc: 'บันทึกกิจกรรมปรับปรุง', priority: 3 },
  '10.2': { action: 'จัดการข้อบกพร่อง + แก้ไขที่รากเหง้า (CAR)', keyDoc: 'บันทึกการแก้ไข (Corrective Action)', priority: 1, mandatoryDoc: true },
  '10.3': { action: 'พัฒนาระบบให้ดีขึ้นต่อเนื่อง (Kaizen/PDCA)', keyDoc: 'แผนพัฒนาต่อเนื่อง', priority: 3 },
};

export interface GapAction {
  id: string;
  title: string;      // ชื่อ clause
  status: ISOStatus;
  action: string;
  keyDoc: string;
  priority: 1 | 2 | 3;
  mandatoryDoc: boolean;
}

export interface ReadinessResult {
  readiness: number;         // % (green / applicable)
  applicable: number;
  green: number; amber: number; red: number; na: number;
  level: 'ready' | 'almost' | 'progress' | 'early';
  levelLabel: string;
  prioritizedActions: GapAction[];   // สิ่งที่ต้องทำก่อน (red/amber เรียงตามความสำคัญ)
  mandatoryDocsMissing: string[];    // เอกสารบังคับที่ยังไม่ green
}

const STATUS_RANK: Record<ISOStatus, number> = { red: 0, amber: 1, green: 2, na: 3 };

/** ประเมินความพร้อม + ลิสต์สิ่งที่ต้องทำก่อน audit จากสถานะ clause จริง */
export function assessReadiness(clauses: ISOClauseCheck[]): ReadinessResult {
  const green = clauses.filter(c => c.status === 'green').length;
  const amber = clauses.filter(c => c.status === 'amber').length;
  const red = clauses.filter(c => c.status === 'red').length;
  const na = clauses.filter(c => c.status === 'na').length;
  const applicable = clauses.length - na;
  const readiness = applicable > 0 ? Math.round((green / applicable) * 100) : 0;

  let level: ReadinessResult['level'] = 'early';
  let levelLabel = 'เริ่มต้น — วางรากฐานระบบ';
  if (readiness >= 85) { level = 'ready'; levelLabel = 'พร้อมขอ Certify — นัด Stage 2 audit ได้'; }
  else if (readiness >= 60) { level = 'almost'; levelLabel = 'ใกล้พร้อม — อุดช่องว่างที่เหลือก่อนตรวจ'; }
  else if (readiness >= 30) { level = 'progress'; levelLabel = 'กำลังไปได้ดี — เร่งเอกสารบังคับ'; }

  const gaps = clauses
    .filter(c => c.status === 'red' || c.status === 'amber')
    .map<GapAction>(c => {
      const g = ISO_CLAUSE_GUIDE[c.id];
      return {
        id: c.id, title: c.title, status: c.status,
        action: g?.action ?? 'ทบทวนความสอดคล้องของข้อกำหนดนี้',
        keyDoc: g?.keyDoc ?? '—',
        priority: g?.priority ?? 2,
        mandatoryDoc: !!g?.mandatoryDoc,
      };
    })
    .sort((a, b) =>
      a.priority - b.priority ||
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      a.id.localeCompare(b.id, undefined, { numeric: true })
    );

  const mandatoryDocsMissing = clauses
    .filter(c => ISO_CLAUSE_GUIDE[c.id]?.mandatoryDoc && c.status !== 'green' && c.status !== 'na')
    .map(c => ISO_CLAUSE_GUIDE[c.id].keyDoc);

  return { readiness, applicable, green, amber, red, na, level, levelLabel, prioritizedActions: gaps, mandatoryDocsMissing };
}
