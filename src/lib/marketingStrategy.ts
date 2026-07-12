/** กลยุทธ์การตลาดที่ผูกกับผล MIT 24-Step (Disciplined Entrepreneurship) — pure, ทดสอบได้
 *  อ่าน businessModel.de24 (ทำแล้ว/โน้ต) → เสนอ ช่องทาง/แคมเปญ/เป้าหมาย ที่อิงข้อมูลจริง
 *  ไม่เดา: ข้อเสนอโผล่เฉพาะขั้นที่ "ทำแล้ว" · ขั้นที่ยังไม่ทำ = gap ให้ไปเติมใน Business Model */

import type { AppData, MarketingChannelType } from '../types';
import { DE24_DEFS } from './de24Sync';

export type MktRole = 'target' | 'channel' | 'message' | 'offer' | 'goal';

/** 10 ขั้น DE24 ที่ป้อนการตลาดโดยตรง + บทบาท */
export const MKT_STEP_LINKS: Array<{ index: number; role: MktRole; why: string }> = [
  { index: 1,  role: 'target',  why: 'ตลาดหัวหาด = กลุ่มที่ยิงก่อน' },
  { index: 4,  role: 'target',  why: 'Persona = ข้อความ + ช่องทางที่ตรงคน' },
  { index: 5,  role: 'message', why: 'วงจรการใช้ = จังหวะสื่อสารแต่ละ touchpoint' },
  { index: 7,  role: 'message', why: 'คุณค่าเป็นตัวเลข = พาดหัวแคมเปญที่จับใจ' },
  { index: 10, role: 'message', why: 'ตำแหน่งแข่งขัน = จุดต่างที่ต้องชู' },
  { index: 12, role: 'channel', why: 'กระบวนการหาลูกค้า = ช่องทางที่ใช้จริง' },
  { index: 15, role: 'offer',   why: 'ราคา = ข้อเสนอ/โปรของแคมเปญ' },
  { index: 16, role: 'goal',    why: 'LTV = เพดานงบต่อลูกค้า' },
  { index: 17, role: 'channel', why: 'กระบวนการขาย = ช่องทางปิดการขาย' },
  { index: 18, role: 'goal',    why: 'COCA = เป้าต้นทุนหาลูกค้าต่อช่องทาง' },
];

export interface LinkedStep {
  index: number; name: string; role: MktRole; why: string; done: boolean; note: string;
}
export interface ChannelSuggestion { type: MarketingChannelType; name: string; rationale: string; }
export interface CampaignIdea { name: string; goal: string; basedOn: string; }
export interface GoalSuggestion { metric: string; unit: string; hint: string; }

export interface MarketingFromDe24 {
  readiness: number;                 // % ของ 10 ขั้นการตลาดที่ทำแล้ว
  linkedSteps: LinkedStep[];
  gaps: Array<{ index: number; name: string; why: string }>;
  channels: ChannelSuggestion[];
  campaigns: CampaignIdea[];
  goals: GoalSuggestion[];
}

const nameOf = (i: number) => DE24_DEFS.find(d => d.index === i)?.name ?? `ขั้น ${i + 1}`;
const clip = (s: string, n = 80) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export function marketingFromDe24(data: AppData): MarketingFromDe24 {
  const de24 = data.businessModel?.de24 ?? [];
  const step = (i: number) => de24[i] ?? { done: false, notes: '' };

  const linkedSteps: LinkedStep[] = MKT_STEP_LINKS.map(l => {
    const s = step(l.index);
    return { index: l.index, name: nameOf(l.index), role: l.role, why: l.why, done: !!s.done, note: clip(s.notes) };
  });

  const doneN = linkedSteps.filter(s => s.done).length;
  const readiness = Math.round((doneN / MKT_STEP_LINKS.length) * 100);
  const gaps = linkedSteps.filter(s => !s.done).map(s => ({ index: s.index, name: s.name, why: s.why }));
  const isDone = (i: number) => !!step(i).done;

  // ── ช่องทาง (จากขั้น target/channel ที่ทำแล้ว) ──
  const channels: ChannelSuggestion[] = [];
  const addCh = (type: MarketingChannelType, name: string, rationale: string) => {
    if (!channels.some(c => c.type === type)) channels.push({ type, name, rationale });
  };
  if (isDone(4)) { addCh('content', 'Content Marketing', 'Persona ชัด → คอนเทนต์ตรงปัญหา'); addCh('social', 'Social Media', 'เข้าถึง Persona ตามช่องที่เขาอยู่'); }
  if (isDone(10)) addCh('seo', 'SEO', 'ตำแหน่งแข่งขันชัด → ยึดคีย์เวิร์ดจุดต่าง');
  if (isDone(12)) { addCh('sem', 'Google Ads (SEM)', 'กระบวนการหาลูกค้าชัด → ยิงตรง intent'); addCh('referral', 'Referral', 'ต่อยอดลูกค้าที่ได้มาให้บอกต่อ'); }
  if (isDone(17)) { addCh('partner', 'Partner / พันธมิตร', 'กระบวนการขายชัด → หา channel partner'); addCh('event', 'Event / สัมมนา', 'ปิดการขาย B2B ผ่านการพบตัวจริง'); }

  // ── แคมเปญ (จากขั้น message/offer ที่ทำแล้ว) ──
  const campaigns: CampaignIdea[] = [];
  if (isDone(7)) campaigns.push({ name: 'สื่อสารคุณค่าเป็นตัวเลข', goal: clip(step(7).notes) || 'ชูตัวเลขที่ลูกค้าประหยัด/ได้เพิ่ม', basedOn: `ขั้น 8 · ${nameOf(7)}` });
  if (isDone(5)) campaigns.push({ name: 'แคมเปญตาม Journey การใช้งาน', goal: clip(step(5).notes) || 'สื่อสารตาม touchpoint แต่ละช่วง', basedOn: `ขั้น 6 · ${nameOf(5)}` });
  if (isDone(15)) campaigns.push({ name: 'ข้อเสนอตามกรอบราคา', goal: clip(step(15).notes) || 'ออกแบบโปร/แพ็กเกจให้ตรงราคา', basedOn: `ขั้น 16 · ${nameOf(15)}` });

  // ── เป้าหมาย (จากขั้น goal ที่ทำแล้ว) ──
  const goals: GoalSuggestion[] = [];
  if (isDone(16)) goals.push({ metric: 'LTV (มูลค่าตลอดชีพ)', unit: '฿', hint: 'ใช้เป็นเพดานงบต่อการได้ลูกค้า 1 ราย' });
  if (isDone(18)) goals.push({ metric: 'COCA / CAC', unit: '฿', hint: 'เป้า: COCA < 1/3 ของ LTV' });
  goals.push({ metric: 'Leads ต่อเดือน', unit: 'leads', hint: 'ตั้งตามความจุช่องทางที่เลือก' });

  return { readiness, linkedSteps, gaps, channels, campaigns, goals };
}
