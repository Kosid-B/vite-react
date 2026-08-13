/* checkupLeads — อ่านลีดจากแบบตรวจสุขภาพระบบ (admin เท่านั้น)
 * ตาราง checkup_leads ปิด RLS ไม่มี policy → เข้าได้เฉพาะผ่าน rpc checkup_leads_list
 * ที่ guard ด้วย is_app_admin() ฝั่ง DB (0055)
 *
 * ส่วนคำนวณเป็น pure ทั้งหมด เพื่อทดสอบได้ — การจัดลำดับว่าใครควรติดต่อก่อน
 * คือส่วนที่ผิดแล้วเสียโอกาสจริง จึงต้องมีเทสต์ ไม่ใช่คำนวณสด ๆ ใน component */
import { supabase, isSupabaseEnabled } from './supabase';

export interface CheckupLead {
  id: string;
  email: string;
  company: string | null;
  pct: number;
  band: string | null;
  source: string | null;
  created_at: string;
  sent_at?: string | null;
}

export const BAND_LABEL_TH: Record<string, string> = {
  critical: 'ยังไม่มีระบบที่ใช้ได้จริง',
  weak: 'มีบางส่วน แต่ยังไม่ครบ',
  developing: 'ใกล้พร้อม เหลือบางจุด',
  ready: 'พร้อมสำหรับการตรวจรับรอง',
};

export const SOURCE_LABEL_TH: Record<string, string> = {
  quick12: 'ตรวจเร็ว 12 ข้อ',
  iso9001: 'ISO 9001 (เต็ม)',
  iso14001: 'ISO 14001 (เต็ม)',
  iso45001: 'ISO 45001 (เต็ม)',
  iso22301: 'ISO 22301 (เต็ม)',
};

export function sourceLabel(s: string | null): string {
  if (!s) return 'ไม่ระบุ';
  return SOURCE_LABEL_TH[s] ?? s;
}

/** ระดับความน่าติดต่อ — ใช้จัดลำดับว่าโทรหาใครก่อน
 *  หลักคิด: คนที่ "รู้ตัวว่าขาด" และ "ทำแบบเต็ม" คือคนที่ตั้งใจจริงที่สุด
 *  ส่วนคนที่คะแนนเต็มแล้วไม่ต้องการเรา — ติดต่อไปก็เสียเวลาทั้งสองฝ่าย */
export type LeadHeat = 'hot' | 'warm' | 'cold';

export interface ScoredLead extends CheckupLead {
  heat: LeadHeat;
  heatReason: string;
  score: number;
}

const FULL_SOURCES = ['iso9001', 'iso14001', 'iso45001', 'iso22301'];

export function scoreLead(l: CheckupLead): ScoredLead {
  const isFull = FULL_SOURCES.includes(l.source ?? '');
  const hasCompany = !!(l.company && l.company.trim());
  const pct = Math.max(0, Math.min(100, l.pct ?? 0));

  // ยิ่งคะแนนต่ำ = ยิ่งมีงานให้ทำ · ทำแบบเต็ม = ลงแรงมาก = ตั้งใจ · ใส่ชื่อบริษัท = ไม่ได้ลองเล่น
  let score = (100 - pct) + (isFull ? 45 : 0) + (hasCompany ? 20 : 0);

  // คะแนนสูงมาก = ระบบเขาพร้อมแล้ว ไม่ต้องการงานวางระบบ (แต่ยังขายตรวจติดตาม/มาตรฐานที่สองได้)
  if (pct >= 85) score -= 40;

  let heat: LeadHeat = 'cold';
  let heatReason = 'ทำแบบเร็ว คะแนนสูง — ยังไม่มีสัญญาณว่าต้องการงานวางระบบ';
  if (score >= 110) {
    heat = 'hot';
    heatReason = isFull
      ? 'ทำแบบเต็มจนจบและพบช่องว่างเยอะ — ตั้งใจจริงและมีงานให้ทำ'
      : 'คะแนนต่ำมากและระบุบริษัท — มีงานให้ทำชัดเจน';
  } else if (score >= 70) {
    heat = 'warm';
    heatReason = hasCompany
      ? 'ระบุบริษัทและยังมีช่องว่างเหลือ — คุยต่อได้'
      : 'มีช่องว่างเหลืออยู่ แต่ยังไม่ระบุบริษัท';
  }

  return { ...l, heat, heatReason, score };
}

/** จัดลำดับว่าควรติดต่อใครก่อน — ร้อนสุดก่อน · คะแนนเท่ากันเอาคนที่เพิ่งทำก่อน */
export function rankLeads(leads: readonly CheckupLead[]): ScoredLead[] {
  return leads
    .map(scoreLead)
    .sort((a, b) => b.score - a.score || (a.created_at < b.created_at ? 1 : -1));
}

export interface CheckupLeadStats {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  avgPct: number;
  full: number;      // ทำแบบเต็มกี่ราย
  withCompany: number;
  last7d: number;
}

export function checkupLeadStats(leads: readonly ScoredLead[], nowIso: string): CheckupLeadStats {
  const now = Date.parse(nowIso);
  const week = 7 * 24 * 3600 * 1000;
  const sum = leads.reduce((s, l) => s + (l.pct ?? 0), 0);
  return {
    total: leads.length,
    hot: leads.filter((l) => l.heat === 'hot').length,
    warm: leads.filter((l) => l.heat === 'warm').length,
    cold: leads.filter((l) => l.heat === 'cold').length,
    avgPct: leads.length === 0 ? 0 : Math.round(sum / leads.length),
    full: leads.filter((l) => FULL_SOURCES.includes(l.source ?? '')).length,
    withCompany: leads.filter((l) => !!(l.company && l.company.trim())).length,
    last7d: leads.filter((l) => {
      const t = Date.parse(l.created_at);
      return Number.isFinite(t) && Number.isFinite(now) && now - t <= week;
    }).length,
  };
}

/** CSV สำหรับเปิดใน Excel/Sheets — ใช้ตอนอยากตามผลนอกระบบ */
export function checkupLeadsCsv(leads: readonly ScoredLead[]): string {
  const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['วันที่', 'อีเมล', 'บริษัท', 'คะแนน', 'ระดับ', 'แบบที่ทำ', 'ความน่าติดต่อ', 'เหตุผล'];
  const rows = leads.map((l) => [
    l.created_at.slice(0, 10),
    l.email,
    l.company ?? '',
    String(l.pct),
    BAND_LABEL_TH[l.band ?? ''] ?? (l.band ?? ''),
    sourceLabel(l.source),
    l.heat === 'hot' ? 'ร้อน' : l.heat === 'warm' ? 'อุ่น' : 'เย็น',
    l.heatReason,
  ]);
  return [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

/** ดึงลีด (admin เท่านั้น — RPC เช็คสิทธิ์เอง) */
export async function loadCheckupLeads(limit = 200): Promise<CheckupLead[] | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase.rpc('checkup_leads_list', { p_limit: limit });
  if (error || !Array.isArray(data)) return null;
  return data as CheckupLead[];
}
