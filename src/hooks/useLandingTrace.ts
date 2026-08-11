import { useEffect } from 'react';
import { track } from '../lib/analytics';
import { scrollPct, crossedMilestones, createRageDetector } from '../lib/funnelTrace';
import { initLandingFunnel, markLandingScroll, markLandingDwell, flush } from '../lib/landingFunnel';

/* ===== useLandingTrace — วัดความลึกของความสนใจบน Landing (PDPA-safe) =====
 * ส่ง 2 ทาง (anonymous · ไม่เก็บ PII · ไม่บันทึก cursor path):
 *   1) GA event รวม: landing_scroll_depth · landing_dwell · landing_exit_depth · landing_rage_click
 *   2) first-party funnel → Supabase (initLandingFunnel + markScroll/markDwell) ให้ดูในแอปได้จริง
 *      = ตอบ "คนค้างตรงไหน/หยุดดูนานไหม/ไม่กดสมัคร" โดยไม่ต้องพึ่ง GA4
 * เรียกครั้งเดียวใน LandingPage — เก็บ state ใน closure ไม่พึ่ง re-render */

const SCROLL_MS = [25, 50, 75, 90];
const DWELL_SEC = [10, 30, 60];

export function useLandingTrace(seg = 'default', enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') return;

    // first-party funnel — เริ่มเซสชัน (ส่ง "เข้าดู" ทันที) · ref จำแนกจาก referrer แบบ PDPA-safe
    try { initLandingFunnel(seg, document.referrer, window.location.origin); } catch { /* noop */ }

    let maxPct = 0;
    let exited = false;
    const startedAt = Date.now();
    const rage = createRageDetector();

    const measure = () => {
      const doc = document.documentElement;
      const pct = scrollPct(window.scrollY, doc.scrollHeight, window.innerHeight);
      const crossed = crossedMilestones(maxPct, pct, SCROLL_MS);
      for (const m of crossed) track('landing_scroll_depth', { pct: m });
      if (pct > maxPct) { maxPct = pct; markLandingScroll(pct); }
    };

    const onScroll = () => { window.requestAnimationFrame(measure); };

    const onClick = () => { if (rage.push(Date.now())) track('landing_rage_click', {}); };

    const fireExit = () => {
      if (exited) return;
      exited = true;
      track('landing_exit_depth', { pct: maxPct });
      markLandingDwell(Math.round((Date.now() - startedAt) / 1000)); // เวลารวมบนหน้า
      flush(true); // ปิดท้าย: ส่ง snapshot สุดท้าย (scroll ลึกสุด + dwell)
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') fireExit(); };

    const timers = DWELL_SEC.map((sec) =>
      window.setTimeout(() => { track('landing_dwell', { sec }); markLandingDwell(sec); }, sec * 1000));

    measure(); // วัดจุดเริ่มต้น (เผื่อหน้าสั้น = 100 ทันที)
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onClick, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', fireExit);

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', fireExit);
      timers.forEach((t) => window.clearTimeout(t));
      fireExit(); // ออกจากหน้า (unmount) = บันทึก depth + dwell สุดท้าย
    };
  }, [enabled, seg]);
}
