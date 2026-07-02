import { isSupabaseEnabled, supabase } from './supabase';

/** Marketplace M1 — หน้าร้านสาธารณะต่อบริษัท (ceoaithailand.org/b/<slug>)
 *  Production: ตาราง public.storefronts (อ่านได้สาธารณะรวม anon)
 *  Local mode: เก็บ draft ใน localStorage เพื่อพรีวิว */

export interface Storefront {
  slug: string;
  workspaceId?: string; // เจ้าของหน้าร้าน — ใช้ตอนสร้างออเดอร์ (M3)
  name: string;
  dbd: string;
  vp: string;           // Value Proposition — จุดขายหนึ่งประโยค (AI Agent ช่วยเขียน)
  description: string;
  services: string[];
  phone: string;
  lineId: string;
  email: string;
  website: string;
  published: boolean;
  updatedAt?: string;
}

const LS_KEY = 'ceo_ai_storefront';

function loadLocal(): Storefront | null {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') as Storefront | null;
    return s ? { ...s, vp: s.vp ?? '' } : null; // ข้อมูลเก่าอาจยังไม่มี vp
  } catch { return null; }
}

interface Row {
  slug: string; workspace_id?: string; name: string; dbd: string; vp?: string; description: string;
  services: string[]; phone: string; line_id: string; email: string; website: string;
  published: boolean; updated_at?: string;
}

function rowToStorefront(r: Row): Storefront {
  return {
    slug: r.slug, workspaceId: r.workspace_id, name: r.name, dbd: r.dbd, vp: r.vp ?? '', description: r.description,
    services: r.services ?? [], phone: r.phone, lineId: r.line_id,
    email: r.email, website: r.website, published: r.published,
    updatedAt: r.updated_at?.slice(0, 10),
  };
}

/** สาธารณะ: อ่านหน้าร้านตาม slug (ทำงานได้โดยไม่ล็อกอิน) */
export async function getStorefront(slug: string): Promise<Storefront | null> {
  if (isSupabaseEnabled && supabase) {
    const { data } = await supabase.from('storefronts').select('*').eq('slug', slug).maybeSingle();
    return data ? rowToStorefront(data as Row) : null;
  }
  const local = loadLocal();
  return local && local.slug === slug ? local : null;
}

/** สาธารณะ: สารบัญธุรกิจทั้งหมดที่เผยแพร่ */
export async function listStorefronts(): Promise<Storefront[]> {
  if (isSupabaseEnabled && supabase) {
    const { data } = await supabase.from('storefronts').select('*')
      .eq('published', true).order('updated_at', { ascending: false }).limit(200);
    return (data as Row[] ?? []).map(rowToStorefront);
  }
  const local = loadLocal();
  return local ? [local] : [];
}

/** หน้าร้านของ workspace ตัวเอง */
export async function getMyStorefront(wsId: string | null): Promise<Storefront | null> {
  if (isSupabaseEnabled && supabase && wsId) {
    const { data } = await supabase.from('storefronts').select('*').eq('workspace_id', wsId).maybeSingle();
    return data ? rowToStorefront(data as Row) : null;
  }
  return loadLocal();
}

/** บันทึก/เผยแพร่หน้าร้าน — คืน error message ถ้าไม่สำเร็จ ('' = สำเร็จ) */
export async function saveStorefront(wsId: string | null, sf: Storefront): Promise<string> {
  if (isSupabaseEnabled && supabase) {
    if (!wsId) return 'ยังไม่พบ workspace — ลองรีเฟรชหน้า';
    const { error } = await supabase.from('storefronts').upsert({
      slug: sf.slug, workspace_id: wsId, name: sf.name, dbd: sf.dbd, vp: sf.vp,
      description: sf.description, services: sf.services, phone: sf.phone,
      line_id: sf.lineId, email: sf.email, website: sf.website,
      published: sf.published, updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id' });
    if (error) {
      if (error.code === '23505') return 'ชื่อลิงก์ (slug) นี้ถูกใช้แล้ว — ลองชื่ออื่น';
      return error.message;
    }
    return '';
  }
  localStorage.setItem(LS_KEY, JSON.stringify({ ...sf, updatedAt: new Date().toISOString().slice(0, 10) }));
  return '';
}
