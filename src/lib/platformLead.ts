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
