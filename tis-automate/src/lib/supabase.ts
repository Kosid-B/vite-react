import { createClient } from '@supabase/supabase-js';

/** TIS Automate — Supabase project แยกจาก CEO AI Thailand (Backend Constraint: Supabase-first)
 *  ค่า default ชี้ project จริง (galtbbkcddugnsfkgyqm) — override ได้ผ่าน .env
 *  ใช้ publishable key (sb_publishable_…) ซึ่งออกแบบมาให้ฝังฝั่ง client ได้โดยตรง */
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://galtbbkcddugnsfkgyqm.supabase.co';
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'sb_publishable__FxwCTv8Cij9FnS6fxCUig_RczqazCT';

export const supabase = createClient(url, publishableKey);
