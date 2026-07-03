import { isSupabaseEnabled, supabase } from './supabase';

/** Marketplace M1 — หน้าร้านสาธารณะต่อบริษัท (ceoaithailand.org/b/<slug>)
 *  Production: ตาราง public.storefronts (อ่านได้สาธารณะรวม anon)
 *  Local mode: เก็บ draft ใน localStorage เพื่อพรีวิว */

export type StorefrontKind = 'product' | 'service' | 'both';

export interface Storefront {
  slug: string;
  workspaceId?: string; // เจ้าของหน้าร้าน — ใช้ตอนสร้างออเดอร์ (M3)
  name: string;
  dbd: string;
  kind: StorefrontKind; // ประเภทร้าน — ใช้กรองสินค้า/บริการบนสารบัญตลาด
  vp: string;           // Value Proposition — จุดขายหนึ่งประโยค (AI Agent ช่วยเขียน)
  promo: string;        // ข้อความโฆษณา/โปรโมชัน — แสดงเด่น 📣 บนตลาด
  description: string;
  services: string[];
  phone: string;
  lineId: string;
  email: string;
  website: string;
  published: boolean;
  featuredUntil?: string; // ตำแหน่ง "ร้านแนะนำ" ปักหมุดบน /b (admin ตั้ง — คู่กับประมูลใน /shop)
  updatedAt?: string;
}

const LS_KEY = 'ceo_ai_storefront';

/** ข้อมูลเก่าอาจยังไม่มี vp/kind/promo */
function normalize(s: Storefront): Storefront {
  return { ...s, vp: s.vp ?? '', kind: s.kind ?? 'both', promo: s.promo ?? '' };
}

function loadLocal(): Storefront | null {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') as Storefront | null;
    return s ? normalize(s) : null;
  } catch { return null; }
}

interface Row {
  slug: string; workspace_id?: string; name: string; dbd: string; kind?: StorefrontKind;
  vp?: string; promo?: string; description: string;
  services: string[]; phone: string; line_id: string; email: string; website: string;
  published: boolean; featured_until?: string | null; updated_at?: string;
}

function rowToStorefront(r: Row): Storefront {
  return {
    slug: r.slug, workspaceId: r.workspace_id, name: r.name, dbd: r.dbd,
    kind: r.kind ?? 'both', vp: r.vp ?? '', promo: r.promo ?? '', description: r.description,
    services: r.services ?? [], phone: r.phone, lineId: r.line_id,
    email: r.email, website: r.website, published: r.published,
    featuredUntil: r.featured_until ?? undefined,
    updatedAt: r.updated_at?.slice(0, 10),
  };
}

/** ร้านนี้อยู่ในตำแหน่ง "ร้านแนะนำ" (โฆษณา) อยู่หรือไม่ */
export function isFeatured(sf: Storefront): boolean {
  return !!sf.featuredUntil && new Date(sf.featuredUntil) > new Date();
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
      slug: sf.slug, workspace_id: wsId, name: sf.name, dbd: sf.dbd, kind: sf.kind,
      vp: sf.vp, promo: sf.promo,
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

/** admin: ตั้ง/ถอดตำแหน่งร้านแนะนำ — until = null คือถอดออก; คืน error ('' = สำเร็จ) */
export async function setFeatured(slug: string, until: string | null): Promise<string> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase.from('storefronts')
      .update({ featured_until: until }).eq('slug', slug);
    return error ? error.message : '';
  }
  const local = loadLocal();
  if (!local || local.slug !== slug) return 'ไม่พบร้านนี้';
  localStorage.setItem(LS_KEY, JSON.stringify({ ...local, featuredUntil: until ?? undefined }));
  return '';
}
