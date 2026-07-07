import { supabase } from './supabase';

const BASE = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export interface AssistParams {
  page: string;
  pageLabel: string;
  instruction: string;
  context: string;
}

/**
 * (ข) เรียก ai-assist แบบ streaming (SSE) — ข้อความทยอยมาทีละส่วน
 * ต้องมี ai-assist เวอร์ชันที่รองรับ stream:true; ถ้าไม่รองรับจะ throw ให้ caller fallback ไปแบบเดิม
 * คืนข้อความเต็มเมื่อจบ
 */
export async function streamAssist(
  params: AssistParams,
  onDelta: (chunk: string, full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!supabase || !BASE) throw new Error('supabase_disabled');
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? ANON;

  const res = await fetch(`${BASE}/functions/v1/ai-assist`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: ANON,
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...params, stream: true }),
    signal,
  });

  if (!res.ok || !res.body) throw new Error(`stream_http_${res.status}`);
  const ctype = res.headers.get('content-type') ?? '';
  if (!ctype.includes('text/event-stream')) throw new Error('not_a_stream');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const payload = t.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let obj: { text?: string; error?: string };
      try { obj = JSON.parse(payload); } catch { continue; }
      if (obj.error) throw new Error(obj.error);
      if (obj.text) { full += obj.text; onDelta(obj.text, full); }
    }
  }
  return full;
}
