/* guestAi — เรียก AI จริงแบบ guest (ไม่ล็อกอิน) ผ่าน Worker /api/guest-ask
 * แก้ pain "คิดว่าต้องสมัครถึงใช้ AI ได้" — ให้เห็นค่าจริงก่อนสมัคร (cap ต่อ IP/วัน ฝั่ง server)
 * คืน null เมื่อไม่มี Worker (local dev / preview ที่ไม่ใช่ ceoaithailand.org) → UI แสดง fallback สุภาพ */

export interface GuestAiResult {
  summary: string;
  suggestions: string[];
  guestRemaining?: number;
  capped?: boolean;
}

export async function guestAskAi(text: string): Promise<GuestAiResult | null> {
  const q = (text || '').trim();
  if (!q) return null;
  try {
    const res = await fetch('/api/guest-ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: q.slice(0, 1000) }),
    });
    if (!res.ok) return null;                       // 404 (ไม่มี worker) / 5xx → fallback
    const data = (await res.json()) as Partial<GuestAiResult> & { error?: string };
    if (data.error || typeof data.summary !== 'string') return null;
    return {
      summary: data.summary,
      suggestions: Array.isArray(data.suggestions) ? data.suggestions.slice(0, 5) : [],
      guestRemaining: typeof data.guestRemaining === 'number' ? data.guestRemaining : undefined,
      capped: !!data.capped,
    };
  } catch {
    return null;                                    // เครือข่ายล้ม → fallback
  }
}
