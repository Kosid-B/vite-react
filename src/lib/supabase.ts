import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AppData } from '../types';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** เปิดใช้ Supabase เมื่อมี env ครบ ไม่งั้นแอปจะรันโหมด local (localStorage) */
export const isSupabaseEnabled = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

/**
 * โหลด AppData ของผู้ใช้ปัจจุบันจากตาราง app_state (1 แถวต่อ 1 ผู้ใช้/เวิร์กสเปซ)
 * คืน null ถ้ายังไม่มีข้อมูลในคลาวด์
 */
export async function cloudLoad(): Promise<AppData | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .maybeSingle();
  if (error) {
    console.warn('[supabase] cloudLoad error:', error.message);
    return null;
  }
  return (data?.data as AppData) ?? null;
}

/** บันทึก AppData ของผู้ใช้ปัจจุบันลงคลาวด์ (upsert ตาม user_id) */
export async function cloudSave(userId: string, data: AppData): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('app_state')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) console.warn('[supabase] cloudSave error:', error.message);
}
