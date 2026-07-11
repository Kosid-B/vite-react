import type { AppData } from '../types';

/** ห้องบอร์ด (Board Room) — CEO (AI) เสนอวาระให้บอร์ด/User อนุมัติ
 *  ทุกวาระมี "มินิบทเรียน" (concept + why + lesson) → อนุมัติแล้วได้สะสมทักษะ 2 สาย:
 *  บริหารธุรกิจ (business) + การตลาด (marketing) — governance ที่สอนไปในตัว */

export type SkillTrack = 'business' | 'marketing';
export type AgendaCategory = 'gate' | 'feature';
export type ItemStatus = 'approved' | 'rejected' | 'proposed' | 'locked';

export interface AgendaItem {
  id: string;
  title: string;
  category: AgendaCategory;   // gate = จุดตัดสินใจเชิงกลยุทธ์ (DE) · feature = ฟีเจอร์/ข้อมูล
  track: SkillTrack;
  xp: number;
  concept: string;            // ชื่อคอนเซ็ปต์ (เช่น "Beachhead Market")
  why: string;                // ทำไมบอร์ดต้องสนใจ + ทักษะที่ได้
  lesson: string;             // บทเรียนลงมือทำ 1 ประโยค
  goto?: string;              // PageId ไปดู/แก้ข้อมูล
  order: number;              // ลำดับ gate (feature = 99)
  requires?: string;          // ต้องอนุมัติ item นี้ก่อน (gate sequence)
  ready?: (d: AppData) => boolean; // ข้อมูลพร้อมเสนอไหม (ไม่ระบุ = พร้อมเสมอ)
}

export interface BoardDecision {
  itemId: string;
  status: 'approved' | 'rejected';
  at: string;
  note?: string;
}

export interface BoardRoomState {
  decisions: BoardDecision[];
}

export function defaultBoardRoom(): BoardRoomState {
  return { decisions: [] };
}

const hasPersonaData = (d: AppData) =>
  (d.personas ?? []).some((p) => (p.pains?.length ?? 0) > 0 && (p.search?.length ?? 0) > 0);

/** วาระทั้งหมด — 5 DE Decision Gates (WHO→VALUE→MONEY→PROOF→SCALE) + ฟีเจอร์/ข้อมูลสำคัญ */
export const AGENDA: AgendaItem[] = [
  // ── 5 Decision Gates (Disciplined Entrepreneurship) — ปลดล็อกตามลำดับ ──
  {
    id: 'gate-who', title: 'Gate 1 · WHO — ตลาดหัวหาด + ลูกค้า', category: 'gate', track: 'business', xp: 50, order: 1,
    concept: 'Beachhead Market & Persona (DE ข้อ 2, 5)',
    why: 'ทักษะบริหาร #1: เลือก "ตลาดเดียวที่ชนะได้ก่อน" — บริษัทตายเพราะพยายามขายทุกคน',
    lesson: 'ยืนยัน 1 กลุ่มเป้าหมายหลัก + persona ที่มาจากข้อมูลจริง ก่อนออกแบบสินค้า',
    goto: 'personas', ready: hasPersonaData,
  },
  {
    id: 'gate-value', title: 'Gate 2 · VALUE — คุณค่าที่วัดได้', category: 'gate', track: 'marketing', xp: 50, order: 2,
    concept: 'Quantified Value Proposition (DE ข้อ 8)',
    why: 'ทักษะการตลาด: บอกคุณค่าเป็น "ตัวเลข" (ประหยัด X บาท/ชม.) ไม่ใช่คำสวย ๆ',
    lesson: 'ระบุคุณค่าที่ลูกค้าได้เป็นตัวเลขเทียบก่อน-หลังใช้สินค้า',
    goto: 'bmc', requires: 'gate-who',
  },
  {
    id: 'gate-money', title: 'Gate 3 · MONEY — LTV > COCA', category: 'gate', track: 'business', xp: 60, order: 3,
    concept: 'Business Model · Pricing · LTV/COCA (DE ข้อ 15–19)',
    why: 'ทักษะบริหารสำคัญสุด: ธุรกิจอยู่รอดเมื่อ "มูลค่าลูกค้า (LTV) > ต้นทุนหาลูกค้า (COCA)"',
    lesson: 'ถ้า LTV ยังไม่มากกว่า COCA — ห้ามอนุมัติให้ scale เด็ดขาด',
    goto: 'roi', requires: 'gate-value',
  },
  {
    id: 'gate-proof', title: 'Gate 4 · PROOF — ลูกค้าจ่ายจริง', category: 'gate', track: 'marketing', xp: 60, order: 4,
    concept: 'MVBP & "Dogs eat the dog food" (DE ข้อ 22–23)',
    why: 'ทักษะการตลาด: พิสูจน์ด้วยเงินจริง (pre-order/ลูกค้าแรก) ก่อนลงทุนสร้างเต็ม',
    lesson: 'มีหลักฐานลูกค้าจ่าย/ลงชื่อจริงก่อน แล้วค่อยทุ่มสร้าง',
    goto: 'market', requires: 'gate-money',
  },
  {
    id: 'gate-scale', title: 'Gate 5 · SCALE — แผนขยาย', category: 'gate', track: 'business', xp: 60, order: 5,
    concept: 'Product Plan & Follow-on Markets (DE ข้อ 24)',
    why: 'ทักษะบริหาร: ขยายเมื่อฐานมั่นคง — วางแผนตลาดถัดไปก่อนเร่งโต',
    lesson: 'อนุมัติแผน roadmap + ตลาดถัดไป ก่อนเร่งการเติบโต',
    goto: 'roadmap', requires: 'gate-proof',
  },

  // ── ฟีเจอร์/ข้อมูลสำคัญ — CEO เสนอให้บอร์ดเซ็นรับรอง (เสนอได้ทันที) ──
  {
    id: 'feat-pricing', title: 'อนุมัติ · โครงสร้างราคา (แพ็กเกจ)', category: 'feature', track: 'business', xp: 30, order: 99,
    concept: 'Pricing Ladder & Tiers',
    why: 'ทักษะบริหาร: บันไดราคา (free→scale) ให้ลูกค้าไต่ขึ้น — ไม่ใช่ราคาเดียว',
    lesson: 'ตรวจว่าราคาแต่ละขั้นสะท้อนคุณค่าที่ต่างกันชัดเจน', goto: 'billing',
  },
  {
    id: 'feat-storefront', title: 'อนุมัติ · หน้าร้าน/Marketplace', category: 'feature', track: 'marketing', xp: 30, order: 99,
    concept: 'Storefront & Marketplace SEO',
    why: 'ทักษะการตลาด: หน้าร้านที่ Google เจอ = ช่องทางลูกค้าหาเราเจอเอง',
    lesson: 'ตรวจว่าหน้าร้านมีคำค้น (keyword) ตรงกับ persona.search', goto: 'storefront',
  },
  {
    id: 'feat-skills', title: 'อนุมัติ · สินค้า/Skill ในตลาด', category: 'feature', track: 'business', xp: 30, order: 99,
    concept: 'Productize Knowledge',
    why: 'ทักษะบริหาร: เปลี่ยนความรู้/เคสเป็นสินค้าขายซ้ำได้ (scalable)',
    lesson: 'ประเมินราคา skill ให้สมเหตุผลกับมูลค่าที่ลูกค้าได้', goto: 'aicompany',
  },
  {
    id: 'feat-marketing', title: 'อนุมัติ · กลยุทธ์การตลาด/ช่องทาง', category: 'feature', track: 'marketing', xp: 30, order: 99,
    concept: 'Go-To-Market Channels',
    why: 'ทักษะการตลาด: เลือกช่องทางที่ persona อยู่จริง แทนยิงมั่ว',
    lesson: 'จับคู่ช่องทาง (FB/Google/TikTok) กับ persona.search ของแต่ละกลุ่ม', goto: 'marketing',
  },
  {
    id: 'feat-finance', title: 'อนุมัติ · งบ/การเงินบริษัท', category: 'feature', track: 'business', xp: 30, order: 99,
    concept: 'Cash Flow Discipline',
    why: 'ทักษะบริหาร: คุมรายรับ-รายจ่าย-กระแสเงินสด = เส้นเลือดธุรกิจ',
    lesson: 'ดู runway (อยู่ได้กี่เดือน) ก่อนอนุมัติค่าใช้จ่ายก้อนใหม่', goto: 'city',
  },
];

const LEVEL_THRESHOLDS = [0, 60, 150, 300, 500];
const LEVEL_LABELS: Record<SkillTrack, string[]> = {
  business:  ['ผู้เริ่มต้น', 'เจ้าของกิจการ', 'ผู้จัดการ', 'ผู้บริหาร (CEO)', 'นักกลยุทธ์ระดับบอร์ด'],
  marketing: ['ผู้เริ่มต้น', 'นักการตลาด', 'นักการตลาดอาวุโส', 'CMO', 'นักกลยุทธ์แบรนด์'],
};
export const TRACK_META: Record<SkillTrack, { label: string; icon: string; color: string }> = {
  business:  { label: 'บริหารธุรกิจ', icon: '🏛️', color: '#1a4f8a' },
  marketing: { label: 'การตลาด',      icon: '📣', color: '#2d6a4f' },
};

export interface SkillLevel {
  track: SkillTrack; xp: number; level: number; label: string;
  nextXp: number | null;    // XP ที่ต้องถึง level ถัดไป (null = สูงสุด)
  intoLevel: number; span: number; // สำหรับ progress bar ภายใน level
}

function decisionMap(decisions: BoardDecision[]): Map<string, BoardDecision> {
  const m = new Map<string, BoardDecision>();
  for (const d of decisions) m.set(d.itemId, d);
  return m;
}

export function itemStatus(item: AgendaItem, data: AppData, decisions: BoardDecision[]): ItemStatus {
  const dm = decisionMap(decisions);
  const decided = dm.get(item.id);
  if (decided) return decided.status;
  if (item.requires && dm.get(item.requires)?.status !== 'approved') return 'locked';
  if (item.ready && !item.ready(data)) return 'locked';
  return 'proposed';
}

export function boardState(data: AppData, decisions: BoardDecision[]): { item: AgendaItem; status: ItemStatus }[] {
  return AGENDA.map((item) => ({ item, status: itemStatus(item, data, decisions) }));
}

/** วาระที่ CEO เสนอ (พร้อมให้บอร์ดกดอนุมัติตอนนี้) */
export function pendingProposals(data: AppData, decisions: BoardDecision[]): AgendaItem[] {
  return AGENDA.filter((i) => itemStatus(i, data, decisions) === 'proposed');
}

export function skillLevels(decisions: BoardDecision[]): Record<SkillTrack, SkillLevel> {
  const approved = new Set(decisions.filter((d) => d.status === 'approved').map((d) => d.itemId));
  const out = {} as Record<SkillTrack, SkillLevel>;
  for (const track of ['business', 'marketing'] as SkillTrack[]) {
    const xp = AGENDA.filter((i) => i.track === track && approved.has(i.id)).reduce((s, i) => s + i.xp, 0);
    let level = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    const idx = level - 1;
    const base = LEVEL_THRESHOLDS[idx];
    const nextXp = idx + 1 < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[idx + 1] : null;
    out[track] = {
      track, xp, level, label: LEVEL_LABELS[track][idx],
      nextXp,
      intoLevel: xp - base,
      span: nextXp === null ? 1 : nextXp - base,
    };
  }
  return out;
}

/** ความคืบหน้า gate เชิงกลยุทธ์ (อนุมัติแล้วกี่/ทั้งหมด) */
export function gateProgress(decisions: BoardDecision[]): { approved: number; total: number } {
  const approved = new Set(decisions.filter((d) => d.status === 'approved').map((d) => d.itemId));
  const gates = AGENDA.filter((i) => i.category === 'gate');
  return { approved: gates.filter((g) => approved.has(g.id)).length, total: gates.length };
}
