import { isSupabaseEnabled, supabase } from './supabase';

/* platformLead — ดักเก็บ "คนสนใจ" บน landing ที่ยังไม่พร้อมสมัคร (First-party data)
 * PDPA: เก็บเมื่อยินยอมเท่านั้น · เก็บ utm เพื่อรู้ว่ามาจากช่องไหน (fb/tiktok/youtube)
 * ส่วน validate = pure (tested) · submit คุยกับ Supabase (RLS: insert สาธารณะเมื่อ consent, อ่านเฉพาะแอดมิน) */

export interface LeadInput {
  contact: string;
  name?: string;
  interest?: string;
  consent: boolean;
}

export interface Utm { source: string; medium: string; campaign: string; }

/** ดึง utm จาก query string (คงไว้ตอน landing ถูก strip — เรียกตอน mount) */
export function readUtm(search: string): Utm {
  try {
    const q = new URLSearchParams(search);
    return {
      source: (q.get('utm_source') || '').slice(0, 60),
      medium: (q.get('utm_medium') || '').slice(0, 60),
      campaign: (q.get('utm_campaign') || '').slice(0, 60),
    };
  } catch { return { source: '', medium: '', campaign: '' }; }
}

/** ตรวจก่อนส่ง (client gate; RLS + CHECK ที่ DB เป็นด่านจริง) */
export function validateLead(input: Partial<LeadInput>): { ok: boolean; error?: string } {
  const contact = (input.contact ?? '').trim();
  if (contact.length < 5) return { ok: false, error: 'กรุณากรอกอีเมล / LINE / เบอร์ติดต่อ' };
  if (contact.length > 200) return { ok: false, error: 'ช่องทางติดต่อยาวเกินไป' };
  if (!input.consent) return { ok: false, error: 'กรุณายินยอมให้เราติดต่อกลับ (PDPA)' };
  return { ok: true };
}

/** ส่ง lead — คืน null ถ้าสำเร็จ, หรือข้อความ error */
export async function submitLead(input: LeadInput, utm: Utm): Promise<string | null> {
  const v = validateLead(input);
  if (!v.ok) return v.error ?? 'ข้อมูลไม่ครบ';
  if (!isSupabaseEnabled || !supabase) return null; // local mode: ถือว่าผ่าน (ไม่มี backend)
  const { error } = await supabase.from('platform_leads').insert({
    contact: input.contact.trim(),
    name: (input.name ?? '').trim(),
    interest: (input.interest ?? '').trim(),
    source: utm.source, medium: utm.medium, campaign: utm.campaign,
    consent: true,
  });
  return error ? 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง' : null;
}

// ───────────────────────── admin: อ่าน + สรุปสถิติ (ปิด loop วัดผล) ─────────────────────────

export interface Lead {
  id: string;
  contact: string;
  name: string;
  interest: string;
  source: string;
  medium: string;
  campaign: string;
  at: string;        // YYYY-MM-DD
}

export interface ChannelStat { key: string; label: string; count: number; pct: number; }

export interface LeadStats {
  total: number;
  last7: number;                 // 7 วันล่าสุด (ยอด lead ใหม่)
  byMedium: ChannelStat[];       // มาจากช่องไหน (fb/tiktok/youtube/…)
  bySource: ChannelStat[];       // แหล่ง (btraining/ig/line/…)
  byCampaign: ChannelStat[];     // แคมเปญ (founding50/…)
}

const CHANNEL_LABEL: Record<string, string> = {
  fb: 'Facebook', facebook: 'Facebook', ig: 'Instagram', instagram: 'Instagram',
  tiktok: 'TikTok', tt: 'TikTok', youtube: 'YouTube', yt: 'YouTube',
  line: 'LINE', google: 'Google', email: 'Email', direct: 'ตรง (ไม่มี utm)',
};

/** แปลง medium/source ให้อ่านง่าย (ค่าที่ว่าง = "ตรง (ไม่มี utm)") */
export function channelLabel(raw: string): string {
  const k = (raw || '').trim().toLowerCase();
  if (!k) return 'ตรง (ไม่มี utm)';
  return CHANNEL_LABEL[k] ?? raw;
}

/** นับตามฟิลด์ที่เลือก (medium/source/campaign) → เรียงมากไปน้อย + % ของทั้งหมด (pure, tested) */
export function channelBreakdown(leads: Lead[], field: 'medium' | 'source' | 'campaign'): ChannelStat[] {
  const total = leads.length;
  const map = new Map<string, number>();
  for (const l of leads) {
    const raw = (l[field] || '').trim().toLowerCase();
    const key = raw || '(direct)';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({
      key,
      label: field === 'campaign' ? (key === '(direct)' ? '(ไม่ระบุแคมเปญ)' : key) : channelLabel(key === '(direct)' ? '' : key),
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/** สรุปสถิติ lead ทั้งหมด (pure, tested) — todayIso ส่งเข้ามาเพื่อคำนวณ 7 วันล่าสุดแบบทดสอบได้ */
export function leadStats(leads: Lead[], todayIso: string): LeadStats {
  const cutoff = new Date(todayIso);
  cutoff.setDate(cutoff.getDate() - 7);
  const cut = cutoff.toISOString().slice(0, 10);
  const last7 = leads.filter(l => l.at >= cut).length;
  return {
    total: leads.length,
    last7,
    byMedium: channelBreakdown(leads, 'medium'),
    bySource: channelBreakdown(leads, 'source'),
    byCampaign: channelBreakdown(leads, 'campaign'),
  };
}

/** CSV สำหรับดาวน์โหลด (escape ครบ) */
export function leadsCsv(leads: Lead[]): string {
  const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const head = ['วันที่', 'ช่องทาง (medium)', 'แหล่ง (source)', 'แคมเปญ', 'ชื่อ', 'ติดต่อ', 'สนใจทำธุรกิจ'];
  const rows = leads.map(l => [l.at, l.medium, l.source, l.campaign, l.name, l.contact, l.interest].map(esc).join(','));
  return [head.map(esc).join(','), ...rows].join('\n');
}

function mapLead(r: Record<string, unknown>): Lead {
  return {
    id: String(r.id),
    contact: String(r.contact ?? ''),
    name: String(r.name ?? ''),
    interest: String(r.interest ?? ''),
    source: String(r.source ?? ''),
    medium: String(r.medium ?? ''),
    campaign: String(r.campaign ?? ''),
    at: r.created_at ? String(r.created_at).slice(0, 10) : '',
  };
}

/** แอดมิน: ดึง lead ทั้งหมด (RLS: อ่านได้เฉพาะ is_app_admin) */
export async function listLeads(limit = 500): Promise<Lead[]> {
  if (!isSupabaseEnabled || !supabase) return [];
  const { data } = await supabase
    .from('platform_leads')
    .select('id,contact,name,interest,source,medium,campaign,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapLead);
}
