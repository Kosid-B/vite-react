/* reachFunnel — เชื่อม "ฝั่งแพลตฟอร์ม" (วิว) เข้ากับ "ฝั่งเว็บ" (คนมาถึงจริง)
 *
 * คำถามที่ตอบไม่ได้มาตลอด: **คลิปที่ได้ 15,900 วิว พาคนมาถึงเว็บกี่คน**
 *   เรามีตัวเลขสองฝั่งแยกกัน แต่ไม่เคยเอามาวางต่อกัน → ตัดสินใจจากยอดวิวซึ่งไม่ใช่ผลลัพธ์
 *
 * ข้อเท็จจริงที่วัดได้จริง 16 ส.ค. 2569 (TikTok · ลิงก์อยู่ในไบโอ):
 *   วิว 15,900 → เข้าโปรไฟล์ **11 คน** → เพดานคนกดลิงก์ = 11 ไม่ว่าคลิปจะดังแค่ไหน
 *   นี่คือ 0.07% และมันไม่ได้เกิดจากคอนเทนต์ไม่ดี — คนดูจบ 89% ด้วยซ้ำ
 *   มันเกิดจาก **โครงสร้างของแพลตฟอร์ม**: ลิงก์อยู่ในไบโอ = ต้องเข้าโปรไฟล์ก่อนถึงจะเห็น
 *
 * ⇒ บทสรุปที่ตัวเลขนี้บังคับ: ถ้าเพดานอยู่ที่ "ขั้นเข้าโปรไฟล์"
 *   **การทำคลิปให้ดังขึ้นไม่ช่วยอะไรเลย** ต้องย้ายลิงก์ไปที่คอมเมนต์ (เห็นได้โดยไม่ต้องเข้าโปรไฟล์)
 *   นี่คือความต่างระหว่าง "ทำงานหนักขึ้น" กับ "ทำงานถูกจุด"
 *
 * pure ทั้งไฟล์ · ทุกตัวเลขต้องมาจากที่ผู้ใช้กรอก/ระบบวัด ห้ามประมาณให้
 */

/** ลิงก์วางไว้ที่ไหน — ตัวกำหนดว่ามีเพดาน "ต้องเข้าโปรไฟล์ก่อน" หรือไม่ */
export type LinkPlacement = 'bio' | 'comment' | 'description' | 'unknown';

export interface PlatformReach {
  platform: string;
  label: string;
  /** ยอดวิว/การเข้าถึงในช่วงที่ดู */
  views: number;
  /** คนที่กดเข้าโปรไฟล์ · null = ไม่ทราบ (แพลตฟอร์มไม่บอก หรือยังไม่ได้ดู) */
  profileVisits?: number | null;
  /** คนที่มาถึงเว็บเราจริง — มาจาก landing_funnel (ต้องติดแท็ก ?s= ถึงจะนับได้) */
  arrivals: number;
  linkPlacement: LinkPlacement;
}

/** ขั้นที่เป็นคอขวดจริง */
export type CeilingStep = 'to_profile' | 'to_click' | 'to_view' | 'none' | 'unknown';

export interface ReachRow extends PlatformReach {
  /** วิว → มาถึงเว็บ (%) — ตัวเลขที่ควรใช้ตัดสินใจ ไม่ใช่ยอดวิว */
  passThroughPct: number;
  /** วิว → เข้าโปรไฟล์ (%) · null = ไม่ทราบ */
  toProfilePct: number | null;
  /** เข้าโปรไฟล์ → มาถึงเว็บ (%) · null = ไม่ทราบ */
  profileToWebPct: number | null;
  ceiling: CeilingStep;
  /** เพดานจำนวนคนสูงสุดที่เป็นไปได้ในโครงสร้างปัจจุบัน · null = ไม่มีเพดานที่วัดได้ */
  ceilingCount: number | null;
  verdict: string;
}

/** ต่ำกว่านี้ถือว่าขั้น "เข้าโปรไฟล์" คือคอขวด (ไม่ใช่คอนเทนต์)
 *  อ้างอิงของจริง: 11/15,900 = 0.07% */
export const PROFILE_STEP_FLOOR_PCT = 1;
/** ต้องมีวิวอย่างน้อยเท่านี้ถึงจะอ่านอัตราส่วนได้ — น้อยกว่านี้คือความบังเอิญ */
export const MIN_VIEWS_FOR_RATE = 500;

const pct = (a: number, b: number): number => (b > 0 ? Math.round((a / b) * 10000) / 100 : 0);

export function reachRow(p: PlatformReach): ReachRow {
  const toProfilePct = p.profileVisits == null ? null : pct(p.profileVisits, p.views);
  const profileToWebPct = p.profileVisits == null || p.profileVisits === 0
    ? null : pct(p.arrivals, p.profileVisits);
  const passThroughPct = pct(p.arrivals, p.views);

  let ceiling: CeilingStep = 'unknown';
  let ceilingCount: number | null = null;
  let verdict = '';

  if (p.views < MIN_VIEWS_FOR_RATE) {
    ceiling = 'to_view';
    verdict = `วิวยังน้อย (${p.views}) — ยังอ่านอัตราส่วนไม่ได้ คอขวดคือ "ยังไม่มีคนเห็น"`;
  } else if (toProfilePct !== null && toProfilePct < PROFILE_STEP_FLOOR_PCT && p.linkPlacement === 'bio') {
    ceiling = 'to_profile';
    ceilingCount = p.profileVisits ?? null;
    verdict =
      `เพดานอยู่ที่ขั้น "เข้าโปรไฟล์" — วิว ${p.views.toLocaleString()} แต่เข้าโปรไฟล์แค่ ${p.profileVisits} ` +
      `(${toProfilePct}%) · ลิงก์อยู่ในไบโอ ⇒ คนกดลิงก์ได้มากสุด ${p.profileVisits} คน ` +
      `**ทำคลิปให้ดังขึ้นไม่ช่วย** — ต้องย้ายลิงก์ไปคอมเมนต์`;
  } else if (p.arrivals === 0) {
    ceiling = 'to_click';
    verdict = p.linkPlacement === 'unknown'
      ? `มีวิว ${p.views.toLocaleString()} แต่ไม่มีใครมาถึงเว็บเลย — และเราไม่รู้ว่าลิงก์วางไว้ตรงไหน (ติดแท็ก ?s= ก่อน)`
      : `มีวิว ${p.views.toLocaleString()} แต่ไม่มีใครมาถึงเว็บเลย — ปัญหาอยู่ที่ "เห็นแล้วไม่กด" ไม่ใช่ "ไม่มีคนเห็น"`;
  } else if (toProfilePct !== null && toProfilePct >= PROFILE_STEP_FLOOR_PCT && profileToWebPct !== null && profileToWebPct < 30) {
    ceiling = 'to_click';
    verdict = `คนเข้าโปรไฟล์ ${p.profileVisits} แต่กดลิงก์ต่อ ${p.arrivals} (${profileToWebPct}%) — คอขวดคือไบโอไม่ชวนให้กด`;
  } else {
    ceiling = 'none';
    verdict = `วิว → เว็บ ${passThroughPct}% (${p.arrivals} จาก ${p.views.toLocaleString()}) — ไม่มีขั้นไหนตันชัดเจน เพิ่มวิวได้ผลตรง ๆ`;
  }

  return { ...p, passThroughPct, toProfilePct, profileToWebPct, ceiling, ceilingCount, verdict };
}

export function reachRows(list: PlatformReach[]): ReachRow[] {
  return list.map(reachRow).sort((a, b) => b.views - a.views);
}

/** สรุปว่าควรทุ่มแรงไปทางไหน — จากคอขวดจริง ไม่ใช่จากแพลตฟอร์มที่วิวเยอะสุด */
export function reachAdvice(rows: ReachRow[]): string {
  if (rows.length === 0) return 'ยังไม่มีข้อมูลฝั่งแพลตฟอร์ม — กรอกยอดวิว/เข้าโปรไฟล์เข้ามาก่อน';

  const blockedAtProfile = rows.filter((r) => r.ceiling === 'to_profile');
  if (blockedAtProfile.length > 0) {
    const worst = blockedAtProfile.sort((a, b) => b.views - a.views)[0];
    const wasted = worst.views - (worst.ceilingCount ?? 0);
    return (
      `${worst.label}: มีคนเห็น ${worst.views.toLocaleString()} คน แต่โครงสร้างลิงก์กั้นไว้ที่ ${worst.ceilingCount} คน ` +
      `— ${wasted.toLocaleString()} คนไม่มีทางกดถึงเราได้เลยแม้อยากกด · ` +
      `แก้ที่เดียว: ปักลิงก์ในคอมเมนต์ (เห็นใต้คลิป ไม่ต้องเข้าโปรไฟล์) ก่อนจะไปทำคลิปเพิ่ม`
    );
  }

  const noArrivals = rows.filter((r) => r.ceiling === 'to_click' && r.arrivals === 0);
  if (noArrivals.length > 0) {
    return `${noArrivals.map((r) => r.label).join(' · ')}: มีคนเห็นแต่ไม่มีใครมาถึงเว็บ — ปัญหาคือ "เห็นแล้วไม่กด" แก้ที่ตอนจบคลิป/คำชวน ไม่ใช่จำนวนคลิป`;
  }

  const best = rows.filter((r) => r.ceiling === 'none').sort((a, b) => b.passThroughPct - a.passThroughPct)[0];
  if (best) return `${best.label} ส่งคนมาได้ดีที่สุด (${best.passThroughPct}%) และไม่มีขั้นไหนตัน — ทุ่มวิวไปทางนี้ได้ผลตรง ๆ`;
  return 'ทุกแพลตฟอร์มยังมีคนเห็นน้อยเกินจะสรุป — คอขวดคือปริมาณคอนเทนต์';
}
