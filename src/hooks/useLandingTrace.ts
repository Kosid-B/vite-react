import { useEffect } from 'react';
import { track } from '../lib/analytics';
import { scrollPct, crossedMilestones, createRageDetector } from '../lib/funnelTrace';

/* ===== useLandingTrace — วัดความลึกของความสนใจบน Landing (PDPA-safe) =====
 * ส่ง GA event รวม (anonymous · ไม่เก็บ PII · ไม่บันทึก cursor path):
 *   landing_scroll_depth {pct}  — เลื่อนถึงกี่ % (ค้าง hero หรือลงลึก)
 *   landing_dwell {sec}         — อยู่บนหน้านานแค่ไหน (10/30/60 วิ)
 *   landing_exit_depth {pct}    — ★ ออกตอนเลื่อนไปกี่ % = จุดค้างที่แท้จริง
 *   landing_rage_click {}       — คลิกรัว = สัญญาณหงุดหงิด/ปุ่มไม่ตอบสนอง
 * เรียกครั้งเดียวใน LandingPage — เก็บ state ใน closure ไม่พึ่ง re-render */

const SCROLL_MS = [25, 50, 75, 90];
const DWELL_SEC = [10, 30, 60];

export function useLandingTrace(enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') return;

    let maxPct = 0;
    let exited = false;
    const rage = createRageDetector();

    const measure = () => {
      const doc = document.documentElement;
      const pct = scrollPct(window.scrollY, doc.scrollHeight, window.innerHeight);
      const crossed = crossedMilestones(maxPct, pct, SCROLL_MS);
      for (const m of crossed) track('landing_scroll_depth', { pct: m });
      if (pct > maxPct) maxPct = pct;
    };

    const onScroll = () => { window.requestAnimationFrame(measure); };

    const onClick = () => { if (rage.push(Date.now())) track('landing_rage_click', {}); };

    const fireExit = () => {
      if (exited) return;
      exited = true;
      track('landing_exit_depth', { pct: maxPct });
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') fireExit(); };

    const timers = DWELL_SEC.map((sec) =>
      window.setTimeout(() => track('landing_dwell', { sec }), sec * 1000));

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
      fireExit(); // ออกจากหน้า (unmount) = บันทึก depth สุดท้าย
    };
  }, [enabled]);
}
