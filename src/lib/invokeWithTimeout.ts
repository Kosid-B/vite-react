import { supabase } from './supabase';

type FnResult<T> = { data: T | null; error: Error | null };

/**
 * เรียก Supabase Edge Function พร้อม timeout กันหน้าจอค้าง
 * ถ้าเซิร์ฟเวอร์ไม่ตอบภายใน timeoutMs จะคืน error แทนการค้างแช่ที่ "กำลังคิด…"
 * ใช้แทน supabase.functions.invoke ได้ตรง ๆ (signature เหมือนกัน)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function invokeFn<T = any>(
  name: string,
  options?: { body?: Record<string, unknown>; headers?: Record<string, string> },
  timeoutMs = 45000,
): Promise<FnResult<T>> {
  if (!supabase) return { data: null, error: new Error('Supabase ยังไม่ถูกตั้งค่า') };
  const timeout = new Promise<FnResult<T>>((resolve) =>
    setTimeout(
      () =>
        resolve({
          data: null,
          error: new Error(
            `หมดเวลา ${Math.round(timeoutMs / 1000)} วินาที — เซิร์ฟเวอร์ไม่ตอบ กรุณาลองใหม่อีกครั้ง`,
          ),
        }),
      timeoutMs,
    ),
  );
  const call = supabase.functions.invoke<T>(name, options) as unknown as Promise<FnResult<T>>;
  return Promise.race([call, timeout]);
}
