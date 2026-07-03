import { isSupabaseEnabled, supabase } from './supabase';

/** 🧪 พิสูจน์ไอเดียก่อนสร้าง — Pre-order Validation
 *  ลูกค้าจริงทิ้ง "สั่งจองล่วงหน้า/สนใจ" บนหน้าร้านสาธารณะ (ไม่ต้องล็อกอิน)
 *  เจ้าของร้านเห็นจำนวน+รายชื่อ = หลักฐานว่ามีคนพร้อมจ่าย ก่อนลงทุนสร้างจริง
 *  Local mode: เก็บใน localStorage */

export type LeadKind = 'preorder' | 'interest';

export interface Lead {
  id: string;
  slug: string;
  kind: LeadKind;
  name: string;
  contact: string;
  note: string;
  createdAt: string;
}

/** เกณฑ์ตัดสินใจ (แนวทาง Lean): ผู้สนใจภายในช่วงทดสอบ */
export const VALIDATION_TARGET = 10;

const LS_KEY = 'ceo_ai_leads';

function loadLocal(): Lead[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as Lead[]; }
  catch { return []; }
}

/** ลูกค้าสาธารณะทิ้งความสนใจ — คืน null ถ้าสำเร็จ */
export async function submitLead(
  lead: Pick<Lead, 'slug' | 'kind' | 'name' | 'contact' | 'note'>,
): Promise<string | null> {
  const contact = lead.contact.trim();
  if (contact.length < 5) return 'กรุณาระบุช่องทางติดต่อ (เบอร์/LINE/อีเมล)';

  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('storefront_leads').insert({
      slug: lead.slug, kind: lead.kind, name: lead.name.trim(),
      contact, note: lead.note.trim(),
    });
    return error ? 'ส่งไม่สำเร็จ — ลองอีกครั้ง' : null;
  }

  const list = loadLocal();
  list.unshift({
    id: 'lead-' + Date.now(), slug: lead.slug, kind: lead.kind,
    name: lead.name.trim(), contact, note: lead.note.trim(),
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(LS_KEY, JSON.stringify(list));
  return null;
}

/** จำนวนผู้สนใจของร้าน (สาธารณะ — social proof) */
export async function countLeads(slug: string): Promise<number> {
  if (isSupabaseEnabled && supabase) {
    const { data } = await supabase.rpc('lead_count', { p_slug: slug });
    return Number(data ?? 0);
  }
  return loadLocal().filter(l => l.slug === slug).length;
}

interface Row {
  id: string; slug: string; kind: LeadKind; name: string; contact: string;
  note: string; created_at: string;
}

/** เจ้าของร้าน: รายชื่อผู้สนใจทั้งหมด (ข้อมูลติดต่อ) */
export async function listLeads(slug: string): Promise<Lead[]> {
  if (isSupabaseEnabled && supabase) {
    const { data, error } = await supabase.from('storefront_leads')
      .select('*').eq('slug', slug).order('created_at', { ascending: false }).limit(200);
    if (error || !data) return [];
    return (data as Row[]).map(r => ({
      id: r.id, slug: r.slug, kind: r.kind, name: r.name,
      contact: r.contact, note: r.note, createdAt: r.created_at,
    }));
  }
  return loadLocal().filter(l => l.slug === slug);
}
