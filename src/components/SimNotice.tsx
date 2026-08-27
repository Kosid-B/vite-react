import { useEffect, useRef } from 'react';
import { SIM_NOTICE, simNoticeActive } from '../lib/simNotice';
import { track } from '../lib/analytics';
import { useLandingTheme, LIGHT } from '../lib/landingTheme';

/* 🔴 หน้า Landing คุมธีมด้วย **React context** (`LandingThemeCtx`) ไม่ใช่ `data-theme` บน <html>
 *    ⇒ โทเคน CSS ทั่วระบบ (`var(--ink)` ฯลฯ) **ไม่พลิกตามปุ่มมินิมอลของหน้านี้**
 *    วัดจริง 27 ส.ค. 2569: ใช้โทเคนแล้วได้ contrast **1.02** ในโหมดมินิมอล (ตัวหนังสือเข้มบนพื้นเข้ม)
 *    ⇒ คอมโพเนนต์ของหน้านี้ต้องรับสีจาก `useLandingTheme()` เหมือนตัวอื่นทั้งหมด
 *    (บทเรียนกว้าง: ในรีโปนี้มีระบบธีม **สองระบบ** — เลือกผิดระบบ = สีไม่พลิกโดยไม่มีใครรู้) */
const DARK_C = {
  bg: 'rgba(245,158,11,0.10)', line: '#f59e0b',
  ink: '#f8fafc', sub: '#94a3b8',
};
const LIGHT_C: typeof DARK_C = {
  bg: 'rgba(245,158,11,0.16)', line: '#b45309',
  ink: LIGHT.ink, sub: LIGHT.slate,
};

/* แถบประกาศชั่วคราว — วางเหนือ hero โดย **ไม่ติดป้ายส่วน** โดยตั้งใจ
 *   (ไม่ยกชื่อแอตทริบิวต์นั้นมาเขียนตรง ๆ เพราะเทสต์สแกนไฟล์นี้ว่าต้องไม่มี —
 *    ยกมาเมื่อไรตัวตรวจจะจับตัวเอง แล้วเราจะแก้ด้วยการยกเว้นตัวเอง = ช่องโหว่ถาวร)
 *   · ไม่ติดป้าย ⇒ ไม่เข้าไปอยู่ในจังหวะอารมณ์ของหน้า (emotionalArc) ที่หนี้เป็น 0 พอดี
 *   · ไม่แทรกระหว่าง hero กับเครื่องคำนวณ ⇒ กฎ "quickcheck ต้องอยู่ติดใต้ hero" ไม่เสีย
 *   · หายเองเมื่อพ้นเส้นตาย ⇒ ค่าที่จ่ายด้วยพื้นที่จอแรกเป็นของชั่วคราวจริง ๆ
 * 🔴 พาไป "ค่ายมือถือ" ไม่ใช่พาเข้าระบบเรา — เรื่องนี้เราทำแทนไม่ได้ และบทความก็บอกแบบนั้น
 */
export default function SimNotice({ nowMs = Date.now() }: { nowMs?: number }) {
  const C = useLandingTheme() === 'minimal' ? LIGHT_C : DARK_C;
  const active = simNoticeActive(nowMs);
  const shown = useRef(false);

  useEffect(() => {
    if (!active || shown.current) return;
    shown.current = true;
    track('sim_notice_shown', {});
  }, [active]);

  if (!active) return null;

  return (
    <a
      className="lp-sim-notice"
      href={SIM_NOTICE.href}
      onClick={() => track('sim_notice_click', {})}
      style={{ background: C.bg, borderBottom: `2px solid ${C.line}`, color: C.ink }}
    >
      <strong style={{ color: C.ink }}>{SIM_NOTICE.headline}</strong>
      <span style={{ color: C.sub }}>{SIM_NOTICE.sub}</span>
    </a>
  );
}
