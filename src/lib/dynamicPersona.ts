// dynamicPersona.ts — Persona ที่ "อัปตามพฤติกรรมจริง" (Dark AI Marketing #5 + #7)
// แทนที่ persona เดาสุ่ม → สร้างจากข้อมูล lead จริง (seg + interest + ช่องทาง) ที่ไหลเข้ามา
// pure + tested · ใช้ในหน้า Admin (Leads) เพื่อเห็นว่า "ลูกค้าจริงของเราเป็นใคร" แล้วปรับคอนเทนต์ให้ตรง
import type { Lead } from './platformLead';
import { channelLabel } from './platformLead';

export interface LivePersona {
  seg: string;                                   // seller/newbie/owner/'' (ไม่ระบุ)
  label: string;                                 // ชื่อกลุ่มอ่านง่าย
  size: number;                                  // จำนวน lead ในกลุ่ม
  pct: number;                                   // % ของ lead ทั้งหมด
  topInterests: { text: string; count: number }[];  // สนใจทำธุรกิจอะไร (พบบ่อยสุด)
  topChannels: { label: string; count: number }[];  // มาจากช่องไหน (medium)
  painHook: string;                              // มุม pain ที่ตรงกับกลุ่มนี้ (จับคู่ seg)
}

const SEG_LABEL: Record<string, string> = {
  seller: 'มีของขายอยู่แล้ว',
  newbie: 'มือใหม่ อยากเริ่มธุรกิจ',
  owner: 'เจ้าของธุรกิจ อยากมีระบบ',
  '': 'ไม่ระบุกลุ่ม',
};

const SEG_HOOK: Record<string, string> = {
  seller: 'ลูกค้าหาไม่เจอ → เปิดหน้าร้าน',
  newbie: 'กลัวเจ๊ง → ทดสอบไอเดียก่อนเสี่ยง',
  owner: 'ทำคนเดียวไม่โต → ทีม AI วางระบบ',
  '': 'ยังไม่รู้ pain — ถามเพิ่มตอนติดต่อกลับ',
};

/** นับความถี่ของสตริง (แบบ trim + ตัดว่าง) → เรียงมากไปน้อย เอา top N */
function topPhrases(values: string[], n: number): { text: string; count: number }[] {
  const map = new Map<string, number>();
  for (const raw of values) {
    const v = (raw || '').trim();
    if (!v) continue;
    const key = v.toLowerCase();
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function topChannels(leads: Lead[], n: number): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const l of leads) {
    const label = channelLabel(l.medium);
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/** normalize seg ให้เป็นหนึ่งใน seller/newbie/owner/'' (ค่าอื่น/default → '') */
function normSeg(raw: string): string {
  const s = (raw || '').trim().toLowerCase();
  return (s === 'seller' || s === 'newbie' || s === 'owner') ? s : '';
}

/**
 * สร้าง persona จาก lead จริง — จัดกลุ่มตาม seg แล้วสรุป interest/ช่องทางที่พบจริง
 * เรียงกลุ่มใหญ่สุดก่อน · คืน [] ถ้าไม่มี lead (ให้ UI โชว์ empty state ไม่ปั้นข้อมูล)
 */
export function livePersonas(leads: Lead[]): LivePersona[] {
  const total = leads.length;
  if (total === 0) return [];
  const groups = new Map<string, Lead[]>();
  for (const l of leads) {
    const seg = normSeg(l.seg);
    (groups.get(seg) ?? groups.set(seg, []).get(seg)!).push(l);
  }
  return [...groups.entries()]
    .map(([seg, ls]): LivePersona => ({
      seg,
      label: SEG_LABEL[seg] ?? SEG_LABEL[''],
      size: ls.length,
      pct: Math.round((ls.length / total) * 1000) / 10,
      topInterests: topPhrases(ls.map(l => l.interest), 4),
      topChannels: topChannels(ls, 3),
      painHook: SEG_HOOK[seg] ?? SEG_HOOK[''],
    }))
    .sort((a, b) => b.size - a.size);
}
