// roiCompare.ts — ROI อย่างง่ายบน Landing: คำนวณผลตอบแทน แล้ว "เทียบกับค่าสมัครแพ็กเรา"
// ตอบคำถามเจ้าของร้าน: "จ่ายค่าระบบเดือนละ ฿X แล้วคุ้มไหม?" · pure + tested · ไม่การันตี (แสดงสมมติฐาน)
import { roiEstimate, type RoiInput } from './marketDemandSupply';
import { PLAN_PRICE_NUM } from './access';
import type { PlanId } from '../types';

export interface RoiCompareResult {
  currentMonthly: number;   // ยอดตอนนี้/เดือน
  extraMonthly: number;     // ยอดเพิ่มที่คาดได้/เดือน
  planCost: number;         // ค่าสมัครแพ็ก/เดือน
  netGain: number;          // ได้เพิ่มสุทธิหลังหักค่าระบบ
  timesOverCost: number;    // ได้เพิ่มเป็นกี่เท่าของค่าระบบ
  breakEvenOrders: number;  // ต้องได้กี่ออร์เดอร์เพิ่มถึงคุ้มค่าระบบ
  worth: boolean;
  verdict: string;          // บทวิเคราะห์สั้น (rule-based, ซื่อสัตย์)
}

/** คำนวณ ROI + เทียบค่าสมัครแพ็ก (default Growth ฿1,490) */
export function roiCompare(inp: RoiInput & { plan?: PlanId }): RoiCompareResult {
  const est = roiEstimate(inp);
  const plan: PlanId = inp.plan ?? 'growth';
  const planCost = PLAN_PRICE_NUM[plan] ?? 1490;
  const ticket = Math.max(0, inp.avgTicket || 0);
  const netGain = est.extraMonthly - planCost;
  const timesOverCost = planCost > 0 ? Math.round((est.extraMonthly / planCost) * 10) / 10 : 0;
  const breakEvenOrders = ticket > 0 ? Math.ceil(planCost / ticket) : 0;
  const worth = est.extraMonthly > planCost;

  let verdict: string;
  if (est.currentMonthly === 0 || est.extraMonthly === 0) {
    verdict = 'กรอกตัวเลขร้านคุณ แล้วระบบจะประเมินให้ว่าคุ้มค่าสมัครไหม';
  } else if (worth) {
    verdict = `ถ้าได้ออร์เดอร์เพิ่มตามนี้ ค่าระบบ ฿${planCost.toLocaleString()}/เดือน คืนทุนแค่ ~${breakEvenOrders} ออร์เดอร์ ` +
      `ที่เหลือเป็นกำไรเพิ่ม (ประเมิน +฿${est.extraMonthly.toLocaleString()} = ~${timesOverCost} เท่าของค่าระบบ)`;
  } else {
    verdict = `ถ้าได้เพิ่มแค่นี้ ยังไม่คุ้มค่าระบบ ฿${planCost.toLocaleString()} — ต้องได้ออร์เดอร์เพิ่มอย่างน้อย ~${breakEvenOrders} ` +
      `ออร์เดอร์/เดือนถึงคุ้ม (เริ่มแพ็กฟรีก่อนได้)`;
  }

  return { currentMonthly: est.currentMonthly, extraMonthly: est.extraMonthly, planCost, netGain, timesOverCost, breakEvenOrders, worth, verdict };
}
