import type { AppData } from '../types';
import { currentStage } from './skillInvestmentPlan';

/* ===== HRD เสนอแผนพัฒนาองค์กร (Training & Development) ผ่านสายงาน → CEO → บอร์ด =====
 * ช่องว่างทักษะจากช่วงการเติบโต → เส้นทางเรียนรู้ 30/60/90 วัน + งบ + ตัวชี้วัด (กรอบ training-plan) */

const PER_HEAD_MIN = 5000, PER_HEAD_MAX = 15000;

export function trainingPlanText(d: AppData): string {
  const s = currentStage(d);
  const team = d.aiCompany?.agents ?? [];
  const n = Math.max(1, team.length);
  const L: string[] = [];
  L.push('📚 HRD เสนอแผนพัฒนาองค์กร (Training & Development) — ผ่าน CEO เสนอบอร์ดพิจารณาอนุมัติ');
  L.push(`ช่วงองค์กร: ${s.badge} ${s.label} (${s.rank}) · ทีม ${team.length} ตำแหน่ง · โฟกัส: ${s.focus}`);
  L.push('');
  L.push('1) ช่องว่างทักษะที่ต้องพัฒนา (ตามช่วงการเติบโต):');
  s.categories.forEach(c => L.push(`   • ${c.name} — ${c.why}`));
  L.push('');
  L.push('2) เส้นทางเรียนรู้ 30/60/90 วัน (Blended):');
  L.push('   • เดือน 1 (Foundation): E-learning ทักษะหลัก + Workshop เครื่องมือ/ระบบ');
  L.push('   • เดือน 2 (Application): มอบงานจริงประยุกต์ทักษะ + Peer coaching');
  L.push('   • เดือน 3 (Mastery): ประเมินผล (portfolio/ทดสอบ) + วัด behavior change ในงานจริง');
  L.push('');
  L.push('3) รูปแบบการเรียนรู้: E-learning + Workshop + On-the-Job + Mentoring (ผสม)');
  L.push('');
  L.push(`4) งบประมาณ: ฿${PER_HEAD_MIN.toLocaleString('th-TH')}–฿${PER_HEAD_MAX.toLocaleString('th-TH')}/คน/ปี`);
  L.push(`   รวมประมาณ ฿${(PER_HEAD_MIN * n).toLocaleString('th-TH')}–฿${(PER_HEAD_MAX * n).toLocaleString('th-TH')} (${n} ตำแหน่ง)`);
  L.push('');
  L.push('5) ตัวชี้วัดความสำเร็จ:');
  L.push('   • อัตราจบหลักสูตร 100% · ผ่านประเมิน ≥ 80% · ยกระดับสมรรถนะ +1 ระดับ ใน 90 วัน');
  L.push('');
  L.push('จึงเรียนเสนอบอร์ดพิจารณาอนุมัติงบและแผนพัฒนาองค์กรตามลำดับสายงาน (HRD → CEO → บอร์ด)');
  return L.join('\n');
}
