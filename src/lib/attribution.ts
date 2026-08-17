// attribution.ts — เก็บ "ช่องทางที่มา" ตอน signup (first-touch) แล้วรวมยอดสมัครจริงต่อช่องทาง
// map utm/referrer → 6 ช่องทางของ Growth Dashboard · pure + tested · PDPA: เก็บแค่ช่องทาง ไม่เก็บ PII
import type { GChannelId } from './growthEconomics';
import { isoWeekTag } from './growthEconomics';

// นิยามย้ายไป types.ts แล้ว (ไฟล์นี้ใช้ localStorage — ฝั่ง Worker ลากเข้ามาไม่ได้)
// re-export ไว้เพื่อให้ไฟล์ที่ import จากที่นี่อยู่แล้วไม่ต้องแก้
import type { SignupSource, SignupRecord } from '../types';
export type { SignupSource, SignupRecord };

const KEY = 'ceoai_signup_src';

function has(hay: string, needles: string[]): boolean {
  const s = hay.toLowerCase();
  return needles.some(n => s.includes(n));
}

/** map utm (source+medium) → ช่องทาง; '' ถ้าจับไม่ได้ */
export function channelFromUtm(u: { source?: string; medium?: string; campaign?: string }): GChannelId | '' {
  const hay = `${u.source ?? ''} ${u.medium ?? ''} ${u.campaign ?? ''}`;
  if (has(hay, ['youtube', 'yt'])) return 'youtube';
  if (has(hay, ['line'])) return 'line';
  if (has(hay, ['facebook', 'fb', 'meta', 'group'])) return 'fb_group';
  if (has(hay, ['google', 'bing', 'duckduckgo', 'organic', 'seo', 'search'])) return 'seo';
  if (has(hay, ['referral', 'word', 'wom', 'friend', 'share'])) return 'word_of_mouth';
  return '';
}

/** map referrer host → ช่องทาง; '' ถ้าจับไม่ได้ (direct/unknown) */
export function channelFromReferrer(referrer?: string): GChannelId | '' {
  if (!referrer) return '';
  let host = referrer;
  try { host = new URL(referrer).hostname; } catch { /* ใช้สตริงดิบ */ }
  if (has(host, ['youtube', 'youtu.be'])) return 'youtube';
  if (has(host, ['line.me', 'liff'])) return 'line';
  if (has(host, ['facebook', 'fb.com', 'fb.me'])) return 'fb_group';
  if (has(host, ['google', 'bing', 'duckduckgo'])) return 'seo';
  return '';
}

/** สรุปช่องทางจาก utm ก่อน แล้ว fallback referrer แล้วค่อย 'other' */
export function resolveChannel(u: { source?: string; medium?: string; campaign?: string }, referrer?: string): GChannelId {
  return channelFromUtm(u) || channelFromReferrer(referrer) || 'other';
}

/** สร้าง SignupSource จาก query string + referrer */
export function sourceFrom(search: string, referrer?: string): SignupSource {
  let source = '', medium = '', campaign = '';
  try {
    const q = new URLSearchParams(search);
    source = (q.get('utm_source') || '').slice(0, 60);
    medium = (q.get('utm_medium') || '').slice(0, 60);
    campaign = (q.get('utm_campaign') || '').slice(0, 60);
  } catch { /* empty */ }
  return { channel: resolveChannel({ source, medium, campaign }, referrer), source, medium, campaign };
}

/** first-touch: บันทึกช่องทางลง localStorage ครั้งแรกเท่านั้น (ไม่ทับของเดิม) */
export function rememberSourceOnce(search: string, referrer?: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(KEY)) return; // มีแล้ว = first-touch เดิม
    localStorage.setItem(KEY, JSON.stringify(sourceFrom(search, referrer)));
  } catch { /* empty */ }
}

/** อ่านช่องทางที่จำไว้ (ตอน stamp ลง AppData) */
export function readRememberedSource(): SignupSource | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as SignupSource) : null;
  } catch { return null; }
}

/** รวมยอดสมัครต่อ (สัปดาห์ → ช่องทาง) จาก signup records */
export function aggregateSignups(records: SignupRecord[]): Record<string, Record<GChannelId, number>> {
  const out: Record<string, Record<GChannelId, number>> = {};
  for (const r of records) {
    if (!r.at || !r.channel) continue;
    const d = new Date(r.at);
    if (isNaN(d.getTime())) continue;
    const wk = isoWeekTag(d);
    (out[wk] ||= {} as Record<GChannelId, number>);
    out[wk][r.channel] = (out[wk][r.channel] || 0) + 1;
  }
  return out;
}

/** ยอดสมัครต่อช่องทางของสัปดาห์ที่ระบุ (เติมช่องที่ว่างเป็น 0 ให้ครบ 6) */
export function signupsForWeek(records: SignupRecord[], weekTag: string): Record<GChannelId, number> {
  const agg = aggregateSignups(records)[weekTag] ?? ({} as Record<GChannelId, number>);
  const empty: Record<GChannelId, number> = { youtube: 0, fb_group: 0, line: 0, seo: 0, word_of_mouth: 0, other: 0 };
  return { ...empty, ...agg };
}
