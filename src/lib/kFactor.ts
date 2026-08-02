// kFactor.ts — K-factor / viral growth (Superorganism เสา 2: Viral Exponential Growth)
// K = i × c (i = คำเชิญต่อผู้ใช้ · c = อัตราแปลงต่อคำเชิญ) · K>1 = ทวีคูณ · ต้อง K > churn
// วัดจากตัวเลขจริง (GA: aha_invite_click/referral · claim_referral) — pure/testable
// ต่อยอด marketplace metrics + viral loop เฟส A (aha invite + built-in identity)

export interface KFactorInput {
  activeUsers: number;      // ผู้ใช้ active (ฐาน)
  invitesSent: number;      // คำเชิญที่ส่งทั้งหมด
  conversions: number;      // คำเชิญที่กลายเป็นผู้ใช้ใหม่จริง
  churnRatePct?: number;    // % เลิกใช้ต่อรอบ (0–100) — ไม่บังคับ
  cycleTimeDays?: number;   // ความยาว viral cycle (วัน) — ไม่บังคับ
}

export type KRegime = 'viral' | 'sub-viral' | 'flat';

export interface KFactorResult {
  invitesPerUser: number;   // i
  conversionRate: number;   // c (0–1)
  k: number;                // K = i × c
  amplification: number;    // ตัวคูณผู้ใช้รวมจากไวรัส = 1/(1−K) ถ้า K<1 · Infinity ถ้า K≥1
  regime: KRegime;          // K>1 viral · 0<K<1 sub-viral · K=0 flat
  churnRate: number;        // 0–1
  sustainable: boolean;     // K > churn (ไวรัสโตเร็วกว่าที่หลุด)
  netPerCycle: number;      // ผู้ใช้สุทธิต่อรอบ (conversions − churn×active) — ประมาณ
  headline: string;
  notes: string[];
}

const clampNonNeg = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);
const ratio = (num: number, den: number): number => (den > 0 ? num / den : 0);

/** คำนวณ K-factor + ระบอบการเติบโต + ความยั่งยืนเทียบ churn — pure */
export function kFactor(inp: KFactorInput): KFactorResult {
  const active = clampNonNeg(inp.activeUsers);
  const invites = clampNonNeg(inp.invitesSent);
  const conv = Math.min(clampNonNeg(inp.conversions), invites); // แปลงเกินจำนวนเชิญไม่ได้
  const churnRate = Math.max(0, Math.min(1, (inp.churnRatePct ?? 0) / 100));

  const invitesPerUser = ratio(invites, active);
  const conversionRate = ratio(conv, invites);
  const k = invitesPerUser * conversionRate;

  const amplification = k < 1 ? 1 / (1 - k) : Infinity;
  const regime: KRegime = k > 1 ? 'viral' : k > 0 ? 'sub-viral' : 'flat';
  const sustainable = k > churnRate;
  const netPerCycle = Math.round(conv - churnRate * active);

  const headline =
    regime === 'flat' ? 'ยังไม่มีไวรัล (K = 0) — เริ่มที่ทำให้ผู้ใช้เชิญ + คนรับสมัครจริง'
    : regime === 'viral' ? `ไวรัลทวีคูณ! K = ${k.toFixed(2)} (>1) — ผู้ใช้เชิญได้มากกว่าที่เสีย`
    : `Sub-viral K = ${k.toFixed(2)} — ไวรัลช่วยขยาย ${amplification.toFixed(1)}× แต่ยังไม่ self-sustaining`;

  const notes: string[] = [];
  if (regime === 'sub-viral') notes.push(`ทุกผู้ใช้ที่หามาเอง จะพาเพิ่มอีก ~${(amplification - 1).toFixed(1)} คนจากไวรัส (ตัวคูณ ${amplification.toFixed(1)}×)`);
  if (regime === 'viral') notes.push('ระวัง: K>1 ยั่งยืนยากในระยะยาว — เฝ้าดู conversion ต่อคำเชิญไม่ให้ตก');
  if (inp.churnRatePct != null) {
    notes.push(sustainable
      ? `K (${k.toFixed(2)}) > churn (${(churnRate * 100).toFixed(0)}%) — โตสุทธิ${netPerCycle >= 0 ? ' (' + netPerCycle + '/รอบ)' : ''}`
      : `⚠️ K (${k.toFixed(2)}) ≤ churn (${(churnRate * 100).toFixed(0)}%) — ไวรัลไม่พอชดเชยคนหลุด · แก้ retention ก่อนเร่งไวรัล`);
  }
  if (invitesPerUser > 0 && conversionRate < 0.2) notes.push(`อัตราแปลงต่อคำเชิญ ${(conversionRate * 100).toFixed(0)}% ต่ำ — ปรับ landing/ข้อเสนอให้คนรับสมัครง่ายขึ้น (คันโยกคุ้มกว่าเพิ่มจำนวนเชิญ)`);
  if (invitesPerUser < 0.5 && active > 0) notes.push(`ผู้ใช้เชิญเฉลี่ย ${invitesPerUser.toFixed(2)} คน — ต่ำ · ยิง aha-moment (ปิดดีล/ร้านขึ้น) ให้เชิญมากขึ้น`);
  if (active === 0) notes.push('ยังไม่มีผู้ใช้ active — ตัวเลขนี้จะมีความหมายเมื่อมีฐานผู้ใช้');

  return { invitesPerUser, conversionRate, k, amplification, regime, churnRate, sustainable, netPerCycle, headline, notes };
}
