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
  images: string[];     // รูปสินค้า (URL/dataURL) สูงสุด MAX_SHOP_IMAGES รูป
  description: string;
  services: string[];
  phone: string;
  lineId: string;
  email: string;
  website: string;
  published: boolean;
  featuredUntil?: string; // ตำแหน่ง "ร้านแนะนำ" ปักหมุดบน /b (admin ตั้ง — คู่กับประมูลใน /shop)
  updatedAt?: string;
  rating?: number;        // ค่าเฉลี่ยรีวิวจริง 1..5 (คำนวณโดย trigger) — โชว์ ⭐ + AggregateRating SEO
  reviewCount?: number;   // จำนวนรีวิวจริง
}

export interface StorefrontReview {
  id: string;
  slug: string;
  rating: number;         // 1..5
  text: string;
  reviewerName: string;
  at?: string;
}

const LS_KEY = 'ceo_ai_storefront';

export const MAX_SHOP_IMAGES = 6;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** เติม field ให้ครบชนิดทุกช่อง (data เก่า / DB null / localStorage อาจไม่ครบ) —
 *  string→'' , array→[] , kind→'both' — กันทุก consumer (หน้าร้าน/ตลาด/matching) ล่มจาก field หาย */
export function coerceStorefront(s: Partial<Storefront> | null | undefined): Storefront {
  const v = s ?? {};
  return {
    slug: str(v.slug),
    workspaceId: v.workspaceId,
    name: str(v.name),
    dbd: str(v.dbd),
    kind: (v.kind === 'product' || v.kind === 'service' || v.kind === 'both') ? v.kind : 'both',
    vp: str(v.vp),
    promo: str(v.promo),
    images: strArr(v.images),
    description: str(v.description),
    services: strArr(v.services),
    phone: str(v.phone),
    lineId: str(v.lineId),
    email: str(v.email),
    website: str(v.website),
    published: !!v.published,
    featuredUntil: v.featuredUntil,
    updatedAt: v.updatedAt,
  };
}

function loadLocal(): Storefront | null {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') as Partial<Storefront> | null;
    return s ? coerceStorefront(s) : null;
  } catch { return null; }
}

interface Row {
  slug: string; workspace_id?: string; name: string; dbd: string; kind?: StorefrontKind;
  vp?: string; promo?: string; images?: string[]; description: string;
  services: string[]; phone: string; line_id: string; email: string; website: string;
  published: boolean; featured_until?: string | null; updated_at?: string;
  rating?: number | null; review_count?: number | null;
}

function rowToStorefront(r: Row): Storefront {
  // ผ่าน coerceStorefront เพื่อเติม field ที่ DB คืน null/หาย (name/dbd/description/phone/…) ให้ครบชนิด
  return coerceStorefront({
    slug: r.slug, workspaceId: r.workspace_id, name: r.name, dbd: r.dbd,
    kind: r.kind, vp: r.vp, promo: r.promo, images: r.images, description: r.description,
    services: r.services, phone: r.phone, lineId: r.line_id,
    email: r.email, website: r.website, published: r.published,
    featuredUntil: r.featured_until ?? undefined,
    updatedAt: r.updated_at?.slice(0, 10),
    rating: r.rating ?? undefined,
    reviewCount: r.review_count ?? undefined,
  });
}

/** สาธารณะ: รีวิวของร้าน (ล่าสุดก่อน) */
export async function listReviews(slug: string): Promise<StorefrontReview[]> {
  if (!isSupabaseEnabled || !supabase) return [];
  const { data } = await supabase
    .from('storefront_reviews')
    .select('id,slug,rating,review_text,reviewer_name,created_at')
    .eq('slug', slug)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id), slug: String(r.slug), rating: Number(r.rating),
    text: String(r.review_text ?? ''), reviewerName: String(r.reviewer_name ?? ''),
    at: r.created_at ? String(r.created_at).slice(0, 10) : undefined,
  }));
}

/** ส่งรีวิว (ต้องล็อกอิน · RLS กันรีวิวร้านตัวเอง) — trigger จะ recompute rating ให้เอง */
export async function submitReview(
  input: { slug: string; rating: number; text?: string; reviewerName?: string; orderId?: string },
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) return { ok: false, error: 'ต้องเข้าสู่ระบบเพื่อรีวิว' };
  const rating = Math.round(input.rating);
  if (!(rating >= 1 && rating <= 5)) return { ok: false, error: 'ให้คะแนน 1–5 ดาว' };
  const { error } = await supabase.from('storefront_reviews').insert({
    slug: input.slug, rating, review_text: input.text ?? '',
    reviewer_name: input.reviewerName ?? '', order_id: input.orderId ?? null,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
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
      vp: sf.vp, promo: sf.promo, images: sf.images,
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

/** ย่อรูปผ่าน canvas (ด้านยาวสุด maxDim px, JPEG) — คืน Blob */
function resizeImage(file: File, maxDim = 1000, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('แปลงรูปไม่สำเร็จ')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('ไฟล์ไม่ใช่รูปภาพ')); };
    img.src = url;
  });
}

/** อัปโหลดรูปสินค้า — production: Supabase Storage (shop-images/<wsId>/…) คืน public URL
 *  local mode: คืน data URL (ย่อเล็กลงอีกขั้น กัน localStorage เต็ม)
 *  คืน { url } หรือ { error } */
export async function uploadShopImage(wsId: string | null, file: File): Promise<{ url?: string; error?: string }> {
  try {
    if (isSupabaseEnabled && supabase) {
      if (!wsId) return { error: 'ยังไม่พบ workspace — ลองรีเฟรชหน้า' };
      const blob = await resizeImage(file, 1000, 0.85);
      const path = `${wsId}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('shop-images')
        .upload(path, blob, { contentType: 'image/jpeg' });
      if (error) return { error: error.message };
      const { data } = supabase.storage.from('shop-images').getPublicUrl(path);
      return { url: data.publicUrl };
    }
    // local mode: data URL ขนาดเล็ก
    const blob = await resizeImage(file, 480, 0.7);
    const url = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
      r.readAsDataURL(blob);
    });
    return { url };
  } catch (e) {
    return { error: (e as Error).message };
  }
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
