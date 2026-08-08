import { useEffect, useRef, useState } from 'react';

/** true ถ้าผู้ใช้ตั้งค่าลดการเคลื่อนไหว (accessibility) */
export function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

/** count-up ตัวเลข (easeOutCubic) — จังหวะ "ลุ้น-เผย" กระตุ้นความสนใจ
 *  เคารพ prefers-reduced-motion (กระโดดไปค่าเป้าหมายทันที) */
export function useCountUp(target: number, ms = 2800): number {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    if (prefersReducedMotion() || from === target) { fromRef.current = target; setVal(target); return; }
    let raf = 0; let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}
