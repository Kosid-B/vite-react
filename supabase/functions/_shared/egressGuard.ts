// egressGuard.ts — จำกัดการเชื่อมต่อออกนอกของ AI/Edge Functions ให้เฉพาะบริการที่อนุมัติ (allowlist)
// defense-in-depth: ต่อให้โค้ดในอนาคตเผลอ fetch host แปลก ๆ ก็จะถูกบล็อกทันที
// (AI ในระบบผลิตแค่ข้อความอยู่แล้ว ไม่มีช่อง fetch URL อิสระ — นี่คือชั้นกันเผื่อไว้)

/** โฮสต์ที่อนุญาตให้เชื่อมต่อออก — บริการหลักที่ระบบต้องใช้จริงเท่านั้น */
export const ALLOWED_HOSTS: readonly string[] = [
  'google.serper.dev',      // Google Search (หาข้อมูลให้ AI)
  'api.anthropic.com',      // Claude API (ประมวลผลภาษา)
];

/** host นี้อยู่ใน allowlist ไหม (รองรับ subdomain ของ host ที่อนุญาต) */
export function isAllowedHost(rawUrl: string): boolean {
  let host: string;
  try { host = new URL(rawUrl).hostname.toLowerCase(); } catch { return false; }
  return ALLOWED_HOSTS.some((h) => host === h || host.endsWith('.' + h));
}

/** fetch ที่บังคับ allowlist — โยน error ถ้าปลายทางไม่อยู่ในรายชื่อที่อนุมัติ */
export function guardedFetch(url: string, init?: RequestInit): Promise<Response> {
  if (!isAllowedHost(url)) {
    throw new Error(`egress blocked: host not in allowlist (${(() => { try { return new URL(url).hostname; } catch { return 'invalid-url'; } })()})`);
  }
  return fetch(url, init);
}
