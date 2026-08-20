import { useEffect } from 'react';
import { track } from '../lib/analytics';
import { scrollPct, crossedMilestones, createRageDetector, sectionInView, SECTION_THRESHOLDS } from '../lib/funnelTrace';
import {
  initLandingFunnel, markLandingScroll, markLandingDwell, flush,
  markSectionEnter, markSectionExit, closeOpenSections,
} from '../lib/landingFunnel';

/* ===== useLandingTrace — วัดความลึกของความสนใจบน Landing (PDPA-safe) =====
 * ส่ง 2 ทาง (anonymous · ไม่เก็บ PII · ไม่บันทึก cursor path):
 *   1) GA event รวม: landing_scroll_depth · landing_dwell · landing_exit_depth · landing_rage_click
 *   2) first-party funnel → Supabase (initLandingFunnel + markScroll/markDwell) ให้ดูในแอปได้จริง
 *      = ตอบ "คนค้างตรงไหน/หยุดดูนานไหม/ไม่กดสมัคร" โดยไม่ต้องพึ่ง GA4
 * เรียกครั้งเดียวใน LandingPage — เก็บ state ใน closure ไม่พึ่ง re-render */

const SCROLL_MS = [25, 50, 75, 90];
const DWELL_SEC = [10, 30, 60];

export function useLandingTrace(
  seg = 'default',
  enabled = true,
  /** กลุ่ม A/B อื่นของผู้เยี่ยมชมคนนี้ — ผูกเข้าฐานข้อมูลเราด้วย ไม่ใช่ส่งเข้า GA อย่างเดียว
   *  รับเป็นค่าเดี่ยว ไม่ใช่ออบเจกต์ เพราะออบเจกต์สร้างใหม่ทุก render จะทำให้ effect รันซ้ำ */
  heroAb?: string,
  layoutAb?: string,
): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') return;

    // first-party funnel — เริ่มเซสชัน (ส่ง "เข้าดู" ทันที) · ref จำแนกจาก referrer แบบ PDPA-safe
    try { initLandingFunnel(seg, document.referrer, window.location.origin, { heroAb, layoutAb }); } catch { /* noop */ }

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

    /* ⚠️ ตัวจับเวลา "อยู่บนหน้ากี่วินาที" ต้องหยุดเมื่อออกจากหน้าแล้ว
     * บั๊กเดิม (พบจากข้อมูลจริง 17 ส.ค. 2569): setTimeout ยังเดินต่อหลังผู้ใช้สลับแอป
     *   → คนเปิดดู 5 วิแล้วสลับไปแอปอื่น (พฤติกรรมปกติมากบนมือถือ) ถูกบันทึกเป็น 30 หรือ 60 วิ
     *   → ในฐานข้อมูลจริงมี 22 คนที่ "อยู่ ≥30 วิ แต่ไม่เลื่อนเลยแม้แต่พิกเซลเดียว"
     *   → ค่าเฉลี่ย "หยุดดู 38 วิ" บนแผงแอดมินจึงสูงกว่าความจริง
     * แก้: เคลียร์ตัวจับเวลาตอนออก + ไม่บันทึกถ้าหน้าไม่ได้อยู่ในสายตาแล้ว */
    let timers: number[] = [];

    const fireExit = () => {
      if (exited) return;
      exited = true;
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
      measure(); // วัด scroll ครั้งสุดท้ายก่อนส่ง — กันกรณีเลื่อนแล้วปิดทันทีก่อน debounce ทำงาน
      track('landing_exit_depth', { pct: maxPct });
      markLandingDwell(Math.round((Date.now() - startedAt) / 1000)); // เวลารวมบนหน้า
      closeOpenSections(); // ปิดส่วนที่ยังอยู่ในจอ ไม่งั้นส่วนที่เขาค้างอ่านอยู่ตอนปิดหน้าจะนับเป็น 0
      flush(true, true); // ปิดท้าย: ส่งแบบ keepalive (ไม่งั้นเบราว์เซอร์ยกเลิกคำขอตอนปิดหน้า)
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') fireExit(); };

    timers = DWELL_SEC.map((sec) =>
      window.setTimeout(() => {
        // เบราว์เซอร์หน่วง timer ในแท็บพื้นหลังแทนที่จะยกเลิก — ต้องกันซ้ำอีกชั้น
        if (exited || document.visibilityState !== 'visible') return;
        track('landing_dwell', { sec });
        markLandingDwell(sec);
      }, sec * 1000));

    /* ส่วนไหนอยู่ในจอบ้าง — อ่านจาก data-sec="<key>" ที่ LandingPage ติดไว้
     * เกณฑ์อยู่ใน sectionInView (funnelTrace.ts) — เห็นครึ่งบล็อก "หรือ" บล็อกกินครึ่งจอ
     * 🔴 เดิมใช้ threshold 0.5 ล้วน ⇒ บล็อกที่สูงเกิน 2 เท่าของจอ (quickcheck/pricing/roadmap
     *    บนมือถือ) เข้าเกณฑ์ไม่ได้เลยแม้แต่ครั้งเดียว = เวลาที่คนใช้กับสองบล็อกนั้นเป็น 0 ตลอด */
    let io: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        const vh = window.innerHeight;
        for (const e of entries) {
          const key = (e.target as HTMLElement).dataset.sec;
          if (!key) continue;
          if (sectionInView(e.intersectionRatio, e.intersectionRect.height, vh)) markSectionEnter(key);
          else markSectionExit(key);
        }
      }, { threshold: SECTION_THRESHOLDS });
      document.querySelectorAll('[data-sec]').forEach((el) => io!.observe(el));
    }

    measure(); // วัดจุดเริ่มต้น (เผื่อหน้าสั้น = 100 ทันที)
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onClick, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', fireExit);

    return () => {
      io?.disconnect();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', fireExit);
      fireExit(); // ออกจากหน้า (unmount) = บันทึก depth + dwell สุดท้าย (เคลียร์ timer ให้ในตัว)
      timers.forEach((t) => window.clearTimeout(t)); // เผื่อ fireExit เคยถูกเรียกไปแล้ว
    };
  }, [enabled, seg, heroAb, layoutAb]);
}
