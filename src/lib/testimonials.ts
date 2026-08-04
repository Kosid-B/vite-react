import { supabase, isSupabaseEnabled } from './supabase';

/* Platform Testimonials — รีวิว "ตัวระบบ CEO AI Thailand" จากสมาชิกจริง
 * flow: สมาชิกล็อกอินเขียน (pending) → แอดมินอนุมัติ → อ่านสาธารณะเฉพาะ approved → โชว์บน landing
 * ส่วน pure (validate/aggregate/format) แยกเทสต์ได้ · ส่วน async CRUD คุยกับ Supabase (RLS บังคับสิทธิ์จริงที่ DB) */

export type TestimonialStatus = 'pending' | 'approved' | 'rejected';

export interface Testimonial {
  id: string;
  authorName: string;
  companyName: string;
  role: string;
  rating: number;
  body: string;
  status: TestimonialStatus;
  featured: boolean;
  at?: string;         // YYYY-MM-DD
}

export interface TestimonialInput {
  workspaceId: string;
  authorName: string;
  companyName?: string;
  role?: string;
  rating: number;
  body: string;
}

export const BODY_MAX = 1000;
export const BODY_MIN = 10;

// ───────────────────────── pure helpers (tested) ─────────────────────────

/** ตรวจความถูกต้องก่อนส่ง (client-side gate; RLS + CHECK ที่ DB เป็นด่านจริง) */
export function validateTestimonial(input: Partial<TestimonialInput>): { ok: boolean; error?: string } {
  const rating = Math.round(Number(input.rating));
  if (!(rating >= 1 && rating <= 5)) return { ok: false, error: 'ให้คะแนน 1–5 ดาว' };
  const body = (input.body ?? '').trim();
  if (body.length < BODY_MIN) return { ok: false, error: `เขียนรีวิวอย่างน้อย ${BODY_MIN} ตัวอักษร` };
  if (body.length > BODY_MAX) return { ok: false, error: `รีวิวยาวเกินไป (สูงสุด ${BODY_MAX} ตัวอักษร)` };
  if (!(input.authorName ?? '').trim()) return { ok: false, error: 'กรุณาระบุชื่อที่จะแสดง' };
  if (!(input.workspaceId ?? '').trim()) return { ok: false, error: 'ต้องเข้าสู่ระบบเพื่อรีวิว' };
  return { ok: true };
}

/** ดาวเต็ม/ว่าง สำหรับแสดงผล (เช่น ★★★★☆) */
export function starString(rating: number): string {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

/** สรุปคะแนนเฉลี่ย + จำนวน (ใช้ทั้งบน landing และเตรียม AggregateRating schema เมื่อมีรีวิวจริงพอ) */
export function aggregateRating(list: Pick<Testimonial, 'rating'>[]): { average: number; count: number } {
  const count = list.length;
  if (count === 0) return { average: 0, count: 0 };
  const sum = list.reduce((a, t) => a + (Number(t.rating) || 0), 0);
  return { average: Math.round((sum / count) * 10) / 10, count };
}

/** จัดเรียงสำหรับ landing: featured ก่อน แล้วค่อยล่าสุด (คงลำดับเดิมเมื่อ featured เท่ากัน) */
export function orderForDisplay(list: Testimonial[]): Testimonial[] {
  return [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
}

function mapRow(r: Record<string, unknown>): Testimonial {
  return {
    id: String(r.id),
    authorName: String(r.author_name ?? ''),
    companyName: String(r.company_name ?? ''),
    role: String(r.role ?? ''),
    rating: Number(r.rating) || 0,
    body: String(r.body ?? ''),
    status: (String(r.status ?? 'pending') as TestimonialStatus),
    featured: Boolean(r.featured),
    at: r.created_at ? String(r.created_at).slice(0, 10) : undefined,
  };
}

// ───────────────────────── async CRUD ─────────────────────────

/** สาธารณะ (ไม่ต้องล็อกอิน): รีวิวที่อนุมัติแล้ว — featured ก่อน แล้วล่าสุด · ใช้บน landing */
export async function listApprovedTestimonials(limit = 12): Promise<Testimonial[]> {
  if (!isSupabaseEnabled || !supabase) return [];
  const { data } = await supabase
    .from('platform_testimonials')
    .select('id,author_name,company_name,role,rating,body,status,featured,created_at')
    .eq('status', 'approved')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapRow);
}

/** สมาชิก: รีวิวของ workspace ตัวเอง (เช็คว่าเคยส่งแล้ว/สถานะอนุมัติ) */
export async function myTestimonials(workspaceId: string): Promise<Testimonial[]> {
  if (!isSupabaseEnabled || !supabase || !workspaceId) return [];
  const { data } = await supabase
    .from('platform_testimonials')
    .select('id,author_name,company_name,role,rating,body,status,featured,created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapRow);
}

/** สมาชิกส่งรีวิว (status=pending รออนุมัติ) — RLS บังคับให้เป็นสมาชิก workspace จริง */
export async function submitTestimonial(input: TestimonialInput): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) return { ok: false, error: 'ต้องเข้าสู่ระบบเพื่อรีวิว' };
  const v = validateTestimonial(input);
  if (!v.ok) return v;
  const { error } = await supabase.from('platform_testimonials').insert({
    workspace_id: input.workspaceId,
    author_name: input.authorName.trim(),
    company_name: (input.companyName ?? '').trim(),
    role: (input.role ?? '').trim(),
    rating: Math.round(input.rating),
    body: input.body.trim(),
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** แอดมิน: คิวรออนุมัติ (RLS: is_app_admin เห็น pending ทุก workspace) */
export async function listPendingTestimonials(): Promise<Testimonial[]> {
  if (!isSupabaseEnabled || !supabase) return [];
  const { data } = await supabase
    .from('platform_testimonials')
    .select('id,author_name,company_name,role,rating,body,status,featured,created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapRow);
}

/** แอดมิน: อนุมัติ/ปฏิเสธ/ปักหมุด (RLS: update เฉพาะ is_app_admin) */
export async function moderateTestimonial(
  id: string,
  patch: { status?: TestimonialStatus; featured?: boolean; note?: string },
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) return { ok: false, error: 'ต้องเข้าสู่ระบบ' };
  const row: Record<string, unknown> = { reviewed_at: new Date().toISOString() };
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.featured !== undefined) row.featured = patch.featured;
  if (patch.note !== undefined) row.note = patch.note;
  const { error } = await supabase.from('platform_testimonials').update(row).eq('id', id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
