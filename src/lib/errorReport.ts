import { track } from './analytics';

/**
 * รายงาน error จากฝั่ง client ไป 2 ทาง (เห็นปัญหา production ก่อนผู้ใช้แจ้ง):
 *   1) GA4 event 'js_error' — ดูใน Analytics
 *   2) beacon → /api/client-error — worker log ให้ Cloudflare observability เก็บ (ไม่โดน ad-block เท่า GA)
 * ออกแบบให้ "พังไม่ได้" — ตัว reporter เองต้องไม่ทำแอปล่ม + throttle กัน error loop
 */
let count = 0;
const seen = new Set<string>();

export function reportError(err: unknown, source: string): void {
  try {
    const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err));
    const msg = (e.message || 'unknown').slice(0, 200);
    const key = source + ':' + msg.slice(0, 80);
    if (seen.has(key) || count >= 25) return; // กัน flood/loop
    seen.add(key); count++;

    const path = typeof location !== 'undefined' ? location.pathname : '';
    track('js_error', { message: msg, source, path });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const payload = JSON.stringify({
        message: msg, source, path,
        stack: (e.stack || '').slice(0, 1000),
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        ts: Date.now(),
      });
      navigator.sendBeacon('/api/client-error', new Blob([payload], { type: 'application/json' }));
    }
  } catch { /* ห้ามให้ตัว reporter ทำแอปพัง */ }
}

/** จับ error ที่หลุดนอก React (async / event handler / promise reject) */
export function installGlobalErrorReporting(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (ev) => reportError(ev.error ?? ev.message, 'window.error'));
  window.addEventListener('unhandledrejection', (ev) => reportError(ev.reason, 'unhandledrejection'));
}
