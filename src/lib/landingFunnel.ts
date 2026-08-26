/* ===== Landing Funnel — first-party, PDPA-safe (Dark AI Marketing #7/#14/#15) =====
 * วัด "คนเข้า Landing กี่คน → หยุดดูนานไหม → เลื่อนลึกแค่ไหน → กด CTA → ตั้งใจสมัคร"
 * ที่ GA4 ตอบให้เห็นในแอปไม่ได้ (คนดูยังไม่ล็อกอิน) — เก็บเป็น first-party ใน Supabase
 * นิรนาม 100%: session = uuid สุ่มฝั่ง client · ไม่เก็บ PII / ไม่บันทึก cursor path / ไม่เก็บ URL
 * ไฟล์นี้แยก 2 ส่วน: (1) ตรรกะ pure (จำแนก referrer + คำนวณ step/leak) ให้ test ได้
 *                    (2) beacon ส่ง RPC track_landing (upsert monotonic) — no-op ในโหมด local */
import { supabase, isSupabaseEnabled } from './supabase';
import { landingVariant, type LandingVariant } from './landingAb';
import { pickUtm, readFirstTouch, mergeUtm, shouldStoreFirstTouch, UTM_FIRST_TOUCH_KEY } from './utmForward';

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

/** ยอดต่อกลุ่ม (seg/ref/variant) — 0051 คืนเป็นตัวเลขเฉย ๆ · 0057 เปลี่ยนเป็นก้อนนี้ */
export interface FunnelCell { total: number; cta: number; signup: number }

/**
 * แปลงค่าที่ได้จาก RPC ให้เป็น FunnelCell เสมอ — รับได้ทั้งตัวเลข (สคีมาเก่า) และอ็อบเจกต์ (ใหม่)
 *
 * ⚠️ ทำไมต้องทนทั้งสองแบบ: ฟังก์ชันใน Postgres กับหน้าเว็บ **deploy คนละเวลา**
 *    วันที่ 17 ส.ค. 2569 เปลี่ยน SQL ให้คืนอ็อบเจกต์ แต่หน้าเว็บยัง `{c}` ตรง ๆ
 *    → React error #31 "Objects are not valid as a React child" = แอดมินเปิดแท็บการเติบโตแล้วจอพัง
 *    TypeScript จับไม่ได้เพราะฝั่ง client `as Partial<LandingAgg>` คือการ "ประกาศ" ไม่ใช่การตรวจ
 */
export function toCell(v: unknown): FunnelCell {
  if (typeof v === 'number' && Number.isFinite(v)) return { total: v, cta: 0, signup: 0 };
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
    return { total: n(o.total), cta: n(o.cta), signup: n(o.signup) };
  }
  return { total: 0, cta: 0, signup: 0 };
}

function toCells(v: unknown): Record<string, FunnelCell> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, FunnelCell> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = toCell(val);
  return out;
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
  by_seg: Record<string, FunnelCell>;
  by_ref: Record<string, FunnelCell>;
  by_ab: Record<string, { total: number; signup: number; cta: number }>; // A/B: show/control/unset
  /** วัน (จาก p_days) — ใช้บอกช่วงเวลาในบทวิเคราะห์ */
  days?: number;
  /** A/B พาดหัว · A/B ลำดับบล็อก — เดิมไปลง GA อย่างเดียว (0057) */
  by_hero_ab?: Record<string, { total: number; signup: number; cta: number }>;
  by_layout_ab?: Record<string, { total: number; signup: number; cta: number }>;
  /** ความสนใจรายส่วนของหน้า (0057) — key = data-sec ที่ติดไว้บน LandingPage */
  sections?: Record<string, { viewers: number; seconds: number; signups: number }>;
  /** ⭐ คอนเทนต์ชิ้นไหนพาคนมา (0062) — เดิมทิ้งข้อมูลนี้ทั้งที่ติดแท็กลิงก์ไว้แล้ว
   *  by_utm_source = แพลตฟอร์ม · by_campaign = หัวข้อ/บทความ · by_content = ชิ้นงานย่อย (c=) */
  by_utm_source?: Record<string, FunnelCell>;
  by_campaign?: Record<string, FunnelCell>;
  /** ⭐ "source/medium" — ตอบ "คอมเมนต์ปักหมุด vs ไบโอ" (tiktok/comment vs tiktok/bio · 0065) */
  by_medium?: Record<string, FunnelCell>;
  by_content?: Record<string, FunnelCell>;
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

  // อยู่นานแต่ไม่เลื่อนเลย — เดิมเขียนว่า "มักเป็นบอท" ซึ่งเป็นการเดา
  // ตรวจข้อมูลจริง 17 ส.ค. 2569 แล้วพบสาเหตุที่แน่นอนกว่า: ตัวจับเวลาเดินต่อหลังผู้ใช้สลับแอป
  // (แก้ที่ useLandingTrace แล้ว) → ข้อมูลก่อนวันนั้นมีค่า "อยู่นาน" ที่สูงเกินจริงปนอยู่
  const sc = agg?.avg_scroll ?? 0;
  const dw = agg?.avg_dwell ?? 0;
  if (sc < 5 && dw > 20) {
    out.push({
      level: 'warn',
      text: `เลื่อนเฉลี่ยเพียง ${sc}% แต่อยู่นานเฉลี่ย ${Math.round(dw)} วินาที — ข้อมูลที่เก็บก่อน 17 ส.ค. 2569 นับเวลาต่อแม้ผู้ใช้สลับไปแอปอื่นแล้ว (บั๊กที่แก้แล้ว) จึงสูงเกินจริง · ส่วนที่เหลืออาจเป็นบอท/ตัวดึงลิงก์พรีวิว — ให้ดูค่าที่เก็บหลังวันนี้เท่านั้น`,
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
  heroAb?: string;      // กลุ่ม A/B พาดหัว (เดิมไปลง GA อย่างเดียว)
  layoutAb?: string;    // กลุ่ม A/B ลำดับบล็อก (เดิมไปลง GA อย่างเดียว)
  /** แท็กคอนเทนต์จาก utm (first-touch) — ตอบ "ชิ้นไหนพาคนมา"
   *  medium = ช่องทางภายในแพลตฟอร์มเดียวกัน (bio vs comment) — ตัวเดียวที่ตอบได้ว่า
   *  "คอมเมนต์ปักหมุดชนะไบโอไหม" ซึ่งเป็นการทดลองที่กำลังรันอยู่ (0065) */
  utm?: { source?: string; medium?: string; campaign?: string; content?: string };
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

/** อ่านแท็กคอนเทนต์จาก query string (utm ที่ Worker ใส่ให้ตอน redirect ลิงก์สั้น)
 *
 * ทำไมต้องเก็บ: เราติดแท็กลิงก์ในคอนเทนต์อย่างละเอียด (`?s=yt&c=6a`) แต่เดิม funnel
 * เก็บแค่ ref_kind = 'social' แล้วทิ้งที่เหลือ → ตอบไม่ได้ว่า "คลิปไหนพาคนมา"
 *
 * PDPA: utm = แท็กที่เราเขียนเอง ไม่ใช่ข้อมูลผู้ใช้ · ยอมเฉพาะ a-z 0-9 - _ ยาวไม่เกิน 32
 * (ค่าอื่นทิ้งทั้งหมด — กันคนยัดข้อความ/อักขระแปลกเข้ารายงานผ่าน query string)
 */
export function utmFrom(search: string): { source?: string; campaign?: string; content?: string } {
  const clean = (v: string | null): string | undefined => {
    if (!v) return undefined;
    const t = v.trim().toLowerCase().slice(0, 32);
    return /^[a-z0-9_-]+$/.test(t) ? t : undefined;
  };
  try {
    const q = new URLSearchParams(search);
    return { source: clean(q.get('utm_source')), campaign: clean(q.get('utm_campaign')), content: clean(q.get('utm_content')) };
  } catch { return {}; }
}

/** utm ที่ควรผูกกับผู้เข้าชมคนนี้ — URL ปัจจุบันก่อน, ไม่มีก็ใช้ "ที่มาแรก" ที่หน้า blog/calc เก็บไว้
 *
 *  🔴 ทำไมต้องมองย้อนไปที่ localStorage: ลิงก์สั้นทุกตัวพาคนไปลงที่ /blog/<slug> หรือ /calc
 *     ไม่ได้พามาที่ Landing ตรง ๆ ⇒ ถ้าอ่านแค่ query ของหน้านี้ เราจะเห็น utm ก็ต่อเมื่อ
 *     เขากดปุ่ม CTA ที่ถูกเติม utm ไว้เท่านั้น · คนที่กด "หน้าหลัก" บนแถบนำทางแทน จะกลายเป็น direct
 *     (ตรวจจริง 20 ส.ค. 2569: 75 แถวใน landing_funnel มี utm แค่ 1 แถว) */
function resolvedUtm(search: string): { source?: string; medium?: string; campaign?: string; content?: string } {
  const cur = pickUtm(search);
  let stored: ReturnType<typeof readFirstTouch> = null;
  try { stored = readFirstTouch(localStorage.getItem(UTM_FIRST_TOUCH_KEY), Date.now()); } catch { /* noop */ }
  if (shouldStoreFirstTouch(cur, stored)) {
    try { localStorage.setItem(UTM_FIRST_TOUCH_KEY, JSON.stringify({ t: Date.now(), u: cur })); } catch { /* noop */ }
    stored = cur;
  }
  // ไม่มีที่มาเลย = อย่าแต่งค่าให้ (ปล่อยว่างดีกว่าเขียน 'site' ทับแล้วอ่านผิดว่ามีที่มา)
  if (!Object.keys(cur).length && !stored) return {};
  const u = mergeUtm(cur, stored);
  return { source: u.utm_source, medium: u.utm_medium, campaign: u.utm_campaign, content: u.utm_content };
}

/** เริ่มเซสชัน funnel — เรียกครั้งเดียวตอน Landing mount (ส่ง view beacon) */
export function initLandingFunnel(
  seg: string, referrer: string, origin: string,
  /** กลุ่ม A/B อื่นของผู้เยี่ยมชมคนนี้ — เดิมส่งเข้า GA อย่างเดียว แอดมินในระบบอ่านไม่ได้ */
  opts?: { heroAb?: string; layoutAb?: string },
): void {
  if (typeof window === 'undefined') return;
  const session = getSession();
  state = {
    session,
    seg: seg || 'default',
    ref: refKind(referrer, origin),
    scroll: 0, dwell: 0, cta: false, signup: false,
    ab: landingVariant(session),
    heroAb: opts?.heroAb,
    layoutAb: opts?.layoutAb,
    // first-touch: เก็บครั้งแรกเท่านั้น (ฝั่ง DB ก็ coalesce ค่าเดิมไว้) — คนกลับมาซ้ำ
    // ต้องไม่ทับเครดิตของคอนเทนต์ที่พาเขามาครั้งแรก
    utm: resolvedUtm(window.location.search),
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

/* ── ความสนใจรายส่วน ────────────────────────────────────────────────────
 * ตอบคำถาม "คนเข้ามาแล้วสนใจส่วนไหนของหน้า" ซึ่ง max_scroll ตอบไม่ได้
 * (เลื่อนผ่าน 100% กับ หยุดอ่าน 40 วินาทีตรงส่วนราคา = คนละความหมายกันคนละโลก)
 *
 * PDPA: เก็บแค่ "ชื่อส่วนที่เรากำหนดเอง → จำนวนวินาทีที่อยู่ในจอ"
 *   ไม่เก็บพิกัดเมาส์ ไม่เก็บสิ่งที่ผู้ใช้พิมพ์ ไม่เก็บ URL ที่มา
 */

/** วินาทีสะสมต่อส่วน (ปัดลง) — key = SECTION_KEYS */
const sectionSec: Record<string, number> = {};
/** เวลาที่ส่วนนั้นเริ่มอยู่ในจอ (ms) — undefined = ไม่อยู่ในจอ */
const sectionSince: Record<string, number> = {};

function sectionSig(): string {
  const keys = Object.keys(sectionSec).sort();
  return keys.map(k => `${k}:${sectionSec[k]}`).join(',');
}

/** ส่วนนั้นเข้ามาอยู่ในจอ */
export function markSectionEnter(key: string, now = Date.now()): void {
  if (!state || !key) return;
  if (sectionSince[key] === undefined) sectionSince[key] = now;
}

/** ส่วนนั้นออกจากจอ → บวกเวลาที่อยู่ในจอเข้าไป
 *  นับเฉพาะที่อยู่ในจอ ≥ 1 วินาที (กันการเลื่อนผ่านเร็ว ๆ นับเป็นความสนใจ) */
export function markSectionExit(key: string, now = Date.now()): void {
  if (!state || !key) return;
  const since = sectionSince[key];
  if (since === undefined) return;
  delete sectionSince[key];
  const sec = Math.floor((now - since) / 1000);
  if (sec < 1) return;
  sectionSec[key] = Math.min(3600, (sectionSec[key] ?? 0) + sec);
  scheduleFlush();
}

/** ปิดส่วนที่ยังค้างอยู่ในจอทั้งหมด — เรียกก่อนออกจากหน้า */
export function closeOpenSections(now = Date.now()): void {
  for (const k of Object.keys(sectionSince)) markSectionExit(k, now);
}

/** บันทึกเวลาของส่วนที่ "ยังอยู่ในจอ" ลงบัญชี แล้วเริ่มนับต่อทันที (ไม่ถือว่าออกจากจอ)
 *
 * 🔴 บั๊กที่แก้ (ยืนยันจาก production 26 ส.ค. 2569):
 *   เวลาของบล็อกถูกบวกเข้าบัญชี **เฉพาะตอนบล็อกนั้นออกจากจอ** (`markSectionExit`)
 *   ⇒ บล็อกที่อยู่ในจอ **ตลอดการเยี่ยมชม** (= คนที่ไม่เลื่อนเลย ซึ่งคือ 80 จาก 93 คน)
 *      จะถูกบันทึกก็ต่อเมื่อมี exit event สะอาด ๆ ยิงตอนออกจากหน้าเท่านั้น
 *   ข้อมูลจริง: **41 session อยู่ ≥10 วินาที แต่ `sections` ว่างเปล่า** (34 ในนั้นไม่เลื่อนเลย)
 *      ทั้งที่ `max_dwell` ของคนกลุ่มเดียวกันถูกบันทึกได้ปกติ
 *      ⇒ ท่อส่งข้อมูลไม่ได้พัง · สิ่งที่หายคือ "เวลาที่ยังไม่ถูกปิดบัญชี"
 *   ⚠️ exit event บนมือถือเชื่อถือไม่ได้ (ระบบฆ่าแท็บเบื้องหลังได้โดยไม่ยิงอะไรเลย)
 *      ⇒ ห้ามออกแบบให้ข้อมูลทั้งก้อนขึ้นกับ event ที่อาจไม่เกิด — ต้องทยอยปิดบัญชีระหว่างทาง
 */
export function settleOpenSections(now = Date.now()): void {
  if (!state) return;
  for (const k of Object.keys(sectionSince)) {
    const since = sectionSince[k];
    const sec = Math.floor((now - since) / 1000);
    if (sec < 1) continue;
    sectionSince[k] = now; // เริ่มนับรอบใหม่จากตรงนี้ — บล็อกยังอยู่ในจอ ไม่ใช่ออกไปแล้ว
    sectionSec[k] = Math.min(3600, (sectionSec[k] ?? 0) + sec);
  }
  scheduleFlush();
}

/** อ่านค่าปัจจุบัน (ใช้ในเทสต์และดีบัก) */
export function currentSections(): Record<string, number> {
  return { ...sectionSec };
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
  const sig = `${state.scroll}|${state.dwell}|${state.cta}|${state.signup}|${sectionSig()}`;
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
    p_hero_ab: state.heroAb ?? null,
    p_layout_ab: state.layoutAb ?? null,
    // วินาทีที่แต่ละส่วนอยู่ในจอ — ตอบ "เขาสนใจส่วนไหนของหน้า"
    // ไม่ใช่ PII: คีย์เป็นชื่อส่วนที่เรากำหนดเอง ค่าเป็นวินาที (เซิร์ฟเวอร์กรองซ้ำอีกชั้น)
    p_sections: Object.keys(sectionSec).length ? sectionSec : null,
    // แท็กคอนเทนต์ → ตอบ "โพสต์/คลิปไหนพาคนมา และคนจากชิ้นไหนกด CTA"
    p_utm_source: state.utm?.source ?? null,
    p_utm_campaign: state.utm?.campaign ?? null,
    p_utm_content: state.utm?.content ?? null,
    p_utm_medium: state.utm?.medium ?? null,
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

/**
 * แปลง payload ดิบจาก RPC → LandingAgg (pure · เทสต์ได้โดยไม่ต้องมี DB)
 *
 * แยกออกมาจาก loadLandingFunnel เพราะบั๊กที่ทำให้แอดมินจอพัง (17 ส.ค. 2569)
 * อยู่ตรงชั้นนี้พอดี — เดิมเป็น `as Partial<LandingAgg>` ซึ่งไม่ได้ตรวจอะไรเลย
 */
export function normalizeLandingAgg(raw: unknown, days = 30): LandingAgg {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const cells = (v: unknown) => toCells(v) as Record<string, { total: number; signup: number; cta: number }>;
  return {
    total: num(d.total),
    engaged: num(d.engaged),
    cta: num(d.cta),
    signup: num(d.signup),
    avg_scroll: num(d.avg_scroll),
    avg_dwell: num(d.avg_dwell),
    bounce: num(d.bounce),
    by_seg: toCells(d.by_seg),
    by_ref: toCells(d.by_ref),
    by_ab: cells(d.by_ab),
    // เดิม 3 ตัวนี้ถูก "ลืมส่งต่อ" → GrowthAiPanel ได้ undefined ตลอด
    // (แผงความสนใจรายส่วน + A/B พาดหัว/ลำดับบล็อก จึงว่างเปล่าทั้งที่ DB มีข้อมูล)
    days: num(d.days) || days,
    by_hero_ab: cells(d.by_hero_ab),
    by_layout_ab: cells(d.by_layout_ab),
    by_utm_source: toCells(d.by_utm_source),
    by_campaign: toCells(d.by_campaign),
    by_medium: toCells(d.by_medium),
    by_content: toCells(d.by_content),
    sections: (d.sections && typeof d.sections === 'object'
      ? (d.sections as LandingAgg['sections'])
      : {}),
  };
}

/** ดึงสรุป funnel (admin เท่านั้น — RPC เช็ค is_app_admin เอง) */
export async function loadLandingFunnel(days = 30): Promise<LandingAgg | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase.rpc('landing_funnel_agg', { p_days: days });
  if (error || !data) return null;
  return normalizeLandingAgg(data, days);
}
