import type { AppData } from '../types';
import { currentStage } from './skillInvestmentPlan';

/* ===== HRD สร้างแผน Onboarding 30/60/90 วัน ให้สมาชิกใหม่ (ราย role) =====
 * "90 วันแรกทำนาย 3 ปีถัดไป" — Day 1 checklist + Week 1 + ไมล์สโตน 30/60/90 + เกณฑ์ผ่าน
 * ผูกกับช่วงการเติบโตของบริษัท (currentStage) และ buddy = หัวหน้าสาย/CEO */

/** buddy (พี่เลี้ยง) ที่เหมาะกับ role ใหม่ — เลือกจาก C-level ที่เกี่ยวข้อง ไม่ก็ CEO */
export function pickBuddy(d: AppData, roleName: string): string {
  const agents = d.aiCompany?.agents ?? [];
  const r = roleName.toLowerCase();
  // จับคู่สายงานคร่าว ๆ
  const line = /market|ตลาด|sale|ขาย|cmo/.test(r) ? /cmo/i
    : /fin|บัญชี|การเงิน|cfo/.test(r) ? /cfo/i
    : /tech|dev|วิศวก|cto|it/.test(r) ? /cto/i
    : /oper|ผลิต|coo/.test(r) ? /coo/i
    : /hr|บุคคล/.test(r) ? /ceo/i
    : /cxo|c[a-z]o/i;
  const lead = agents.find(a => line.test(a.role) && !new RegExp(roleName, 'i').test(a.role));
  const ceo = agents.find(a => /ceo/i.test(a.role)) ?? agents[0];
  return lead ? `${lead.role} · ${lead.name}` : ceo ? `${ceo.role} · ${ceo.name}` : 'หัวหน้าทีม';
}

/** แผน onboarding 30/60/90 วัน ของ role ที่ระบุ */
export function onboardingPlanText(d: AppData, roleName: string): string {
  const c = d.aiCompany;
  const s = currentStage(d);
  const buddy = pickBuddy(d, roleName);
  const L: string[] = [];
  L.push(`🧭 แผน Onboarding 30/60/90 วัน — ตำแหน่ง ${roleName}`);
  L.push(`บริษัท: ${c?.name || '-'} (${c?.industry || 'ไม่ระบุ'}) · ช่วง ${s.badge} ${s.label} · โฟกัส: ${s.focus}`);
  L.push(`พี่เลี้ยง (Buddy): ${buddy}`);
  L.push('หลักการ: 90 วันแรกทำนาย 3 ปีถัดไป — สมาชิกที่หลงทางในสัปดาห์แรก เริ่มมองหางานใหม่ในเดือน 3');
  L.push('');
  L.push('■ Day 1 (IT & Admin):');
  L.push('   ☐ ตั้งค่าบัญชี/สิทธิ์เข้าระบบ (workspace, เครื่องมือที่ต้องใช้)');
  L.push('   ☐ แนะนำตัวกับทีม + รับ mission/ค่านิยมบริษัทจาก CEO');
  L.push(`   ☐ นัดพบพี่เลี้ยง (${buddy}) ครั้งแรก + ช่องทางถามด่วน`);
  L.push('   ☐ เอกสาร HR + ผู้ติดต่อฉุกเฉิน');
  L.push('');
  L.push('■ สัปดาห์แรก:');
  L.push('   • เข้าใจ mission/ค่านิยม/กลยุทธ์บริษัท + โครงสร้างทีมและบทบาทแต่ละคน');
  L.push('   • เงาติดตาม (shadow) ประชุม/เวิร์กโฟลว์สำคัญ + ตั้งค่าเครื่องมือครบ');
  L.push('');
  L.push('■ 30 วัน — เรียนรู้ภูมิทัศน์ (Learn the Landscape):');
  L.push('   ☐ อ่านกลยุทธ์/OKR + ผลไตรมาสก่อน · 1:1 กับเพื่อนร่วมงานข้ามสาย ≥5 คน');
  L.push('   ☐ ทบทวนกระบวนการ/เครื่องมือ/เอกสาร + จบ training บังคับ (สินค้า/ความปลอดภัย/compliance)');
  L.push('   เกณฑ์ผ่าน: อธิบายได้ว่าบริษัททำอะไร + ตำแหน่งนี้ช่วยอย่างไร · รู้ว่าถามใครเรื่องอะไร · เจอ 1 quick win');
  L.push('');
  L.push('■ 60 วัน — เริ่มสร้างผลงาน (Start Contributing):');
  L.push('   ☐ ส่งงานอิสระชิ้นแรก · เสนอปรับปรุงกระบวนการ 1 อย่าง · รับผิดชอบ KPI ที่กำหนด');
  L.push('   ☐ ตั้งจังหวะ 1:1 กับหัวหน้าสม่ำเสมอ');
  L.push('   เกณฑ์ผ่าน: งานชิ้นแรกเสร็จตรงเวลา/ได้มาตรฐาน · หัวหน้าประเมิน "on track" · ทำงานเองได้รายวัน');
  L.push('');
  L.push('■ 90 วัน — เต็มประสิทธิภาพ (Full Productivity):');
  L.push('   ☐ ประเมินผลงานครั้งแรกกับหัวหน้า · ร่วมวางแผน/กลยุทธ์ทีม · ช่วยโค้ชสมาชิกที่ใหม่กว่า');
  L.push('   ☐ ทบทวน/อัปเดตเอกสาร onboarding ของตัวเอง (ส่งต่อรุ่นถัดไป)');
  L.push('   เกณฑ์ผ่าน: KPI มุ่งสู่เป้า · เพื่อนร่วมงานให้ฟีดแบ็กบวก · ตั้งเป้าพัฒนา 6 เดือนถัดไปชัด');
  L.push('');
  L.push('จึงเรียนเสนอผ่านสายงาน HRD → CEO เพื่อใช้เป็นแผนรับสมาชิกใหม่มาตรฐานของบริษัท');
  return L.join('\n');
}
