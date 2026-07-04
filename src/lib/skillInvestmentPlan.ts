import type { AppData } from '../types';
import { getCompanyLevel, companyXP } from './gamification';

/* ===== แผนลงทุน "ทักษะ" ตามช่วงการเติบโตของธุรกิจ (HRD + CEO เสนอบอร์ด) =====
 * อ้างอิงคลังทักษะ AI Flow (501 ทักษะ · 20 หมวด) ใน Google Drive ของ Board
 * HRD จับคู่หมวดทักษะที่จำเป็นในแต่ละช่วง → CEO สรุปเสนอบอร์ดพิจารณาลงทุนซื้อ + ราคา (Price Analysis) */

export interface StagePlan {
  rank: string; badge: string; label: string;
  focus: string;
  categories: { name: string; count: number; why: string }[];
}

/** จำนวนทักษะต่อหมวดในคลัง AI Flow (จากไดเรกทอรีจริง) */
export const AIFLOW_CATEGORIES: Record<string, number> = {
  'เนื้อหา & คอปปี้': 56, 'อีเมล & Automation': 42, 'โซเชียลมีเดีย': 38,
  'ขาย & Funnel': 30, 'กฎหมาย & Compliance': 30, 'ปฏิบัติการ & ระบบ': 30,
  'การเงิน & ตั้งราคา': 28, 'HR & ทีม': 28, 'แบรนด์ & ดีไซน์': 24,
  'อีเวนต์ & การพูด': 24, 'เปิดตัว & เติบโต': 24, 'อีคอมเมิร์ซ & สินค้า': 24,
  'โฆษณา & Paid Media': 22, 'วิเคราะห์ & ข้อมูล': 22, 'SEO & ค้นหา': 20,
  'คอร์ส & การศึกษา': 20, 'ลูกค้า & ที่ปรึกษา': 18, 'เฉพาะอุตสาหกรรม': 15,
  'AI & เทคโนโลยี': 4, 'Nonprofit & ชุมชน': 2,
};
export const AIFLOW_TOTAL = 501;

/** แผนทักษะที่ HRD แนะนำต่อช่วงการเติบโต */
export const STAGE_PLANS: StagePlan[] = [
  { rank: 'Starter', badge: '🌱', label: 'หมู่บ้านสตาร์ทอัป', focus: 'วางรากฐาน — มีตัวตน ขายเป็น เก็บเงินเป็น',
    categories: [
      { name: 'แบรนด์ & ดีไซน์', count: 24, why: 'สร้างตัวตน โลโก้ โทนแบรนด์ ให้ลูกค้าจดจำ' },
      { name: 'เนื้อหา & คอปปี้', count: 56, why: 'เขียนหน้าเว็บ/โพสต์/คำอธิบายสินค้าให้ขายได้' },
      { name: 'การเงิน & ตั้งราคา', count: 28, why: 'ตั้งราคา ทำงบ คุมกระแสเงินสดตั้งแต่วันแรก' },
      { name: 'ปฏิบัติการ & ระบบ', count: 30, why: 'วาง SOP งานประจำ ลดความผิดพลาด' },
    ] },
  { rank: 'Growing', badge: '🌿', label: 'ชุมชนกำลังโต', focus: 'หาลูกค้า — เปิดช่องทางการตลาดที่วัดผลได้',
    categories: [
      { name: 'โซเชียลมีเดีย', count: 38, why: 'สร้างการรับรู้ + ผู้ติดตามเป็นฐานลูกค้า' },
      { name: 'SEO & ค้นหา', count: 20, why: 'ให้ลูกค้าเจอเราบน Google โดยไม่ต้องจ่ายค่าโฆษณา' },
      { name: 'อีเมล & Automation', count: 42, why: 'ดูแลลูกค้าเก่า + ปิดการขายอัตโนมัติ' },
      { name: 'ขาย & Funnel', count: 30, why: 'ออกแบบเส้นทางปิดการขายให้ conversion สูงขึ้น' },
    ] },
  { rank: 'Professional', badge: '⭐', label: 'เมืองมืออาชีพ', focus: 'ขยายด้วยข้อมูล — ยิงแอดคุ้ม + ตัดสินใจจากตัวเลข',
    categories: [
      { name: 'โฆษณา & Paid Media', count: 22, why: 'เร่งการเติบโตด้วยงบโฆษณาที่คุม ROI ได้' },
      { name: 'วิเคราะห์ & ข้อมูล', count: 22, why: 'วัดผลทุกช่องทาง ตัดสินใจจาก data ไม่ใช่ความรู้สึก' },
      { name: 'ลูกค้า & ที่ปรึกษา', count: 18, why: 'ยกระดับบริการ/รักษาลูกค้ามูลค่าสูง' },
      { name: 'เปิดตัว & เติบโต', count: 24, why: 'เปิดตัวสินค้า/แคมเปญให้ปัง' },
    ] },
  { rank: 'Advanced', badge: '🏆', label: 'นครธุรกิจ', focus: 'เพิ่มสายรายได้ + วางระบบกำกับ',
    categories: [
      { name: 'อีคอมเมิร์ซ & สินค้า', count: 24, why: 'เปิดร้านออนไลน์/ขยายไลน์สินค้า' },
      { name: 'คอร์ส & การศึกษา', count: 20, why: 'สร้างรายได้จากความรู้ (digital product)' },
      { name: 'อีเวนต์ & การพูด', count: 24, why: 'สร้างแบรนด์ผู้นำ + หาลูกค้าองค์กร' },
      { name: 'กฎหมาย & Compliance', count: 30, why: 'สัญญา/ข้อกำหนด/PDPA ให้โตอย่างปลอดภัย' },
    ] },
  { rank: 'Elite', badge: '👑', label: 'มหานคร AI', focus: 'ขยายองค์กร + ระบบอัตโนมัติเต็มรูปแบบ',
    categories: [
      { name: 'HR & ทีม', count: 28, why: 'จ้าง/พัฒนา/รักษาทีม เมื่อองค์กรใหญ่ขึ้น' },
      { name: 'ปฏิบัติการ & ระบบ', count: 30, why: 'ทำให้ทุกกระบวนการเป็นระบบ ทำซ้ำได้' },
      { name: 'AI & เทคโนโลยี', count: 4, why: 'ผสาน AI/automation ลดต้นทุนแรงงาน' },
      { name: 'เฉพาะอุตสาหกรรม', count: 15, why: 'ทักษะเชิงลึกเฉพาะสายธุรกิจ' },
    ] },
];

/** ช่วงการเติบโตปัจจุบันของบริษัท */
export function currentStage(d: AppData): StagePlan {
  const rank = getCompanyLevel(companyXP(d)).rank;
  return STAGE_PLANS.find(s => s.rank === rank) ?? STAGE_PLANS[0];
}

/* ===== Price Analysis — แพ็กทักษะ (value-based, positioning สำหรับ SME ไทย) =====
 * อ้างอิง pricing-analysis: ตั้งราคาตาม "คุณค่า" ไม่ใช่ต้นทุน · 3 แพ็กตามช่วง + Full Bundle เป็น anchor
 * เทียบคู่แข่ง bundle ต่างประเทศ ~$30–50 (~฿1,000–1,800) · ของเรารวมภาษาไทย + ใช้ในระบบ CEO AI */
export interface SkillPack {
  id: string; name: string; skills: number; priceTHB: number; forStage: string; note: string;
}
export const SKILL_PACKS: SkillPack[] = [
  { id: 'foundation', name: 'Foundation Pack (วางรากฐาน)', skills: 138, priceTHB: 590, forStage: 'Starter',
    note: 'แบรนด์+คอปปี้+การเงิน+ระบบ — เริ่มธุรกิจให้ครบ' },
  { id: 'growth', name: 'Growth Pack (หาลูกค้า)', skills: 130, priceTHB: 1290, forStage: 'Growing',
    note: 'โซเชียล+SEO+อีเมล+Funnel — เปิดช่องทางรายได้' },
  { id: 'scale', name: 'Scale Pack (ขยายด้วยข้อมูล)', skills: 86, priceTHB: 1990, forStage: 'Professional–Advanced',
    note: 'แอด+วิเคราะห์+อีคอมเมิร์ซ+กฎหมาย — โตแบบมืออาชีพ' },
  { id: 'full', name: 'Full Bundle (501 ทักษะ) ⭐ คุ้มสุด', skills: 501, priceTHB: 3900, forStage: 'ทุกช่วง',
    note: 'ครบ 20 หมวด — anchor ราคา, ต่อทักษะเฉลี่ย < ฿8' },
];

/* ===== Competitor Analysis + Promotion (แข่งกับคู่แข่ง) =====
 * อ้างอิง competitor-analysis + pricing-analysis: หา gap แล้ววาง positioning ที่คู่แข่งไม่มี */
export interface Competitor { name: string; price: string; gap: string; }
export const COMPETITORS: Competitor[] = [
  { name: 'Skill bundle ต่างประเทศ (Gumroad ฯลฯ)', price: '~$30–50 (฿1,000–1,800)',
    gap: 'ภาษาอังกฤษล้วน · เป็นไฟล์เฉยๆ ไม่มีระบบรัน/ทีม AI ให้ใช้จริง' },
  { name: 'คอร์สการตลาด/ที่ปรึกษาไทย', price: '฿3,900–50,000',
    gap: 'จ่ายครั้งเดียวได้ความรู้ แต่ไม่มีเครื่องมือทำงานอัตโนมัติต่อ' },
  { name: 'ทำเอง / จ้างฟรีแลนซ์ต่องาน', price: '฿500–2,000/งาน',
    gap: 'ช้า ควบคุมคุณภาพยาก ต้นทุนสะสมสูงเมื่อทำหลายงาน' },
];

/** จุดต่างของเรา (ที่คู่แข่งตามยาก) */
export const OUR_EDGE = [
  'ทักษะภาษาไทย + ใช้ในระบบ CEO AI ได้ทันที (ไม่ใช่แค่ไฟล์)',
  'AI Agent (CFO/CMO/HRD) หยิบทักษะไปทำงานจริง + รายงานบอร์ด',
  'ผูกกับการเงิน/เมืองบริษัท/ตลาด B2B ในที่เดียว',
  'ที่ปรึกษาธุรกิจไทยกว่า 20 ปีอยู่เบื้องหลัง',
];

export interface Promo { name: string; detail: string; }
export const PROMOTIONS: Promo[] = [
  { name: '🎁 Early Bird เปิดตัว −40%', detail: 'Full Bundle ฿3,900 → ฿2,340 (100 สิทธิ์แรก) สร้างแรงกระเพื่อมช่วงเปิดตัว' },
  { name: '📦 Bundle + แพ็กเกจ', detail: 'สมัคร Growth/Scale รับ Foundation Pack ฟรี (เพิ่ม perceived value ลด churn)' },
  { name: '🔓 ปลดตามช่วงเมือง', detail: 'เมืองโตถึง Professional ปลดส่วนลด Scale Pack −25% (ผูกกับ gamification)' },
  { name: '🤝 แนะนำเพื่อน', detail: 'แนะนำ 1 บริษัทที่จ่ายเงิน รับคูปอง ฿300 ทั้งสองฝ่าย (viral loop)' },
];
