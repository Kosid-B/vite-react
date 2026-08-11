/* landingAb — A/B holdout บนหน้า Landing: "2 ส่วนใหม่ช่วย conversion จริงไหม?" (pure, tested)
 *
 * ทดสอบ: กลุ่ม 'show' เห็นทั้ง 2 ส่วน (ลอง AI จริง GuestAiTry + จัดการความกลัว AI WhyTrustAi)
 *         vs กลุ่ม 'control' ไม่เห็นทั้งคู่ → เทียบ signup rate ว่าเพิ่มขึ้นจริงไหม
 * assign แบบ deterministic จาก session id (นิรนาม) — คงกลุ่มเดิมทุกครั้งที่กลับมา (ไม่เอนเอียง)
 * บันทึกกลุ่มลง landing_funnel.ab → admin เทียบผลใน GrowthDashboard */

export type LandingVariant = 'control' | 'show';

/** เวอร์ชันการทดลอง — เปลี่ยนเมื่อเริ่มรอบใหม่ (ให้ผู้เยี่ยมชมเดิมถูก re-assign แบบสะอาด) */
export const LANDING_AB_ID = 'new_sections_v1';

/** สัดส่วนกลุ่ม control (holdout) — 0.5 = 50/50 · ปรับลงเพื่อลดต้นทุน holdout ได้ (เช่น 0.3) */
export const CONTROL_SHARE = 0.5;

/** hash เสถียร (djb2) — แบ่งกลุ่มคงที่ต่อ session (ไม่พึ่ง Math.random ที่เปลี่ยนทุกครั้ง) */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** กลุ่ม A/B ของผู้เยี่ยมชม (deterministic จาก session id + เวอร์ชันการทดลอง) */
export function landingVariant(sessionId: string, controlShare: number = CONTROL_SHARE): LandingVariant {
  const share = Math.max(0, Math.min(1, controlShare));
  const bucket = (hashStr(`${LANDING_AB_ID}:${sessionId || 'anon'}`) % 1000) / 1000; // 0..0.999
  return bucket < share ? 'control' : 'show';
}

/** กลุ่มนี้ควรเห็น 2 ส่วนใหม่ไหม */
export function showNewSections(v: LandingVariant): boolean {
  return v === 'show';
}

// ── วิเคราะห์ผล (ฝั่ง admin) ────────────────────────────────────────────────
export interface AbCell { total: number; signup: number; cta: number }

export interface AbVariantStat {
  variant: string;
  total: number;
  signup: number;
  cta: number;
  signupRate: number; // % ของผู้เข้าชมในกลุ่มที่ "ตั้งใจสมัคร"
  ctaRate: number;    // % ที่กด CTA
}

/** แปลง by_ab (จาก landing_funnel_agg) → สถิติต่อกลุ่ม (เรียง show ก่อน control) */
export function landingAbStats(byAb: Record<string, Partial<AbCell>> | null | undefined): AbVariantStat[] {
  const order = (k: string) => (k === 'show' ? 0 : k === 'control' ? 1 : 2);
  return Object.entries(byAb ?? {})
    .map(([variant, c]) => {
      const total = Math.max(0, c?.total ?? 0);
      const signup = Math.max(0, c?.signup ?? 0);
      const cta = Math.max(0, c?.cta ?? 0);
      return {
        variant, total, signup, cta,
        signupRate: total > 0 ? +((signup / total) * 100).toFixed(1) : 0,
        ctaRate: total > 0 ? +((cta / total) * 100).toFixed(1) : 0,
      };
    })
    .sort((a, b) => order(a.variant) - order(b.variant) || a.variant.localeCompare(b.variant));
}

/** ตัวอย่างขั้นต่ำต่อกลุ่มก่อนสรุปผล (กัน noise ตอนข้อมูลน้อย) */
export const MIN_SAMPLE_PER_ARM = 30;

export interface AbVerdict {
  ready: boolean;              // ข้อมูลพอสรุปหรือยัง
  show?: AbVariantStat;
  control?: AbVariantStat;
  liftPct?: number;            // signupRate(show) − signupRate(control) เป็น "จุด %" (absolute)
  relLiftPct?: number;         // เพิ่มขึ้นกี่ % เทียบ control (relative)
  winner?: 'show' | 'control' | 'tie';
  message: string;
}

/** สรุปผล show vs control: พร้อมสรุปไหม + ใครชนะ + lift */
export function landingAbVerdict(byAb: Record<string, Partial<AbCell>> | null | undefined): AbVerdict {
  const stats = landingAbStats(byAb);
  const show = stats.find(s => s.variant === 'show');
  const control = stats.find(s => s.variant === 'control');
  if (!show || !control || show.total < MIN_SAMPLE_PER_ARM || control.total < MIN_SAMPLE_PER_ARM) {
    const need = MIN_SAMPLE_PER_ARM;
    return {
      ready: false, show, control,
      message: `ข้อมูลยังไม่พอสรุป — ต้องมีอย่างน้อย ${need} ผู้เข้าชม/กลุ่ม (ตอนนี้ show ${show?.total ?? 0}, control ${control?.total ?? 0})`,
    };
  }
  const liftPct = +(show.signupRate - control.signupRate).toFixed(1);
  const relLiftPct = control.signupRate > 0 ? +(((show.signupRate - control.signupRate) / control.signupRate) * 100).toFixed(0) : null;
  const winner: 'show' | 'control' | 'tie' = liftPct > 0 ? 'show' : liftPct < 0 ? 'control' : 'tie';
  let message: string;
  if (winner === 'show') {
    message = `2 ส่วนใหม่ช่วยจริง — signup ${show.signupRate}% vs ${control.signupRate}% (+${liftPct} จุด${relLiftPct != null ? `, +${relLiftPct}%` : ''})`;
  } else if (winner === 'control') {
    message = `กลุ่มไม่เห็น 2 ส่วนกลับ signup สูงกว่า (${control.signupRate}% vs ${show.signupRate}%) — ทบทวนเนื้อหา/ตำแหน่ง`;
  } else {
    message = `signup เท่ากันทั้งสองกลุ่ม (${show.signupRate}%) — ยังไม่ต่างชัด`;
  }
  return { ready: true, show, control, liftPct, relLiftPct: relLiftPct ?? undefined, winner, message };
}
