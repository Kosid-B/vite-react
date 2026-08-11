/* guestAi — เรียก AI จริงแบบ guest (ไม่ล็อกอิน) ผ่าน Worker /api/guest-ask
 * แก้ pain "คิดว่าต้องสมัครถึงใช้ AI ได้" — ให้เห็นค่าจริงก่อนสมัคร (โควตา token/IP/วัน ฝั่ง server)
 * "คนดูนาน (engagement สูง) ได้ token ฟรีมากกว่า" — ส่ง tier จากพฤติกรรมการดูหน้า (landing_funnel)
 * คืน null เมื่อไม่มี Worker (local dev / preview ที่ไม่ใช่ ceoaithailand.org) → UI แสดง fallback สุภาพ */

import { engagementTier } from './tokenEconomics';
import { currentEngagement } from './landingFunnel';

export interface GuestAiResult {
  summary: string;
  suggestions: string[];
  guestTokensLeft?: number;
  capped?: boolean;
}

export async function guestAskAi(text: string): Promise<GuestAiResult | null> {
  const q = (text || '').trim();
  if (!q) return null;
  // จัดระดับ engagement จากพฤติกรรมการดูหน้า (dwell/scroll/CTA) → คนตั้งใจดูได้ token ฟรีมากกว่า
  let tier = 'cold';
  try { tier = engagementTier(currentEngagement()); } catch { /* default cold */ }
  try {
    const res = await fetch('/api/guest-ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: q.slice(0, 1000), tier }),
    });
    if (!res.ok) return null;                       // 404 (ไม่มี worker) / 5xx → fallback
    const data = (await res.json()) as Partial<GuestAiResult> & { error?: string };
    if (data.error || typeof data.summary !== 'string') return null;
    return {
      summary: data.summary,
      suggestions: Array.isArray(data.suggestions) ? data.suggestions.slice(0, 5) : [],
      guestTokensLeft: typeof data.guestTokensLeft === 'number' ? data.guestTokensLeft : undefined,
      capped: !!data.capped,
    };
  } catch {
    return null;                                    // เครือข่ายล้ม → fallback
  }
}
