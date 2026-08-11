/* ===== Amplitude sink — product analytics (funnel · retention · behavioral) =====
 * ส่ง event ชุดเดียวกับ GA เข้า Amplitude ด้วย → ได้ funnel/retention cohort เชิงลึกที่ GA ทำยาก
 * ทำงานเฉพาะเมื่อมี VITE_AMPLITUDE_KEY (API key ฝั่ง client = public โดยดีไซน์ เหมือน GA id) —
 * ไม่มีคีย์ = no-op (โหมด local/ยังไม่ตั้งค่า) · นิรนาม 100%: device_id สุ่มฝั่ง client ไม่เก็บ PII
 * ไฟล์นี้แยกส่วน pure (buildAmplitudePayload) ให้ test ได้ · ส่วนส่งเป็น fire-and-forget เงียบเสมอ */

const AMP_KEY = (import.meta.env.VITE_AMPLITUDE_KEY as string | undefined)?.trim() || '';
const AMP_ENDPOINT = 'https://api2.amplitude.com/2/httpapi';
const DID_KEY = 'ceo_ai_amp_did';

export const isAmplitudeEnabled = Boolean(AMP_KEY);

/** device id นิรนาม คงที่ต่อ browser (ไม่ผูกตัวตน) */
export function amplitudeDeviceId(): string {
  try {
    let id = localStorage.getItem(DID_KEY);
    if (!id) {
      const g = globalThis as { crypto?: { randomUUID?: () => string } };
      id = g.crypto?.randomUUID ? g.crypto.randomUUID() : 'a-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(DID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export interface AmplitudeBody {
  api_key: string;
  events: Array<{
    event_type: string;
    device_id: string;
    time: number;
    platform: string;
    event_properties: Record<string, string | number>;
  }>;
}

/** สร้าง payload สำหรับ HTTP API v2 (pure — test ได้) */
export function buildAmplitudePayload(
  apiKey: string,
  deviceId: string,
  event: string,
  params: Record<string, string | number>,
  now: number,
): AmplitudeBody {
  return {
    api_key: apiKey,
    events: [{
      event_type: event,
      device_id: deviceId,
      time: now,
      platform: 'Web',
      event_properties: params,
    }],
  };
}

/** ส่ง event เข้า Amplitude (no-op ถ้าไม่มีคีย์) — เงียบเสมอ ไม่ทำ UX พัง */
export function sendAmplitude(event: string, params: Record<string, string | number> = {}): void {
  if (!AMP_KEY || typeof fetch === 'undefined') return;
  try {
    const body = buildAmplitudePayload(AMP_KEY, amplitudeDeviceId(), event, params, Date.now());
    fetch(AMP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true, // ให้ส่งจบแม้ผู้ใช้ปิดหน้า (เช่น exit_depth)
    }).catch(() => {});
  } catch { /* noop */ }
}
