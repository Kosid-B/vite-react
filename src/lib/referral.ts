// referral.ts — Safe Promo ชั้นที่ 2: ชวนเพื่อน → ทั้งคู่ได้เครดิต AI (เมื่อเพื่อนสมัครแพ็กจ่ายเงินจริง)
// "ไม่เจ็บตัว": รางวัลจ่ายก็ต่อเมื่อมีรายได้ ฿790+ เข้ามา · ต้นทุน = AI marginal (2×200 calls ≈ ฿196 << ฿790)
// cap/anti-fraud บังคับฝั่ง server (migration 0043 · claim_referral — referee ต้องเป็นแพ็กจ่ายเงิน + ครั้งเดียว)

/** เครดิต AI ที่ผู้ชวนและผู้ถูกชวนได้ "คนละ" (calls · เดือนที่สมัคร) */
export const REF_REWARD_CALLS = 200;

/** คู่ referrer→referee ใช้ได้ไหม (ต้องมีทั้งคู่ + ไม่ใช่ตัวเอง) — pure */
export function isValidRefPair(referrer: string | null | undefined, referee: string | null | undefined): boolean {
  return !!referrer && !!referee && referrer !== referee;
}

/** สร้างลิงก์ชวนเพื่อนจาก workspace id (ref code = wsId เพื่อ attribute ฝั่ง server) — pure */
export function referralLink(wsId: string | null | undefined, origin = 'https://ceoaithailand.org'): string {
  return wsId ? `${origin}/?ref=${encodeURIComponent(wsId)}` : `${origin}/`;
}
