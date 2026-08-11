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

/** ขั้นที่ "รูรั่วใหญ่สุด" (drop มากสุดหลังขั้นแรก) → ชี้จุดที่ต้องแก้ก่อน */
export function biggestLeak(steps: FunnelStep[]): { from: string; to: string; dropPct: number } | null {
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

/** ส่ง snapshot สะสมปัจจุบันผ่าน RPC (upsert monotonic ฝั่ง DB) — no-op ในโหมด local */
export function flush(force = false): void {
  if (!state || !isSupabaseEnabled || !supabase) return;
  const sig = `${state.scroll}|${state.dwell}|${state.cta}|${state.signup}`;
  if (!force && sig === lastSent) return;
  lastSent = sig;
  supabase
    .rpc('track_landing', {
      p_session: state.session,
      p_seg: state.seg,
      p_ref: state.ref,
      p_scroll: state.scroll,
      p_cta: state.cta,
      p_signup: state.signup,
      p_dwell: state.dwell,
      p_ab: state.ab,
    })
    .then(() => {}, () => {}); // เงียบเสมอ — tracking ต้องไม่ทำหน้าเว็บพัง
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
