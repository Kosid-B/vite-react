/* ===== Amplitude sink — product analytics (funnel · retention · cohort) + Session Replay =====
 * ส่ง event ชุดเดียวกับ GA เข้า Amplitude ด้วย → ได้ funnel/retention/cohort เชิงลึก + "อัดเมาส์"
 * (Session Replay) ดูว่าคนเลื่อน/ลังเล/ค้างตรงไหนก่อนออก โดยไม่ต้องเขียน recorder เอง
 * ── ความเป็นส่วนตัว ──
 *   • ทำงานเฉพาะเมื่อมี VITE_AMPLITUDE_KEY (public client key เหมือน GA id) — ไม่มี = inert สนิท
 *   • Session Replay ตั้ง mask ระดับ 'medium' = ปิดบังทุก input (อีเมล/ชื่อ/เบอร์) อัตโนมัติ (PDPA)
 *   • device id จัดการโดย SDK (นิรนาม) · SDK โหลดแบบ dynamic import = ไม่บวมบันเดิลหลักเมื่อไม่มีคีย์
 *   • ควร gate ด้วย consent เหมือน GA/Pixel — เรียก track() เมื่อผู้ใช้ยินยอมแล้วเท่านั้น (คุมที่จุดเรียก)
 * ไฟล์นี้เก็บ pure helper (replaySampleRate) ไว้ test · ส่วน SDK เป็น fire-and-forget เงียบเสมอ */

const AMP_KEY = (import.meta.env.VITE_AMPLITUDE_KEY as string | undefined)?.trim() || '';

export const isAmplitudeEnabled = Boolean(AMP_KEY);

/** parse + clamp อัตราสุ่มอัด replay (0..1) จาก env — pure, test ได้ (ค่าเริ่มต้น 1 = อัดทุกเซสชัน) */
export function replaySampleRate(envVal: string | undefined): number {
  if (envVal == null || envVal.trim() === '') return 1; // ไม่ตั้งค่า = อัดทุกเซสชัน
  const n = Number(envVal);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

// ── SDK loader (dynamic import · โหลดครั้งเดียวเมื่อมีคีย์) ──────────────────────
type AmpCore = typeof import('@amplitude/analytics-browser');
let core: AmpCore | null = null;
let loading: Promise<AmpCore | null> | null = null;
const queue: Array<[string, Record<string, string | number>]> = [];

async function ensureInit(): Promise<AmpCore | null> {
  if (!AMP_KEY || typeof window === 'undefined') return null;
  if (core) return core;
  if (!loading) {
    loading = (async () => {
      const [amp, sr] = await Promise.all([
        import('@amplitude/analytics-browser'),
        import('@amplitude/plugin-session-replay-browser'),
      ]);
      const sampleRate = replaySampleRate(import.meta.env.VITE_AMPLITUDE_REPLAY_SR as string | undefined);
      // อัดเมาส์/คลิก/สโครล + ปิดบัง PII อัตโนมัติ (mask ทุก input ระดับ 'medium')
      amp.add(sr.sessionReplayPlugin({ sampleRate, privacyConfig: { defaultMaskLevel: 'medium' } }));
      // ไม่ autocapture (เราส่ง event เองผ่าน track) — กัน event ซ้ำ/สัญญาณรบกวน
      amp.init(AMP_KEY, { autocapture: false });
      core = amp;
      for (const [e, p] of queue.splice(0)) { try { amp.track(e, p); } catch { /* noop */ } }
      return amp;
    })().catch(() => null);
  }
  return loading;
}

/** ส่ง event เข้า Amplitude (no-op ถ้าไม่มีคีย์) — คิวไว้จนกว่า SDK พร้อม · เงียบเสมอ */
export function sendAmplitude(event: string, params: Record<string, string | number> = {}): void {
  if (!AMP_KEY || typeof window === 'undefined') return;
  if (core) { try { core.track(event, params); } catch { /* noop */ } return; }
  queue.push([event, params]);
  ensureInit().catch(() => {});
}

/** ผูก event กับผู้ใช้ (uuid นิรนาม) ตอน login — ให้ retention/cohort ตามรายคนได้ */
export function identifyAmplitudeUser(uid: string): void {
  if (!AMP_KEY || !uid) return;
  ensureInit().then((c) => { try { c?.setUserId(uid); } catch { /* noop */ } }).catch(() => {});
}

/** ล้างตัวตนตอน logout (เริ่ม session ใหม่แบบนิรนาม) */
export function resetAmplitudeUser(): void {
  if (!core) return;
  try { core.reset(); } catch { /* noop */ }
}
