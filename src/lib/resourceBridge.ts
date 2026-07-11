import type { AppData, FinanceEntry } from '../types';
import { applyApproval, rejectRequest, type ResourceRequest, type ResourcesState } from './resources';
import type { BoardDecision } from './boardRoom';

/** สะพานเชื่อม: คำขอทรัพยากร → ห้องบอร์ด (วาระ + XP) + การเงิน (รายจ่ายอัตโนมัติ)
 *  ตรรกะบริสุทธิ์ ทดสอบได้ — ใช้ร่วมกันทั้งหน้า Resources และ BoardRoom */

/** เกณฑ์ "คำขอก้อนใหญ่" = ผลกระทบงบ ≥ ฿10,000/เดือน → ต้องผ่านห้องบอร์ด */
export const BIG_REQUEST_THRESHOLD = 10000;
/** XP ทักษะบริหารที่ได้เมื่อบอร์ดอนุมัติคำขอทรัพยากรก้อนใหญ่ */
export const RESOURCE_BOARD_XP = 20;

/** ผลกระทบงบของคำขอ (บาท/เดือน) — unitCost × amount (0 ถ้าไม่มีต้นทุน) */
export function requestCost(state: ResourcesState, req: ResourceRequest): number {
  const unitCost = req.type === 'new'
    ? (req.unitCost ?? 0)
    : (state.items.find((r) => r.id === req.resourceId)?.unitCost ?? 0);
  return unitCost * req.amount;
}

/** คำขอก้อนใหญ่ไหม (เพิ่ม/ใหม่ ที่กระทบงบถึงเกณฑ์) — reduce ไม่นับเป็นก้อนใหญ่ */
export function isBigRequest(state: ResourcesState, req: ResourceRequest): boolean {
  if (req.type === 'reduce') return false;
  return requestCost(state, req) >= BIG_REQUEST_THRESHOLD;
}

/** คำขอ pending ก้อนใหญ่ → ไปโผล่เป็นวาระในห้องบอร์ด */
export function bigPendingRequests(state: ResourcesState): ResourceRequest[] {
  return (state.requests ?? []).filter((q) => q.status === 'pending' && isBigRequest(state, q));
}

/** สร้างรายการรายจ่ายในระบบ finance เมื่ออนุมัติทรัพยากรที่มีต้นทุน (add/new) — reduce/ไม่มีต้นทุน = null */
export function financeEntryForApproval(state: ResourcesState, req: ResourceRequest, today: string): FinanceEntry | null {
  if (req.type === 'reduce') return null;
  const cost = requestCost(state, req);
  if (cost <= 0) return null;
  const name = req.type === 'new'
    ? (req.resourceName ?? 'ทรัพยากรใหม่')
    : (state.items.find((r) => r.id === req.resourceId)?.name ?? 'ทรัพยากร');
  return {
    id: 'res-fin-' + req.id,
    label: `ทรัพยากร: ${name} (+${req.amount})`,
    amount: cost,
    kind: 'expense',
    date: today,
    recurring: true,
  };
}

/** อนุมัติคำขอทรัพยากร (ใช้ร่วมทั้ง Resources และ BoardRoom):
 *  - ปรับจำนวนทรัพยากรจริง (applyApproval)
 *  - ไหลเข้าเป็นรายจ่ายใน finance อัตโนมัติ (ถ้ามีต้นทุน)
 *  - ถ้าอนุมัติผ่านห้องบอร์ด (viaBoard) → บันทึก decision + ให้ XP ทักษะบริหาร */
export function approveResourceRequest(data: AppData, reqId: string, opts: { viaBoard: boolean; today: string }): AppData {
  const state: ResourcesState = data.resources ?? { items: [], requests: [] };
  const req = state.requests.find((q) => q.id === reqId);
  if (!req || req.status !== 'pending') return data;

  const nextResources = applyApproval(state, reqId);
  const fin = financeEntryForApproval(state, req, opts.today);
  const finance = fin ? [fin, ...(data.finance ?? [])] : (data.finance ?? []);

  let boardRoom = data.boardRoom ?? { decisions: [] };
  if (opts.viaBoard) {
    const decision: BoardDecision = {
      itemId: 'res-req-' + reqId, status: 'approved', at: opts.today,
      xp: RESOURCE_BOARD_XP, track: 'business',
    };
    boardRoom = { decisions: [...boardRoom.decisions.filter((d) => d.itemId !== decision.itemId), decision] };
  }

  return { ...data, resources: nextResources, finance, boardRoom };
}

/** ปฏิเสธคำขอ (ใช้ร่วม) */
export function rejectResourceRequest(data: AppData, reqId: string): AppData {
  const state: ResourcesState = data.resources ?? { items: [], requests: [] };
  return { ...data, resources: rejectRequest(state, reqId) };
}
