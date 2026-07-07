import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* ค่า public (ไม่ใช่ secret) ของ production Supabase — publishable key + URL เปิดเผยได้โดยดีไซน์
 * (อยู่ใน wrangler.jsonc vars อยู่แล้ว). ใช้เป็น fallback เฉพาะ "production build" เพื่อให้เว็บ
 * ต่อ backend ได้แน่นอนแม้ build ไม่ได้ inject VITE_SUPABASE_* — กันเคส deploy หลุด local-mode */
const PROD_FALLBACK_URL = 'https://waigsnxhrlwtiotspaim.supabase.co';
const PROD_FALLBACK_KEY = 'sb_publishable_Tf6Q7Mq6I2OLtfXot-EWJA_FESohA9E';

// npm run dev (import.meta.env.PROD = false) → ไม่ fallback = local-mode เหมือนเดิม
// production build (vite build) → ถ้าไม่มี env จริง ใช้ fallback สาธารณะ
const prodFallbackUrl = import.meta.env.PROD ? PROD_FALLBACK_URL : undefined;
const prodFallbackKey = import.meta.env.PROD ? PROD_FALLBACK_KEY : undefined;

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || prodFallbackUrl;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || prodFallbackKey;

/** เปิดใช้ Supabase เมื่อมี url+key ครบ ไม่งั้นแอปจะรันโหมด local (localStorage) */
export const isSupabaseEnabled = Boolean(SUPABASE_URL && anonKey);

export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(SUPABASE_URL!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
