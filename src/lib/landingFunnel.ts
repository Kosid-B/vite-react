/* ===== Landing Funnel — first-party, PDPA-safe (Dark AI Marketing #7/#14/#15) =====
 * วัด "คนเข้า Landing กี่คน → หยุดดูนานไหม → เลื่อนลึกแค่ไหน → กด CTA → ตั้งใจสมัคร"
 * ที่ GA4 ตอบให้เห็นในแอปไม่ได้ (คนดูยังไม่ล็อกอิน) — เก็บเป็น first-party ใน Supabase
 * นิรนาม 100%: session = uuid สุ่มฝั่ง client · ไม่เก็บ PII / ไม่บันทึก cursor path / ไม่เก็บ URL
 * ไฟล์นี้แยก 2 ส่วน: (1) ตรรกะ pure (จำแนก referrer + คำนวณ step/leak) ให้ test ได้
 *                    (2) beacon ส่ง RPC track_landing (upsert monotonic) — no-op ในโหมด local */
import { supabase, isSupabaseEnabled } from './supabase';
import { landingVariant, type LandingVariant } from './landingAb';

// ── (1) ตรรกะ pure ───────────────────────────────────────────────────────────

export type RefKind = 'direct' | 'social' | 'search' | 'other';

const SOCIAL_HOSTS = ['facebook', 'fb.', 'instagram', 'l.instagram', 'lm.facebook', 'tiktok', 'line.', 'liff.', 't.co', 'twitter', 'x.com', 'youtube', 'youtu.be', 'linkedin', 'lnkd.in', 'messenger', 'pinterest', 'reddit'];
const SEARCH_HOSTS = ['google.', 'bing.', 'yahoo.', 'duckduckgo', 'baidu.', 'yandex.', 'ecosia.'];

/** จำแนกที่มาแบบ PDPA-safe จาก referrer (ไม่เก็บ URL เต็ม เก็บแค่ประเภท) */
export function refKind(referrer: string, origin: string): RefKind {
  const r = (referrer || '').toLowerCase().trim();
  if (!r) return 'direct';
  try {
    const host = new URL(r).hostname.toLowerCase();
    const org = origin ? new URL(origin).hostname.toLowerCase() : '';
    if (org && (host === org || host.endsWith('.' + org))) return 'direct'; // ลิงก์ภายในเว็บเดียวกัน
    if (SOCIAL_HOSTS.some((s) => host.includes(s))) return 'social';
    if (SEARCH_HOSTS.some((s) => host.includes(s))) return 'search';
    return 'other';
  } catch {
    return 'other';
  }
}

/** payload สรุปจาก RPC landing_funnel_agg */
export interface LandingAgg {
  total: number;
  engaged: number;   // เลื่อน ≥ 50%
  cta: number;       // กด CTA หลัก
  signup: number;    // กดสมัคร/เข้าสู่ระบบ
  avg_scroll: number;
  avg_dwell: number; // วินาที
  bounce: number;    // เข้ามาแล้วเด้งออก (<10 วิ และเลื่อน <25%)
  by_seg: Record<string, number>;
  by_ref: Record<string, number>;
  by_ab: Record<string, { total: number; signup: number; cta: number }>; // A/B: show/control/unset
}

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  pct: number;          // % จากยอดเข้าทั้งหมด (View = 100)
  dropFromPrev: number; // % ที่หลุดจากขั้นก่อนหน้า
}

/** แปลง agg → 4 ขั้น funnel (View → หยุดดู/เลื่อนลึก → กด CTA → ตั้งใจสมัคร) พร้อม drop-off */
export function landingFunnelSteps(agg: LandingAgg | null): FunnelStep[] {
  const total = agg?.total ?? 0;
  const raw = [
    { key: 'view', label: 'เข้าดู Landing', count: total },
    { key: 'engaged', label: 'สนใจจริง (เลื่อนผ่าน hero ≥ 50%)', count: agg?.engaged ?? 0 },
    { key: 'cta', label: 'กดปุ่มเริ่มใช้งาน (CTA)', count: agg?.cta ?? 0 },
    { key: 'signup', label: 'ตั้งใจสมัคร / เข้าสู่ระบบ', count: agg?.signup ?? 0 },
  ];
  return raw.map((s, i) => {
    const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
    const prev = i > 0 ? raw[i - 1].count : s.count;
    const dropFromPrev = i > 0 && prev > 0 ? Math.round(((prev - s.count) / prev) * 100) : 0;
    return { ...s, pct, dropFromPrev: Math.max(0, dropFromPrev) };
  });
}

/* ══════════════════════════════════════════════════════════════════════
 * ข้อควรระวังก่อนเชื่อตัวเลขในกรวย — เพิ่มหลังเจอเคสจริง 15 ส.ค. 2569
 *
 * เคสที่เกิด: รายงานบอกว่า "หลุด 98% ที่ hero → ต้องรีบแก้ Hero"
 *   แต่พอไล่ข้อมูลดิบพบว่า
 *     • ผู้เข้าชมจาก social 28 คน มี max_scroll = 0 ทั้ง 28 คน (ไม่มีใครเลื่อนแม้แต่พิกเซลเดียว)
 *     • คนกด CTA (4) มากกว่าคนที่ "เลื่อนผ่าน hero" (1) — เป็นไปไม่ได้ถ้าเป็นกรวยจริง
 *       เพราะปุ่ม CTA อยู่เหนือ fold กดได้โดยไม่ต้องเลื่อน
 *     • ผู้สมัคร 1 คนมี dwell 1,209 วินาที (20 นาที) = การทดสอบภายใน
 *
 *   ถ้าเชื่อตัวเลขแล้วรีบแก้ Hero = แก้สิ่งที่ไม่ได้พัง โดยใช้ข้อมูลที่ไม่ใช่คน
 *
 * ฟังก์ชันนี้จึงเตือนก่อนที่ใครจะเอาเปอร์เซ็นต์ไปตัดสินใจ
 * ══════════════════════════════════════════════════════════════════════ */

export interface FunnelCaveat {
  /** blocker = ห้ามใช้ตัวเลขนี้ตัดสินใจ · warn = ใช้ได้แต่ต้องรู้ข้อจำกัด */
  level: 'blocker' | 'warn';
  text: string;
}

/** จำนวนผู้เข้าชมขั้นต่ำที่พอจะสรุปอะไรได้ — ต่ำกว่านี้ทุกเปอร์เซ็นต์คือสัญญาณรบกวน */
export const MIN_SAMPLE = 100;

export function funnelCaveats(agg: LandingAgg | null, steps: readonly FunnelStep[]): FunnelCaveat[] {
  const out: FunnelCaveat[] = [];
  const total = agg?.total ?? 0;
  if (total === 0) return out;

  if (total < MIN_SAMPLE) {
    out.push({
      level: 'blocker',
      text: `ผู้เข้าชมเพียง ${total} คน (ต่ำกว่า ${MIN_SAMPLE}) — เปอร์เซ็นต์ทุกตัวยังเป็นสัญญาณรบกวน คนเดียวขยับได้หลายเปอร์เซ็นต์ ยังใช้ตัดสินใจแก้หน้าเว็บไม่ได้`,
    });
  }

  // ขั้นหลังมากกว่าขั้นก่อน = ขั้นตอนไม่ได้เรียงต่อกันจริง → drop% ไม่มีความหมาย
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].count > steps[i - 1].count) {
      out.push({
        level: 'blocker',
        text: `"${steps[i].label}" (${steps[i].count}) มากกว่า "${steps[i - 1].label}" (${steps[i - 1].count}) — สองขั้นนี้ไม่ได้เรียงต่อกันจริง (ปุ่ม CTA กดได้โดยไม่ต้องเลื่อน) ตัวเลข "หลุด %" ของขั้นนี้จึงไม่มีความหมาย`,
      });
    }
  }

  // อยู่นานแต่ไม่เลื่อนเลย = ลายนิ้วมือของบอท/ตัวดึงพรีวิว ไม่ใช่คนอ่านแล้วไม่สนใจ
  const sc = agg?.avg_scroll ?? 0;
  const dw = agg?.avg_dwell ?? 0;
  if (sc < 5 && dw > 20) {
    out.push({
      level: 'warn',
      text: `เลื่อนเฉลี่ยเพียง ${sc}% แต่อยู่นานเฉลี่ย ${Math.round(dw)} วินาที — รูปแบบนี้มักเป็นบอทหรือตัวดึงลิงก์พรีวิว ไม่ใช่คนที่อ่านแล้วไม่สนใจ ควรแยกออกก่อนสรุป`,
    });
  }

  return out;
}

/** ใช้ตัวเลขในกรวยตัดสินใจได้ไหม — false เมื่อมี caveat ระดับ blocker */
export function funnelTrustworthy(agg: LandingAgg | null, steps: readonly FunnelStep[]): boolean {
  return funnelCaveats(agg, steps).every((c) => c.level !== 'blocker');
}

/** ขั้นที่ "รูรั่วใหญ่สุด" (drop มากสุดหลังขั้นแรก) → ชี้จุดที่ต้องแก้ก่อน
 *  ⚠️ คืน null เมื่อข้อมูลยังเชื่อไม่ได้ — ชี้จุดที่ต้องแก้จากข้อมูลที่ไม่ใช่คน
 *     อันตรายกว่าไม่ชี้เลย เพราะทำให้ไปแก้สิ่งที่ไม่ได้พัง */
export function biggestLeak(
  steps: FunnelStep[],
  agg?: LandingAgg | null,
): { from: string; to: string; dropPct: number } | null {
  if (agg !== undefined && !funnelTrustworthy(agg, steps)) return null;
  let worst: { from: string; to: string; dropPct: number } | null = null;
  for (let i = 1; i < steps.length; i++) {
    if (!worst || steps[i].dropFromPrev > worst.dropPct) {
      worst = { from: steps[i - 1].label, to: steps[i].label, dropPct: steps[i].dropFromPrev };
    }
  }
  return worst && worst.dropPct > 0 ? worst : null;
}

/** วินาที → ข้อความอ่านง่าย (เช่น 8 วิ / 1 น 25 วิ) */
export function dwellLabel(sec: number): string {
  const s = Math.max(0, Math.round(sec || 0));
  if (s < 60) return `${s} วิ`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} น ${r} วิ` : `${m} น`;
}

// ── (2) beacon (impure) — ส่ง RPC upsert แบบ monotonic ────────────────────────

const SID_KEY = 'ceo_ai_fsid'; // funnel session id (นิรนาม, คงที่ต่อ browser)

interface FunnelState {
  session: string;
  seg: string;
  ref: RefKind;
  scroll: number;
  dwell: number;
  cta: boolean;
  signup: boolean;
  ab: LandingVariant;   // กลุ่ม A/B (holdout 2 ส่วนใหม่)
}
let state: FunnelState | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lastSent = ''; // ลายเซ็น payload ล่าสุด — กันส่งซ้ำที่ไม่มีอะไรเปลี่ยน

function newSession(): string {
  try {
    const g = globalThis as { crypto?: { randomUUID?: () => string } };
    if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  } catch { /* noop */ }
  // fallback (ไม่ต้อง crypto-secure — แค่ต้องไม่ชนกัน)
  return 'f-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
}

function getSession(): string {
  try {
    let id = localStorage.getItem(SID_KEY);
    if (!id) { id = newSession(); localStorage.setItem(SID_KEY, id); }
    return id;
  } catch {
    return newSession();
  }
}

/** เริ่มเซสชัน funnel — เรียกครั้งเดียวตอน Landing mount (ส่ง view beacon) */
export function initLandingFunnel(seg: string, referrer: string, origin: string): void {
  if (typeof window === 'undefined') return;
  const session = getSession();
  state = {
    session,
    seg: seg || 'default',
    ref: refKind(referrer, origin),
    scroll: 0, dwell: 0, cta: false, signup: false,
    ab: landingVariant(session),
  };
  flush(); // นับ "เข้าดู" ทันที
}

/** id เซสชันนิรนามของผู้เยี่ยมชมคนนี้ — ใช้ join ข้อมูล first-party ข้ามตาราง
 *  (quickcheck_submissions ใช้ id เดียวกับ landing_funnel เพื่อดูได้ว่า "คนที่กรอกฟอร์ม เลื่อน/สมัครไหม") */
export function currentFunnelSession(): string {
  return getSession();
}

/** กลุ่ม A/B ของผู้เยี่ยมชมคนนี้ (deterministic จาก session) — ให้ LandingPage ตัดสินใจแสดง 2 ส่วนใหม่ */
export function currentLandingVariant(): LandingVariant {
  return landingVariant(getSession());
}

export function markLandingScroll(pct: number): void {
  if (!state) return;
  if (pct > state.scroll) { state.scroll = Math.min(100, Math.round(pct)); scheduleFlush(); }
}
export function markLandingDwell(sec: number): void {
  if (!state) return;
  if (sec > state.dwell) { state.dwell = Math.round(sec); scheduleFlush(); }
}
export function markLandingCta(): void {
  if (!state || state.cta) return;
  state.cta = true; flush(true); // CTA = สัญญาณสำคัญ → ส่งทันที
}
export function markLandingSignup(): void {
  if (!state) return;
  state.cta = true; state.signup = true; flush(true);
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => { flushTimer = null; flush(); }, 900);
}

/** ส่ง snapshot สะสมปัจจุบันผ่าน RPC (upsert monotonic ฝั่ง DB) — no-op ในโหมด local
 *
 *  ⚠️ ตอนออกจากหน้า (pagehide/visibilitychange) ต้องใช้ keepalive เท่านั้น
 *  บั๊กที่เจอจริง (ส.ค. 2569): ใช้ fetch ธรรมดาส่งตอนออกจากหน้า → เบราว์เซอร์ยกเลิกคำขอ
 *    ผลคือ max_dwell ที่บันทึกได้เกือบทั้งหมดเป็น 0 หรือ 10 พอดี (= ค่าจากตัวจับเวลาที่ยิงตอนหน้ายังเปิดอยู่)
 *    ส่วนค่าจริงตอนออก และ max_scroll ที่ส่งไปพร้อมกัน หายทั้งคู่
 *    → ตัวเลข "คนไม่เลื่อนเลย" ที่เห็นในรายงาน ส่วนหนึ่งจึงเป็นข้อมูลที่ส่งไม่ถึง ไม่ใช่พฤติกรรมจริง
 *  หมายเหตุ: ใช้ sendBeacon ไม่ได้ เพราะตั้ง header apikey/Authorization ไม่ได้ */
export function flush(force = false, leaving = false): void {
  if (!state || !isSupabaseEnabled || !supabase) return;
  const sig = `${state.scroll}|${state.dwell}|${state.cta}|${state.signup}`;
  if (!force && sig === lastSent) return;
  lastSent = sig;

  const body = {
    p_session: state.session,
    p_seg: state.seg,
    p_ref: state.ref,
    p_scroll: state.scroll,
    p_cta: state.cta,
    p_signup: state.signup,
    p_dwell: state.dwell,
    p_ab: state.ab,
  };

  if (leaving) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        // keepalive = คำขออยู่รอดหลังหน้าถูกปิด (จำกัด 64KB — payload นี้ไม่กี่ร้อยไบต์)
        void fetch(`${url}/rest/v1/rpc/track_landing`, {
          method: 'POST',
          keepalive: true,
          headers: { apikey: key, Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }).catch(() => {});
        return;
      } catch { /* ตกไปใช้ทางปกติด้านล่าง */ }
    }
  }

  supabase.rpc('track_landing', body).then(() => {}, () => {}); // เงียบเสมอ — tracking ต้องไม่ทำหน้าเว็บพัง
}

/** สัญญาณ engagement สด ของผู้เยี่ยมชมคนนี้ (dwell/scroll/CTA) — ให้ token ฟรีตามความตั้งใจ
 *  ใช้กับ tokenEconomics.engagementTier() เพื่อจัดโควตา token ฟรี "คนดูนาน = ได้มากกว่า" */
export function currentEngagement(): { dwellSec: number; scrollPct: number; reachedCta: boolean } {
  return {
    dwellSec: state?.dwell ?? 0,
    scrollPct: state?.scroll ?? 0,
    reachedCta: !!(state?.cta || state?.signup),
  };
}

/** ดึงสรุป funnel (admin เท่านั้น — RPC เช็ค is_app_admin เอง) */
export async function loadLandingFunnel(days = 30): Promise<LandingAgg | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase.rpc('landing_funnel_agg', { p_days: days });
  if (error || !data) return null;
  const d = data as Partial<LandingAgg>;
  return {
    total: d.total ?? 0,
    engaged: d.engaged ?? 0,
    cta: d.cta ?? 0,
    signup: d.signup ?? 0,
    avg_scroll: d.avg_scroll ?? 0,
    avg_dwell: d.avg_dwell ?? 0,
    bounce: d.bounce ?? 0,
    by_seg: d.by_seg ?? {},
    by_ref: d.by_ref ?? {},
    by_ab: d.by_ab ?? {},
  };
}
