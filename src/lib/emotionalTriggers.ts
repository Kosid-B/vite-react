import type { AppData } from '../types';
import { companyXP, getCompanyLevel, ACHIEVEMENTS } from './gamification';
import { financeSummary } from './finance';

/* ===== Emotional Triggers — สร้างอารมณ์เชื่อมกับการกระทำทันที =====
 * ตรวจจับ "โมเมนต์สำคัญ" ที่ผู้ใช้ 'เพิ่งข้าม' (prev → next) แล้วยิงการฉลอง/ให้กำลังใจทันที
 * หลักจิตวิทยา: feedback ทันที (dopamine) + ยืนยันตัวตน (identity) + ความภูมิใจ (pride) + โมเมนตัม
 * ใช้ที่ updateData ส่วนกลาง — ทุกการกระทำที่ทำให้ธุรกิจก้าวหน้าจะได้ payoff ทางอารมณ์ทันที */

export type Tone = 'triumph' | 'milestone' | 'encourage';

export interface EmotionalMoment {
  id: string;
  emoji: string;
  title: string;
  message: string;
  tone: Tone;          // คุมสี/ความเข้มของการฉลอง
}

const closedDeals = (d: AppData) => (d.marketplace?.deals ?? []).filter(x => x.status === 'closed').length;
const doneTasks = (d: AppData) => d.aiCompany.tasks.filter(t => t.status === 'done').length;

/**
 * คืน "โมเมนต์อารมณ์" ที่มีลำดับความสำคัญสูงสุดที่เพิ่งเกิดขึ้น (prev → next)
 * คืน null ถ้าไม่มีเหตุการณ์สำคัญ (การกระทำทั่วไป)
 */
export function detectEmotionalMoment(prev: AppData, next: AppData): EmotionalMoment | null {
  // 1) เลื่อนระดับบริษัท (Level up) — ชัยชนะสูงสุด
  const lvPrev = getCompanyLevel(companyXP(prev));
  const lvNext = getCompanyLevel(companyXP(next));
  if (lvNext.rank !== lvPrev.rank && companyXP(next) > companyXP(prev)) {
    return { id: `levelup-${lvNext.rank}`, emoji: lvNext.badge, tone: 'triumph',
      title: `เลื่อนระดับเป็น ${lvNext.rank}!`,
      message: 'ทุกก้าวที่คุณลงมือ กำลังสร้างธุรกิจจริงขึ้นมา — ไปต่อกันเลย 🚀' };
  }

  // 2) ปลดล็อกเหรียญใหม่ (Badge) — ความภูมิใจ
  const newBadge = ACHIEVEMENTS.find(a => !a.earned(prev) && a.earned(next));
  if (newBadge) {
    return { id: `badge-${newBadge.id}`, emoji: newBadge.icon, tone: 'triumph',
      title: `ปลดล็อก "${newBadge.label}"!`,
      message: `${newBadge.desc} — คุณทำได้จริง ไม่ใช่แค่ฝัน 🏆` };
  }

  const finPrev = financeSummary(prev);
  const finNext = financeSummary(next);

  // 3) รายได้ก้อนแรก — จุดเปลี่ยนทางอารมณ์ที่ทรงพลังที่สุดของ SME
  if (!finPrev.hasRevenue && finNext.hasRevenue) {
    return { id: 'first-revenue', emoji: '💰', tone: 'triumph',
      title: 'รายได้ก้อนแรกมาแล้ว!',
      message: 'นี่คือหลักฐานว่ามีคนพร้อมจ่ายให้คุณจริง ๆ — ธุรกิจของคุณเริ่มแล้ว 🎉' };
  }

  // 4) ทำกำไร (รายได้ ≥ รายจ่าย)
  if (!finPrev.breakEven && finNext.breakEven) {
    return { id: 'break-even', emoji: '📈', tone: 'milestone',
      title: 'ธุรกิจทำกำไรแล้ว!',
      message: 'รายได้แซงรายจ่ายสำเร็จ — คุณข้ามเส้นที่ SME ส่วนใหญ่ไปไม่ถึง' };
  }

  // 5) ปิดดีลแรก — ลูกค้าจริงคนแรก
  if (closedDeals(prev) === 0 && closedDeals(next) >= 1) {
    return { id: 'first-deal', emoji: '🤝', tone: 'triumph',
      title: 'ปิดดีลแรกสำเร็จ!',
      message: 'ลูกค้าจริงคนแรกของคุณ — จากนี้คือการทำซ้ำให้เก่งขึ้น 💪' };
  }

  // 6) Mission อนุมัติ — เป้าหมายชัด
  if (!prev.aiCompany.missionApproved && next.aiCompany.missionApproved) {
    return { id: 'mission-approved', emoji: '🧭', tone: 'milestone',
      title: 'Mission ได้รับอนุมัติ!',
      message: 'บริษัทของคุณมีทิศทางชัดเจนแล้ว — ทีม AI พร้อมลงมือตามเป้า' };
  }

  // 7) จ้างเอเจนต์ตัวแรก — ก้าวแรกของการมีทีม
  if (prev.aiCompany.agents.length === 0 && next.aiCompany.agents.length >= 1) {
    return { id: 'first-hire', emoji: '🎊', tone: 'encourage',
      title: 'คุณมีทีมงานคนแรกแล้ว!',
      message: 'จากคนเดียว สู่การมีทีม AI ช่วยขับเคลื่อน — เริ่มต้นที่ยิ่งใหญ่' };
  }

  // 8) โมเมนตัมรายวัน (streak) ที่หมุดสำคัญ
  const sPrev = prev.streak?.count ?? 0;
  const sNext = next.streak?.count ?? 0;
  if (sNext > sPrev && [3, 7, 14, 30, 60, 100].includes(sNext)) {
    return { id: `streak-${sNext}`, emoji: '🔥', tone: 'encourage',
      title: `ทำงานต่อเนื่อง ${sNext} วัน!`,
      message: 'ความสม่ำเสมอคือสิ่งที่แยกผู้ชนะออกจากคนทั่วไป — รักษาไฟนี้ไว้' };
  }

  // 9) งานเสร็จชิ้นแรกของทีม
  if (doneTasks(prev) === 0 && doneTasks(next) >= 1) {
    return { id: 'first-task', emoji: '✅', tone: 'encourage',
      title: 'ทีม AI ส่งงานชิ้นแรกแล้ว!',
      message: 'เห็นไหม — งานเดินได้จริงแม้คุณไม่ต้องทำเองทุกอย่าง' };
  }

  return null;
}
