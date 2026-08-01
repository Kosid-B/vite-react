// pmfSurvey.ts — Product-Market Fit test (Sean Ellis "40% rule") · pure/tested
// คำถามหลัก: "คุณจะรู้สึกยังไงถ้าใช้ <สินค้า> ไม่ได้อีก?" → ผิดหวังมาก / ผิดหวังบ้าง / ไม่ผิดหวัง
// ถ้า "ผิดหวังมาก" ≥ 40% = ถึง PMF (พร้อม scale) · ใช้ในแพ็กพรีเมียม (Superorganism §Viral Growth)

export interface PmfInput {
  veryDisappointed: number;
  somewhat: number;
  notDisappointed: number;
}
export type PmfVerdict = 'strong' | 'near' | 'weak' | 'nodata';
export interface PmfResult {
  total: number;
  veryPct: number;      // % "ผิดหวังมาก"
  verdict: PmfVerdict;
  label: string;
  guidance: string;
  color: string;
}

export const PMF_THRESHOLD = 40;   // เกณฑ์ Sean Ellis
export const PMF_MIN_SAMPLE = 30;  // ต่ำกว่านี้ = ยังเชื่อไม่ได้เต็มที่

/** คำนวณผล PMF จากจำนวนคำตอบ — pure */
export function pmfScore(inp: PmfInput): PmfResult {
  const v = Math.max(0, Math.floor(inp.veryDisappointed || 0));
  const s = Math.max(0, Math.floor(inp.somewhat || 0));
  const n = Math.max(0, Math.floor(inp.notDisappointed || 0));
  const total = v + s + n;
  if (total === 0) {
    return { total: 0, veryPct: 0, verdict: 'nodata', label: 'ยังไม่มีข้อมูล',
      guidance: `กรอกจำนวนคำตอบจากลูกค้าจริง (แนะนำ ≥ ${PMF_MIN_SAMPLE} คน ผลถึงจะเชื่อถือได้)`, color: 'var(--ink4)' };
  }
  const veryPct = Math.round((v / total) * 1000) / 10;
  const small = total < PMF_MIN_SAMPLE ? ` · ⚠️ ตัวอย่างน้อย (${total} < ${PMF_MIN_SAMPLE}) ผลยังไม่นิ่ง` : '';
  if (veryPct >= PMF_THRESHOLD) {
    return { total, veryPct, verdict: 'strong', label: '🎉 ถึง Product-Market Fit แล้ว',
      guidance: `${veryPct}% ตอบ "ผิดหวังมาก" (≥ ${PMF_THRESHOLD}%) = มี PMF → เร่ง acquisition/scale ได้ (ให้ K-factor > churn)${small}`,
      color: 'var(--green)' };
  }
  if (veryPct >= 25) {
    return { total, veryPct, verdict: 'near', label: '🟡 ใกล้ PMF',
      guidance: `${veryPct}% (เกณฑ์ ${PMF_THRESHOLD}%) — ยังไม่ถึงแต่ใกล้ · ดูว่ากลุ่มที่ "ผิดหวังมาก" คือใคร แล้วทำ core value ให้เข้มขึ้นเฉพาะเขา วัดซ้ำ${small}`,
      color: '#f59e0b' };
  }
  return { total, veryPct, verdict: 'weak', label: '🔴 ยังไม่ถึง PMF',
    guidance: `${veryPct}% (เกณฑ์ ${PMF_THRESHOLD}%) — อย่าเพิ่งเร่งโต (เทน้ำใส่ถังรั่ว) · กลับไปแก้ product / เลือก segment ที่ใช่ก่อน scale${small}`,
    color: '#ef4444' };
}
